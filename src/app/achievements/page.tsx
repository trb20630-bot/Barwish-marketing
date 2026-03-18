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

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string | null>(null)

  useEffect(() => {
    fetchAchievements()
  }, [])

  async function fetchAchievements() {
    const { data } = await supabase
      .from('achievements')
      .select('*')
      .order('sort_order', { ascending: true })

    if (data) setAchievements(data)
    setLoading(false)
  }

  const categories = Array.from(new Set(achievements.map((a) => a.category)))

  const filtered = filter
    ? achievements.filter((a) => a.category === filter)
    : achievements

  // Count unlocks per achievement
  const [unlockCounts, setUnlockCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    async function fetchCounts() {
      const { data } = await supabase
        .from('member_achievements')
        .select('achievement_id')

      if (data) {
        const counts: Record<string, number> = {}
        ;(data as { achievement_id: string }[]).forEach((ma) => {
          counts[ma.achievement_id] = (counts[ma.achievement_id] || 0) + 1
        })
        setUnlockCounts(counts)
      }
    }
    fetchCounts()
  }, [])

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <Nav />
      <main className="flex-1 pb-20 md:pb-0">
        <header className="px-6 pt-8 pb-4">
          <h1 className="text-xl font-bold">成就系統</h1>
          <p className="text-light-muted text-sm">
            共 {achievements.length} 個成就
          </p>
        </header>

        {/* Category Filter */}
        <div className="px-6 mb-4 flex gap-2 overflow-x-auto">
          <button
            onClick={() => setFilter(null)}
            className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors ${
              filter === null
                ? 'bg-amber text-dark font-semibold'
                : 'bg-dark-card border border-dark-border text-light-muted'
            }`}
          >
            全部
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors ${
                filter === cat
                  ? 'bg-amber text-dark font-semibold'
                  : 'bg-dark-card border border-dark-border text-light-muted'
              }`}
            >
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
              <div
                key={achievement.id}
                className={`border rounded-xl p-4 ${categoryColors[achievement.category] || 'border-dark-border bg-dark-card'}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-light">
                        {achievement.name}
                      </span>
                      {achievement.is_hidden && (
                        <span className="text-[10px] bg-light-muted/20 text-light-muted px-1.5 py-0.5 rounded">
                          隱藏
                        </span>
                      )}
                    </div>
                    <p className="text-light-muted text-sm mt-0.5">
                      {achievement.description}
                    </p>
                    <p className="text-light-muted/50 text-xs mt-1">
                      {achievement.code}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-amber font-semibold">
                      {unlockCounts[achievement.id] || 0}
                    </p>
                    <p className="text-light-muted text-[10px]">已解鎖</p>
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
