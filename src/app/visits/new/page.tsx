'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import { supabase } from '@/lib/supabase'
import { checkAndUnlockAchievements } from '@/lib/achievements'
import type { Member, Achievement } from '@/types/database'

export default function NewVisitPage() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [member, setMember] = useState<Member | null>(null)
  const [searching, setSearching] = useState(false)
  const [notFound, setNotFound] = useState(false)

  const [amount, setAmount] = useState('')
  const [weather, setWeather] = useState('cloudy')
  const [arrivalTime, setArrivalTime] = useState(
    new Date().toTimeString().slice(0, 5)
  )
  const [referrerPhone, setReferrerPhone] = useState('')
  const [notes, setNotes] = useState('')

  const [saving, setSaving] = useState(false)
  const [unlockedAchievements, setUnlockedAchievements] = useState<Achievement[]>([])
  const [showSuccess, setShowSuccess] = useState(false)

  async function searchMember() {
    if (!phone.trim()) return
    setSearching(true)
    setNotFound(false)
    setMember(null)

    const { data } = await supabase
      .from('members')
      .select('*')
      .eq('phone', phone.trim())
      .single()

    if (data) {
      setMember(data)
    } else {
      setNotFound(true)
    }
    setSearching(false)
  }

  async function handleSubmit() {
    if (!member) return
    setSaving(true)

    const visitAmount = parseFloat(amount) || 0

    // 1. 新增來店記錄
    let referrerId: string | null = null
    if (referrerPhone.trim()) {
      const { data: referrer } = await supabase
        .from('members')
        .select('id')
        .eq('phone', referrerPhone.trim())
        .single()
      if (referrer) referrerId = referrer.id
    }

    const { data: visit, error } = await supabase
      .from('visits')
      .insert({
        member_id: member.id,
        visit_date: new Date().toISOString().split('T')[0],
        amount: visitAmount,
        weather,
        arrival_time: arrivalTime,
        referrer_id: referrerId,
        notes: notes.trim() || null,
      })
      .select()
      .single()

    if (error || !visit) {
      setSaving(false)
      return
    }

    // 2. 更新會員統計
    const newTotalVisits = member.total_visits + 1
    const newTotalSpent = Number(member.total_spent) + visitAmount
    const now = new Date().toISOString()

    await supabase
      .from('members')
      .update({
        total_visits: newTotalVisits,
        total_spent: newTotalSpent,
        last_visit_at: now,
        first_visit_at: member.first_visit_at || now,
      })
      .eq('id', member.id)

    // 3. 處理引路人
    if (referrerId) {
      const currentMonth = new Date().toISOString().slice(0, 7)
      await supabase.from('referrals').insert({
        referrer_id: referrerId,
        referred_id: member.id,
        referral_month: currentMonth,
      })
    }

    // 4. 檢查成就
    const unlocked = await checkAndUnlockAchievements(
      member.id,
      visit.id,
      { amount: visitAmount, weather, arrival_time: arrivalTime }
    )

    // Also check referrer achievements
    if (referrerId) {
      await checkAndUnlockAchievements(
        referrerId,
        visit.id,
        { amount: 0, weather: null, arrival_time: null }
      )
    }

    setUnlockedAchievements(unlocked)
    setShowSuccess(true)
    setSaving(false)
  }

  function reset() {
    setPhone('')
    setMember(null)
    setNotFound(false)
    setAmount('')
    setWeather('cloudy')
    setArrivalTime(new Date().toTimeString().slice(0, 5))
    setReferrerPhone('')
    setNotes('')
    setUnlockedAchievements([])
    setShowSuccess(false)
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <Nav />
      <main className="flex-1 pb-20 md:pb-0">
        <header className="px-6 pt-8 pb-4">
          <h1 className="text-xl font-bold">來店登記</h1>
          <p className="text-light-muted text-sm">記錄會員來店消費</p>
        </header>

        {/* Success State */}
        {showSuccess ? (
          <div className="px-6 animate-fadeIn">
            <div className="bg-teal/10 border border-teal/30 rounded-2xl p-6 text-center mb-6">
              <span className="text-4xl block mb-3">✅</span>
              <h2 className="text-xl font-bold text-teal mb-1">登記完成！</h2>
              <p className="text-light-muted">
                {member?.name || '會員'} 的來店記錄已儲存
              </p>
            </div>

            {/* Unlocked Achievements */}
            {unlockedAchievements.length > 0 && (
              <div className="mb-6">
                <h3 className="text-teal font-semibold mb-3 text-center">
                  🎉 解鎖了 {unlockedAchievements.length} 個成就！
                </h3>
                <div className="space-y-2">
                  {unlockedAchievements.map((a) => (
                    <div
                      key={a.id}
                      className="bg-dark-card border border-teal/50 rounded-xl p-4 animate-unlock"
                    >
                      <p className="font-bold text-teal">{a.name}</p>
                      <p className="text-light-muted text-sm">{a.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={reset}
                className="flex-1 bg-amber hover:bg-amber-light text-dark font-bold rounded-xl py-4 text-lg transition-colors"
              >
                繼續登記
              </button>
              <button
                onClick={() => router.push(`/members/${member?.id}`)}
                className="flex-1 bg-dark-card border border-dark-border text-light rounded-xl py-4 text-lg hover:bg-dark-hover transition-colors"
              >
                查看會員
              </button>
            </div>
          </div>
        ) : (
          <div className="px-6 space-y-4">
            {/* Step 1: Find Member */}
            <div className="bg-dark-card border border-dark-border rounded-2xl p-5">
              <h2 className="text-sm text-light-muted mb-3">1. 查詢會員</h2>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchMember()}
                  placeholder="輸入電話號碼"
                  className="flex-1 bg-dark border border-dark-border rounded-xl px-4 py-3 text-light text-lg placeholder:text-light-muted/50 focus:outline-none focus:border-amber transition-colors"
                  autoFocus
                />
                <button
                  onClick={searchMember}
                  disabled={searching}
                  className="bg-amber text-dark font-semibold px-6 rounded-xl hover:bg-amber-light transition-colors disabled:opacity-50"
                >
                  {searching ? '...' : '查詢'}
                </button>
              </div>

              {notFound && (
                <div className="mt-3 flex items-center justify-between bg-red-900/20 border border-red-700/30 rounded-lg px-4 py-3">
                  <span className="text-red-300 text-sm">找不到此會員</span>
                  <button
                    onClick={() => router.push(`/members/new?phone=${phone}`)}
                    className="text-amber text-sm font-semibold hover:text-amber-light"
                  >
                    建立新會員 &rarr;
                  </button>
                </div>
              )}

              {member && (
                <div className="mt-3 bg-dark rounded-lg px-4 py-3 flex items-center justify-between animate-fadeIn">
                  <div>
                    <span className="font-semibold text-light">{member.name || '未命名'}</span>
                    <span className="text-light-muted text-sm ml-2">
                      {member.level === 4 ? 'VVIP' : member.level === 3 ? '銀級' : member.level === 2 ? '銅級' : '基礎'}
                    </span>
                  </div>
                  <span className="text-amber text-sm">{member.total_visits} 次來店</span>
                </div>
              )}
            </div>

            {/* Step 2: Visit Details */}
            {member && (
              <div className="bg-dark-card border border-dark-border rounded-2xl p-5 animate-fadeIn">
                <h2 className="text-sm text-light-muted mb-3">2. 消費資訊</h2>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-light-muted">消費金額</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0"
                      className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3 text-light text-2xl font-bold placeholder:text-light-muted/30 focus:outline-none focus:border-amber transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-light-muted">天氣</label>
                      <div className="flex gap-2 mt-1">
                        {[
                          { value: 'sunny', label: '☀️' },
                          { value: 'cloudy', label: '☁️' },
                          { value: 'rainy', label: '🌧' },
                        ].map((w) => (
                          <button
                            key={w.value}
                            onClick={() => setWeather(w.value)}
                            className={`flex-1 py-2 rounded-lg text-xl transition-colors ${
                              weather === w.value
                                ? 'bg-amber/20 border border-amber'
                                : 'bg-dark border border-dark-border'
                            }`}
                          >
                            {w.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-light-muted">到店時間</label>
                      <input
                        type="time"
                        value={arrivalTime}
                        onChange={(e) => setArrivalTime(e.target.value)}
                        className="w-full bg-dark border border-dark-border rounded-xl px-4 py-2 text-light focus:outline-none focus:border-amber transition-colors mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-light-muted">引路人電話（選填）</label>
                    <input
                      type="tel"
                      value={referrerPhone}
                      onChange={(e) => setReferrerPhone(e.target.value)}
                      placeholder="帶這位會員來的人的電話"
                      className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3 text-light placeholder:text-light-muted/30 focus:outline-none focus:border-amber transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-light-muted">備註（選填）</label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="特別事項"
                      className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3 text-light placeholder:text-light-muted/30 focus:outline-none focus:border-amber transition-colors"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Submit */}
            {member && (
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="w-full bg-amber hover:bg-amber-light text-dark font-bold rounded-2xl py-5 text-xl transition-colors disabled:opacity-50 animate-fadeIn"
              >
                {saving ? '儲存中...' : '確認登記'}
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
