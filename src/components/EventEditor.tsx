import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { CAT_COLS } from '../lib/types'
import type { Category, EventRow } from '../lib/types'
import { hhmm } from '../lib/date'
import CategoryManager from './CategoryManager'

const toLocalInput = (iso: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

export default function EventEditor({
  event,
  defaultDate,
  onClose,
  onSaved,
}: {
  event: EventRow | null
  defaultDate: string
  onClose: () => void
  onSaved: () => void
}) {
  const [cats, setCats] = useState<Category[]>([])
  const [title, setTitle] = useState(event?.title ?? '')
  const [detail, setDetail] = useState(event?.detail ?? '')
  const [date, setDate] = useState(event?.event_date ?? defaultDate)
  const [allDay, setAllDay] = useState(event?.all_day ?? false)
  const [start, setStart] = useState(hhmm(event?.start_time ?? null))
  const [end, setEnd] = useState(hhmm(event?.end_time ?? null))
  const [catId, setCatId] = useState(event?.category_id ?? '')
  const [useColor, setUseColor] = useState(!!event?.color)
  const [color, setColor] = useState(event?.color ?? '#8b5cf6')
  const [notify, setNotify] = useState(event?.notify_enabled ?? false)
  const [notifyAt, setNotifyAt] = useState(toLocalInput(event?.notify_at ?? null))
  const [manage, setManage] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const loadCats = useCallback(async () => {
    const { data } = await supabase
      .from('categories')
      .select(CAT_COLS)
      .is('deleted_at', null)
      .order('sort_order')
    setCats((data ?? []) as Category[])
  }, [])

  useEffect(() => {
    loadCats()
  }, [loadCats])

  const save = async () => {
    if (!title.trim()) return setError('予定名を入力してください')
    if (!date) return setError('日付を設定してください')
    if (!allDay && start && end && end < start) return setError('終了時刻が開始時刻より前です')
    if (notify && !notifyAt) return setError('通知の日時を設定してください')
    setBusy(true)
    const row = {
      title: title.trim(),
      detail,
      event_date: date,
      all_day: allDay,
      start_time: allDay ? null : start || null,
      end_time: allDay ? null : end || null,
      category_id: catId || null,
      color: useColor ? color : null,
      notify_enabled: notify,
      notify_at: notify && notifyAt ? new Date(notifyAt).toISOString() : null,
    }
    const { error } = event
      ? await supabase.from('events').update(row).eq('id', event.id)
      : await supabase.from('events').insert({ ...row, sort_order: Date.now() })
    setBusy(false)
    if (error) return setError(error.message)
    onSaved()
  }

  const remove = async () => {
    if (!event) return
    if (!window.confirm('この予定を削除しますか?(ゴミ箱機能は後で追加します。今は非表示になります)')) return
    const { error } = await supabase
      .from('events')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', event.id)
    if (error) return setError(error.message)
    onSaved()
  }

  return (
    <>
      <div className="overlay" onClick={onClose}>
        <div className="sheet form" onClick={(e) => e.stopPropagation()}>
          <h3>{event ? '予定を編集' : '予定を追加'}</h3>
          <input placeholder="予定名" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea
            placeholder="詳細説明(任意)"
            rows={3}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
          />
          <label>
            日付
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="check">
            <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
            終日
          </label>
          {!allDay && (
            <>
              <label>
                開始時刻(空欄なら時間なしの予定)
                <input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
              </label>
              <label>
                終了時刻(任意)
                <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
              </label>
            </>
          )}
          <label>
            カテゴリー
            <select value={catId} onChange={(e) => setCatId(e.target.value)}>
              <option value="">なし</option>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <button className="mini wide" onClick={() => setManage(true)}>
            カテゴリーを管理
          </button>
          <label className="check">
            <input type="checkbox" checked={useColor} onChange={(e) => setUseColor(e.target.checked)} />
            この予定だけ個別の色にする
          </label>
          {useColor && (
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          )}
          <label className="check">
            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
            通知する
          </label>
          {notify && (
            <label>
              通知の日時
              <input type="datetime-local" value={notifyAt} onChange={(e) => setNotifyAt(e.target.value)} />
            </label>
          )}
          {error && <p className="err">{error}</p>}
          <button className="primary" onClick={save} disabled={busy}>
            保存
          </button>
          {event && (
            <button className="danger" onClick={remove}>
              削除
            </button>
          )}
          <button className="cancel" onClick={onClose}>
            キャンセル
          </button>
        </div>
      </div>
      {manage && <CategoryManager onClose={() => setManage(false)} onChanged={loadCats} />}
    </>
  )
}