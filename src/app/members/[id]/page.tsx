'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Member, Visit, Achievement, MemberAchievement } from '@/types/database'

const levelNames: Record<number, string> = { 1: '基礎', 2: '銅級', 3: '銀級', 4: 'VVIP' }
const levelThresholds = [0, 10, 40, 50]

type UnlockedAchievement = MemberAchievement & { achievement: Achievement }
type ReferralRecord = {
  id: string
  created_at: string
  referred: { id: string; name: string | null; phone: string } | null
}

export default function MemberDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [member, setMember] = useState<Member | null>(null)
  const [visits, setVisits] = useState<Visit[]>([])
  const [achievements, setAchievements] = useState<UnlockedAchievement[]>([])
  const [totalAchievements, setTotalAchievements] = useState(0)
  const [referrals, setReferrals] = useState<ReferralRecord[]>([])
  const [referredBy, setReferredBy] = useState<{ name: string | null; phone: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', phone: '', line_id: '', telegram_id: '' })
  const [tab, setTab] = useState<'achievements' | 'visits' | 'referrals'>('achievements')

  const fetchData = useCallback(async () => {
    setLoading(true)

    const [memberRes, visitsRes, achievementsRes, totalRes, referralsRes, referredByRes] = await Promise.all([
      supabase.from('members').select('*').eq('id', id).single(),
      supabase.from('visits').select('*').eq('member_id', id).order('visit_date', { ascending: false }).limit(50),
      supabase.from('member_achievements').select('*, achievement:achievements(*)').eq('member_id', id).order('unlocked_at', { ascending: false }),
      supabase.from('achievements').select('id', { count: 'exact' }),
      supabase.from('referrals').select('id, created_at, referred:referred_id(id, name, phone)').eq('referrer_id', id).order('created_at', { ascending: false }),
      supabase.from('referrals').select('referrer:referrer_id(name, phone)').eq('referred_id', id).limit(1),
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
    if (referralsRes.data) setReferrals(referralsRes.data as unknown as ReferralRecord[])
    if (referredByRes.data && referredByRes.data.length > 0) {
      const ref = referredByRes.data[0] as unknown as { referrer: { name: string | null; phone: string } | null }
      setReferredBy(ref.referrer)
    }

    setLoading(false)
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

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

  async function handleDeactivate() {
    if (!member) return
    if (!confirm(`確定要停用 ${member.name || member.phone} 的會員資格？`)) return
    await supabase.from('members').update({ is_active: false }).eq('id', member.id)
    router.push('/members')
  }

  async function handleSetLevel(level: number) {
    if (!member) return
    const expiresAt = new Date()
    expiresAt.setMonth(expiresAt.getMonth() + 3)
    await supabase.from('members').update({
      level,
      level_expires_at: expiresAt.toISOString(),
    }).eq('id', member.id)
    fetchData()
  }

  async function handleExportCSV() {
    if (!member) return
    const rows = [
      ['日期', '消費金額', '天氣', '到店時間', '備註'],
      ...visits.map((v) => [
        v.visit_date,
        String(v.amount),
        v.weather || '',
        v.arrival_time || '',
        v.notes || '',
      ]),
    ]
    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${member.name || member.phone}_來店記錄.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex flex-col md:flex-row min-h-screen">
        <Nav />
        <main className="flex-1 flex items-center justify-center"><p className="text-light-muted">載入中...</p></main>
      </div>
    )
  }

  if (!member) {
    return (
      <div className="flex flex-col md:flex-row min-h-screen">
        <Nav />
        <main className="flex-1 flex items-center justify-center"><p className="text-light-muted">找不到此會員</p></main>
      </div>
    )
  }

  const unlockedCount = achievements.length
  const nextLevel = member.level < 4 ? member.level + 1 : null
  const nextThreshold = nextLevel ? levelThresholds[nextLevel - 1] : null
  const progressPercent = nextThreshold ? Math.min((unlockedCount / nextThreshold) * 100, 100) : 100

  const daysUntilExpiry = member.level_expires_at
    ? Math.ceil((new Date(member.level_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <Nav />
      <main className="flex-1 pb-20 md:pb-0">
        <header className="px-6 pt-8 pb-4 flex items-center justify-between">
          <button onClick={() => router.back()} className="text-light-muted text-sm hover:text-light transition-colors">
            &larr; 返回
          </button>
          <div className="flex gap-2">
            <button onClick={handleExportCSV} className="text-light-muted text-xs hover:text-amber transition-colors px-2 py-1 border border-dark-border rounded-lg">
              匯出 CSV
            </button>
            <button onClick={handleDeactivate} className="text-red-400/60 text-xs hover:text-red-400 transition-colors px-2 py-1 border border-dark-border rounded-lg">
              停用
            </button>
          </div>
        </header>

        {/* Member Card */}
        <section className="px-6 mb-6">
          <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
            {editing ? (
              <div className="space-y-3">
                <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="姓名"
                  className="w-full bg-dark border border-dark-border rounded-lg px-3 py-2 text-light focus:outline-none focus:border-amber" />
                <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="電話"
                  className="w-full bg-dark border border-dark-border rounded-lg px-3 py-2 text-light focus:outline-none focus:border-amber" />
                <input value={editForm.line_id} onChange={(e) => setEditForm({ ...editForm, line_id: e.target.value })} placeholder="Line ID"
                  className="w-full bg-dark border border-dark-border rounded-lg px-3 py-2 text-light focus:outline-none focus:border-amber" />
                <input value={editForm.telegram_id} onChange={(e) => setEditForm({ ...editForm, telegram_id: e.target.value })} placeholder="Telegram ID"
                  className="w-full bg-dark border border-dark-border rounded-lg px-3 py-2 text-light focus:outline-none focus:border-amber" />
                <div className="flex gap-2">
                  <button onClick={handleSave} className="flex-1 bg-amber text-dark font-semibold rounded-lg py-2 hover:bg-amber-light transition-colors">儲存</button>
                  <button onClick={() => setEditing(false)} className="flex-1 bg-dark-border text-light rounded-lg py-2 hover:bg-dark-hover transition-colors">取消</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">{member.name || '未命名'}</h2>
                    <p className="text-light-muted">{member.phone}</p>
                    {member.line_id && <p className="text-light-muted text-xs mt-0.5">Line: {member.line_id}</p>}
                    {member.telegram_id && <p className="text-light-muted text-xs">TG: {member.telegram_id}</p>}
                    {referredBy && (
                      <p className="text-light-muted text-xs mt-1">
                        由 <span className="text-amber">{referredBy.name || referredBy.phone}</span> 引薦
                      </p>
                    )}
                  </div>
                  <button onClick={() => setEditing(true)} className="text-light-muted text-sm hover:text-amber transition-colors">編輯</button>
                </div>

                {/* Level + Badge */}
                <div className="mt-4 flex items-center gap-3">
                  <span className={`text-lg font-bold px-3 py-1 rounded-lg ${
                    member.level === 4 ? 'bg-amber/20 text-amber' :
                    member.level === 3 ? 'bg-gray-300/20 text-gray-300' :
                    member.level === 2 ? 'bg-orange-400/20 text-orange-400' : 'bg-light-muted/10 text-light-muted'
                  }`}>
                    {levelNames[member.level]}
                  </span>
                  <span className="text-light-muted text-sm">{unlockedCount} / {totalAchievements} 成就</span>
                  {daysUntilExpiry !== null && member.level >= 2 && (
                    <span className={`text-xs px-2 py-0.5 rounded ${daysUntilExpiry <= 14 ? 'bg-red-900/30 text-red-300' : 'bg-dark text-light-muted'}`}>
                      {daysUntilExpiry > 0 ? `${daysUntilExpiry} 天到期` : '已逾期'}
                    </span>
                  )}
                </div>

                {/* Manual Level Adjust */}
                <div className="mt-3 flex gap-1">
                  <span className="text-light-muted text-xs mr-2 self-center">手動調整：</span>
                  {[1, 2, 3, 4].map((lv) => (
                    <button
                      key={lv}
                      onClick={() => handleSetLevel(lv)}
                      disabled={member.level === lv}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        member.level === lv
                          ? 'bg-amber/30 text-amber font-semibold'
                          : 'bg-dark border border-dark-border text-light-muted hover:text-light'
                      }`}
                    >
                      {levelNames[lv]}
                    </button>
                  ))}
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-light-muted mb-1">
                    <span>等級進度</span>
                    <span>
                      {nextLevel ? `距離${levelNames[nextLevel]}還需 ${Math.max(0, (nextThreshold || 0) - unlockedCount)} 個成就` : '已達最高等級'}
                    </span>
                  </div>
                  <div className="h-2 bg-dark rounded-full overflow-hidden">
                    <div className="h-full bg-amber rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                  </div>
                </div>

                {/* Stats */}
                <div className="mt-4 grid grid-cols-4 gap-2">
                  <div className="text-center">
                    <p className="text-xl font-bold text-amber">{member.total_visits}</p>
                    <p className="text-[10px] text-light-muted">來店</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-teal">${Number(member.total_spent).toLocaleString()}</p>
                    <p className="text-[10px] text-light-muted">消費</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold">{unlockedCount}</p>
                    <p className="text-[10px] text-light-muted">成就</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-blue-400">{referrals.length}</p>
                    <p className="text-[10px] text-light-muted">引路</p>
                  </div>
                </div>

                {/* Member Since */}
                <div className="mt-3 flex gap-4 text-xs text-light-muted">
                  {member.first_visit_at && <span>首訪：{new Date(member.first_visit_at).toLocaleDateString('zh-TW')}</span>}
                  {member.last_visit_at && <span>最近：{new Date(member.last_visit_at).toLocaleDateString('zh-TW')}</span>}
                </div>
              </>
            )}
          </div>
        </section>

        {/* Tabs */}
        <div className="px-6 mb-4 flex gap-1 bg-dark-card border border-dark-border rounded-xl p-1">
          {[
            { key: 'achievements' as const, label: `成就 (${unlockedCount})` },
            { key: 'visits' as const, label: `來店 (${visits.length})` },
            { key: 'referrals' as const, label: `引路 (${referrals.length})` },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                tab === t.key ? 'bg-amber text-dark font-semibold' : 'text-light-muted hover:text-light'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="px-6">
          {/* Achievements Tab */}
          {tab === 'achievements' && (
            achievements.length === 0 ? (
              <p className="text-light-muted text-sm py-6 text-center">尚未解鎖任何成就</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {achievements.map((ma) => (
                  <div key={ma.id} className="bg-dark-card border border-teal/30 rounded-xl p-3">
                    <p className="font-semibold text-teal text-sm">{ma.achievement?.name}</p>
                    <p className="text-light-muted text-xs mt-0.5">{ma.achievement?.description}</p>
                    <p className="text-light-muted text-[10px] mt-1">
                      {new Date(ma.unlocked_at).toLocaleDateString('zh-TW')}
                    </p>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Visits Tab */}
          {tab === 'visits' && (
            visits.length === 0 ? (
              <p className="text-light-muted text-sm py-6 text-center">尚無來店記錄</p>
            ) : (
              <div className="space-y-2">
                {visits.map((visit) => (
                  <div key={visit.id} className="bg-dark-card border border-dark-border rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-light">{new Date(visit.visit_date).toLocaleDateString('zh-TW')}</p>
                      <div className="flex gap-2 mt-0.5">
                        {visit.weather && (
                          <span className="text-xs text-light-muted">
                            {visit.weather === 'rainy' ? '🌧' : visit.weather === 'sunny' ? '☀️' : '☁️'}
                          </span>
                        )}
                        {visit.arrival_time && <span className="text-xs text-light-muted">{visit.arrival_time}</span>}
                        {visit.notes && <span className="text-xs text-light-muted truncate max-w-[100px]">{visit.notes}</span>}
                      </div>
                    </div>
                    <p className="text-amber font-semibold">${Number(visit.amount).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Referrals Tab */}
          {tab === 'referrals' && (
            referrals.length === 0 ? (
              <p className="text-light-muted text-sm py-6 text-center">尚無引路記錄</p>
            ) : (
              <div className="space-y-2">
                {referrals.map((ref) => {
                  const referred = ref.referred as { id: string; name: string | null; phone: string } | null
                  return (
                    <div key={ref.id} className="bg-dark-card border border-dark-border rounded-xl p-3 flex items-center justify-between">
                      <div>
                        {referred ? (
                          <Link href={`/members/${referred.id}`} className="text-sm font-medium text-light hover:text-amber transition-colors">
                            {referred.name || referred.phone}
                          </Link>
                        ) : (
                          <span className="text-light-muted text-sm">未知</span>
                        )}
                      </div>
                      <p className="text-light-muted text-xs">{new Date(ref.created_at).toLocaleDateString('zh-TW')}</p>
                    </div>
                  )
                })}
              </div>
            )
          )}
        </div>
      </main>
    </div>
  )
}
