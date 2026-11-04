import { useState } from 'react'
import { supabase } from './lib/supabase'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true)
    setMessage('')
    const { error } =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })
    if (error) setMessage(error.message)
    else if (mode === 'signup')
      setMessage('確認メールを送信しました。メール内のリンクを開いてからログインしてください。')
    setBusy(false)
  }

  return (
    <div className="auth">
      <h1>My Planner</h1>
      <input
        type="email"
        placeholder="メールアドレス"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="パスワード(6文字以上)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={submit} disabled={busy}>
        {mode === 'login' ? 'ログイン' : '新規登録'}
      </button>
      <button className="link" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
        {mode === 'login' ? 'アカウントを作成する' : 'ログインに戻る'}
      </button>
      {message && <p className="msg">{message}</p>}
    </div>
  )
}