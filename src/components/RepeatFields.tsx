import { WEEKDAYS } from '../lib/date'
import type { RepeatState } from '../lib/repeat'

const UNIT = { daily: '日', weekly: '週間', monthly: 'か月', yearly: '年' }

const toggle = (arr: number[], n: number) =>
  arr.includes(n) ? arr.filter((x) => x !== n) : [...arr, n].sort((a, b) => a - b)

export default function RepeatFields({
  value,
  onChange,
}: {
  value: RepeatState
  onChange: (v: RepeatState) => void
}) {
  const set = (p: Partial<RepeatState>) => onChange({ ...value, ...p })

  return (
    <>
      <label>
        繰り返し
        <select value={value.freq} onChange={(e) => set({ freq: e.target.value as RepeatState['freq'] })}>
          <option value="">なし</option>
          <option value="daily">毎日</option>
          <option value="weekly">毎週</option>
          <option value="monthly">毎月</option>
          <option value="yearly">毎年</option>
        </select>
      </label>
      {value.freq && (
        <>
          <label>
            間隔({UNIT[value.freq]}ごと)
            <input
              type="number"
              min={1}
              value={value.interval}
              onChange={(e) => set({ interval: Number(e.target.value) })}
            />
          </label>
          {value.freq === 'weekly' && (
            <div className="chips">
              {WEEKDAYS.map((w, i) => (
                <button
                  key={w}
                  className={value.weekdays.includes(i) ? 'chip on' : 'chip'}
                  onClick={() => set({ weekdays: toggle(value.weekdays, i) })}
                >
                  {w}
                </button>
              ))}
            </div>
          )}
          {value.freq === 'monthly' && (
            <div className="chips">
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <button
                  key={d}
                  className={value.monthdays.includes(d) ? 'chip on' : 'chip'}
                  onClick={() => set({ monthdays: toggle(value.monthdays, d) })}
                >
                  {d}
                </button>
              ))}
            </div>
          )}
          <label>
            繰り返しの終了日(任意)
            <input type="date" value={value.until} onChange={(e) => set({ until: e.target.value })} />
          </label>
        </>
      )}
    </>
  )
}