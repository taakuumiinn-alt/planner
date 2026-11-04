import { useState } from 'react'

type View = 'month' | 'week' | 'day'
const WEEK = ['日', '月', '火', '水', '木', '金', '土']

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

export default function CalendarScreen() {
  const [view, setView] = useState<View>('month')
  const [cursor, setCursor] = useState(() => new Date())
  const [selected, setSelected] = useState<Date | null>(null)

  const y = cursor.getFullYear()
  const m = cursor.getMonth()
  const offset = new Date(y, m, 1).getDay() // 日曜始まり
  const cells = Array.from({ length: 42 }, (_, i) => new Date(y, m, 1 - offset + i))
  const today = new Date()

  const moveMonth = (d: number) => setCursor(new Date(y, m + d, 1))

  return (
    <div className="cal">
      <div className="seg">
        {(['month', 'week', 'day'] as View[]).map((v) => (
          <button key={v} className={view === v ? 'on' : ''} onClick={() => setView(v)}>
            {v === 'month' ? '月' : v === 'week' ? '週' : '日'}
          </button>
        ))}
      </div>

      <div className="calhead">
        <button onClick={() => moveMonth(-1)} aria-label="前月">‹</button>
        <strong>
          {y}年{m + 1}月
        </strong>
        <button onClick={() => moveMonth(1)} aria-label="翌月">›</button>
        <button className="todaybtn" onClick={() => setCursor(new Date())}>
          今日
        </button>
      </div>

      {view !== 'month' ? (
        <p className="placeholder">週間・1日表示は次のステップで実装します</p>
      ) : (
        <div className="grid">
          {WEEK.map((w, i) => (
            <div key={w} className={`dow ${i === 0 ? 'sun' : i === 6 ? 'sat' : ''}`}>
              {w}
            </div>
          ))}
          {cells.map((d) => {
            const dow = d.getDay()
            const classes = [
              'cell',
              d.getMonth() !== m ? 'out' : '',
              dow === 0 ? 'sun' : dow === 6 ? 'sat' : '',
              sameDay(d, today) ? 'today' : '',
              selected && sameDay(d, selected) ? 'sel' : '',
            ]
              .filter(Boolean)
              .join(' ')
            return (
              <div key={d.toISOString()} className={classes} onClick={() => setSelected(d)}>
                <span className="num">{d.getDate()}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}