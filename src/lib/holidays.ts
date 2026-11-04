const URL = 'https://holidays-jp.github.io/api/v1/date.json'
const KEY = 'planner:holidays'
const MAX_AGE = 30 * 24 * 60 * 60 * 1000

type Cache = { at: number; data: Record<string, string> }

export async function loadHolidays(): Promise<Record<string, string>> {
  let cached: Cache | null = null
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) cached = JSON.parse(raw) as Cache
  } catch {
    /* 読めなければ取得し直す */
  }
  if (cached && Date.now() - cached.at < MAX_AGE) return cached.data
  try {
    const res = await fetch(URL)
    if (!res.ok) throw new Error(String(res.status))
    const data = (await res.json()) as Record<string, string>
    try {
      localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), data }))
    } catch {
      /* 保存できなくても表示は続ける */
    }
    return data
  } catch {
    return cached?.data ?? {}
  }
}