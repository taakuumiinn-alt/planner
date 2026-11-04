import type { Category, EventRow, Todo, TodoList } from './types'
import { hhmm } from './date'

export const DEFAULT_COLOR = '#8b5cf6'

export const eventColor = (e: EventRow, cats: Category[]) =>
  e.color ?? cats.find((c) => c.id === e.category_id)?.color ?? DEFAULT_COLOR

export const todoColor = (t: Todo, lists: TodoList[]) =>
  lists.find((l) => l.id === t.list_id)?.color ?? DEFAULT_COLOR

const isTimed = (e: EventRow) => !e.all_day && !!e.start_time

// 時間あり→開始時刻順、時間なし(終日含む)→その下
export const cmpEvent = (a: EventRow, b: EventRow) => {
  const ta = isTimed(a)
  const tb = isTimed(b)
  if (ta && tb) return (a.start_time as string).localeCompare(b.start_time as string)
  if (ta) return -1
  if (tb) return 1
  return a.sort_order - b.sort_order
}

export const timeLabel = (e: EventRow) => {
  if (e.all_day) return '終日'
  if (!e.start_time) return '時間なし'
  return `${hhmm(e.start_time)}${e.end_time ? ' – ' + hhmm(e.end_time) : ''}`
}