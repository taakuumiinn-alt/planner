import { useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Category } from '../lib/types'
import { fmtFull } from '../lib/date'
import { eventColor, timeLabel } from '../lib/calendar'
import type { EventOcc } from '../lib/calendar'
import { describeRule } from '../lib/repeat'

export default function EventDetail({
  event,
  cats,
  onClose,
  onEdit,
  onDuplicate,
  onDeleted,
}: {
  event: EventOcc
  cats: Category[]
  onClose: () => void
  onEdit: () => void
  onDuplicate: () => void
  onDeleted: () => void
}) {
  const [error, setError] = useState('')
  const cat = cats.find((c) => c.id === event.category_id)

  const remove = async () => {
    const msg = event.repeat_rule
      ? 'この繰り返し予定をすべて削除しますか?(今は非表示になります)'
      : 'この予定を削除しますか?(ゴミ箱機能は後で追加します。今は非表示になります)'
    if (!window.confirm(msg)) return
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
          {fmtFull(event.occ_date)} {timeLabel(event)}
        </p>
        {event.repeat_rule && <p className="dline">繰り返し:{describeRule(event.repeat_rule)}</p>}
        {cat && <p className="dline">カテゴリー:{cat.name}</p>}
        {event.notify_enabled && event.notify_at && (
          <p className="dline">通知:{new Date(event.notify_at).toLocaleString('ja-JP')}</p>
        )}
        {event.detail && <p className="ddetail">{event.detail}</p>}
        {error && <p className="err">{error}</p>}
        <button className="primary" onClick={onEdit}>
          編集
        </button>
        <button onClick={onDuplicate}>複製</button>
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