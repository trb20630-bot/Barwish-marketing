'use client'

import { useEffect, useState } from 'react'
import Nav from '@/components/Nav'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Member } from '@/types/database'

const levelNames: Record<number, string> = { 1: '基礎', 2: '銅級', 3: '銀級', 4: 'VVIP' }

export default function ExpiringMembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchExpiring()
  }, [])

  async function fetchExpiring() {
    const twoWeeksLater = new Date()
    twoWeeksLater.setDate(twoWeeksLater.getDate() + 14)

    const { data } = await supabase
      .from('members')
      .select('*')
      .eq('is_active', true)
      .gte('level', 2)
      .lte('level_expires_at', twoWeeksLater.toISOString())
      .order('level_expires_at', { ascending: true })

    if (data) setMembers(data)
    setLoading(false)
  }

  async function handleDowngrade(member: Member) {
    if (!confirm(`確定要將 ${member.name || member.phone} 從 ${levelNames[member.level]} 降為 ${levelNames[Math.max(1, member.level - 1)]}？`)) return

    const newLevel = Math.max(1, member.level - 1)
    await supabase.from('members').update({ level: newLevel }).eq('id', member.id)
    fetchExpiring()
  }

  async function handleExtend(member: Member) {
    const expiresAt = new Date()
    expiresAt.setMonth(expiresAt.getMonth() + 3)

    await supabase.from('members').update({
      level_expires_at: expiresAt.toISOString(),
    }).eq('id', member.id)

    fetchExpiring()
  }

  function daysUntilExpiry(dateStr: string | null) {
    if (!dateStr) return null
    const diff = new Date(dateStr).getTime() - Date.now()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <Nav />
      <main className="flex-1 pb-20 md:pb-0">
        <header className="px-6 pt-8 pb-4">
          <Link href="/members" className="text-light-muted text-sm hover:text-light transition-colors">
            &larr; 會員列表
          </Link>
          <h1 className="text-xl font-bold mt-2">等級即將到期</h1>
          <p className="text-light-muted text-sm">
            {members.length} 位會員需注意
          </p>
        </header>

        <div className="px-6 space-y-3">
          {loading ? (
            <p className="text-light-muted text-center py-12">載入中...</p>
          ) : members.length === 0 ? (
            <p className="text-light-muted text-center py-12">目前沒有即將到期的會員</p>
          ) : (
            members.map((member) => {
              const days = daysUntilExpiry(member.level_expires_at)
              const isExpired = days !== null && days < 0
              return (
                <div key={member.id} className="bg-dark-card border border-dark-border rounded-xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <Link href={`/members/${member.id}`} className="font-semibold text-light hover:text-amber transition-colors">
                        {member.name || '未命名'}
                      </Link>
                      <p className="text-light-muted text-sm">{member.phone}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-bold ${member.level === 4 ? 'text-amber' : member.level === 3 ? 'text-gray-300' : 'text-orange-400'}`}>
                        {levelNames[member.level]}
                      </span>
                      <p className={`text-xs mt-0.5 ${isExpired ? 'text-red-400' : 'text-amber'}`}>
                        {isExpired ? `已逾期 ${Math.abs(days!)} 天` : `${days} 天後到期`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleExtend(member)}
                      className="flex-1 bg-teal/20 text-teal border border-teal/30 rounded-lg py-2 text-sm font-medium hover:bg-teal/30 transition-colors"
                    >
                      延長 3 個月
                    </button>
                    <button
                      onClick={() => handleDowngrade(member)}
                      className="flex-1 bg-red-900/20 text-red-300 border border-red-700/30 rounded-lg py-2 text-sm font-medium hover:bg-red-900/30 transition-colors"
                    >
                      降級
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </main>
    </div>
  )
}
