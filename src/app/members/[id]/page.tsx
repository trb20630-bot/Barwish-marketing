'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import { supabase } from '@/lib/supabase'
import type { Member, Visit, Achievement, MemberAchievement } from '@/types/database'

const levelNames: Record<number, string> = { 1: '基礎', 2: '銅級', 3: '銀級', 4: 'VVIP' }
const levelThresholds = [0, 10, 40, 50]

type UnlockedAchievement = MemberAchievement & { achievement: Achievement }

export default function MemberDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [member, setMember] = useState<Member | null>(null)
  const [visits, setVisits] = useState<Visit[]>([])
  const [achievements, setAchievements] = useState<UnlockedAchievement[]>([])
  const [totalAchievements, setTotalAchievements] = useState(0)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', phone: '', line_id: '', telegram_id: '' })

  useEffect(() => {
    fetchData()
  }, [id])

  async function fetchData() {
    setLoading(true)

    const [memberRes, visitsRes, achievementsRes, totalRes] = await Promise.all([
      supabase.from('members').select('*').eq('id', id).single(),
      supabase.from('visits').select('*').eq('member_id', id).order('visit_date', { ascending: false }).limit(20),
      supabase.from('member_achievements').select('*, achievement:achievements(*)').eq('member_id', id).order('unlocked_at', { ascending: false }),
      supabase.from('achievements').select('id', { count: 'exact' }),
    ])

    if (memberRes.data) {
      setMember(memberRes.data)
      setEditForm({
        name: memberRes.data.name || '',
        phone: memberRes.data.phone,
        line_id: memberRes.data.line_id || '',
        telegram_id: memberRes.data.telegram_id || '',
      })
    }
    if (visitsRes.data) setVisits(visitsRes.data)
    if (achievementsRes.data) setAchievements(achievementsRes.data as unknown as UnlockedAchievement[])
    if (totalRes.count !== null) setTotalAchievements(totalRes.count)

    setLoading(false)
  }

  async function handleSave() {
    if (!member) return

    const { error } = await supabase
      .from('members')
      .update({
        name: editForm.name.trim() || null,
        phone: editForm.phone.trim(),
        line_id: editForm.line_id.trim() || null,
        telegram_id: editForm.telegram_id.trim() || null,
      })
      .eq('id', member.id)

    if (!error) {
      setEditing(false)
      fetchData()
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col md:flex-row min-h-screen">
        <Nav />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-light-muted">載入中...</p>
        </main>
      </div>
    )
  }

  if (!member) {
    return (
      <div className="flex flex-col md:flex-row min-h-screen">
        <Nav />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-light-muted">找不到此會員</p>
        </main>
      </div>
    )
  }

  const unlockedCount = achievements.length
  const nextLevel = member.level < 4 ? member.level + 1 : null
  const nextThreshold = nextLevel ? levelThresholds[nextLevel - 1] : null
  const progressPercent = nextThreshold
    ? Math.min((unlockedCount / nextThreshold) * 100, 100)
    : 100

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <Nav />
      <main className="flex-1 pb-20 md:pb-0">
        <header className="px-6 pt-8 pb-4">
          <button
            onClick={() => router.back()}
            className="text-light-muted text-sm mb-2 hover:text-light transition-colors"
          >
            &larr; 返回
          </button>
        </header>

        {/* Member Card */}
        <section className="px-6 mb-6">
          <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
            {editing ? (
              <div className="space-y-3">
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="姓名"
                  className="w-full bg-dark border border-dark-border rounded-lg px-3 py-2 text-light focus:outline-none focus:border-amber"
                />
                <input
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="電話"
                  className="w-full bg-dark border border-dark-border rounded-lg px-3 py-2 text-light focus:outline-none focus:border-amber"
                />
                <input
                  value={editForm.line_id}
                  onChange={(e) => setEditForm({ ...editForm, line_id: e.target.value })}
                  placeholder="Line ID"
                  className="w-full bg-dark border border-dark-border rounded-lg px-3 py-2 text-light focus:outline-none focus:border-amber"
                />
                <input
                  value={editForm.telegram_id}
                  onChange={(e) => setEditForm({ ...editForm, telegram_id: e.target.value })}
                  placeholder="Telegram ID"
                  className="w-full bg-dark border border-dark-border rounded-lg px-3 py-2 text-light focus:outline-none focus:border-amber"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    className="flex-1 bg-amber text-dark font-semibold rounded-lg py-2 hover:bg-amber-light transition-colors"
                  >
                    儲存
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="flex-1 bg-dark-border text-light rounded-lg py-2 hover:bg-dark-hover transition-colors"
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">{member.name || '未命名'}</h2>
                    <p className="text-light-muted">{member.phone}</p>
                  </div>
                  <button
                    onClick={() => setEditing(true)}
                    className="text-light-muted text-sm hover:text-amber transition-colors"
                  >
                    編輯
                  </button>
                </div>

                <div className="mt-4 flex items-center gap-4">
                  <span className={`text-lg font-bold ${
                    member.level === 4 ? 'text-amber' :
                    member.level === 3 ? 'text-gray-300' :
                    member.level === 2 ? 'text-orange-400' : 'text-light-muted'
                  }`}>
                    {levelNames[member.level]}
                  </span>
                  <span className="text-light-muted text-sm">
                    {unlockedCount} / {totalAchievements} 成就
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-light-muted mb-1">
                    <span>等級進度</span>
                    <span>
                      {nextLevel
                        ? `距離${levelNames[nextLevel]}還需 ${Math.max(0, (nextThreshold || 0) - unlockedCount)} 個成就`
                        : '已達最高等級'}
                    </span>
                  </div>
                  <div className="h-2 bg-dark rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <p className="text-xl font-bold text-amber">{member.total_visits}</p>
                    <p className="text-xs text-light-muted">來店次數</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-teal">
                      ${Number(member.total_spent).toLocaleString()}
                    </p>
                    <p className="text-xs text-light-muted">累積消費</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold">{unlockedCount}</p>
                    <p className="text-xs text-light-muted">成就解鎖</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Achievements */}
        <section className="px-6 mb-6">
          <h3 className="text-light-muted text-xs uppercase tracking-wider mb-3">已解鎖成就</h3>
          {achievements.length === 0 ? (
            <p className="text-light-muted text-sm">尚未解鎖任何成就</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {achievements.map((ma) => (
                <div
                  key={ma.id}
                  className="bg-dark-card border border-teal/30 rounded-xl p-3"
                >
                  <p className="font-semibold text-teal text-sm">{ma.achievement?.name}</p>
                  <p className="text-light-muted text-xs mt-0.5">{ma.achievement?.description}</p>
                  <p className="text-light-muted text-[10px] mt-1">
                    {new Date(ma.unlocked_at).toLocaleDateString('zh-TW')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Visit History */}
        <section className="px-6 mb-6">
          <h3 className="text-light-muted text-xs uppercase tracking-wider mb-3">來店記錄</h3>
          {visits.length === 0 ? (
            <p className="text-light-muted text-sm">尚無來店記錄</p>
          ) : (
            <div className="space-y-2">
              {visits.map((visit) => (
                <div
                  key={visit.id}
                  className="bg-dark-card border border-dark-border rounded-xl p-3 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm text-light">
                      {new Date(visit.visit_date).toLocaleDateString('zh-TW')}
                    </p>
                    <div className="flex gap-2 mt-0.5">
                      {visit.weather && (
                        <span className="text-xs text-light-muted">
                          {visit.weather === 'rainy' ? '🌧' : visit.weather === 'sunny' ? '☀️' : '☁️'}
                        </span>
                      )}
                      {visit.arrival_time && (
                        <span className="text-xs text-light-muted">{visit.arrival_time}</span>
                      )}
                    </div>
                  </div>
                  <p className="text-amber font-semibold">
                    ${Number(visit.amount).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
