export const LIST_COLS = 'id,name,color,icon,sort_order,show_on_lock,done_list_name'
export const TODO_COLS =
  'id,list_id,title,detail,start_date,due_date,date_only,sort_order,completed_at,was_overdue,repeat_rule,notify_enabled,notify_at,remind_days_before'

export type TodoList = {
  id: string
  name: string
  color: string
  icon: string
  sort_order: number
  show_on_lock: boolean
  done_list_name: string | null
}

export type Todo = {
  id: string
  list_id: string | null
  title: string
  detail: string
  start_date: string | null
  due_date: string | null
  date_only: boolean
  sort_order: number
  completed_at: string | null
  was_overdue: boolean
  repeat_rule: string | null
  notify_enabled: boolean
  notify_at: string | null
  remind_days_before: number | null
}