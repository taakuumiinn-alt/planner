import { useState } from 'react'
import CalendarScreen from './screens/CalendarScreen'
import OtherScreen from './screens/OtherScreen'
import AddMenu from './components/AddMenu'

type Tab = 'calendar' | 'other'
const KEY = 'planner:lastTab'

function loadTab(): Tab {
  try {
    return localStorage.getItem(KEY) === 'other' ? 'other' : 'calendar'
  } catch {
    return 'calendar'
  }
}

export default function Shell({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  const [tab, setTab] = useState<Tab>(loadTab)
  const [menuOpen, setMenuOpen] = useState(false)
  const [toast, setToast] = useState('')

  const changeTab = (t: Tab) => {
    setTab(t)
    try {
      localStorage.setItem(KEY, t)
    } catch {
      /* 保存できなくても動作は続ける */
    }
  }

  const onPick = (label: string) => {
    setMenuOpen(false)
    setToast(`「${label}」は次のステップで実装します`)
    setTimeout(() => setToast(''), 2500)
  }

  return (
    <div className="shell">
      <header className="topbar">
        <h2>{tab === 'calendar' ? 'カレンダー' : 'その他'}</h2>
        <button className="plus" aria-label="新規作成" onClick={() => setMenuOpen(true)}>
          +
        </button>
      </header>

      <main className="content">
        {tab === 'calendar' ? (
          <CalendarScreen />
        ) : (
          <OtherScreen email={email} onSignOut={onSignOut} />
        )}
      </main>

      <nav className="bottomnav">
        <button className={tab === 'calendar' ? 'on' : ''} onClick={() => changeTab('calendar')}>
          カレンダー
        </button>
        <button className={tab === 'other' ? 'on' : ''} onClick={() => changeTab('other')}>
          その他
        </button>
      </nav>

      {menuOpen && <AddMenu onPick={onPick} onClose={() => setMenuOpen(false)} />}
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}