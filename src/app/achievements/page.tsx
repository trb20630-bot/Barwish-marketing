'use client'

import { useEffect, useState } from 'react'
import Nav from '@/components/Nav'
import { supabase } from '@/lib/supabase'
import type { Achievement } from '@/types/database'

const categoryLabels: Record<string, string> = {
  visits: '來店次數',
  spending: '消費金額',
  referrals: '引路人',
  events: '活動參與',
  hidden: '隱藏彩蛋',
}

const categoryColors: Record<string, string> = {
  visits: 'border-amber/30 bg-amber/5',
  spending: 'border-teal/30 bg-teal/5',
  referrals: 'border-blue-500/30 bg-blue-500/5',
  events: 'border-purple-500/30 bg-purple-500/5',
  hidden: 'border-light-muted/20 bg-light-muted/5',
}

const conditionTypeLabels: Record<string, string> = {
  visit_count: '來店次數',
  consecutive_weeks: '連續週數',
  single_spend: '單次消費',
  total_spend: '累積消費',
  weather: '天氣',
  late_night: '深夜',
  birthday_week: '生日',
  referral_count: '引路次數',
  event_type: '活動參與',
  month: '月份',
}

type EditingAchievement = {
  id?: string
  code: string
  name: string
  description: string
  category: string
  condition_type: string
  condition_value: string
  is_hidden: boolean
  sort_order: number
}

const emptyForm: EditingAchievement = {
  code: '', name: '', description: '', category: 'visits',
  condition_type: 'visit_count', condition_value: '', is_hidden: false, sort_order: 0,
}

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string | null>(null)
  const [unlockCounts, setUnlockCounts] = useState<Record<string, number>>({})
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<EditingAchievement>({ ...emptyForm })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchAchievements()
    fetchCounts()
  }, [])

  async function fetchAchievements() {
    const { data } = await supabase.from('achievements').select('*').order('sort_order', { ascending: true })
    if (data) setAchievements(data)
    setLoading(false)
  }

  async function fetchCounts() {
    const { data } = await supabase.from('member_achievements').select('achievement_id')
    if (data) {
      const counts: Record<string, number> = {}
      ;(data as { achievement_id: string }[]).forEach((ma) => {
        counts[ma.achievement_id] = (counts[ma.achievement_id] || 0) + 1
      })
      setUnlockCounts(counts)
    }
  }

  function startEdit(achievement: Achievement) {
    const cond = achievement.condition as Record<string, unknown>
    setForm({
      id: achievement.id,
      code: achievement.code,
      name: achievement.name,
      description: achievement.description || '',
      category: achievement.category,
      condition_type: (cond.type as string) || 'visit_count',
      condition_value: String(cond.value ?? ''),
      is_hidden: achievement.is_hidden,
      sort_order: achievement.sort_order,
    })
    setShowForm(true)
    setError('')
  }

  function startNew() {
    setForm({ ...emptyForm, sort_order: achievements.length + 1 })
    setShowForm(true)
    setError('')
  }

  async function handleSave() {
    setError('')
    if (!form.code.trim() || !form.name.trim()) {
      setError('請填寫代碼和名稱')
      return
    }

    setSaving(true)

    const condition: Record<string, unknown> = { type: form.condition_type }
    if (form.condition_value) {
      const num = Number(form.condition_value)
      condition.value = isNaN(num) ? form.condition_value : num
    }

    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      description: form.description.trim(),
      category: form.category,
      condition,
      is_hidden: form.is_hidden,
      sort_order: form.sort_order,
    }

    if (form.id) {
      const { error: err } = await supabase.from('achievements').update(payload).eq('id', form.id)
      if (err) { setError(err.message); setSaving(false); return }
    } else {
      const { error: err } = await supabase.from('achievements').insert(payload)
      if (err) {
        setError(err.code === '23505' ? '代碼已存在' : err.message)
        setSaving(false)
        return
      }
    }

    setShowForm(false)
    setSaving(false)
    fetchAchievements()
  }

  async function handleDelete(achievement: Achievement) {
    if (!confirm(`確定要刪除成就「${achievement.name}」？已解鎖的記錄也會被移除。`)) return
    await supabase.from('member_achievements').delete().eq('achievement_id', achievement.id)
    await supabase.from('achievements').delete().eq('id', achievement.id)
    fetchAchievements()
    fetchCounts()
  }

  const categories = Array.from(new Set(achievements.map((a) => a.category)))
  const filtered = filter ? achievements.filter((a) => a.category === filter) : achievements

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <Nav />
      <main className="flex-1 pb-20 md:pb-0">
        <header className="px-6 pt-8 pb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">成就系統</h1>
            <p className="text-light-muted text-sm">共 {achievements.length} 個成就</p>
          </div>
          <button
            onClick={startNew}
            className="bg-amber text-dark px-4 py-2 rounded-lg text-sm font-semibold hover:bg-amber-light transition-colors"
          >
            + 新增
          </button>
        </header>

        {/* Form Modal */}
        {showForm && (
          <div className="px-6 mb-6 animate-fadeIn">
            <div className="bg-dark-card border border-amber/30 rounded-2xl p-5 space-y-3">
              <h3 className="text-amber font-semibold">{form.id ? '編輯成就' : '新增成就'}</h3>

              {error && (
                <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg px-3 py-2 text-sm">{error}</div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-light-muted">代碼 *</label>
                  <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="visit_10"
                    className="w-full bg-dark border border-dark-border rounded-lg px-3 py-2 text-light text-sm focus:outline-none focus:border-amber" />
                </div>
                <div>
                  <label className="text-xs text-light-muted">名稱 *</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="熟面孔"
                    className="w-full bg-dark border border-dark-border rounded-lg px-3 py-2 text-light text-sm focus:outline-none focus:border-amber" />
                </div>
              </div>

              <div>
                <label className="text-xs text-light-muted">說明</label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="來店 10 次"
                  className="w-full bg-dark border border-dark-border rounded-lg px-3 py-2 text-light text-sm focus:outline-none focus:border-amber" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-light-muted">分類</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full bg-dark border border-dark-border rounded-lg px-3 py-2 text-light text-sm focus:outline-none focus:border-amber">
                    {Object.entries(categoryLabels).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-light-muted">排序</label>
                  <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                    className="w-full bg-dark border border-dark-border rounded-lg px-3 py-2 text-light text-sm focus:outline-none focus:border-amber" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-light-muted">條件類型</label>
                  <select value={form.condition_type} onChange={(e) => setForm({ ...form, condition_type: e.target.value })}
                    className="w-full bg-dark border border-dark-border rounded-lg px-3 py-2 text-light text-sm focus:outline-none focus:border-amber">
                    {Object.entries(conditionTypeLabels).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-light-muted">條件值</label>
                  <input value={form.condition_value} onChange={(e) => setForm({ ...form, condition_value: e.target.value })} placeholder="10"
                    className="w-full bg-dark border border-dark-border rounded-lg px-3 py-2 text-light text-sm focus:outline-none focus:border-amber" />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-light-muted cursor-pointer">
                <input type="checkbox" checked={form.is_hidden} onChange={(e) => setForm({ ...form, is_hidden: e.target.checked })}
                  className="rounded border-dark-border" />
                隱藏成就（彩蛋）
              </label>

              <div className="flex gap-2">
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 bg-amber text-dark font-semibold rounded-lg py-2 hover:bg-amber-light transition-colors disabled:opacity-50">
                  {saving ? '儲存中...' : '儲存'}
                </button>
                <button onClick={() => setShowForm(false)}
                  className="flex-1 bg-dark-border text-light rounded-lg py-2 hover:bg-dark-hover transition-colors">
                  取消
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Category Filter */}
        <div className="px-6 mb-4 flex gap-2 overflow-x-auto">
          <button onClick={() => setFilter(null)}
            className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors ${filter === null ? 'bg-amber text-dark font-semibold' : 'bg-dark-card border border-dark-border text-light-muted'}`}>
            全部
          </button>
          {categories.map((cat) => (
            <button key={cat} onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors ${filter === cat ? 'bg-amber text-dark font-semibold' : 'bg-dark-card border border-dark-border text-light-muted'}`}>
              {categoryLabels[cat] || cat}
            </button>
          ))}
        </div>

        {/* Achievement List */}
        <div className="px-6 space-y-2">
          {loading ? (
            <p className="text-light-muted text-center py-12">載入中...</p>
          ) : filtered.length === 0 ? (
            <p className="text-light-muted text-center py-12">尚無成就資料</p>
          ) : (
            filtered.map((achievement) => (
              <div key={achievement.id}
                className={`border rounded-xl p-4 ${categoryColors[achievement.category] || 'border-dark-border bg-dark-card'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1" onClick={() => startEdit(achievement)} style={{ cursor: 'pointer' }}>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-light">{achievement.name}</span>
                      {achievement.is_hidden && (
                        <span className="text-[10px] bg-light-muted/20 text-light-muted px-1.5 py-0.5 rounded">隱藏</span>
                      )}
                    </div>
                    <p className="text-light-muted text-sm mt-0.5">{achievement.description}</p>
                    <p className="text-light-muted/50 text-xs mt-1">{achievement.code}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-amber font-semibold">{unlockCounts[achievement.id] || 0}</p>
                      <p className="text-light-muted text-[10px]">已解鎖</p>
                    </div>
                    <button onClick={() => handleDelete(achievement)}
                      className="text-light-muted/30 hover:text-red-400 text-xs transition-colors" title="刪除">
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
