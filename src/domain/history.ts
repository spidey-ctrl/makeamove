import type { Move } from './persistence'
import { addDays } from './dates'

export type HistoryGroup = {
  label: 'today' | 'yesterday' | 'earlier'
  moves: Move[]
}

export function groupHistory(moves: Move[], today: string): HistoryGroup[] {
  const dated = moves
    .filter((m): m is Move & { completedAt: string } => m.completedAt !== null)
    .sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1))

  const yesterday = addDays(today, -1)

  const byLabel: Record<HistoryGroup['label'], Move[]> = {
    today: [],
    yesterday: [],
    earlier: [],
  }

  for (const move of dated) {
    if (move.completedAt === today) {
      byLabel.today.push(move)
    } else if (move.completedAt === yesterday) {
      byLabel.yesterday.push(move)
    } else {
      byLabel.earlier.push(move)
    }
  }

  return (['today', 'yesterday', 'earlier'] as const)
    .map((label) => ({ label, moves: byLabel[label] }))
    .filter((group) => group.moves.length > 0)
}