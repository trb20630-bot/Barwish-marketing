'use client'

import { useEffect, useState } from 'react'
import Nav from '@/components/Nav'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type VisitRow = {
  id: string
  visit_date: string
  amount: number
  weather: string | null
  arrival_time: string | null
  notes: string | null
  member: { id: string; name: string | null; phone: string } | null
}

export default function VisitsPage() {
  const [visits, setVisits] = useState<VisitRow[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0])
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    fetchVisits()
  }, [dateFilter, showAll])

  async function fetchVisits() {
    setLoading(true)
    let query = supabase
      .from('visits')
      .select('id, visit_date, amount, weather, arrival_time, notes, member:members!visits_member_id_fkey(id, name, phone)')
      .order('created_at', { ascending: false })

    if (!showAll) {
      query = query.eq('visit_date', dateFilter)
    } else {
      query = query.limit(100)
    }

    const { data } = await query
    if (data) setVisits(data as unknown as VisitRow[])
    setLoading(false)
  }

  async function deleteVisit(visitId: string) {
    if (!confirm('確定要刪除此來店記錄？')) return

    const visit = visits.find((v) => v.id === visitId)
    if (!visit) return

    // Delete visit
    await supabase.from('visits').delete().eq('id', visitId)

    // Update member stats
    if (visit.member) {
      const memberId = (visit.member as { id: string }).id
      const { data: member } = await supabase.from('members').select('total_visits, total_spent').eq('id', memberId).single()
      if (member) {
        await supabase.from('members').update({
          total_visits: Math.max(0, member.total_visits - 1),
          total_spent: Math.max(0, Number(member.total_spent) - Number(visit.amount)),
        }).eq('id', memberId)
      }
    }

    // Also remove any achievements triggered by this visit
    await supabase.from('member_achievements').delete().eq('trigger_visit_id', visitId)

    fetchVisits()
  }

  const totalRevenue = visits.reduce((sum, v) => sum + Number(v.amount), 0)
  const weatherIcon = (w: string | null) => w === 'rainy' ? '🌧' : w === 'sunny' ? '☀️' : '☁️'

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <Nav />
      <main className="flex-1 pb-20 md:pb-0">
        <header className="px-6 pt-8 pb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">來店記錄</h1>
            <p className="text-light-muted text-sm">
              {visits.length} 筆記錄 | 營收 ${totalRevenue.toLocaleString()}
            </p>
          </div>
          <Link
            href="/visits/new"
            className="bg-amber text-dark px-4 py-2 rounded-lg text-sm font-semibold hover:bg-amber-light transition-colors"
          >
            + 登記
          </Link>
        </header>

        {/* Date Filter */}
        <div className="px-6 mb-4 flex gap-2 items-center">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => { setDateFilter(e.target.value); setShowAll(false) }}
            className="bg-dark-card border border-dark-border rounded-lg px-3 py-2 text-light text-sm focus:outline-none focus:border-amber"
          />
          <button
            onClick={() => { setDateFilter(new Date().toISOString().split('T')[0]); setShowAll(false) }}
            className={`px-3 py-2 rounded-lg text-xs transition-colors ${
              !showAll && dateFilter === new Date().toISOString().split('T')[0]
                ? 'bg-amber text-dark font-semibold'
                : 'bg-dark-card border border-dark-border text-light-muted'
            }`}
          >
            今天
          </button>
          <button
            onClick={() => setShowAll(!showAll)}
            className={`px-3 py-2 rounded-lg text-xs transition-colors ${
              showAll
                ? 'bg-amber text-dark font-semibold'
                : 'bg-dark-card border border-dark-border text-light-muted'
            }`}
          >
            全部
          </button>
        </div>

        {/* Visit List */}
        <div className="px-6 space-y-2">
          {loading ? (
            <p className="text-light-muted text-center py-12">載入中...</p>
          ) : visits.length === 0 ? (
            <p className="text-light-muted text-center py-12">
              {showAll ? '尚無來店記錄' : `${dateFilter} 無來店記錄`}
            </p>
          ) : (
            visits.map((visit) => {
              const member = visit.member as { id: string; name: string | null; phone: string } | null
              return (
                <div
                  key={visit.id}
                  className="bg-dark-card border border-dark-border rounded-xl p-4 animate-fadeIn"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {member ? (
                          <Link href={`/members/${member.id}`} className="font-semibold text-light hover:text-amber transition-colors">
                            {member.name || member.phone}
                          </Link>
                        ) : (
                          <span className="text-light-muted">未知會員</span>
                        )}
                        {visit.weather && <span className="text-sm">{weatherIcon(visit.weather)}</span>}
                      </div>
                      <div className="flex gap-3 mt-1 text-xs text-light-muted">
                        <span>{visit.visit_date}</span>
                        {visit.arrival_time && <span>{visit.arrival_time.slice(0, 5)}</span>}
                        {visit.notes && <span className="truncate max-w-[120px]">{visit.notes}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-amber font-bold text-lg">${Number(visit.amount).toLocaleString()}</p>
                      <button
                        onClick={() => deleteVisit(visit.id)}
                        className="text-light-muted/40 hover:text-red-400 text-xs transition-colors"
                        title="刪除"
                      >
                        ✕
                      </button>
                    </div>
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
