import { useSettings, DEFAULT_SETTINGS } from '../lib/settings'
import { WEEKDAYS } from '../lib/date'

export default function ColorSettings() {
  const { settings, update } = useSettings()

  return (
    <section className="card">
      <h3>カレンダーの色</h3>
      <div className="colorgrid">
        {WEEKDAYS.map((w, i) => (
          <label key={w}>
            {w}
            <input
              type="color"
              value={settings.weekdayColors[i]}
              onChange={(e) =>
                update({ weekdayColors: settings.weekdayColors.map((c, j) => (j === i ? e.target.value : c)) })
              }
            />
          </label>
        ))}
        <label>
          祝日
          <input
            type="color"
            value={settings.holidayColor}
            onChange={(e) => update({ holidayColor: e.target.value })}
          />
        </label>
      </div>
      <button
        className="mini"
        onClick={() =>
          update({ weekdayColors: DEFAULT_SETTINGS.weekdayColors, holidayColor: DEFAULT_SETTINGS.holidayColor })
        }
      >
        初期の色に戻す
      </button>
    </section>
  )
}