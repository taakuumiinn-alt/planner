import { supabase } from '../lib/supabase'
import type { Category, EventRow } from '../lib/types'
import { fmtFull } from '../lib/date'
import { eventColor, timeLabel } from '../lib/calendar'
import { useState } from 'react'

export default function EventDetail({
  event,
  cats,
  onClose,
  onEdit,
  onDeleted,
}: {
  event: EventRow
  cats: Category[]
  onClose: () => void
  onEdit: () => void
  onDeleted: () => void
}) {
  const [error, setError] = useState('')
  const cat = cats.find((c) => c.id === event.category_id)

  const remove = async () => {
    if (!window.confirm('この予定を削除しますか?(ゴミ箱機能は後で追加します。今は非表示になります)')) return
    const { error } = await supabase
      .from('events')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', event.id)
    if (error) return setError(error.message)
    onDeleted()
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet form" onClick={(e) => e.stopPropagation()}>
        <div className="dtitle" style={{ borderLeft: `5px solid ${eventColor(event, cats)}` }}>
          {event.title}
        </div>
        <p className="dline">
          {fmtFull(event.event_date)} {timeLabel(event)}
        </p>
        {cat && <p className="dline">カテゴリー:{cat.name}</p>}
        {event.notify_enabled && event.notify_at && (
          <p className="dline">通知:{new Date(event.notify_at).toLocaleString('ja-JP')}</p>
        )}
        {event.detail && <p className="ddetail">{event.detail}</p>}
        {error && <p className="err">{error}</p>}
        <button className="primary" onClick={onEdit}>
          編集
        </button>
        <button className="danger" onClick={remove}>
          削除
        </button>
        <button className="cancel" onClick={onClose}>
          閉じる
        </button>
      </div>
    </div>
  )
}