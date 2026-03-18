import Nav from '@/components/Nav'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <Nav />
      <main className="flex-1 pb-20 md:pb-0">
        {/* Header */}
        <header className="px-6 pt-8 pb-6">
          <h1 className="text-2xl font-bold text-amber">欲室 BAR WISH</h1>
          <p className="text-light-muted text-sm mt-1">懂得藏起來喝酒的大人</p>
        </header>

        {/* Quick Actions */}
        <section className="px-6 mb-8">
          <h2 className="text-light-muted text-xs uppercase tracking-wider mb-4">快速操作</h2>
          <div className="grid grid-cols-2 gap-4">
            <Link
              href="/visits/new"
              className="bg-amber hover:bg-amber-light text-dark font-bold rounded-2xl p-6 text-center transition-colors"
            >
              <span className="text-3xl block mb-2">➕</span>
              <span className="text-lg">來店登記</span>
            </Link>
            <Link
              href="/members/new"
              className="bg-dark-card hover:bg-dark-hover border border-dark-border rounded-2xl p-6 text-center transition-colors"
            >
              <span className="text-3xl block mb-2">👤</span>
              <span className="text-lg text-light">新增會員</span>
            </Link>
          </div>
        </section>

        {/* Stats Overview */}
        <section className="px-6 mb-8">
          <h2 className="text-light-muted text-xs uppercase tracking-wider mb-4">系統概覽</h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-dark-card border border-dark-border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-amber">--</p>
              <p className="text-light-muted text-xs mt-1">總會員</p>
            </div>
            <div className="bg-dark-card border border-dark-border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-teal">--</p>
              <p className="text-light-muted text-xs mt-1">今日來店</p>
            </div>
            <div className="bg-dark-card border border-dark-border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-light">--</p>
              <p className="text-light-muted text-xs mt-1">成就解鎖</p>
            </div>
          </div>
        </section>

        {/* Setup Guide */}
        <section className="px-6">
          <div className="bg-dark-card border border-amber/30 rounded-xl p-5">
            <h3 className="text-amber font-semibold mb-2">設定指南</h3>
            <ol className="text-light-muted text-sm space-y-2 list-decimal list-inside">
              <li>在 Supabase 建立專案</li>
              <li>執行 <code className="bg-dark px-2 py-0.5 rounded text-amber text-xs">supabase-schema.sql</code></li>
              <li>將 URL 和 Key 填入 <code className="bg-dark px-2 py-0.5 rounded text-amber text-xs">.env.local</code></li>
              <li>重啟開發伺服器</li>
            </ol>
          </div>
        </section>
      </main>
    </div>
  )
}
