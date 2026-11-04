export default function AddMenu({
  onPick,
  onClose,
}: {
  onPick: (label: string) => void
  onClose: () => void
}) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => onPick('ToDoを追加')}>ToDoを追加</button>
        <button onClick={() => onPick('予定を追加')}>予定を追加</button>
        <button onClick={() => onPick('メモを追加')}>メモを追加</button>
        <button className="cancel" onClick={onClose}>
          キャンセル
        </button>
      </div>
    </div>
  )
}