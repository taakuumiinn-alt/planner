import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Todo, TodoList } from '../lib/types'
import { fmt, todayStr } from '../lib/date'
import TodoEditor from '../components/TodoEditor'
import ListEditor from '../components/ListEditor'

const DEFAULT_COLOR = '#8b5cf6'

export default function ListScreen({
  email,
  onSignOut,
  reloadKey,
}: {
  email: string
  onSignOut: () => void
  reloadKey: number
}) {
  const [lists, setLists] = useState<TodoList[]>([])
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editTodo, setEditTodo] = useState<Todo | null>(null)
  const [editList, setEditList] = useState<TodoList | 'new' | null>(null)

  const load = useCallback(async () => {
    const [l, t] = await Promise.all([
      supabase
        .from('todo_lists')
        .select('id,name,color,icon,sort_order,show_on_lock,done_list_name')
        .is('deleted_at', null)
        .order('sort_order'),
      supabase
        .from('todos')
        .select('id,list_id,title,detail,start_date,due_date,date_only,sort_order,completed_at,was_overdue')
        .is('deleted_at', null)
        .order('sort_order'),
    ])
    if (l.error || t.error) {
      setError((l.error ?? t.error)!.message)
    } else {
      setError('')
      setLists((l.data ?? []) as TodoList[])
      setTodos((t.data ?? []) as Todo[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load, reloadKey])

  const today = todayStr()
  const colorOf = (t: Todo) => lists.find((l) => l.id === t.list_id)?.color ?? DEFAULT_COLOR
  const byDue = (a: Todo, b: Todo) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999')

  const complete = async (t: Todo) => {
    const list = lists.find((l) => l.id === t.list_id)
    if (list && !list.done_list_name) {
      const name = window.prompt(`「${list.name}」の完了済みリストの名前を入力してください`)
      if (name && name.trim()) {
        await supabase.from('todo_lists').update({ done_list_name: name.trim() }).eq('id', list.id)
      }
    }
    const overdue = !!t.due_date && t.due_date < today
    const { error } = await supabase
      .from('todos')
      .update({ completed_at: new Date().toISOString(), was_overdue: overdue })
      .eq('id', t.id)
    if (error) setError(error.message)
    load()
  }

  const undo = async (t: Todo) => {
    const { error } = await supabase.from('todos').update({ completed_at: null }).eq('id', t.id)
    if (error) setError(error.message)
    load()
  }

  const active = todos.filter((t) => !t.completed_at)
  const done = todos.filter((t) => t.completed_at)
  const overdue = active.filter((t) => t.due_date && t.due_date < today).sort(byDue)
  const todayOnly = active.filter((t) => t.date_only && t.due_date === today)
  const rest = active.filter((t) => !overdue.includes(t) && !todayOnly.includes(t))
  const lower = rest.filter((t) => t.date_only || !t.list_id).sort(byDue)

  const row = (t: Todo, completedView = false) => (
    <div key={t.id} className="trow">
      <button
        className="circle"
        style={{ borderColor: colorOf(t), background: completedView ? colorOf(t) : 'transparent' }}
        aria-label={completedView ? '未完了に戻す' : '完了にする'}
        onClick={() => (completedView ? undo(t) : complete(t))}
      />
      <div className="tmain" onClick={() => setEditTodo(t)}>
        <div className={completedView ? 'ttitle done' : 'ttitle'}>{t.title}</div>
        {(t.due_date || t.start_date) && (
          <div className={!completedView && t.due_date && t.due_date < today ? 'tdue late' : 'tdue'}>
            {t.start_date ? `${fmt(t.start_date)} → ` : ''}
            {t.due_date ? fmt(t.due_date) : ''}
            {t.date_only ? '(日付限定)' : ''}
            {completedView && t.was_overdue ? ' 期限切れだった' : ''}
          </div>
        )}
      </div>
    </div>
  )

  const groups = [
    ...lists.map((l) => ({
      key: l.id,
      title: l.done_list_name ?? `${l.name}(完了済みの名前が未設定)`,
      items: done.filter((t) => t.list_id === l.id),
    })),
    { key: 'none', title: 'リスト未所属の完了済み', items: done.filter((t) => !t.list_id) },
  ]
    .map((g) => ({
      ...g,
      items: [...g.items].sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? '')),
    }))
    .filter((g) => g.items.length > 0)

  if (loading) return <p className="empty">読み込み中…</p>

  return (
    <div className="other">
      {error && <p className="err">エラー:{error}</p>}

      {overdue.length > 0 && (
        <section className="card late-card">
          <h3>期限切れ</h3>
          {overdue.map((t) => row(t))}
        </section>
      )}

      {todayOnly.length > 0 && (
        <section className="card today-card">
          <h3>今日やること({fmt(today)})</h3>
          {todayOnly.map((t) => row(t))}
        </section>
      )}

      {lists.map((l) => {
        const items = rest.filter((t) => t.list_id === l.id && !t.date_only)
        return (
          <section key={l.id} className="card" style={{ borderLeft: `4px solid ${l.color}` }}>
            <div className="chead">
              <h3>
                {l.icon} {l.name}
              </h3>
              <button className="mini" onClick={() => setEditList(l)}>
                編集
              </button>
            </div>
            {items.length === 0 ? <p className="empty">ToDoはありません</p> : items.map((t) => row(t))}
          </section>
        )
      })}

      {lower.length > 0 && (
        <section className="card">
          <h3>リスト未所属・日付限定</h3>
          {lower.map((t) => row(t))}
        </section>
      )}

      <button className="addlist" onClick={() => setEditList('new')}>
        + リストを作成
      </button>

      {groups.map((g) => (
        <section key={g.key} className="card muted">
          <h3>{g.title}</h3>
          {g.items.map((t) => row(t, true))}
        </section>
      ))}

      <section className="card">
        <h3>アカウント</h3>
        <p className="empty">{email}</p>
        <button className="logout" onClick={onSignOut}>
          ログアウト
        </button>
      </section>

      {editTodo && (
        <TodoEditor
          todo={editTodo}
          onClose={() => setEditTodo(null)}
          onSaved={() => {
            setEditTodo(null)
            load()
          }}
        />
      )}
      {editList && (
        <ListEditor
          list={editList === 'new' ? null : editList}
          onClose={() => setEditList(null)}
          onSaved={() => {
            setEditList(null)
            load()
          }}
        />
      )}
    </div>
  )
}