const pad = (n: number) => String(n).padStart(2, '0')

export const toDateStr = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const todayStr = () => toDateStr(new Date())

export const fmt = (s: string) => {
  const [, m, d] = s.split('-')
  return `${Number(m)}/${Number(d)}`
}

export const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

export const fmtFull = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return `${m}/${d}(${WEEKDAYS[new Date(y, m - 1, d).getDay()]})`
}

export const hhmm = (t: string | null) => (t ? t.slice(0, 5) : '')