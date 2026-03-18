'use client'

import { useEffect, useState } from 'react'
import Nav from '@/components/Nav'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Member } from '@/types/database'

const levelNames: Record<number, string> = { 1: '基礎', 2: '銅級', 3: '銀級', 4: 'VVIP' }
const levelColors: Record<number, string> = {
  1: 'text-light-muted',
  2: 'text-orange-400',
  3: 'text-gray-300',
  4: 'text-amber',
}

type SortKey = 'last_visit' | 'total_visits' | 'total_spent' | 'name'

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [search, setSearch] = useState('')
  const [filterLevel, setFilterLevel] = useState<number | null>(null)
  const [sortBy, setSortBy] = useState<SortKey>('last_visit')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMembers()
  }, [filterLevel, sortBy])

  async function fetchMembers() {
    setLoading(true)
    let query = supabase.from('members').select('*').eq('is_active', true)

    if (filterLevel !== null) query = query.eq('level', filterLevel)

    switch (sortBy) {
      case 'last_visit':
        query = query.order('last_visit_at', { ascending: false, nullsFirst: false })
        break
      case 'total_visits':
        query = query.order('total_visits', { ascending: false })
        break
      case 'total_spent':
        query = query.order('total_spent', { ascending: false })
        break
      case 'name':
        query = query.order('name', { ascending: true, nullsFirst: false })
        break
    }

    const { data } = await query
    if (data) setMembers(data)
    setLoading(false)
  }

  function handleExportCSV() {
    const rows = [
      ['姓名', '電話', '等級', '來店次數', '累積消費', '最後來店', 'Line ID', 'Telegram ID'],
      ...filtered.map((m) => [
        m.name || '',
        m.phone,
        levelNames[m.level],
        String(m.total_visits),
        String(m.total_spent),
        m.last_visit_at ? new Date(m.last_visit_at).toLocaleDateString('zh-TW') : '',
        m.line_id || '',
        m.telegram_id || '',
      ]),
    ]
    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `欲室會員名單_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filtered = members.filter((m) => {
    if (!search) return true
    const s = search.toLowerCase()
    return m.phone.includes(s) || (m.name && m.name.toLowerCase().includes(s))
  })

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <Nav />
      <main className="flex-1 pb-20 md:pb-0">
        <header className="px-6 pt-8 pb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">會員管理</h1>
            <p className="text-light-muted text-sm">{members.length} 位會員</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleExportCSV}
              className="text-light-muted text-xs px-3 py-2 border border-dark-border rounded-lg hover:text-amber transition-colors">
              匯出
            </button>
            <Link href="/members/new"
              className="bg-amber text-dark px-4 py-2 rounded-lg text-sm font-semibold hover:bg-amber-light transition-colors">
              + 新增
            </Link>
          </div>
        </header>

        {/* Search */}
        <div className="px-6 mb-3">
          <input
            type="text"
            placeholder="搜尋電話或姓名..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-dark-card border border-dark-border rounded-xl px-4 py-3 text-light placeholder:text-light-muted focus:outline-none focus:border-amber transition-colors"
          />
        </div>

        {/* Filter + Sort */}
        <div className="px-6 mb-4 space-y-2">
          <div className="flex gap-2 overflow-x-auto">
            {[null, 1, 2, 3, 4].map((lv) => (
              <button key={lv ?? 'all'} onClick={() => setFilterLevel(lv)}
                className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors ${
                  filterLevel === lv ? 'bg-amber text-dark font-semibold' : 'bg-dark-card border border-dark-border text-light-muted hover:text-light'
                }`}>
                {lv === null ? '全部' : levelNames[lv]}
              </button>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {[
              { key: 'last_visit' as SortKey, label: '最近來店' },
              { key: 'total_visits' as SortKey, label: '來店次數' },
              { key: 'total_spent' as SortKey, label: '消費金額' },
              { key: 'name' as SortKey, label: '姓名' },
            ].map((s) => (
              <button key={s.key} onClick={() => setSortBy(s.key)}
                className={`px-3 py-1 rounded-full text-[10px] whitespace-nowrap transition-colors ${
                  sortBy === s.key ? 'bg-teal/20 text-teal border border-teal/30' : 'text-light-muted/60 hover:text-light-muted'
                }`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Member List */}
        <div className="px-6 space-y-2">
          {loading ? (
            <div className="text-center text-light-muted py-12">載入中...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-light-muted py-12">
              {members.length === 0 ? '尚無會員資料' : '查無符合的會員'}
            </div>
          ) : (
            filtered.map((member) => (
              <Link key={member.id} href={`/members/${member.id}`}
                className="block bg-dark-card border border-dark-border rounded-xl p-4 hover:bg-dark-hover transition-colors animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-light">{member.name || '未命名'}</span>
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                        member.level === 4 ? 'bg-amber/20 text-amber' :
                        member.level === 3 ? 'bg-gray-300/20 text-gray-300' :
                        member.level === 2 ? 'bg-orange-400/20 text-orange-400' :
                        'text-light-muted'
                      }`}>
                        {levelNames[member.level]}
                      </span>
                    </div>
                    <p className="text-light-muted text-sm mt-0.5">{member.phone}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-amber font-semibold">{member.total_visits} 次</p>
                    <p className="text-light-muted text-xs">
                      ${Number(member.total_spent).toLocaleString()}
                    </p>
                    <p className="text-light-muted text-[10px]">
                      {member.last_visit_at ? new Date(member.last_visit_at).toLocaleDateString('zh-TW') : '尚未來店'}
                    </p>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
