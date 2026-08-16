import { useEffect, useRef, useState } from 'react'
import {
  createProject,
  createMove,
  deleteMove,
  deleteProject,
  renameProject,
  setMoveCompleted,
  setProjectModel,
  updateMove,
  type MovePatch,
} from './domain/store'
import { loadState, saveState } from './domain/storage'
import { sortActiveMoves } from './domain/strategy'
import type { AppState, ExecutionModel, Move } from './domain/persistence'

function App() {
  const [state, setState] = useState<AppState>(loadState)
  const [projectId, setProjectId] = useState<string | null>(null)

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

  function apply(mutate: (s: AppState) => AppState) {
    setState((s) => mutate(s))
  }

  const project = projectId
    ? state.projects.find((p) => p.id === projectId) ?? null
    : null

  if (project) {
    return (
      <ProjectView
        projectId={project.id}
        projectName={project.name}
        model={project.model}
        moves={state.moves.filter((m) => m.projectId === project.id)}
        apply={apply}
        onBack={() => setProjectId(null)}
      />
    )
  }

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1>MakeAMove</h1>
      <form
        style={{ display: 'flex', gap: 8, marginBottom: 24 }}
        onSubmit={(e) => {
          e.preventDefault()
          const form = e.currentTarget
          const input = form.elements.namedItem('name') as HTMLInputElement
          const name = input.value.trim()
          if (!name) return
          apply((s) => createProject(s, name))
          input.value = ''
        }}
      >
        <input
          name="name"
          type="text"
          placeholder="New project name"
          aria-label="Project name"
          style={{ flex: 1, padding: '4px 8px' }}
        />
        <button type="submit">Add project</button>
      </form>

      {state.projects.length === 0 ? (
        <p>No projects yet. Create your first project above.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {state.projects.map((p) => (
            <li
              key={p.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 0',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <button
                type="button"
                style={{
                  flex: 1,
                  textAlign: 'left',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: 'var(--text-h)',
                }}
                onClick={() => {
                  setProjectId(p.id)
                }}
              >
                {p.name}
              </button>
              <RenameButton
                initial={p.name}
                onRename={(name) => apply((s) => renameProject(s, p.id, name))}
              />
              <button
                type="button"
                onClick={() => apply((s) => deleteProject(s, p.id))}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      <p style={{ marginTop: 24, fontSize: 13, color: 'var(--text)' }}>
        {state.projects.length} project{state.projects.length === 1 ? '' : 's'}; stored
        locally
      </p>
    </main>
  )
}

function ProjectView({
  projectId,
  projectName,
  model,
  moves,
  apply,
  onBack,
}: {
  projectId: string
  projectName: string
  model: ExecutionModel
  moves: Move[]
  apply: (mutate: (s: AppState) => AppState) => void
  onBack: () => void
}) {
  const [showForm, setShowForm] = useState(false)
  const ordered = sortActiveMoves(moves, model)
  const completed = moves.filter((m) => m.completed)
  const nothingToDo = ordered.length === 0 && completed.length > 0

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '2rem 1rem' }}>
      <button type="button" onClick={onBack}>
        ← All projects
      </button>
      <h1>{projectName}</h1>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        Execution model:
        <select
          value={model}
          onChange={(e) =>
            apply((s) => setProjectModel(s, projectId, e.target.value as ExecutionModel))
          }
          aria-label="Execution model"
          style={{ padding: '4px 8px' }}
        >
          <option value="low-hanging-fruit">Low Hanging Fruit</option>
          <option value="high-hanging-fruit">High Hanging Fruit</option>
        </select>
      </label>

      <h2 style={{ fontSize: 18, margin: '0 0 8px' }}>Active</h2>
      {ordered.length === 0 ? (
        <div
          style={{
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: 24,
            textAlign: 'center',
            marginBottom: 16,
            background: 'var(--accent-bg)',
          }}
        >
          <p style={{ color: 'var(--text-h)', marginBottom: 8 }}>
            {nothingToDo
              ? 'Everything in this project is done.'
              : 'This project has no moves.'}
          </p>
          <button type="button" onClick={() => setShowForm(true)}>
            Add a move
          </button>
        </div>
      ) : (
        <>
          <button type="button" onClick={() => setShowForm(true)} style={{ marginBottom: 16 }}>
            Add a move
          </button>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {ordered.map((move) => (
              <MoveRow key={move.id} move={move} apply={apply} />
            ))}
          </ul>
        </>
      )}

      {completed.length > 0 && (
        <>
          <h2 style={{ fontSize: 18, margin: '24px 0 8px' }}>Completed</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {completed.map((move) => (
              <MoveRow key={move.id} move={move} apply={apply} />
            ))}
          </ul>
        </>
      )}

      {showForm && (
        <MoveForm
          onAdd={(input) => {
            apply((s) => createMove(s, projectId, input))
            setShowForm(false)
          }}
          onCancel={() => setShowForm(false)}
        />
      )}
    </main>
  )
}

function MoveRow({
  move,
  apply,
}: {
  move: Move
  apply: (mutate: (s: AppState) => AppState) => void
}) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <li
        style={{
          padding: '12px 0',
          borderBottom: '1px solid var(--border)',
          color: 'var(--text-h)',
        }}
      >
        <MoveForm
          initial={move}
          onAdd={(patch) => {
            apply((s) => updateMove(s, move.id, patch))
            setEditing(false)
          }}
          onCancel={() => setEditing(false)}
        />
      </li>
    )
  }

  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 0',
        borderBottom: '1px solid var(--border)',
        opacity: move.completed ? 0.55 : 1,
      }}
    >
      <input
        type="checkbox"
        aria-label={`Mark "${move.title}" ${move.completed ? 'not ' : ''}completed`}
        checked={move.completed}
        disabled={move.progress >= 100}
        onChange={(e) => apply((s) => setMoveCompleted(s, move.id, e.target.checked))}
      />
      <div style={{ flex: 1 }}>
        <div
          style={{
            color: 'var(--text-h)',
            textDecoration: move.completed ? 'line-through' : 'none',
          }}
        >
          {move.title}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text)', opacity: 0.8 }}>
          Difficulty {move.difficulty}/5 · {move.progress}% · due {move.deadline}
          {move.completed && move.completedAt ? ` · completed ${move.completedAt}` : ''}
        </div>
      </div>
      <button type="button" onClick={() => setEditing(true)}>
        Edit
      </button>
      <button type="button" onClick={() => apply((s) => deleteMove(s, move.id))}>
        Delete
      </button>
    </li>
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
      style={{
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        display: 'grid',
        gap: 12,
      }}
      onSubmit={(e) => {
        e.preventDefault()
        if (!valid) return
        onAdd({ title: title.trim(), difficulty, progress, deadline })
      }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <label style={{ flex: 1 }}>
          Title
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to happen?"
            aria-label="Move title"
            style={{ display: 'block', width: '100%', padding: '6px 8px' }}
          />
        </label>
        <label>
          Deadline
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            aria-label="Move deadline"
            style={{ display: 'block', padding: '6px 8px' }}
          />
        </label>
      </div>

      <label>
        Difficulty: {difficulty}/5
        <input
          type="range"
          min={1}
          max={5}
          step={1}
          value={difficulty}
          onChange={(e) => setDifficulty(Number(e.target.value))}
          aria-label="Move difficulty"
          style={{ display: 'block', width: '100%' }}
        />
      </label>

      <label>
        Progress: {progress}%
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={progress}
          onChange={(e) => setProgress(Number(e.target.value))}
          aria-label="Move progress"
          style={{ display: 'block', width: '100%' }}
        />
      </label>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" disabled={!valid}>
          {initial ? 'Save' : 'Add move'}
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

  if (!editing) return <button onClick={() => setEditing(true)}>Rename</button>

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
        defaultValue={initial}
        aria-label="New project name"
        autoFocus
        style={{ padding: '4px 8px' }}
      />
    </form>
  )
}

export default App