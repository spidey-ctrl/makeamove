export function isOverdue(deadline: string, today: string): boolean {
  return deadline < today
}

export function todayString(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate(),
  ).padStart(2, '0')}`
}

export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number)
  const result = new Date(Date.UTC(year, month - 1, day + days))
  return result.toISOString().slice(0, 10)
}

export function daysUntil(deadline: string, today: string): number {
  const [dy, dm, dd] = deadline.split('-').map(Number)
  const [ty, tm, td] = today.split('-').map(Number)
  const diff = Date.UTC(dy, dm - 1, dd) - Date.UTC(ty, tm - 1, td)
  return Math.round(diff / 86_400_000)
}