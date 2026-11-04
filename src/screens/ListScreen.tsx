
import ColorSettings from '../components/ColorSettings'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { LIST_COLS, TODO_COLS } from '../lib/types'
import type { Todo, TodoList } from '../lib/types'
import { fmt, todayStr } from '../lib/date'
import { diffDays, nextDue, parseRule, shiftDate, shiftIso } from '../lib/repeat'
import TodoEditor from '../components/TodoEditor'
import ListEditor from '../components/ListEditor'
import SortableList from '../components/SortableList'
import type { HandleProps } from '../components/SortableList'

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
      supabase.from('todo_lists').select(LIST_COLS).is('deleted_at', null).order('sort_order'),
      supabase.from('todos').select(TODO_COLS).is('deleted_at', null).order('sort_order'),
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

  const colorOf = (t: Todo) =>
    lists.find((l) => l.id === t.list_id)?.color ?? DEFAULT_COLOR

  const byDue = (a: Todo, b: Todo) =>
    (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999')

  const reorderTodo = async (id: string, order: number) => {
    setTodos((prev) =>
      prev
        .map((t) => (t.id === id ? { ...t, sort_order: order } : t))
        .sort((a, b) => a.sort_order - b.sort_order),
    )

    const { error } = await supabase
      .from('todos')
      .update({ sort_order: order })
      .eq('id', id)

    if (error) {
      setError(error.message)
      load()
    }
  }

  const reorderList = async (id: string, order: number) => {
    setLists((prev) =>
      prev
        .map((l) => (l.id === id ? { ...l, sort_order: order } : l))
        .sort((a, b) => a.sort_order - b.sort_order),
    )

    const { error } = await supabase
      .from('todo_lists')
      .update({ sort_order: order })
      .eq('id', id)

    if (error) {
      setError(error.message)
      load()
    }
  }

  const createNext = async (t: Todo) => {
    const rule = parseRule(t.repeat_rule)
    if (!rule || !t.due_date) return

    const next = nextDue(rule, t.due_date, today)
    if (!next) return

    const diff = diffDays(t.due_date, next)

    const { error } = await supabase.from('todos').insert({
      list_id: t.list_id,
      title: t.title,
      detail: t.detail,
      date_only: t.date_only,
      due_date: next,
      start_date: t.start_date ? shiftDate(t.start_date, diff) : null,
      sort_order: t.sort_order,
      repeat_rule: t.repeat_rule,
      notify_enabled: t.notify_enabled,
      notify_at: t.notify_at ? shiftIso(t.notify_at, diff) : null,
      remind_days_before: t.remind_days_before,
    })

    if (error) setError(error.message)
  }

  const complete = async (t: Todo) => {
    const list = lists.find((l) => l.id === t.list_id)

    if (list && !list.done_list_name) {
      const name = window.prompt(
        `「${list.name}」の完了済みリストの名前を入力してください`,
      )

      if (name && name.trim()) {
        await supabase
          .from('todo_lists')
          .update({ done_list_name: name.trim() })
          .eq('id', list.id)
      }
    }

    const overdue = !!t.due_date && t.due_date < today

    const { error } = await supabase
      .from('todos')
      .update({
        completed_at: new Date().toISOString(),
        was_overdue: overdue,
      })
      .eq('id', t.id)

    if (error) {
      setError(error.message)
      return
    }

    if (t.repeat_rule) await createNext(t)

    load()
  }

  const undo = async (t: Todo) => {
    const { error } = await supabase
      .from('todos')
      .update({ completed_at: null })
      .eq('id', t.id)

    if (error) {
      setError(error.message)
      return
    }

    // 繰り返しToDoは、完了時に作られた次回分を取り消す
    const rule = parseRule(t.repeat_rule)

    if (rule && t.due_date) {
      const next = nextDue(rule, t.due_date, today)

      const dup = todos.find(
        (x) =>
          !x.completed_at &&
          x.id !== t.id &&
          x.title === t.title &&
          x.list_id === t.list_id &&
          x.repeat_rule === t.repeat_rule &&
          x.due_date === next,
      )

      if (dup) {
        await supabase
          .from('todos')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', dup.id)
      }
    }

    load()
  }

  const active = todos.filter((t) => !t.completed_at)
  const done = todos.filter((t) => t.completed_at)

  const overdue = active
    .filter((t) => t.due_date && t.due_date < today)
    .sort(byDue)

  const todayOnly = active.filter(
    (t) => t.date_only && t.due_date === today,
  )

  const rest = active.filter(
    (t) => !overdue.includes(t) && !todayOnly.includes(t),
  )

  const lower = rest
    .filter((t) => t.date_only || !t.list_id)
    .sort(byDue)

  const row = (
    t: Todo,
    completedView = false,
    handle?: HandleProps,
  ) => (
    <div key={t.id} className="trow" {...handle}>
      <button
        className="circle"
        style={{
          borderColor: colorOf(t),
          background: completedView ? colorOf(t) : 'transparent',
        }}
        aria-label={completedView ? '未完了に戻す' : '完了にする'}
        onClick={() =>
          completedView ? undo(t) : complete(t)
        }
      />

      <div className="tmain" onClick={() => setEditTodo(t)}>
        <div className={completedView ? 'ttitle done' : 'ttitle'}>
          {t.title}
        </div>

        {(t.due_date || t.start_date) && (
          <div
            className={
              !completedView && t.due_date && t.due_date < today
                ? 'tdue late'
                : 'tdue'
            }
          >
            {t.start_date ? `${fmt(t.start_date)} → ` : ''}
            {t.due_date ? fmt(t.due_date) : ''}
            {t.date_only ? '(日付限定)' : ''}
            {t.repeat_rule ? ' 🔁' : ''}
            {t.notify_enabled ? ' 🔔' : ''}
            {completedView && t.was_overdue ? ' 期限切れだった' : ''}
          </div>
        )}
      </div>
    </div>
  )

  const groups = [
    ...lists.map((l) => ({
      key: l.id,
      title:
        l.done_list_name ??
        `${l.name}(完了済みの名前が未設定)`,
      items: done.filter((t) => t.list_id === l.id),
    })),
    {
      key: 'none',
      title: 'リスト未所属の完了済み',
      items: done.filter((t) => !t.list_id),
    },
  ]
    .map((g) => ({
      ...g,
      items: [...g.items].sort((a, b) =>
        (b.completed_at ?? '').localeCompare(a.completed_at ?? ''),
      ),
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

      <SortableList
        items={lists}
        onReorder={reorderList}
        render={(l, handle) => {
          const items = rest.filter(
            (t) => t.list_id === l.id && !t.date_only,
          )

          return (
            <section
              className="card"
              style={{ borderLeft: `4px solid ${l.color}` }}
            >
              <div className="chead" {...handle}>
                <h3>
                  {l.icon} {l.name}
                </h3>

                <button
                  className="mini"
                  onClick={() => setEditList(l)}
                >
                  編集
                </button>
              </div>

              {items.length === 0 ? (
                <p className="empty">ToDoはありません</p>
              ) : (
                <SortableList
                  items={items}
                  onReorder={reorderTodo}
                  render={(t, h) => row(t, false, h)}
                />
              )}
            </section>
          )
        }}
      />

      {lower.length > 0 && (
        <>
          <ColorSettings />

          <section className="card">
            <h3>リスト未所属・日付限定</h3>
            {lower.map((t) => row(t))}
          </section>
        </>
      )}

      <button
        className="addlist"
        onClick={() => setEditList('new')}
      >
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
