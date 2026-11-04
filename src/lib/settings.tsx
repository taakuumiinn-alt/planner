import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from './supabase'

export type Settings = {
  weekdayColors: string[] // 日〜土
  holidayColor: string
}

export const DEFAULT_SETTINGS: Settings = {
  weekdayColors: ['#f87171', '#e8e8f2', '#e8e8f2', '#e8e8f2', '#e8e8f2', '#e8e8f2', '#60a5fa'],
  holidayColor: '#f87171',
}

type Ctx = { settings: Settings; update: (p: Partial<Settings>) => void }
const SettingsContext = createContext<Ctx>({ settings: DEFAULT_SETTINGS, update: () => {} })

// eslint-disable-next-line react-refresh/only-export-components
export const useSettings = () => useContext(SettingsContext)

export function SettingsProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const latest = useRef<Settings>(DEFAULT_SETTINGS)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    supabase
      .from('user_settings')
      .select('settings')
      .maybeSingle()
      .then(({ data }) => {
        if (!data?.settings) return
        const s = { ...DEFAULT_SETTINGS, ...data.settings } as Settings
        if (!Array.isArray(s.weekdayColors) || s.weekdayColors.length !== 7) {
          s.weekdayColors = DEFAULT_SETTINGS.weekdayColors
        }
        latest.current = s
        setSettings(s)
      })
  }, [])

  const update = (p: Partial<Settings>) => {
    const next = { ...latest.current, ...p }
    latest.current = next
    setSettings(next)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      supabase
        .from('user_settings')
        .upsert({ user_id: userId, settings: next, updated_at: new Date().toISOString() })
        .then(({ error }) => {
          if (error) console.error('設定の保存に失敗しました', error.message)
        })
    }, 600)
  }

  return <SettingsContext.Provider value={{ settings, update }}>{children}</SettingsContext.Provider>
}