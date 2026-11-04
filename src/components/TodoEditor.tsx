import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { LIST_COLS } from '../lib/types'
import type { Todo, TodoList } from '../lib/types'
import { parseRule } from '../lib/repeat'
import type { RepeatRule } from '../lib/repeat'

const WD = ['日', '月', '火', '水', '木', '金', '土']
const UNIT = { daily: '日', weekly: '週間', monthly: 'か月', yearly: '年' }

const toLocalInput = (iso: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

const toggle = (arr: number[], n: number) =>
  arr.includes(n) ? arr.filter((x) => x !== n) : [...arr, n].sort((a, b) => a - b)

export default function TodoEditor({
  todo,
  onClose,
  onSaved,
}: {
  todo: Todo | null
  onClose: () => void
  onSaved: () => void
}) {
  const init = parseRule(todo?.repeat_rule ?? null)
  const [lists, setLists] = useState<TodoList[]>([])
  const [title, setTitle] = useState(todo?.title ?? '')
  const [detail, setDetail] = useState(todo?.detail ?? '')
  const [listId, setListId] = useState(todo?.list_id ?? '')
  const [dateOnly, setDateOnly] = useState(todo?.date_only ?? false)
  const [start, setStart] = useState(todo?.start_date ?? '')
  const [due, setDue] = useState(todo?.due_date ?? '')
  const [freq, setFreq] = useState<'' | RepeatRule['freq']>(init?.freq ?? '')
  const [interval, setIntervalN] = useState(init?.interval ?? 1)
  const [weekdays, setWeekdays] = useState<number[]>(init?.weekdays ?? [])
  const [monthdays, setMonthdays] = useState<number[]>(init?.monthdays ?? [])
  const [until, setUntil] = useState(init?.until ?? '')
  const [notify, setNotify] = useState(todo?.notify_enabled ?? false)
  const [notifyAt, setNotifyAt] = useState(toLocalInput(todo?.notify_at ?? null))
  const [remind, setRemind] = useState(
    todo?.remind_days_before == null ? '' : String(todo.remind_days_before),
  )
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase
      .from('todo_lists')
      .select(LIST_COLS)
      .is('deleted_at', null)
      .order('sort_order')
      .then(({ data }) => setLists((data ?? []) as TodoList[]))
  }, [])

  const save = async () => {
    if (!title.trim()) return setError('タスク名を入力してください')
    if (dateOnly && !due) return setError('日付限定ToDoは日付を設定してください')
    if (!dateOnly && start && due && start > due) return setError('開始日が期限日より後になっています')

    let repeat_rule: string | null = null
    if (freq) {
      if (!due) return setError('繰り返しには期限日(日付)を設定してください')
      const rule: RepeatRule = {
        freq,
        interval: Math.max(1, interval || 1),
        weekdays:
          freq === 'weekly'
            ? weekdays.length
              ? weekdays
              : [new Date(due + 'T00:00:00').getDay()]
            : [],
        monthdays:
          freq === 'monthly' ? (monthdays.length ? monthdays : [Number(due.split('-')[2])]) : [],
        until: until || null,
      }
      repeat_rule = JSON.stringify(rule)
    }

    if (notify && !notifyAt && remind === '') return setError('通知日時またはリマインダーを設定してください')
    if (notify && remind !== '' && !due) return setError('期限前のリマインダーには期限日が必要です')

    setBusy(true)
    const row = {
      title: title.trim(),
      detail,
      list_id: listId || null,
      date_only: dateOnly,
      start_date: dateOnly ? null : start || null,
      due_date: due || null,
      repeat_rule,
      notify_enabled: notify,
      notify_at: notify && notifyAt ? new Date(notifyAt).toISOString() : null,
      remind_days_before: notify && remind !== '' ? Number(remind) : null,
    }
    const { error } = todo
      ? await supabase.from('todos').update(row).eq('id', todo.id)
      : await supabase.from('todos').insert({ ...row, sort_order: Date.now() })
    setBusy(false)
    if (error) return setError(error.message)
    onSaved()
  }

  const remove = async () => {
    if (!todo) return
    if (!window.confirm('このToDoを削除しますか?(ゴミ箱機能は後で追加します。今は非表示になります)')) return
    const { error } = await supabase
      .from('todos')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', todo.id)
    if (error) return setError(error.message)
    onSaved()
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet form" onClick={(e) => e.stopPropagation()}>
        <h3>{todo ? 'ToDoを編集' : 'ToDoを追加'}</h3>
        <input placeholder="タスク名" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea
          placeholder="詳細説明(任意)"
          rows={3}
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
        />
        <label>
          リスト
          <select value={listId} onChange={(e) => setListId(e.target.value)}>
            <option value="">リストなし</option>
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.icon} {l.name}
              </option>
            ))}
          </select>
        </label>
        <label className="check">
          <input type="checkbox" checked={dateOnly} onChange={(e) => setDateOnly(e.target.checked)} />
          特定の日だけにやること(日付限定)
        </label>
        {!dateOnly && (
          <label>
            開始日(任意)
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
        )}
        <label>
          {dateOnly ? '日付' : '期限日(任意)'}
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </label>

        <label>
          繰り返し
          <select value={freq} onChange={(e) => setFreq(e.target.value as '' | RepeatRule['freq'])}>
            <option value="">なし</option>
            <option value="daily">毎日</option>
            <option value="weekly">毎週</option>
            <option value="monthly">毎月</option>
            <option value="yearly">毎年</option>
          </select>
        </label>
        {freq && (
          <>
            <label>
              間隔({UNIT[freq]}ごと)
              <input
                type="number"
                min={1}
                value={interval}
                onChange={(e) => setIntervalN(Number(e.target.value))}
              />
            </label>
            {freq === 'weekly' && (
              <div className="chips">
                {WD.map((w, i) => (
                  <button
                    key={w}
                    className={weekdays.includes(i) ? 'chip on' : 'chip'}
                    onClick={() => setWeekdays(toggle(weekdays, i))}
                  >
                    {w}
                  </button>
                ))}
              </div>
            )}
            {freq === 'monthly' && (
              <div className="chips">
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <button
                    key={d}
                    className={monthdays.includes(d) ? 'chip on' : 'chip'}
                    onClick={() => setMonthdays(toggle(monthdays, d))}
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}
            <label>
              繰り返しの終了日(任意)
              <input type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
            </label>
          </>
        )}

        <label className="check">
          <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
          通知する
        </label>
        {notify && (
          <>
            <label>
              個別通知の日時
              <input type="datetime-local" value={notifyAt} onChange={(e) => setNotifyAt(e.target.value)} />
            </label>
            <label>
              期限が近づいたときのリマインダー(朝9:00)
              <select value={remind} onChange={(e) => setRemind(e.target.value)}>
                <option value="">なし</option>
                <option value="0">期限当日</option>
                <option value="1">1日前</option>
                <option value="2">2日前</option>
                <option value="3">3日前</option>
                <option value="7">1週間前</option>
              </select>
            </label>
          </>
        )}

        {error && <p className="err">{error}</p>}
        <button className="primary" onClick={save} disabled={busy}>
          保存
        </button>
        {todo && (
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