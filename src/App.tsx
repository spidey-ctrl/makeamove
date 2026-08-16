import { useEffect, useRef, useState } from 'react'
import {
  createProject,
  createMove,
  deleteMove,
  deleteProject,
  renameProject,
  reopenMove,
  setGlobalModel,
  setMoveCompleted,
  setMoveDeadline,
  setProjectModel,
  updateMove,
  type MovePatch,
} from './domain/store'
import { loadState, saveState } from './domain/storage'
import { sortActiveMoves } from './domain/strategy'
import { findOverdueMoves } from './domain/rollover'
import { groupHistory } from './domain/history'
import { nearestDueMoves } from './domain/focus'
import { addDays, daysUntil, isOverdue, todayString } from './domain/dates'
import type { AppState, ExecutionModel, Move } from './domain/persistence'

function App() {
  const [state, setState] = useState<AppState>(loadState)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [rolloverDismissedAt, setRolloverDismissedAt] = useState(0)
  const [toasts, setToasts] = useState<string[]>([])

  const latest = useRef(state)
  latest.current = state
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveState(state), 300)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [state])

  useEffect(() => {
    function flush() {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current)
        saveTimer.current = null
      }
      saveState(latest.current)
    }
    window.addEventListener('beforeunload', flush)
    return () => window.removeEventListener('beforeunload', flush)
  }, [])

  useEffect(() => {
    if (toasts.length === 0) return
    const handle = setTimeout(() => setToasts([]), 4000)
    return () => clearTimeout(handle)
  }, [toasts])

  function apply(mutate: (s: AppState) => AppState) {
    setState((s) => mutate(s))
  }

  const project = projectId
    ? state.projects.find((p) => p.id === projectId) ?? null
    : null
  const today = todayString()
  const overdueMoves = findOverdueMoves(state.moves, today)
  const showRollover = overdueMoves.length > 0 && Date.now() > rolloverDismissedAt

  return (
    <>
      <header className="brand-bar">
        <div className="brand-bar-inner">
          <span className="brand-mark">→</span>
          <span className="brand-name">MakeAMove</span>
        </div>
      </header>

      {showRollover && (
        <RolloverPrompt
          moves={overdueMoves}
          today={today}
          apply={apply}
          onMoved={(notices) => {
            setToasts(notices)
            setRolloverDismissedAt(Date.now())
          }}
          onDismiss={() => setRolloverDismissedAt(Date.now())}
        />
      )}

      {project ? (
        <ProjectView
          projectId={project.id}
          projectName={project.name}
          model={project.model}
          moves={state.moves.filter((m) => m.projectId === project.id)}
          today={today}
          apply={apply}
          onBack={() => setProjectId(null)}
        />
      ) : (
        <main className="page">
          <div className="page-head">
            <h1 className="page-title">Projects</h1>
            <NewProjectCard onCreate={(name) => apply((s) => createProject(s, name))} />
          </div>

          {(() => {
            const dueSoon = nearestDueMoves(state.moves, today, 3)
            const allActive = state.moves.filter((m) => !m.completed)
            const globalOrdered = sortActiveMoves(allActive, state.globalModel)
            const projectName = (id: string) =>
              state.projects.find((p) => p.id === id)?.name ?? 'Untitled'
            if (dueSoon.length === 0) return null
            return (
              <NextUpWidget
                due={dueSoon}
                all={globalOrdered}
                globalModel={state.globalModel}
                projectName={projectName}
                today={today}
                onOpenProject={setProjectId}
                onSelectModel={(m) => apply((s) => setGlobalModel(s, m))}
              />
            )
          })()}

          {state.projects.length === 0 ? (
            <div className="card empty">
              <p className="empty-title">No projects yet</p>
              <p className="empty-hint">
                Create your first project above and start stacking moves.
              </p>
            </div>
          ) : (
            <div className="project-grid">
              {state.projects.map((p) => {
                const moves = state.moves.filter((m) => m.projectId === p.id)
                const active = moves.filter((m) => !m.completed).length
                const done = moves.length - active
                const overdue = moves.filter(
                  (m) => !m.completed && isOverdue(m.deadline, today),
                ).length
                return (
                  <div key={p.id} className="card project-box">
                    <button
                      type="button"
                      className="project-name"
                      onClick={() => setProjectId(p.id)}
                    >
                      {p.name}
                    </button>
                    <span className="project-meta">
                      {active} active · {done} done
                    </span>
                    {overdue > 0 && (
                      <span className="pill pill-warn">{overdue} overdue</span>
                    )}
                    <div className="project-box-actions">
                      <RenameButton
                        initial={p.name}
                        onRename={(name) => apply((s) => renameProject(s, p.id, name))}
                      />
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => apply((s) => deleteProject(s, p.id))}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <p className="foot-meta">
            {state.projects.length} project{state.projects.length === 1 ? '' : 's'} · stored
            locally
          </p>
        </main>
      )}

      <div className="toast-stack" role="status">
        {toasts.map((t) => (
          <div key={t} className="toast">
            {t}
          </div>
        ))}
      </div>
    </>
  )
}

function NewProjectCard({ onCreate }: { onCreate: (name: string) => void }) {
  return (
    <form
      className="card project-card"
      style={{ padding: '8px 10px', gap: 8 }}
      onSubmit={(e) => {
        e.preventDefault()
        const form = e.currentTarget
        const input = form.elements.namedItem('name') as HTMLInputElement
        const name = input.value.trim()
        if (!name) return
        onCreate(name)
        input.value = ''
      }}
    >
      <input
        name="name"
        type="text"
        className="input"
        placeholder="New project name"
        aria-label="Project name"
        style={{ flex: 1, minWidth: 160 }}
      />
      <button type="submit" className="btn btn-primary">
        Add project
      </button>
    </form>
  )
}

function NextUpWidget({
  due,
  all,
  globalModel,
  projectName,
  today,
  onOpenProject,
  onSelectModel,
}: {
  due: Move[]
  all: Move[]
  globalModel: ExecutionModel
  projectName: (id: string) => string
  today: string
  onOpenProject: (id: string) => void
  onSelectModel: (model: ExecutionModel) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const hidden = Math.max(0, all.length - due.length)

  return (
    <section className="card nextup-card" aria-label="Next up">
      <div className="nextup-head">
        <span className="nextup-title">Next up</span>
        <span className="nextup-sub">
          {hidden > 0 ? `${hidden} more across projects` : 'Newest deadlines first'}
        </span>
      </div>

      {due.map((move) => (
        <button
          key={move.id}
          type="button"
          className="nextup-row"
          onClick={() => onOpenProject(move.projectId)}
        >
          <span className="nextup-name">{projectName(move.projectId)}</span>
          <span className="nextup-title-text">{move.title}</span>
          <span className="pill pill-accent">{dueLabel(today, move.deadline)}</span>
        </button>
      ))}

      <div className="nextup-expand">
        {expanded ? (
          <>
            <div className="nextup-expand-head" style={{ marginBottom: 8 }}>
              <span className="section-title">Order by model</span>
              <div className="tabbar" role="tablist" aria-label="Global execution model">
                <button
                  type="button"
                  role="tab"
                  aria-selected={globalModel === 'low-hanging-fruit'}
                  className={`tab ${globalModel === 'low-hanging-fruit' ? 'tab-active' : ''}`}
                  onClick={() => onSelectModel('low-hanging-fruit')}
                >
                  Easiest first
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={globalModel === 'high-hanging-fruit'}
                  className={`tab ${globalModel === 'high-hanging-fruit' ? 'tab-active' : ''}`}
                  onClick={() => onSelectModel('high-hanging-fruit')}
                >
                  Hardest first
                </button>
              </div>
            </div>
            {all.map((move) => {
              const overdue = isOverdue(move.deadline, today)
              return (
                <button
                  key={move.id}
                  type="button"
                  className="nextup-row"
                  onClick={() => onOpenProject(move.projectId)}
                >
                  <span className="nextup-name">{projectName(move.projectId)}</span>
                  <span className="nextup-title-text">{move.title}</span>
                  <DifficultyTag value={move.difficulty} />
                  {overdue ? (
                    <span className="pill pill-warn">Overdue</span>
                  ) : (
                    <span className="pill pill-accent">{dueLabel(today, move.deadline)}</span>
                  )}
                </button>
              )
            })}
          </>
        ) : null}
        <div style={{ textAlign: 'right' }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setExpanded((s) => !s)}
          >
            {expanded ? 'Show less' : expandedLabel(all, due)}
          </button>
        </div>
      </div>
    </section>
  )
}

function expandedLabel(all: Move[], due: Move[]) {
  const hidden = all.length - due.length
  return hidden > 0 ? `Show all ${all.length} moves` : 'Show all moves'
}

function dueLabel(today: string, deadline: string) {
  const days = daysUntil(deadline, today)
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  return `In ${days} days`
}

function RolloverPrompt({
  moves,
  today,
  apply,
  onMoved,
  onDismiss,
}: {
  moves: Move[]
  today: string
  apply: (mutate: (s: AppState) => AppState) => void
  onMoved: (notices: string[]) => void
  onDismiss: () => void
}) {
  const [deadlines, setDeadlines] = useState<Record<string, string>>(() =>
    Object.fromEntries(moves.map((m) => [m.id, addDays(today, 7)])),
  )

  function confirmAll() {
    for (const move of moves) {
      apply((s) => setMoveDeadline(s, move.id, deadlines[move.id]))
    }
    onMoved(
      moves.map((m) => `✓ "${m.title}" moved to next week (${deadlines[m.id]})`),
    )
  }

  return (
    <div className="overlay">
      <div className="modal" role="dialog" aria-modal="true" aria-label="Overdue moves">
        <h2 className="modal-title">
          {moves.length} overdue move{moves.length === 1 ? '' : 's'}
        </h2>
        <p className="modal-sub">Roll them all over to next week, with no guilt.</p>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {moves.map((m) => (
            <li key={m.id} className="rollover-row">
              <span className="pill pill-warn">Overdue</span>
              <span className="rollover-title">{m.title}</span>
              <input
                type="date"
                className="input"
                aria-label={`New deadline for ${m.title}`}
                value={deadlines[m.id]}
                onChange={(e) =>
                  setDeadlines((d) => ({ ...d, [m.id]: e.target.value }))
                }
                style={{ width: 148 }}
              />
            </li>
          ))}
        </ul>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onDismiss}>
            Dismiss
          </button>
          <button type="button" className="btn btn-primary" onClick={confirmAll}>
            Move all to next week
          </button>
        </div>
      </div>
    </div>
  )
}

function ProjectView({
  projectId,
  projectName,
  model,
  moves,
  today,
  apply,
  onBack,
}: {
  projectId: string
  projectName: string
  model: ExecutionModel
  moves: Move[]
  today: string
  apply: (mutate: (s: AppState) => AppState) => void
  onBack: () => void
}) {
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [view, setView] = useState<'queue' | 'history'>('queue')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const ordered = sortActiveMoves(moves, model)
  const nothingToDo = ordered.length === 0 && moves.some((m) => m.completed)

  const completed = moves.filter((m) => m.completed).length
  const overdue = moves.filter((m) => !m.completed && isOverdue(m.deadline, today)).length
  const selected = selectedId != null ? (moves.find((m) => m.id === selectedId) ?? null) : null

  return (
    <main className="page">
      <button type="button" className="back-btn" onClick={onBack}>
        ← All projects
      </button>
      <div className="page-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 className="page-title">{projectName}</h1>
          <span className="pill pill-accent">
            {model === 'low-hanging-fruit' ? 'Low Hanging Fruit' : 'High Hanging Fruit'}
          </span>
        </div>
        <select
          className="model-select"
          value={model}
          onChange={(e) =>
            apply((s) => setProjectModel(s, projectId, e.target.value as ExecutionModel))
          }
          aria-label="Execution model"
        >
          <option value="low-hanging-fruit">Low Hanging Fruit</option>
          <option value="high-hanging-fruit">High Hanging Fruit</option>
        </select>
      </div>

      <div className="stats" aria-hidden="true">
        <div className="stat">
          <div className="stat-label">Active</div>
          <div className="stat-value">{ordered.length}</div>
        </div>
        <div className={`stat ${completed > 0 ? 'stat-ok' : ''}`}>
          <div className="stat-label">Done</div>
          <div className="stat-value">{completed}</div>
        </div>
        <div className={`stat ${overdue > 0 ? 'stat-warn' : ''}`}>
          <div className="stat-label">Overdue</div>
          <div className="stat-value">{overdue}</div>
        </div>
      </div>

      <div className="toolbar">
        <div className="tabbar" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={view === 'queue'}
            className={`tab ${view === 'queue' ? 'tab-active' : ''}`}
            onClick={() => setView('queue')}
          >
            Queue
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'history'}
            className={`tab ${view === 'history' ? 'tab-active' : ''}`}
            onClick={() => setView('history')}
          >
            History
          </button>
        </div>
        {view === 'queue' && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setShowQuickAdd((s) => !s)
              setView('queue')
            }}
          >
            {showQuickAdd ? 'Close' : 'Add a move'}
          </button>
        )}
      </div>

      {view === 'queue' ? (
        <>
          {showQuickAdd ? (
            <MoveForm
              onAdd={(input) => {
                apply((s) => createMove(s, projectId, input))
                setShowQuickAdd(false)
              }}
              onCancel={() => setShowQuickAdd(false)}
            />
          ) : ordered.length === 0 ? (
            <div className="card empty">
              <p className="empty-title">
                {nothingToDo ? 'Everything done' : 'No moves yet'}
              </p>
              <p className="empty-hint">
                {nothingToDo
                  ? 'Nice work. Everything in this project is complete.'
                  : 'Add your first move to start building momentum.'}
              </p>
              <button type="button" className="btn btn-primary" onClick={() => setShowQuickAdd(true)}>
                Add a move
              </button>
            </div>
          ) : (
            <div className="workspace">
              <div className="queue">
                {ordered.map((move, i) => (
                  <QueueItem
                    key={move.id}
                    move={move}
                    rank={i + 1}
                    today={today}
                    selected={selectedId === move.id}
                    onSelect={() => setSelectedId(move.id)}
                    apply={apply}
                  />
                ))}
              </div>
              <FocusPanel
                key={selected?.id ?? 'none'}
                move={selected ?? null}
                today={today}
                apply={apply}
                onChanged={(id) => {
                  const m = moves.find((x) => x.id === id)
                  if (m?.completed) setSelectedId(null)
                }}
                onDeleted={() => setSelectedId(null)}
              />
            </div>
          )}
        </>
      ) : (
        <HistoryView moves={moves} apply={apply} />
      )}
    </main>
  )
}

function QueueItem({
  move,
  rank,
  today,
  selected,
  onSelect,
  apply,
}: {
  move: Move
  rank: number
  today: string
  selected: boolean
  onSelect: () => void
  apply: (mutate: (s: AppState) => AppState) => void
}) {
  const overdue = isOverdue(move.deadline, today)

  return (
    <button
      type="button"
      className={`queue-item ${selected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      <span className="queue-rank">{rank}</span>
      <input
        type="checkbox"
        className="input"
        aria-label={`Mark "${move.title}" completed`}
        checked={false}
        disabled={move.progress >= 100}
        onChange={(e) => {
          e.stopPropagation()
          apply((s) => setMoveCompleted(s, move.id, e.target.checked))
        }}
      />
      <span className="queue-title">{move.title}</span>
      <DifficultyTag value={move.difficulty} />
      {overdue && <span className="pill pill-warn">Overdue</span>}
    </button>
  )
}

function FocusPanel({
  move,
  today,
  apply,
  onChanged,
  onDeleted,
}: {
  move: Move | null
  today: string
  apply: (mutate: (s: AppState) => AppState) => void
  onChanged: (id: string) => void
  onDeleted: () => void
}) {
  if (!move) {
    return (
      <aside className="focus-panel">
        <div className="focus-empty">
          <div className="big">→</div>
          Pick a move from the queue to focus it here.
        </div>
      </aside>
    )
  }

  const overdue = isOverdue(move.deadline, today)

  return (
    <aside className="focus-panel">
      <div className="focus-panel-tag">Focus</div>
      <input
        type="text"
        className="focus-title-input"
        value={move.title}
        onChange={(e) => apply((s) => updateMove(s, move.id, { title: e.target.value }))}
        aria-label="Move title"
      />
      {overdue && <span className="pill pill-warn">Overdue · {move.deadline}</span>}

      <div className="panel-field">
        <div className="field-label" style={{ marginBottom: 8 }}>
          Difficulty
        </div>
        <DifficultyPicker
          value={move.difficulty}
          onChange={(v) => apply((s) => updateMove(s, move.id, { difficulty: v }))}
        />
      </div>

      <div className="panel-field focus-big-progress">
        <label className="field-label" htmlFor="focus-progress">
          Progress · <span className="focus-progress-num">{move.progress}%</span>
        </label>
        <input
          id="focus-progress"
          type="range"
          className="input"
          style={{ width: '100%', marginBottom: 8 }}
          min={0}
          max={100}
          step={1}
          value={move.progress}
          onChange={(e) => apply((s) => updateMove(s, move.id, { progress: Number(e.target.value) }))}
          aria-label="Move progress"
        />
        <span className="progress-track" style={{ display: 'block', width: '100%', height: 10 }}>
          <span className="progress-fill" style={{ width: `${move.progress}%` }} />
        </span>
      </div>

      <div className="panel-field">
        <label className="field-label" htmlFor="focus-deadline">
          Deadline
        </label>
        <input
          id="focus-deadline"
          type="date"
          className="input"
          style={{ width: '100%' }}
          value={move.deadline}
          onChange={(e) => apply((s) => updateMove(s, move.id, { deadline: e.target.value }))}
          aria-label="Move deadline"
        />
      </div>

      <div className="focus-footer">
        <button
          type="button"
          className="btn btn-complete"
          onClick={() => {
            apply((s) => setMoveCompleted(s, move.id, true))
            onChanged(move.id)
          }}
        >
          Complete it
        </button>
        <button
          type="button"
          className="btn btn-danger"
          onClick={() => {
            apply((s) => deleteMove(s, move.id))
            onDeleted()
          }}
        >
          Delete
        </button>
      </div>
    </aside>
  )
}

function HistoryView({
  moves,
  apply,
}: {
  moves: Move[]
  apply: (mutate: (s: AppState) => AppState) => void
}) {
  const groups = groupHistory(moves, todayString())

  if (groups.length === 0) {
    return (
      <div className="card empty">
        <p className="empty-title">No completed moves yet</p>
        <p className="empty-hint">Complete a move and it will land in history.</p>
      </div>
    )
  }

  return (
    <>
      {groups.map((group) => (
        <section key={group.label}>
          <h2 className="history-group-title">
            {group.label === 'yesterday'
              ? 'Yesterday'
              : group.label === 'today'
                ? 'Today'
                : 'Earlier'}
          </h2>
          <div className="stack">
            {group.moves.map((move) => (
              <div key={move.id} className="card history-row">
                <span className="history-title">{move.title}</span>
                <span className="history-date">{move.completedAt}</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => apply((s) => reopenMove(s, move.id))}
                >
                  Reopen
                </button>
              </div>
            ))}
          </div>
        </section>
      ))}
    </>
  )
}

function DifficultyTag({ value }: { value: number }) {
  const label = value <= 2 ? 'Easy' : value <= 3 ? 'Medium' : 'Hard'
  const tone = value <= 2 ? 'low' : value <= 3 ? 'med' : 'high'
  return <span className={`pill pill-diff pill-diff-${tone}`}>{label}</span>
}

function DifficultyPicker({
  value,
  onChange,
}: {
  value: number
  onChange: (value: number) => void
}) {
  const options = [
    { label: 'Easy', value: 1 },
    { label: 'Medium', value: 3 },
    { label: 'Hard', value: 5 },
  ]
  return (
    <div className="diff-picker" role="radiogroup" aria-label="Move difficulty">
      {options.map((o) => (
        <button
          key={o.label}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={`diff-picker-btn ${value === o.value ? 'diff-picker-btn-active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function MoveForm({
  initial,
  onAdd,
  onCancel,
}: {
  initial?: Move
  onAdd: (patch: MovePatch & { title: string; deadline: string }) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [difficulty, setDifficulty] = useState(initial?.difficulty ?? 3)
  const [progress, setProgress] = useState(initial?.progress ?? 0)
  const [deadline, setDeadline] = useState(initial?.deadline ?? '')

  const valid = title.trim() !== '' && deadline !== ''

  return (
    <form
      className="card form-card"
      onSubmit={(e) => {
        e.preventDefault()
        if (!valid) return
        onAdd({ title: title.trim(), difficulty, progress, deadline })
      }}
    >
      <div className="form-row">
        <div>
          <label className="field-label" htmlFor="move-title">
            Title
          </label>
          <input
            id="move-title"
            type="text"
            className="input"
            style={{ width: '100%' }}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to happen?"
            aria-label="Move title"
          />
        </div>
        <div>
          <label className="field-label" htmlFor="move-deadline">
            Deadline
          </label>
          <input
            id="move-deadline"
            type="date"
            className="input"
            style={{ width: '100%' }}
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            aria-label="Move deadline"
          />
        </div>
      </div>

      <div>
        <div className="field-label" style={{ marginBottom: 8 }}>
          Difficulty · <DifficultyTag value={difficulty} />
        </div>
        <DifficultyPicker value={difficulty} onChange={setDifficulty} />
      </div>

      <div>
        <label className="field-label" htmlFor="move-progress">
          Progress · {progress}%
        </label>
        <input
          id="move-progress"
          type="range"
          className="input"
          style={{ width: '100%' }}
          min={0}
          max={100}
          step={1}
          value={progress}
          onChange={(e) => setProgress(Number(e.target.value))}
          aria-label="Move progress"
        />
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={!valid}>
          {initial ? 'Save move' : 'Add move'}
        </button>
      </div>
    </form>
  )
}

function RenameButton({
  initial,
  onRename,
}: {
  initial: string
  onRename: (name: string) => void
}) {
  const [editing, setEditing] = useState(false)

  if (!editing) {
    return (
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
        Rename
      </button>
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const input = e.currentTarget.elements.namedItem('name') as HTMLInputElement
        const name = input.value.trim()
        if (name) onRename(name)
        setEditing(false)
      }}
    >
      <input
        name="name"
        className="input"
        defaultValue={initial}
        aria-label="New project name"
        autoFocus
        style={{ width: 140 }}
      />
    </form>
  )
}

export default App