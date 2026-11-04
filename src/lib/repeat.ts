import { toDateStr, WEEKDAYS } from './date'

export type RepeatRule = {
  freq: 'daily' | 'weekly' | 'monthly' | 'yearly'
  interval: number
  weekdays: number[] // 0=日 ... 6=土
  monthdays: number[] // 1〜31
  until: string | null
}

export const parseRule = (s: string | null): RepeatRule | null => {
  if (!s) return null
  try {
    const r = JSON.parse(s)
    if (!['daily', 'weekly', 'monthly', 'yearly'].includes(r.freq)) return null
    return {
      freq: r.freq,
      interval: Math.max(1, Number(r.interval) || 1),
      weekdays: Array.isArray(r.weekdays) ? r.weekdays : [],
      monthdays: Array.isArray(r.monthdays) ? r.monthdays : [],
      until: r.until || null,
    }
  } catch {
    return null
  }
}

export const parseDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const daysIn = (y: number, m: number) => new Date(y, m + 1, 0).getDate()

export const diffDays = (a: string, b: string) =>
  Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86400000)
export const shiftDate = (s: string, n: number) => toDateStr(addDays(parseDate(s), n))
export const shiftIso = (iso: string, n: number) => {
  const d = new Date(iso)
  d.setDate(d.getDate() + n)
  return d.toISOString()
}

export const nextOnce = (r: RepeatRule, from: Date): Date => {
  if (r.freq === 'daily') return addDays(from, r.interval)

  if (r.freq === 'weekly') {
    if (r.weekdays.length === 0) return addDays(from, 7 * r.interval)
    const set = new Set(r.weekdays)
    for (let i = 1; i <= 6 - from.getDay(); i++) {
      const c = addDays(from, i)
      if (set.has(c.getDay())) return c
    }
    const weekStart = addDays(from, -from.getDay() + 7 * r.interval)
    for (let i = 0; i < 7; i++) {
      const c = addDays(weekStart, i)
      if (set.has(c.getDay())) return c
    }
    return addDays(from, 7 * r.interval)
  }

  if (r.freq === 'monthly') {
    const days = r.monthdays.length ? [...r.monthdays].sort((a, b) => a - b) : [from.getDate()]
    const y = from.getFullYear()
    const m = from.getMonth()
    const sameMonth = days.map((d) => Math.min(d, daysIn(y, m))).filter((d) => d > from.getDate())
    if (sameMonth.length) return new Date(y, m, sameMonth[0])
    const t = new Date(y, m + r.interval, 1)
    return new Date(t.getFullYear(), t.getMonth(), Math.min(days[0], daysIn(t.getFullYear(), t.getMonth())))
  }

  const ty = from.getFullYear() + r.interval
  return new Date(ty, from.getMonth(), Math.min(from.getDate(), daysIn(ty, from.getMonth())))
}

// 次回の日付。終了日を過ぎる場合は null。
// 完了が遅れて次回がすでに過去になる場合は、今日以降になるまで進める。
export const nextDue = (r: RepeatRule, from: string, today: string): string | null => {
  let cur = parseDate(from)
  for (let i = 0; i < 1000; i++) {
    cur = nextOnce(r, cur)
    const s = toDateStr(cur)
    if (r.until && s > r.until) return null
    if (s >= today) return s
  }
  return null
}
  export type RepeatState = {
  freq: '' | RepeatRule['freq']
  interval: number
  weekdays: number[]
  monthdays: number[]
  until: string
}

export const stateFromRule = (s: string | null): RepeatState => {
  const r = parseRule(s)
  return {
    freq: r?.freq ?? '',
    interval: r?.interval ?? 1,
    weekdays: r?.weekdays ?? [],
    monthdays: r?.monthdays ?? [],
    until: r?.until ?? '',
  }
}

export const buildRule = (st: RepeatState, baseDate: string): string | null => {
  if (!st.freq) return null
  const base = parseDate(baseDate)
  const rule: RepeatRule = {
    freq: st.freq,
    interval: Math.max(1, st.interval || 1),
    weekdays: st.freq === 'weekly' ? (st.weekdays.length ? st.weekdays : [base.getDay()]) : [],
    monthdays: st.freq === 'monthly' ? (st.monthdays.length ? st.monthdays : [base.getDate()]) : [],
    until: st.until || null,
  }
  return JSON.stringify(rule)
}

export const describeRule = (s: string | null): string => {
  const r = parseRule(s)
  if (!r) return ''
  const n = r.interval
  let t = ''
  if (r.freq === 'daily') t = n === 1 ? '毎日' : `${n}日ごと`
  else if (r.freq === 'weekly')
    t =
      (n === 1 ? '毎週' : `${n}週間ごと`) +
      (r.weekdays.length ? ' ' + r.weekdays.map((d) => WEEKDAYS[d]).join('・') : '')
  else if (r.freq === 'monthly')
    t =
      (n === 1 ? '毎月' : `${n}か月ごと`) +
      (r.monthdays.length ? ' ' + r.monthdays.join('・') + '日' : '')
  else t = n === 1 ? '毎年' : `${n}年ごと`
  return r.until ? `${t}(${r.until}まで)` : t
}

// 開始日 baseDate の繰り返し予定のうち、from〜to の範囲に入る日付を返す
export const occurrencesBetween = (
  baseDate: string,
  rule: RepeatRule | null,
  from: string,
  to: string,
): string[] => {
  if (!rule) return baseDate >= from && baseDate <= to ? [baseDate] : []
  const out: string[] = []
  const limit = rule.until && rule.until < to ? rule.until : to
  let cur = parseDate(baseDate)
  for (let i = 0; i < 5000; i++) {
    const s = toDateStr(cur)
    if (s > limit) break
    if (s >= from) out.push(s)
    cur = nextOnce(rule, cur)
  }
  return out
}