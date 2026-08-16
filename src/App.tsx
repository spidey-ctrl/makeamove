import { useEffect, useRef, useState } from 'react'
import { createProject, deleteProject, renameProject } from './domain/store'
import { loadState, saveState } from './domain/storage'
import type { AppState } from './domain/persistence'

function App() {
  const [state, setState] = useState<AppState>(loadState)

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
          {state.projects.map((project) => (
            <li
              key={project.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 0',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <span style={{ flex: 1, color: 'var(--text-h)' }}>
                {project.name}
              </span>
              <RenameButton
                initial={project.name}
                onRename={(name) => apply((s) => renameProject(s, project.id, name))}
              />
              <button
                type="button"
                onClick={() => apply((s) => deleteProject(s, project.id))}
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