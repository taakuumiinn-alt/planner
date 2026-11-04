import type { Category, EventRow, Todo, TodoList } from '../lib/types'
import { fmtFull } from '../lib/date'
import { eventColor, timeLabel, todoColor } from '../lib/calendar'

export default function DaySheet({
  date,
  events,
  todos,
  cats,
  lists,
  onOpenEvent,
  onClose,
}: {
  date: string
  events: EventRow[]
  todos: Todo[]
  cats: Category[]
  lists: TodoList[]
  onOpenEvent: (e: EventRow) => void
  onClose: () => void
}) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet daysheet slideup" onClick={(e) => e.stopPropagation()}>
        <h3>{fmtFull(date)}</h3>
        {events.map((e) => (
          <div
            key={e.id}
            className="drow"
            style={{ borderLeft: `4px solid ${eventColor(e, cats)}` }}
            onClick={() => onOpenEvent(e)}
          >
            <div className="dtime">{timeLabel(e)}</div>
            <div className="dname">{e.title}</div>
          </div>
        ))}
        {todos.map((t) => (
          <div key={t.id} className="drow todo" style={{ borderLeft: `4px dashed ${todoColor(t, lists)}` }}>
            <div className="dtime">ToDo(表示のみ)</div>
            <div className="dname">{t.title}</div>
          </div>
        ))}
        <button className="cancel" onClick={onClose}>
          閉じる
        </button>
      </div>
    </div>
  )
}