import type { Move } from './persistence'

export type ExecutionModel = 'low-hanging-fruit' | 'high-hanging-fruit'

export function sortActiveMoves(moves: Move[], model: ExecutionModel): Move[] {
  const active = moves.filter((m) => !m.completed)
  const tiebreaker = (a: Move, b: Move) => a.deadline.localeCompare(b.deadline)
  const byDifficulty = (a: Move, b: Move) =>
    model === 'low-hanging-fruit'
      ? a.difficulty - b.difficulty
      : b.difficulty - a.difficulty

  return [...active].sort((a, b) => {
    const difficulty = byDifficulty(a, b)
    return difficulty !== 0 ? difficulty : tiebreaker(a, b)
  })
}