import type { EventOcc } from '../lib/calendar'

export default function EventMenu({
  event,
  onEdit,
  onDuplicate,
  onDelete,
  onClose,
}: {
  event: EventOcc
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
  onClose: () => void
}) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet slideup" onClick={(e) => e.stopPropagation()}>
        <div className="menutitle">{event.title}</div>
        <button onClick={onEdit}>編集</button>
        <button onClick={onDuplicate}>複製</button>
        <button className="danger" onClick={onDelete}>
          削除
        </button>
        <button className="cancel" onClick={onClose}>
          キャンセル
        </button>
      </div>
    </div>
  )
}