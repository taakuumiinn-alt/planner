const SECTIONS = ['今日やること', 'ToDoリスト', 'メモ', '期限切れ', '完了済み']

export default function OtherScreen({
  email,
  onSignOut,
}: {
  email: string
  onSignOut: () => void
}) {
  return (
    <div className="other">
      {SECTIONS.map((s) => (
        <section key={s} className="card">
          <h3>{s}</h3>
          <p className="empty">まだありません</p>
        </section>
      ))}
      <section className="card">
        <h3>アカウント</h3>
        <p className="empty">{email}</p>
        <button className="logout" onClick={onSignOut}>
          ログアウト
        </button>
      </section>
    </div>
  )
}