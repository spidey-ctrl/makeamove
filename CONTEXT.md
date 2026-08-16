# MakeAMove

A task and project management web application that fights list-overwhelm through strategic focus and momentum-building models. Work is organized into projects that contain individually-schedulable units of work ("moves"), each with its own difficulty and deadline.

## Language

**Project**:
A grouping container (like a folder) for related moves. A project has no deadline of its own; all scheduling happens at the move level.
_Avoid_: Folder itself, goal, epic

**Move**:
The smallest schedulable unit of work. A move carries its own deadline, difficulty rating, and completion state. It is the unit the Strategy Engine sorts and the rollover prompt operates on.
_Avoid_: Task, sub-task, action item, todo

**Difficulty**:
A user-set rating (1–5) on a move indicating how hard it is to complete.
_Avoid_: Effort, complexity, priority

**Progress**:
A 0–100% slider on a move representing partial completion. Active moves may hold any progress value; the completed tick is not tied to it.

**Completed**:
The terminal state of a move, represented by a tick. The tick can be set manually at any progress level and is auto-set when progress is slid to 100%. Unticking a move at 100% progress is not permitted.
_Avoid_: Done, finished, closed

**Reopen**:
The action of returning a completed move to the active state from its history, available when the user has missed something. Reopen resets the move's progress to 0% and returns it to the active list; the completion record stays in history.
_Avoid_: Restore, un-complete

**Rollover**:
The prompt shown on load for overdue active moves. Each overdue move is offered a new deadline defaulting to today + 7 days, editable before confirm; confirming returns the move to the active list and the move is notified as moved to next week.
_Avoid_: Push, snooze, postpone

## Strategy Engine

**Strategy Engine**:
The module that orders a project's active moves for display based on the user's chosen execution model. It reads moves and sorts them; it never writes.
_Avoid_: Sorter, prioritizer, recommender

**Low Hanging Fruit**:
An execution model that orders active moves by difficulty ascending (easiest first), breaking ties by deadline ascending. Aimed at building quick momentum.
_Avoid_: Easiest-first, quick wins, low fruit

**High Hanging Fruit**:
An execution model that orders active moves by difficulty descending (hardest first), breaking ties by deadline ascending. Aimed at doing the deep work in high-energy sessions.
_Avoid_: Hardest-first, deep work, eat-the-frog, high fruit

## History

**History**:
A per-project list of completed moves ordered newest-first, grouped by completion day (today / yesterday / earlier). Each row shows the move title and its completion date and offers Reopen.
_Avoid_: Archive, timeline, completed list