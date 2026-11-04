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
}