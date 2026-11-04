const pad = (n: number) => String(n).padStart(2, '0')

export const toDateStr = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const todayStr = () => toDateStr(new Date())

export const fmt = (s: string) => {
  const [, m, d] = s.split('-')
  return `${Number(m)}/${Number(d)}`
}