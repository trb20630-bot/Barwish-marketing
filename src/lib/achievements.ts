import { supabase } from './supabase'
import type { Achievement, AchievementCondition, Member, Visit } from '@/types/database'

/**
 * 檢查並解鎖成就
 * 每次來店記錄新增時呼叫
 */
export async function checkAndUnlockAchievements(
  memberId: string,
  visitId: string,
  visit: { amount: number; weather: string | null; arrival_time: string | null }
): Promise<Achievement[]> {
  // 1. 取得會員資料
  const { data: member } = await supabase
    .from('members')
    .select('*')
    .eq('id', memberId)
    .single()

  if (!member) return []

  // 2. 取得所有成就
  const { data: allAchievements } = await supabase
    .from('achievements')
    .select('*')

  if (!allAchievements) return []

  // 3. 取得已解鎖的成就 ID
  const { data: unlocked } = await supabase
    .from('member_achievements')
    .select('achievement_id')
    .eq('member_id', memberId)

  const unlockedIds = new Set((unlocked || []).map((u) => u.achievement_id))

  // 4. 取得引路人數量
  const { count: referralCount } = await supabase
    .from('referrals')
    .select('*', { count: 'exact', head: true })
    .eq('referrer_id', memberId)

  // 5. 檢查每個未解鎖的成就
  const newlyUnlocked: Achievement[] = []

  for (const achievement of allAchievements) {
    if (unlockedIds.has(achievement.id)) continue

    const condition = achievement.condition as AchievementCondition
    let satisfied = false

    switch (condition.type) {
      case 'visit_count':
        satisfied = member.total_visits >= condition.value
        break

      case 'single_spend':
        satisfied = visit.amount >= condition.value
        break

      case 'total_spend':
        satisfied = Number(member.total_spent) >= condition.value
        break

      case 'weather':
        satisfied = visit.weather === condition.value
        break

      case 'late_night':
        if (visit.arrival_time) {
          const [hours] = visit.arrival_time.split(':').map(Number)
          satisfied = hours >= 2 && hours < 6
        }
        break

      case 'referral_count':
        satisfied = (referralCount || 0) >= condition.value
        break

      case 'consecutive_weeks':
        satisfied = await checkConsecutiveWeeks(memberId, condition.value)
        break

      default:
        break
    }

    if (satisfied) {
      const { error } = await supabase.from('member_achievements').insert({
        member_id: memberId,
        achievement_id: achievement.id,
        trigger_visit_id: visitId,
      })

      if (!error) {
        newlyUnlocked.push(achievement)
      }
    }
  }

  // 6. 更新會員等級
  if (newlyUnlocked.length > 0) {
    await updateMemberLevel(memberId)
  }

  return newlyUnlocked
}

async function checkConsecutiveWeeks(memberId: string, requiredWeeks: number): Promise<boolean> {
  const { data: visits } = await supabase
    .from('visits')
    .select('visit_date')
    .eq('member_id', memberId)
    .order('visit_date', { ascending: false })
    .limit(requiredWeeks * 7)

  if (!visits || visits.length < requiredWeeks) return false

  // Get unique weeks (ISO week numbers)
  const weeks = new Set<string>()
  visits.forEach((v) => {
    const d = new Date(v.visit_date)
    const weekStart = new Date(d)
    weekStart.setDate(d.getDate() - d.getDay())
    weeks.add(weekStart.toISOString().split('T')[0])
  })

  // Check consecutive weeks from most recent
  const sortedWeeks = Array.from(weeks).sort().reverse()
  let consecutive = 1
  for (let i = 1; i < sortedWeeks.length; i++) {
    const prev = new Date(sortedWeeks[i - 1])
    const curr = new Date(sortedWeeks[i])
    const diffDays = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24)
    if (diffDays <= 7) {
      consecutive++
      if (consecutive >= requiredWeeks) return true
    } else {
      break
    }
  }

  return consecutive >= requiredWeeks
}

async function updateMemberLevel(memberId: string) {
  const { count } = await supabase
    .from('member_achievements')
    .select('*', { count: 'exact', head: true })
    .eq('member_id', memberId)

  const totalUnlocked = count || 0

  let newLevel = 1
  if (totalUnlocked >= 50) newLevel = 4
  else if (totalUnlocked >= 40) newLevel = 3
  else if (totalUnlocked >= 10) newLevel = 2

  // 設定等級到期日（3個月後）
  const expiresAt = new Date()
  expiresAt.setMonth(expiresAt.getMonth() + 3)

  await supabase
    .from('members')
    .update({
      level: newLevel,
      level_expires_at: expiresAt.toISOString(),
    })
    .eq('id', memberId)
}
