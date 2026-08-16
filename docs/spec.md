# MakeAMove — Product Spec

Triage: none (no tracker configured; spec published to repo only).
Domain language: authoritative in `CONTEXT.md`. Prior decisions: ADRs `docs/adr/0001–0003`.

## Problem Statement

A single-user to-do list grows into a wall of equal-weight tasks. The user doesn't know what to do next, misses deadlines silently, and feels guilt rather than momentum. There is no reason for tasks to demand equal attention — they differ in difficulty, urgency, and progress.

## Solution

MakeAMove organizes work into **projects**, each holding **moves** — individually schedulable units of work with their own **difficulty** (1–5), **progress** (0–100%), and **deadline**. A **Strategy Engine** orders a project's active moves by a switchable execution model (easiest-first or hardest-first) so the user always has a clear next action, and missed deadlines are resolved with a zero-guilt **rollover** prompt rather than nagging.

## User Stories

1. As a user, I want to create a project, so that I can group related moves together.
2. As a user, I want to rename a project, so that I can keep its name meaningful.
3. As a user, I want to delete a project, so that I can remove a grouping I no longer need.
4. As a user, I want to add a move to a project, so that I can capture work that needs to happen.
5. As a user, I want a move to have a title, so that I can recognize what the work is.
6. As a user, I want to set a difficulty (1–5) on a move with a slider, so that I can express how hard the work is.
7. As a user, I want to set a deadline on a move, so that I can schedule when it must be done.
8. As a user, I want to set progress (0–100%) on a move with a slider, so that I can record partial completion.
9. As a user, I want to edit a move's title, difficulty, deadline, and progress, so that I can keep its data current.
10. As a user, I want to delete a move, so that I can remove work that no longer exists.
11. As a user, I want active moves in a project ordered by the Low Hanging Fruit model (easiest first, nearest deadline first on ties), so that I can build quick momentum.
12. As a user, I want active moves in a project ordered by the High Hanging Fruit model (hardest first, nearest deadline first on ties), so that I can do deep work in high-energy sessions.
13. As a user, I want to switch the execution model for a project, so that I can match my approach to my energy level.
14. As a user, I want the chosen execution model to persist, so that I don't re-pick it on every visit.
15. As a user, I want progress to never act as a sort key in either model, so that the ordering stays transparent and explainable.
16. As a user, I want to mark a move completed with a tick at any progress level, so that I can declare work done even if I never slid it to 100%.
17. As a user, I want sliding progress to 100% to auto-complete the move, so that I can finish in one continuous gesture.
18. As a user, I want un-ticking a move at 100% progress to be refused, so that an active move never shows full progress (invariant: active ⟺ progress < 100).
19. As a user, I want completed moves to show a tick and stay visible in the project, so that I can see what's been done.
20. As a user, I want a move due tomorrow to be flagged as due but NOT counted as overdue, so that I'm not nagged before I'm actually late.
21. As a user, I want a move to be counted overdue only when its deadline is strictly before today's local calendar date, so that "late" means genuinely late.
22. As a user, I want the app to show a rollover prompt on load when any active move is overdue, so that I can resolve missed deadlines with fresh intent.
23. As a user, I want no rollover prompt when nothing is overdue, so that a clean slate stays quiet.
24. As a user, I want each overdue move in the prompt to offer a new deadline defaulting to today + 7 days, so that the default action is "move it on without thinking."
25. As a user, I want to edit the offered deadline before confirming, so that I can pick an alternative timeline.
26. As a user, I want to confirm the batch to roll all overdue moves in one action, so that catching up is quick.
27. As a user, I want a per-move confirmation toast after rollover ("'Finish essay' moved to next week — Sep 6"), so that I know each move was handled.
28. As a user, I want to dismiss the rollover prompt, so that I can deal with overdue moves in my own time.
29. As a user, I want dismissed overdue moves to stay visible in the active list, so that the list itself remains the reminder.
30. As a user, I want a project with no moves to say "This project has no moves" with an add-first-move call-to-action, so that I understand the empty state.
31. As a user, I want a project whose moves are all completed to say everything's done with a link to history, so that I'm not left staring at a dead list.
32. As a user, I want to open a per-project History view of completed moves ordered newest-completion-first, so that I can revisit past work.
33. As a user, I want History grouped by day (today / yesterday / earlier), so that I can see this week's flow at a glance.
34. As a user, I want each History row to show the move title and its completion date, so that I can identify the move.
35. As a user, I want to Reopen a completed move from History, so that I can fix something I missed.
36. As a user, I want Reopen to move the move back to active and reset its progress to 0%, so that the invariant holds and stale progress isn't misleading.
37. As a user, I want the completion record to stay in History after Reopen, so that I don't lose the memory of having done it.
38. As a user, I want all data to survive a page reload, so that I don't lose my projects and moves.
39. As a user, I want the app to recover gracefully when stored data is empty or corrupt (seed a clean empty state), so that I'm never stuck with a broken app.
40. As a user, I want stored data to migrate forward when the schema changes, so that I don't lose existing moves on upgrade.

## Implementation Decisions

**Architecture**
- Single-page web app; single-user, per-browser. **No backend, no auth** (ADR 0001). All data in LocalStorage under one schema-versioned key.
- State management: plain root store object + React context. Mutations are pure `mutate(state, action) → state`; a single debounced `saveToState` (≈300 ms) writes to LocalStorage to tolerate the high-frequency progress slider. A framework store (Zustand/Redux) is deferred until the flat two-array shape proves painful.

**Seams (test surface)**
- **Strategy Engine** — pure function `sortActiveMoves(moves, model) → moves[]`. The primary seam: deterministic ordering for both models.
- **Date/time** — pure function `isOverdue(deadline, today) → boolean` and `defaultRolloverDate(today) → date` operating on "local calendar date at 00:00" semantics.
- **Persistence** — pure `hydrate(raw) → state` / `migrate(state) → state` at the storage boundary: empty/corrupt → clean state; version mismatch → migration chain.
- **Rollover reducer** — the batch prompt's state transitions (none / some / all confirmed, per-move toast emitted).

**Schema** (record shape, from the design resolution — encodes `0003` invariant constraints)
```json
{
  "schemaVersion": 1,
  "projects": [ { "id": "p1", "name": "College", "createdAt": "..." } ],
  "moves": [
    {
      "id": "m1", "projectId": "p1", "title": "Finish essay",
      "difficulty": 3, "progress": 60,
      "deadline": "2026-08-30",
      "completed": false, "completedAt": null
    }
  ]
}
```
- Invariants enforced: `completed` XOR active; if not completed, progress < 100 (UI refuses un-tick at 100); Reopen sets `completed=false, progress=0`, keeps `completedAt` (renders in History).
- Completion date: single `completedAt` field, overwritten on each completion — not an event log (ADR 0002).
- Strategy Engine: difficulty primary key per model, deadline ascending as tiebreaker; progress never a key. Read-only — it never writes state.
- Dates compared as local calendar dates only; deadlines carry no time component (ADR 0002/0003 scope: no time-of-day sessions).

**Known user-facing behaviors**
- Rollover prompt is a nudge, not a gate: dismiss leaves overdue moves visible in the active list.
- No native browser notifications; the per-move rollover toast is in-app. No persistent "N overdue" chip — the active list is the reminder.

## Testing Decisions

- **What makes a good test:** test external behavior through the seams above — inputs in, state/files-visible-out — never poke at internal reducer or store wiring. Dates tested with injected "today" rather than the real clock.
- **Strategy Engine (module tested):** table-driven tests for both models — ordering by difficulty, tie-breaking by deadline, progress having no effect on order, empty and single-move inputs.
- **Date logic (module tested):** `isOverdue` boundary cases — deadline yesterday/ today / tomorrow, same local date across an injected midnight; `defaultRolloverDate` = today + 7.
- **Persistence (module tested):** hydrate with valid JSON, corrupt JSON, missing key, and every schema version → clean seed / migration outcomes.
- **Rollover reducer (module tested):** transition from overdue-with-moves to all-confirmed / partially-confirmed / dismissed; toast emission per confirmed move; dismissed moves retained and still visible.
- **Prior art:** none yet — this is the first spec and the repo is greenfield. These four seam modules become the prior art for later specs.

## Out of Scope

- Backend/server, accounts, auth, and any multi-device sync.
- Shared or collaborative projects.
- Browser/system push notifications.
- Move-level subtasks, tags, boards, or calendar views.
- Recurring, estimated-duration, or time-of-day scheduling on moves.
- Deprecated: progress-as-sort-key and weighted aggregate scores.

## Further Notes

- The four seam modules (Strategy Engine, date/time, persistence, rollover reducer) are the natural starting set for implementation and are designed to be implemented and tested without a UI.
- `CONTEXT.md` is the authoritative glossary; any new term introduced during implementation should be reflected there.
- No issue tracker is configured for this repo; this spec lives at `docs/spec.md` awaiting a tracker decision before tickets are cut.