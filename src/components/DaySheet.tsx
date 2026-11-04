import type { Category, Todo, TodoList } from '../lib/types'
import { fmtFull } from '../lib/date'
import { eventColor, timeLabel, todoColor } from '../lib/calendar'
import type { EventOcc } from '../lib/calendar'

export default function DaySheet({
  date,
  holiday,
  events,
  todos,
  cats,
  lists,
  onOpenEvent,
  onClose,
}: {
  date: string
  holiday?: string
  events: EventOcc[]
  todos: Todo[]
  cats: Category[]
  lists: TodoList[]
  onOpenEvent: (e: EventOcc) => void
  onClose: () => void
}) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet daysheet slideup" onClick={(e) => e.stopPropagation()}>
        <h3>
          {fmtFull(date)}
          {holiday && <span className="holname"> {holiday}</span>}
        </h3>
        {events.map((e) => (
          <div
            key={`${e.id}:${e.occ_date}`}
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