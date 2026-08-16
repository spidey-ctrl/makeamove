import type { Move } from './persistence'
import { isOverdue } from './dates'

export function findOverdueMoves(moves: Move[], today: string): Move[] {
  return moves.filter((m) => !m.completed && isOverdue(m.deadline, today))
}