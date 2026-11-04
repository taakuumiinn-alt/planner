import { useState } from 'react'
import { supabase } from '../lib/supabase'
import type { TodoList } from '../lib/types'

const ICONS = ['📋', '📚', '🏫', '💼', '🏠', '🛒', '💪', '🎯', '✏️', '⭐', '🎵', '💡']
const COLORS = ['#8b5cf6', '#22d3ee', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#a3a3a3']

export default function ListEditor({
  list,
  onClose,
  onSaved,
}: {
  list: TodoList | null
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(list?.name ?? '')
  const [icon, setIcon] = useState(list?.icon ?? ICONS[0])
  const [color, setColor] = useState(list?.color ?? COLORS[0])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const save = async () => {
    if (!name.trim()) return setError('リスト名を入力してください')
    setBusy(true)
    const row = { name: name.trim(), icon, color }
    const { error } = list
      ? await supabase.from('todo_lists').update(row).eq('id', list.id)
      : await supabase.from('todo_lists').insert({ ...row, sort_order: Date.now() })
    setBusy(false)
    if (error) return setError(error.message)
    onSaved()
  }

  const remove = async () => {
    if (!list) return
    if (!window.confirm('このリストを削除しますか?(ゴミ箱機能は後で追加します。今は非表示になります)')) return
    const { error } = await supabase
      .from('todo_lists')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', list.id)
    if (error) return setError(error.message)
    onSaved()
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet form" onClick={(e) => e.stopPropagation()}>
        <h3>{list ? 'リストを編集' : 'リストを作成'}</h3>
        <input placeholder="リスト名" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="picker">
          {ICONS.map((i) => (
            <button key={i} className={icon === i ? 'pick on' : 'pick'} onClick={() => setIcon(i)}>
              {i}
            </button>
          ))}
        </div>
        <div className="picker">
          {COLORS.map((c) => (
            <button
              key={c}
              className={color === c ? 'swatch on' : 'swatch'}
              style={{ background: c }}
              onClick={() => setColor(c)}
              aria-label={c}
            />
          ))}
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </div>
        {error && <p className="err">{error}</p>}
        <button className="primary" onClick={save} disabled={busy}>
          保存
        </button>
        {list && (
          <button className="danger" onClick={remove}>
            削除
          </button>
        )}
        <button className="cancel" onClick={onClose}>
          キャンセル
        </button>
      </div>
    </div>
  )
}