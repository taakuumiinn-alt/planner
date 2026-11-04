import { useState } from 'react'
import CalendarScreen from './screens/CalendarScreen'
import ListScreen from './screens/ListScreen'
import AddMenu from './components/AddMenu'
import TodoEditor from './components/TodoEditor'
import EventEditor from './components/EventEditor'
import { todayStr } from './lib/date'

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
  const [addingEvent, setAddingEvent] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
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
    if (label === '予定を追加') {
      setAddingEvent(true)
      return
    }
    setToast(`「${label}」は次のステップで実装します`)
    setTimeout(() => setToast(''), 2500)
  }

  const bump = () => setReloadKey((k) => k + 1)

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
          <CalendarScreen
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            reloadKey={reloadKey}
          />
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
            bump()
          }}
        />
      )}
      {addingEvent && (
        <EventEditor
          event={null}
          defaultDate={selectedDate ?? todayStr()}
          onClose={() => setAddingEvent(false)}
          onSaved={() => {
            setAddingEvent(false)
            bump()
          }}
        />
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}