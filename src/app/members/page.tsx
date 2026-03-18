'use client'

import { useEffect, useState } from 'react'
import Nav from '@/components/Nav'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Member } from '@/types/database'

const levelNames: Record<number, string> = {
  1: '基礎',
  2: '銅級',
  3: '銀級',
  4: 'VVIP',
}

const levelColors: Record<number, string> = {
  1: 'text-light-muted',
  2: 'text-orange-400',
  3: 'text-gray-300',
  4: 'text-amber',
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [search, setSearch] = useState('')
  const [filterLevel, setFilterLevel] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMembers()
  }, [filterLevel])

  async function fetchMembers() {
    setLoading(true)
    let query = supabase
      .from('members')
      .select('*')
      .order('last_visit_at', { ascending: false, nullsFirst: false })

    if (filterLevel !== null) {
      query = query.eq('level', filterLevel)
    }

    const { data, error } = await query
    if (!error && data) {
      setMembers(data)
    }
    setLoading(false)
  }

  const filtered = members.filter((m) => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      m.phone.includes(s) ||
      (m.name && m.name.toLowerCase().includes(s))
    )
  })

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <Nav />
      <main className="flex-1 pb-20 md:pb-0">
        <header className="px-6 pt-8 pb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">會員管理</h1>
          <Link
            href="/members/new"
            className="bg-amber text-dark px-4 py-2 rounded-lg text-sm font-semibold hover:bg-amber-light transition-colors"
          >
            + 新增
          </Link>
        </header>

        {/* Search & Filter */}
        <div className="px-6 mb-4 space-y-3">
          <input
            type="text"
            placeholder="搜尋電話或姓名..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-dark-card border border-dark-border rounded-xl px-4 py-3 text-light placeholder:text-light-muted focus:outline-none focus:border-amber transition-colors"
          />
          <div className="flex gap-2 overflow-x-auto">
            {[null, 1, 2, 3, 4].map((lv) => (
              <button
                key={lv ?? 'all'}
                onClick={() => setFilterLevel(lv)}
                className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors ${
                  filterLevel === lv
                    ? 'bg-amber text-dark font-semibold'
                    : 'bg-dark-card border border-dark-border text-light-muted hover:text-light'
                }`}
              >
                {lv === null ? '全部' : levelNames[lv]}
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
              <Link
                key={member.id}
                href={`/members/${member.id}`}
                className="block bg-dark-card border border-dark-border rounded-xl p-4 hover:bg-dark-hover transition-colors animate-fadeIn"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-light">
                        {member.name || '未命名'}
                      </span>
                      <span className={`text-xs font-medium ${levelColors[member.level]}`}>
                        {levelNames[member.level]}
                      </span>
                    </div>
                    <p className="text-light-muted text-sm mt-0.5">{member.phone}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-amber font-semibold">{member.total_visits} 次</p>
                    <p className="text-light-muted text-xs">
                      {member.last_visit_at
                        ? new Date(member.last_visit_at).toLocaleDateString('zh-TW')
                        : '尚未來店'}
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
