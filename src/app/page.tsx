'use client'

import { useEffect, useState } from 'react'
import Nav from '@/components/Nav'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Stats = {
  totalMembers: number
  todayVisits: number
  totalUnlocks: number
  todayRevenue: number
  levelCounts: Record<number, number>
  expiringMembers: number
}

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentVisits, setRecentVisits] = useState<Array<{
    id: string
    visit_date: string
    amount: number
    member: { name: string | null; phone: string } | null
  }>>([])

  useEffect(() => {
    fetchStats()
    fetchRecentVisits()
  }, [])

  async function fetchStats() {
    const today = new Date().toISOString().split('T')[0]
    const twoWeeksLater = new Date()
    twoWeeksLater.setDate(twoWeeksLater.getDate() + 14)

    const [members, todayV, unlocks, levels, expiring] = await Promise.all([
      supabase.from('members').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('visits').select('amount').eq('visit_date', today),
      supabase.from('member_achievements').select('id', { count: 'exact', head: true }),
      supabase.from('members').select('level').eq('is_active', true),
      supabase.from('members').select('id', { count: 'exact', head: true })
        .eq('is_active', true)
        .gte('level', 2)
        .lte('level_expires_at', twoWeeksLater.toISOString()),
    ])

    const levelCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 }
    if (levels.data) {
      (levels.data as { level: number }[]).forEach((m) => {
        levelCounts[m.level] = (levelCounts[m.level] || 0) + 1
      })
    }

    const todayRevenue = todayV.data
      ? (todayV.data as { amount: number }[]).reduce((sum, v) => sum + Number(v.amount), 0)
      : 0

    setStats({
      totalMembers: members.count || 0,
      todayVisits: todayV.data?.length || 0,
      totalUnlocks: unlocks.count || 0,
      todayRevenue,
      levelCounts,
      expiringMembers: expiring.count || 0,
    })
  }

  async function fetchRecentVisits() {
    const { data } = await supabase
      .from('visits')
      .select('id, visit_date, amount, member:members!visits_member_id_fkey(name, phone)')
      .order('created_at', { ascending: false })
      .limit(5)

    if (data) setRecentVisits(data as unknown as typeof recentVisits)
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <Nav />
      <main className="flex-1 pb-20 md:pb-0">
        <header className="px-6 pt-8 pb-6">
          <h1 className="text-2xl font-bold text-amber">欲室 BAR WISH</h1>
          <p className="text-light-muted text-sm mt-1">懂得藏起來喝酒的大人</p>
        </header>

        {/* Quick Actions */}
        <section className="px-6 mb-8">
          <div className="grid grid-cols-2 gap-4">
            <Link
              href="/visits/new"
              className="bg-amber hover:bg-amber-light text-dark font-bold rounded-2xl p-6 text-center transition-colors active:scale-95"
            >
              <span className="text-3xl block mb-2">+</span>
              <span className="text-lg">來店登記</span>
            </Link>
            <Link
              href="/members/new"
              className="bg-dark-card hover:bg-dark-hover border border-dark-border rounded-2xl p-6 text-center transition-colors active:scale-95"
            >
              <span className="text-3xl block mb-2">+</span>
              <span className="text-lg text-light">新增會員</span>
            </Link>
          </div>
        </section>

        {/* Stats */}
        <section className="px-6 mb-8">
          <h2 className="text-light-muted text-xs uppercase tracking-wider mb-4">今日概覽</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-dark-card border border-dark-border rounded-xl p-4">
              <p className="text-3xl font-bold text-amber">{stats?.totalMembers ?? '-'}</p>
              <p className="text-light-muted text-xs mt-1">總會員</p>
            </div>
            <div className="bg-dark-card border border-dark-border rounded-xl p-4">
              <p className="text-3xl font-bold text-teal">{stats?.todayVisits ?? '-'}</p>
              <p className="text-light-muted text-xs mt-1">今日來店</p>
            </div>
            <div className="bg-dark-card border border-dark-border rounded-xl p-4">
              <p className="text-3xl font-bold text-light">
                {stats ? `$${stats.todayRevenue.toLocaleString()}` : '-'}
              </p>
              <p className="text-light-muted text-xs mt-1">今日營收</p>
            </div>
            <div className="bg-dark-card border border-dark-border rounded-xl p-4">
              <p className="text-3xl font-bold text-teal-light">{stats?.totalUnlocks ?? '-'}</p>
              <p className="text-light-muted text-xs mt-1">成就解鎖</p>
            </div>
          </div>
        </section>

        {/* Level Distribution */}
        {stats && (
          <section className="px-6 mb-8">
            <h2 className="text-light-muted text-xs uppercase tracking-wider mb-4">等級分佈</h2>
            <div className="grid grid-cols-4 gap-2">
              {[
                { level: 1, name: '基礎', color: 'text-light-muted' },
                { level: 2, name: '銅級', color: 'text-orange-400' },
                { level: 3, name: '銀級', color: 'text-gray-300' },
                { level: 4, name: 'VVIP', color: 'text-amber' },
              ].map((l) => (
                <div key={l.level} className="bg-dark-card border border-dark-border rounded-xl p-3 text-center">
                  <p className={`text-xl font-bold ${l.color}`}>{stats.levelCounts[l.level]}</p>
                  <p className="text-light-muted text-[10px] mt-0.5">{l.name}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Expiring Alert */}
        {stats && stats.expiringMembers > 0 && (
          <section className="px-6 mb-8">
            <Link href="/members/expiring" className="block bg-red-900/20 border border-red-700/30 rounded-xl p-4">
              <p className="text-red-300 font-semibold">
                {stats.expiringMembers} 位會員等級即將到期
              </p>
              <p className="text-red-400/60 text-sm mt-0.5">點擊查看詳情 &rarr;</p>
            </Link>
          </section>
        )}

        {/* Recent Visits */}
        <section className="px-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-light-muted text-xs uppercase tracking-wider">最近來店</h2>
            <Link href="/visits" className="text-amber text-xs hover:text-amber-light">查看全部 &rarr;</Link>
          </div>
          <div className="space-y-2">
            {recentVisits.length === 0 ? (
              <p className="text-light-muted text-sm py-4 text-center">尚無來店記錄</p>
            ) : (
              recentVisits.map((v) => (
                <div key={v.id} className="bg-dark-card border border-dark-border rounded-xl p-3 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-light">
                      {(v.member as { name: string | null; phone: string } | null)?.name || (v.member as { name: string | null; phone: string } | null)?.phone || '未知'}
                    </p>
                    <p className="text-light-muted text-xs">{v.visit_date}</p>
                  </div>
                  <p className="text-amber font-semibold">${Number(v.amount).toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
