import { useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { supabase } from '../lib/supabase'
import { CAT_COLS, EVENT_COLS, LIST_COLS, TODO_COLS } from '../lib/types'
import type { Category, EventRow, Todo, TodoList } from '../lib/types'
import { WEEKDAYS, fmtFull, toDateStr, todayStr } from '../lib/date'
import { cmpEvent, eventColor, timeLabel, todoColor } from '../lib/calendar'
import type { EventOcc } from '../lib/calendar'
import { occurrencesBetween, parseRule } from '../lib/repeat'
import { loadHolidays } from '../lib/holidays'
import { useSettings } from '../lib/settings'
import DaySheet from '../components/DaySheet'
import EventDetail from '../components/EventDetail'
import EventEditor from '../components/EventEditor'
import EventMenu from '../components/EventMenu'

type View = 'month' | 'week' | 'day'

function EventChip({
  occ,
  color,
  onMenu,
}: {
  occ: EventOcc
  color: string
  onMenu: (o: EventOcc) => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `ev:${occ.id}:${occ.occ_date}`,
    data: { occ },
  })
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className="item ev"
      style={{ background: color + '33', borderLeft: `3px solid ${color}`, opacity: isDragging ? 0.35 : 1 }}
      onContextMenu={(e) => {
        e.preventDefault()
        onMenu(occ)
      }}
    >
      {occ.title}
    </div>
  )
}

function DayCell({
  ds,
  className,
  onClick,
  children,
}: {
  ds: string
  className: string
  onClick: () => void
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `day:${ds}` })
  return (
    <div ref={setNodeRef} className={className + (isOver ? ' over' : '')} onClick={onClick}>
      {children}
    </div>
  )
}

export default function CalendarScreen({
  selectedDate,
  onSelectDate,
  reloadKey,
}: {
  selectedDate: string | null
  onSelectDate: (d: string) => void
  reloadKey: number
}) {
  const { settings } = useSettings()
  const [view, setView] = useState<View>('month')
  const [cursor, setCursor] = useState(() => new Date())
  const [cats, setCats] = useState<Category[]>([])
  const [lists, setLists] = useState<TodoList[]>([])
  const [events, setEvents] = useState<EventRow[]>([])
  const [todos, setTodos] = useState<Todo[]>([])
  const [holidays, setHolidays] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [tick, setTick] = useState(0)
  const [sheetDate, setSheetDate] = useState<string | null>(null)
  const [detail, setDetail] = useState<EventOcc | null>(null)
  const [menu, setMenu] = useState<EventOcc | null>(null)
  const [editing, setEditing] = useState<EventOcc | null>(null)
  const [duplicating, setDuplicating] = useState<EventOcc | null>(null)
  const [dragging, setDragging] = useState<EventOcc | null>(null)

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

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  )

  useEffect(() => {
    loadHolidays().then(setHolidays)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [c, l, e1, e2, t] = await Promise.all([
        supabase.from('categories').select(CAT_COLS).is('deleted_at', null),
        supabase.from('todo_lists').select(LIST_COLS).is('deleted_at', null),
        supabase
          .from('events')
          .select(EVENT_COLS)
          .is('deleted_at', null)
          .is('repeat_rule', null)
          .gte('event_date', startStr)
          .lte('event_date', endStr),
        supabase
          .from('events')
          .select(EVENT_COLS)
          .is('deleted_at', null)
          .not('repeat_rule', 'is', null)
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
      const err = c.error ?? l.error ?? e1.error ?? e2.error ?? t.error
      if (err) {
        setError(err.message)
        return
      }
      setError('')
      setCats((c.data ?? []) as Category[])
      setLists((l.data ?? []) as TodoList[])
      setEvents([...((e1.data ?? []) as EventRow[]), ...((e2.data ?? []) as EventRow[])])
      setTodos(
        ((t.data ?? []) as Todo[]).filter((x) => (x.start_date ?? (x.due_date as string)) <= endStr),
      )
    })()
    return () => {
      cancelled = true
    }
  }, [startStr, endStr, reloadKey, tick])

  const byDate = useMemo(() => {
    const map = new Map<string, EventOcc[]>()
    for (const e of events) {
      for (const d of occurrencesBetween(e.event_date, parseRule(e.repeat_rule), startStr, endStr)) {
        const list = map.get(d) ?? []
        list.push({ ...e, occ_date: d })
        map.set(d, list)
      }
    }
    for (const list of map.values()) list.sort(cmpEvent)
    return map
  }, [events, startStr, endStr])

  const eventsOn = (ds: string) => byDate.get(ds) ?? []
  const todosOn = (ds: string) =>
    todos.filter((t) => (t.start_date ?? (t.due_date as string)) <= ds && ds <= (t.due_date as string))

  const dayColor = (d: Date, ds: string) =>
    holidays[ds] ? settings.holidayColor : settings.weekdayColors[d.getDay()]

  const refresh = () => setTick((k) => k + 1)
  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2800)
  }

  const move = (dir: number) => {
    if (view === 'month') setCursor(new Date(y, m + dir, 1))
    else if (view === 'week') setCursor(new Date(y, m, cursor.getDate() + 7 * dir))
    else setCursor(new Date(y, m, cursor.getDate() + dir))
  }

  const weekStart = new Date(y, m, cursor.getDate() - cursor.getDay())
  const weekDays = Array.from(
    { length: 7 },
    (_, i) => new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i),
  )
  const title =
    view === 'month'
      ? `${y}年${m + 1}月`
      : view === 'week'
        ? `${weekDays[0].getMonth() + 1}/${weekDays[0].getDate()} – ${weekDays[6].getMonth() + 1}/${weekDays[6].getDate()}`
        : `${y}年${m + 1}月${cursor.getDate()}日(${WEEKDAYS[cursor.getDay()]})`

  const onDayClick = (d: Date) => {
    const ds = toDateStr(d)
    onSelectDate(ds)
    if (eventsOn(ds).length > 0 || todosOn(ds).length > 0) setSheetDate(ds)
  }

  const onDragStart = (e: DragStartEvent) => setDragging((e.active.data.current?.occ as EventOcc) ?? null)

  const onDragEnd = async (e: DragEndEvent) => {
    const occ = e.active.data.current?.occ as EventOcc | undefined
    setDragging(null)
    if (!occ) return
    // 動かさずに離した → メニューを表示
    if (Math.hypot(e.delta.x, e.delta.y) < 10) {
      setMenu(occ)
      return
    }
    const overId = e.over ? String(e.over.id) : ''
    if (!overId.startsWith('day:')) return
    const target = overId.slice(4)
    if (target === occ.occ_date) return
    if (occ.repeat_rule) {
      showToast('繰り返し予定は、編集画面から日付を変更してください')
      return
    }
    setEvents((prev) => prev.map((x) => (x.id === occ.id ? { ...x, event_date: target } : x)))
    const { error } = await supabase.from('events').update({ event_date: target }).eq('id', occ.id)
    if (error) {
      setError(error.message)
      refresh()
    }
  }

  const deleteEvent = async (occ: EventOcc) => {
    const msg = occ.repeat_rule
      ? 'この繰り返し予定をすべて削除しますか?(今は非表示になります)'
      : 'この予定を削除しますか?(ゴミ箱機能は後で追加します。今は非表示になります)'
    if (!window.confirm(msg)) return
    const { error } = await supabase
      .from('events')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', occ.id)
    if (error) setError(error.message)
    refresh()
  }

  const dayBlock = (d: Date) => {
    const ds = toDateStr(d)
    return (
      <section key={ds} className={ds === today ? 'wday today' : 'wday'}>
        <div className="whead" style={{ color: dayColor(d, ds) }} onClick={() => onSelectDate(ds)}>
          {fmtFull(ds)}
          {holidays[ds] && <span className="holname"> {holidays[ds]}</span>}
        </div>
        {eventsOn(ds).map((o) => (
          <div
            key={`${o.id}:${o.occ_date}`}
            className="drow"
            style={{ borderLeft: `4px solid ${eventColor(o, cats)}` }}
            onClick={() => setDetail(o)}
            onContextMenu={(ev) => {
              ev.preventDefault()
              setMenu(o)
            }}
          >
            <div className="dtime">{timeLabel(o)}</div>
            <div className="dname">{o.title}</div>
          </div>
        ))}
        {todosOn(ds).map((t) => (
          <div key={t.id} className="drow todo" style={{ borderLeft: `4px dashed ${todoColor(t, lists)}` }}>
            <div className="dtime">ToDo(表示のみ)</div>
            <div className="dname">{t.title}</div>
          </div>
        ))}
      </section>
    )
  }

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
        <button onClick={() => move(-1)} aria-label="前へ">‹</button>
        <strong>{title}</strong>
        <button onClick={() => move(1)} aria-label="次へ">›</button>
        <button className="todaybtn" onClick={() => setCursor(new Date())}>
          今日
        </button>
      </div>

      {view === 'month' && (
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragCancel={() => setDragging(null)}
        >
          <div className="grid">
            {WEEKDAYS.map((w, i) => (
              <div key={w} className="dow" style={{ color: settings.weekdayColors[i] }}>
                {w}
              </div>
            ))}
            {cells.map((d) => {
              const ds = toDateStr(d)
              const classes = [
                'cell',
                d.getMonth() !== m ? 'out' : '',
                ds === today ? 'today' : '',
                ds === selectedDate ? 'sel' : '',
              ]
                .filter(Boolean)
                .join(' ')
              return (
                <DayCell key={ds} ds={ds} className={classes} onClick={() => onDayClick(d)}>
                  <span className="num" style={{ color: dayColor(d, ds) }}>
                    {d.getDate()}
                  </span>
                  {holidays[ds] && (
                    <div className="hol" style={{ color: settings.holidayColor }}>
                      {holidays[ds]}
                    </div>
                  )}
                  {eventsOn(ds).map((o) => (
                    <EventChip key={`${o.id}:${o.occ_date}`} occ={o} color={eventColor(o, cats)} onMenu={setMenu} />
                  ))}
                  {todosOn(ds).map((t) => {
                    const c = todoColor(t, lists)
                    return (
                      <div key={t.id} className="item td" style={{ color: c, borderLeft: `3px dashed ${c}` }}>
                        {t.title}
                      </div>
                    )
                  })}
                </DayCell>
              )
            })}
          </div>
          <DragOverlay>
            {dragging && (
              <div
                className="item ev dragov"
                style={{
                  background: eventColor(dragging, cats) + '55',
                  borderLeft: `3px solid ${eventColor(dragging, cats)}`,
                }}
              >
                {dragging.title}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {view === 'week' && <div className="wlist">{weekDays.map((d) => dayBlock(d))}</div>}
      {view === 'day' && <div className="wlist">{dayBlock(cursor)}</div>}

      {sheetDate && (
        <DaySheet
          date={sheetDate}
          holiday={holidays[sheetDate]}
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

      {menu && (
        <EventMenu
          event={menu}
          onClose={() => setMenu(null)}
          onEdit={() => {
            setEditing(menu)
            setMenu(null)
          }}
          onDuplicate={() => {
            setDuplicating(menu)
            setMenu(null)
          }}
          onDelete={() => {
            const o = menu
            setMenu(null)
            deleteEvent(o)
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
          onDuplicate={() => {
            setDuplicating(detail)
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

      {duplicating && (
        <EventEditor
          event={null}
          template={{ ...duplicating, event_date: duplicating.occ_date }}
          defaultDate={duplicating.occ_date}
          onClose={() => setDuplicating(null)}
          onSaved={() => {
            setDuplicating(null)
            refresh()
          }}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}