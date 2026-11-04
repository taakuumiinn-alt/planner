import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { CAT_COLS, EVENT_COLS, LIST_COLS, TODO_COLS } from '../lib/types'
import type { Category, EventRow, Todo, TodoList } from '../lib/types'
import { WEEKDAYS, toDateStr, todayStr } from '../lib/date'
import { cmpEvent, eventColor, todoColor } from '../lib/calendar'
import DaySheet from '../components/DaySheet'
import EventDetail from '../components/EventDetail'
import EventEditor from '../components/EventEditor'

type View = 'month' | 'week' | 'day'

export default function CalendarScreen({
  selectedDate,
  onSelectDate,
  reloadKey,
}: {
  selectedDate: string | null
  onSelectDate: (d: string) => void
  reloadKey: number
}) {
  const [view, setView] = useState<View>('month')
  const [cursor, setCursor] = useState(() => new Date())
  const [cats, setCats] = useState<Category[]>([])
  const [lists, setLists] = useState<TodoList[]>([])
  const [events, setEvents] = useState<EventRow[]>([])
  const [todos, setTodos] = useState<Todo[]>([])
  const [error, setError] = useState('')
  const [tick, setTick] = useState(0)
  const [sheetDate, setSheetDate] = useState<string | null>(null)
  const [detail, setDetail] = useState<EventRow | null>(null)
  const [editing, setEditing] = useState<EventRow | null>(null)

  const y = cursor.getFullYear()
  const m = cursor.getMonth()
  const offset = new Date(y, m, 1).getDay() // 日曜始まり
  const cells = useMemo(
    () => Array.from({ length: 42 }, (_, i) => new Date(y, m, 1 - offset + i)),
    [y, m, offset],
  )
  const startStr = toDateStr(cells[0])
  const endStr = toDateStr(cells[41])
  const today = todayStr()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [c, l, e, t] = await Promise.all([
        supabase.from('categories').select(CAT_COLS).is('deleted_at', null),
        supabase.from('todo_lists').select(LIST_COLS).is('deleted_at', null),
        supabase
          .from('events')
          .select(EVENT_COLS)
          .is('deleted_at', null)
          .gte('event_date', startStr)
          .lte('event_date', endStr),
        supabase
          .from('todos')
          .select(TODO_COLS)
          .is('deleted_at', null)
          .is('completed_at', null)
          .not('due_date', 'is', null)
          .gte('due_date', startStr),
      ])
      if (cancelled) return
      const err = c.error ?? l.error ?? e.error ?? t.error
      if (err) {
        setError(err.message)
        return
      }
      setError('')
      setCats((c.data ?? []) as Category[])
      setLists((l.data ?? []) as TodoList[])
      setEvents((e.data ?? []) as EventRow[])
      setTodos(
        ((t.data ?? []) as Todo[]).filter(
          (x) => (x.start_date ?? (x.due_date as string)) <= endStr,
        ),
      )
    })()
    return () => {
      cancelled = true
    }
  }, [startStr, endStr, reloadKey, tick])

  const eventsOn = (ds: string) => events.filter((e) => e.event_date === ds).sort(cmpEvent)
  const todosOn = (ds: string) =>
    todos.filter((t) => (t.start_date ?? (t.due_date as string)) <= ds && ds <= (t.due_date as string))

  const moveMonth = (d: number) => setCursor(new Date(y, m + d, 1))

  const onDayClick = (d: Date) => {
    const ds = toDateStr(d)
    onSelectDate(ds)
    if (eventsOn(ds).length > 0 || todosOn(ds).length > 0) setSheetDate(ds)
  }

  const refresh = () => setTick((k) => k + 1)

  return (
    <div className="cal">
      {error && <p className="err">エラー:{error}</p>}
      <div className="seg">
        {(['month', 'week', 'day'] as View[]).map((v) => (
          <button key={v} className={view === v ? 'on' : ''} onClick={() => setView(v)}>
            {v === 'month' ? '月' : v === 'week' ? '週' : '日'}
          </button>
        ))}
      </div>

      <div className="calhead">
        <button onClick={() => moveMonth(-1)} aria-label="前月">‹</button>
        <strong>
          {y}年{m + 1}月
        </strong>
        <button onClick={() => moveMonth(1)} aria-label="翌月">›</button>
        <button className="todaybtn" onClick={() => setCursor(new Date())}>
          今日
        </button>
      </div>

      {view !== 'month' ? (
        <p className="placeholder">週間・1日表示は次のステップで実装します</p>
      ) : (
        <div className="grid">
          {WEEKDAYS.map((w, i) => (
            <div key={w} className={`dow ${i === 0 ? 'sun' : i === 6 ? 'sat' : ''}`}>
              {w}
            </div>
          ))}
          {cells.map((d) => {
            const ds = toDateStr(d)
            const dow = d.getDay()
            const classes = [
              'cell',
              d.getMonth() !== m ? 'out' : '',
              dow === 0 ? 'sun' : dow === 6 ? 'sat' : '',
              ds === today ? 'today' : '',
              ds === selectedDate ? 'sel' : '',
            ]
              .filter(Boolean)
              .join(' ')
            return (
              <div key={ds} className={classes} onClick={() => onDayClick(d)}>
                <span className="num">{d.getDate()}</span>
                {eventsOn(ds).map((e) => {
                  const c = eventColor(e, cats)
                  return (
                    <div key={e.id} className="item ev" style={{ background: c + '33', borderLeft: `3px solid ${c}` }}>
                      {e.title}
                    </div>
                  )
                })}
                {todosOn(ds).map((t) => {
                  const c = todoColor(t, lists)
                  return (
                    <div key={t.id} className="item td" style={{ color: c, borderLeft: `3px dashed ${c}` }}>
                      {t.title}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}

      {sheetDate && (
        <DaySheet
          date={sheetDate}
          events={eventsOn(sheetDate)}
          todos={todosOn(sheetDate)}
          cats={cats}
          lists={lists}
          onClose={() => setSheetDate(null)}
          onOpenEvent={(e) => {
            setSheetDate(null)
            setDetail(e)
          }}
        />
      )}

      {detail && (
        <EventDetail
          event={detail}
          cats={cats}
          onClose={() => setDetail(null)}
          onEdit={() => {
            setEditing(detail)
            setDetail(null)
          }}
          onDeleted={() => {
            setDetail(null)
            refresh()
          }}
        />
      )}

      {editing && (
        <EventEditor
          event={editing}
          defaultDate={editing.event_date}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            refresh()
          }}
        />
      )}
    </div>
  )
}