import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Todo, TodoList } from '../lib/types'

export default function TodoEditor({
  todo,
  onClose,
  onSaved,
}: {
  todo: Todo | null
  onClose: () => void
  onSaved: () => void
}) {
  const [lists, setLists] = useState<TodoList[]>([])
  const [title, setTitle] = useState(todo?.title ?? '')
  const [detail, setDetail] = useState(todo?.detail ?? '')
  const [listId, setListId] = useState(todo?.list_id ?? '')
  const [dateOnly, setDateOnly] = useState(todo?.date_only ?? false)
  const [start, setStart] = useState(todo?.start_date ?? '')
  const [due, setDue] = useState(todo?.due_date ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase
      .from('todo_lists')
      .select('id,name,color,icon,sort_order,show_on_lock,done_list_name')
      .is('deleted_at', null)
      .order('sort_order')
      .then(({ data }) => setLists((data ?? []) as TodoList[]))
  }, [])

  const save = async () => {
    if (!title.trim()) return setError('タスク名を入力してください')
    if (dateOnly && !due) return setError('日付限定ToDoは日付を設定してください')
    if (!dateOnly && start && due && start > due) return setError('開始日が期限日より後になっています')
    setBusy(true)
    const row = {
      title: title.trim(),
      detail,
      list_id: listId || null,
      date_only: dateOnly,
      start_date: dateOnly ? null : start || null,
      due_date: due || null,
    }
    const { error } = todo
      ? await supabase.from('todos').update(row).eq('id', todo.id)
      : await supabase.from('todos').insert({ ...row, sort_order: Date.now() })
    setBusy(false)
    if (error) return setError(error.message)
    onSaved()
  }

  const remove = async () => {
    if (!todo) return
    if (!window.confirm('このToDoを削除しますか?(ゴミ箱機能は後で追加します。今は非表示になります)')) return
    const { error } = await supabase
      .from('todos')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', todo.id)
    if (error) return setError(error.message)
    onSaved()
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet form" onClick={(e) => e.stopPropagation()}>
        <h3>{todo ? 'ToDoを編集' : 'ToDoを追加'}</h3>
        <input placeholder="タスク名" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea
          placeholder="詳細説明(任意)"
          rows={3}
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
        />
        <label>
          リスト
          <select value={listId} onChange={(e) => setListId(e.target.value)}>
            <option value="">リストなし</option>
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.icon} {l.name}
              </option>
            ))}
          </select>
        </label>
        <label className="check">
          <input type="checkbox" checked={dateOnly} onChange={(e) => setDateOnly(e.target.checked)} />
          特定の日だけにやること(日付限定)
        </label>
        {!dateOnly && (
          <label>
            開始日(任意)
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
        )}
        <label>
          {dateOnly ? '日付' : '期限日(任意)'}
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </label>
        {error && <p className="err">{error}</p>}
        <button className="primary" onClick={save} disabled={busy}>
          保存
        </button>
        {todo && (
          <button className="danger" onClick={remove}>
            削除
          </button>
        )}
        <button className="cancel" onClick={onClose}>
          キャンセル
        </button>
      </div>
    </div>
  )
}