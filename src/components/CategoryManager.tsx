import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { CAT_COLS } from '../lib/types'
import type { Category } from '../lib/types'

const COLORS = ['#8b5cf6', '#22d3ee', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#a3a3a3']

export default function CategoryManager({
  onClose,
  onChanged,
}: {
  onClose: () => void
  onChanged: () => void
}) {
  const [cats, setCats] = useState<Category[]>([])
  const [editing, setEditing] = useState<Category | null>(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLORS[1])
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('categories')
      .select(CAT_COLS)
      .is('deleted_at', null)
      .order('sort_order')
    if (error) setError(error.message)
    else setCats((data ?? []) as Category[])
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const reset = () => {
    setEditing(null)
    setName('')
    setColor(COLORS[1])
  }

  const startEdit = (c: Category) => {
    setEditing(c)
    setName(c.name)
    setColor(c.color)
  }

  const save = async () => {
    if (!name.trim()) return setError('カテゴリー名を入力してください')
    const row = { name: name.trim(), color }
    const { error } = editing
      ? await supabase.from('categories').update(row).eq('id', editing.id)
      : await supabase.from('categories').insert({ ...row, sort_order: Date.now() })
    if (error) return setError(error.message)
    setError('')
    reset()
    await load()
    onChanged()
  }

  const remove = async (c: Category) => {
    if (!window.confirm(`カテゴリー「${c.name}」を削除しますか?`)) return
    const { error } = await supabase
      .from('categories')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', c.id)
    if (error) return setError(error.message)
    if (editing?.id === c.id) reset()
    await load()
    onChanged()
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet form" onClick={(e) => e.stopPropagation()}>
        <h3>カテゴリー</h3>
        {cats.length === 0 && <p className="empty">まだありません</p>}
        {cats.map((c) => (
          <div key={c.id} className="catrow">
            <span className="dot" style={{ background: c.color }} />
            <span className="catname">{c.name}</span>
            <button className="mini" onClick={() => startEdit(c)}>
              編集
            </button>
            <button className="mini" onClick={() => remove(c)}>
              削除
            </button>
          </div>
        ))}
        <hr className="sep" />
        <input
          placeholder={editing ? 'カテゴリー名を変更' : '新しいカテゴリー名(例:学校)'}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
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
        <button className="primary" onClick={save}>
          {editing ? '変更を保存' : '追加'}
        </button>
        {editing && (
          <button className="cancel" onClick={reset}>
            編集をやめる
          </button>
        )}
        <button className="cancel" onClick={onClose}>
          閉じる
        </button>
      </div>
    </div>
  )
}