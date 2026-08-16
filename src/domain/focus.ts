import type { Move } from './persistence'

export function nearestDueMoves(moves: Move[], today: string, count: number): Move[] {
  return moves
    .filter((m) => !m.completed && m.deadline >= today)
    .slice()
    .sort((a, b) =>
      a.deadline === b.deadline ? (a.id < b.id ? -1 : 1) : a.deadline < b.deadline ? -1 : 1,
    )
    .slice(0, count)
}