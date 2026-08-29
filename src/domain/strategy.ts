import type { ExecutionModel, Move } from './persistence'

export function sortActiveMoves(moves: Move[], model: ExecutionModel): Move[] {
  const active = moves.filter((m) => !m.completed)
  const byDeadline = (a: Move, b: Move) => a.deadline.localeCompare(b.deadline)
  const byDifficulty = (a: Move, b: Move) =>
    model === 'low-hanging-fruit'
      ? a.difficulty - b.difficulty
      : b.difficulty - a.difficulty

  if (model === 'deadline-first') {
    return [...active].sort((a, b) => {
      const deadline = byDeadline(a, b)
      return deadline !== 0 ? deadline : a.difficulty - b.difficulty
    })
  }

  return [...active].sort((a, b) => {
    const difficulty = byDifficulty(a, b)
    return difficulty !== 0 ? difficulty : byDeadline(a, b)
  })
}