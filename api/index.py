import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

try:  # local dev only; harmless in production
    from dotenv import load_dotenv

    load_dotenv()
except Exception:  # pragma: no cover
    pass

import bcrypt
import jwt
import psycopg
from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request
from mangum import Mangum
from psycopg.rows import dict_row
from pydantic import BaseModel
from pydantic.networks import EmailStr

DATABASE_URL = os.environ.get("DATABASE_URL", "")
JWT_SECRET = os.environ.get("JWT_SECRET", "")
TOKEN_TTL_DAYS = int(os.environ.get("TOKEN_TTL_DAYS", "7"))
RESET_TOKEN_TTL_MINUTES = int(os.environ.get("RESET_TOKEN_TTL_MINUTES", "30"))
BASE_URL = os.environ.get("BASE_URL", "https://makeamove-flame.vercel.app")
EMAIL_FROM = os.environ.get("EMAIL_FROM", "")
EMAIL_API_KEY = os.environ.get("EMAIL_API_KEY", "")


def get_conn():
    return psycopg.connect(DATABASE_URL, row_factory=dict_row, connect_timeout=6)


def ensure_schema() -> None:
    if not DATABASE_URL:
        return
    sql = """
    CREATE TABLE IF NOT EXISTS users (
        id            TEXT PRIMARY KEY,
        email         TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        verified      BOOLEAN NOT NULL DEFAULT TRUE,
        failed_attempts INTEGER NOT NULL DEFAULT 0,
        locked_until  TIMESTAMPTZ,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS password_resets (
        id         TEXT PRIMARY KEY,
        user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at    TIMESTAMPTZ
    );
    CREATE TABLE IF NOT EXISTS user_state (
        user_id    TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        data       JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_resets_user ON password_resets(user_id);
    """
    try:
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(sql)
            conn.commit()
    except Exception as exc:  # pragma: no cover - fail soft on cold start
        print(f"[makeamove] ensure_schema failed: {exc}")


ensure_schema()

app = FastAPI(title="MakeAMove API")
handler = Mangum(app)


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("ascii")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("ascii"))
    except ValueError:
        return False


def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "iat": now_utc(),
        "exp": now_utc() + timedelta(days=TOKEN_TTL_DAYS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def require_user(authorization: str = Header(default="")) -> dict[str, Any]:
    if not JWT_SECRET:
        raise HTTPException(status_code=500, detail="Auth is not configured")
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not signed in")
    token = authorization[len("Bearer "):]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Session expired or invalid")
    return {"id": str(payload["sub"]), "email": str(payload["email"])}


def fetch_user_by_email(email: str) -> Optional[dict]:
    if not DATABASE_URL:
        return None
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT id, email, password_hash, verified, failed_attempts, locked_until"
            " FROM users WHERE email ILIKE %s",
            (email,),
        )
        return cur.fetchone()


def fetch_user_by_id(user_id: str) -> Optional[dict]:
    if not DATABASE_URL:
        return None
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        return cur.fetchone()


def new_token_for(user_id: str) -> str:
    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "DELETE FROM password_resets WHERE user_id = %s",
            (user_id,),
        )
        cur.execute(
            "INSERT INTO password_resets (id, user_id, token_hash, expires_at)"
            " VALUES (%s, %s, %s, %s)",
            (secrets.token_urlsafe(16), user_id, token_hash, now_utc() + timedelta(minutes=RESET_TOKEN_TTL_MINUTES)),
        )
        conn.commit()
    return token


def send_email(to: str, subject: str, html: str) -> None:
    if not EMAIL_API_KEY or not EMAIL_FROM:
        print(f"[makeamove] email not configured; would send '{subject}' to {to}")
        return
    try:
        import httpx

        resp = httpx.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {EMAIL_API_KEY}"},
            json={"from": EMAIL_FROM, "to": [to], "subject": subject, "html": html},
            timeout=10,
        )
        resp.raise_for_status()
    except Exception as exc:  # pragma: no cover
        print(f"[makeamove] send_email failed to {to}: {exc}")


class SignupBody(BaseModel):
    email: EmailStr
    password: str


class LoginBody(BaseModel):
    email: EmailStr
    password: str


class ForgotBody(BaseModel):
    email: EmailStr


class ResetBody(BaseModel):
    token: str
    password: str


class StateBody(BaseModel):
    state: dict[str, Any]


@app.get("/api/health")
def health() -> dict:
    return {
        "ok": True,
        "db": bool(DATABASE_URL),
        "auth": bool(JWT_SECRET),
        "email": bool(EMAIL_API_KEY),
    }


@app.post("/api/auth/signup")
def signup(body: SignupBody) -> dict:
    if not DATABASE_URL or not JWT_SECRET:
        raise HTTPException(status_code=503, detail="Server is not configured yet")
    password = body.password
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    email = body.email.lower()
    existing = fetch_user_by_email(email)
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    user_id = secrets.token_urlsafe(16)
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "INSERT INTO users (id, email, password_hash) VALUES (%s, %s, %s)",
            (user_id, email, hash_password(password)),
        )
        conn.commit()
    send_email(
        email,
        "Welcome to MakeAMove",
        f"<p>Your MakeAMove account is ready. From now on your projects and moves sync to the cloud.</p>",
    )
    return {"token": create_token(user_id, email), "user": {"email": email}}


@app.post("/api/auth/login")
def login(body: LoginBody) -> dict:
    if not DATABASE_URL or not JWT_SECRET:
        raise HTTPException(status_code=503, detail="Server is not configured yet")
    email = body.email.lower()
    user = fetch_user_by_email(email)
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    if user.get("locked_until") and now_utc() < user["locked_until"]:
        raise HTTPException(status_code=401, detail="Too many attempts. Try again later.")
    if not verify_password(body.password, user["password_hash"]):
        attempts = (user.get("failed_attempts") or 0) + 1
        locked_until = now_utc() + timedelta(minutes=15) if attempts >= 5 else None
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(
                "UPDATE users SET failed_attempts = %s, locked_until = %s WHERE id = %s",
                (attempts if not locked_until else 0, locked_until, user["id"]),
            )
            conn.commit()
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = %s",
            (user["id"],),
        )
        conn.commit()
    return {"token": create_token(user["id"], email), "user": {"email": email}}


@app.get("/api/auth/me")
def me(user: dict = Depends(require_user)) -> dict:
    row = fetch_user_by_id(user["id"])
    if not row:
        raise HTTPException(status_code=401, detail="Account not found")
    return {"email": row["email"], "verified": row["verified"]}


@app.post("/api/auth/forgot-password")
def forgot_password(body: ForgotBody) -> dict:
    if not DATABASE_URL:
        raise HTTPException(status_code=503, detail="Server is not configured yet")
    email = body.email.lower()
    user = fetch_user_by_email(email)
    if not user:
        return {"message": "If that email exists, a reset link has been sent."}
    token = new_token_for(user["id"])
    reset_url = f"{BASE_URL}/#reset/{token}"
    html = (
        f"""
        <p>Click the link below to choose a new password. This link expires in {RESET_TOKEN_TTL_MINUTES} minutes.</p>
        <p><a href="{reset_url}">Reset my password</a></p>
        """
        if EMAIL_API_KEY
        else f"""
        <p>Reset link (email isn't configured yet): {reset_url}</p>
        """
    )
    send_email(email, "Reset your MakeAMove password", html)
    return {"message": "If that email exists, a reset link has been sent."}


@app.post("/api/auth/reset-password")
def reset_password(body: ResetBody) -> dict:
    if not DATABASE_URL:
        raise HTTPException(status_code=503, detail="Server is not configured yet")
    if len(body.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    token_hash = hashlib.sha256(body.token.encode("utf-8")).hexdigest()
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT pr.id, pr.user_id, pr.expires_at FROM password_resets pr"
            " WHERE pr.token_hash = %s AND pr.used_at IS NULL",
            (token_hash,),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=400, detail="Invalid or already-used reset link")
        if now_utc() > row["expires_at"]:
            raise HTTPException(status_code=400, detail="This reset link has expired")
        cur.execute(
            "UPDATE password_resets SET used_at = %s WHERE id = %s",
            (now_utc(), row["id"]),
        )
        cur.execute(
            "UPDATE users SET password_hash = %s, failed_attempts = 0, locked_until = NULL WHERE id = %s",
            (hash_password(body.password), row["user_id"]),
        )
        conn.commit()
    return {"message": "Password updated. You can now sign in."}


@app.get("/api/me/state")
def get_state(user: dict = Depends(require_user)) -> dict:
    if not DATABASE_URL:
        raise HTTPException(status_code=503, detail="Server is not configured yet")
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT data, updated_at FROM user_state WHERE user_id = %s", (user["id"],))
        row = cur.fetchone()
    return {
        "state": row["data"] if row else None,
        "updatedAt": row["updated_at"].isoformat() if row else None,
    }


@app.put("/api/me/state")
def put_state(body: StateBody, user: dict = Depends(require_user)) -> dict:
    if not DATABASE_URL:
        raise HTTPException(status_code=503, detail="Server is not configured yet")
    import json as _json

    payload = _json.dumps(body.state)
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "INSERT INTO user_state (user_id, data, updated_at) VALUES (%s, %s::jsonb, now())"
            " ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()",
            (user["id"], payload),
        )
        conn.commit()
        cur.execute("SELECT updated_at FROM user_state WHERE user_id = %s", (user["id"],))
        updated = cur.fetchone()
    return {"ok": True, "updatedAt": updated["updated_at"].isoformat() if updated else None}