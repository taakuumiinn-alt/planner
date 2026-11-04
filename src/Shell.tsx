import { useState } from 'react'
import CalendarScreen from './screens/CalendarScreen'
import ListScreen from './screens/ListScreen'
import AddMenu from './components/AddMenu'
import TodoEditor from './components/TodoEditor'

type Tab = 'calendar' | 'list'
const KEY = 'planner:lastTab'

function loadTab(): Tab {
  try {
    return localStorage.getItem(KEY) === 'list' ? 'list' : 'calendar'
  } catch {
    return 'calendar'
  }
}

export default function Shell({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  const [tab, setTab] = useState<Tab>(loadTab)
  const [menuOpen, setMenuOpen] = useState(false)
  const [addingTodo, setAddingTodo] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
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
    if (label === 'ToDoを追加') {
      setAddingTodo(true)
      return
    }
    setToast(`「${label}」は次のステップで実装します`)
    setTimeout(() => setToast(''), 2500)
  }

  return (
    <div className="shell">
      <header className="topbar">
        <h2>{tab === 'calendar' ? 'カレンダー' : 'リスト'}</h2>
        <button className="plus" aria-label="新規作成" onClick={() => setMenuOpen(true)}>
          +
        </button>
      </header>

      <main className="content">
        {tab === 'calendar' ? (
          <CalendarScreen />
        ) : (
          <ListScreen email={email} onSignOut={onSignOut} reloadKey={reloadKey} />
        )}
      </main>

      <nav className="bottomnav">
        <button className={tab === 'calendar' ? 'on' : ''} onClick={() => changeTab('calendar')}>
          カレンダー
        </button>
        <button className={tab === 'list' ? 'on' : ''} onClick={() => changeTab('list')}>
          リスト
        </button>
      </nav>

      {menuOpen && <AddMenu onPick={onPick} onClose={() => setMenuOpen(false)} />}
      {addingTodo && (
        <TodoEditor
          todo={null}
          onClose={() => setAddingTodo(false)}
          onSaved={() => {
            setAddingTodo(false)
            setReloadKey((k) => k + 1)
          }}
        />
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}