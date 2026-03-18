export type Database = {
  public: {
    Tables: {
      members: {
        Row: Member
        Insert: MemberInsert
        Update: MemberUpdate
      }
      visits: {
        Row: Visit
        Insert: VisitInsert
        Update: VisitUpdate
      }
      achievements: {
        Row: Achievement
        Insert: AchievementInsert
        Update: AchievementUpdate
      }
      member_achievements: {
        Row: MemberAchievement
        Insert: MemberAchievementInsert
        Update: MemberAchievementUpdate
      }
      referrals: {
        Row: Referral
        Insert: ReferralInsert
        Update: ReferralUpdate
      }
    }
  }
}

export type Member = {
  id: string
  phone: string
  name: string | null
  line_id: string | null
  telegram_id: string | null
  level: number
  total_visits: number
  total_spent: number
  first_visit_at: string | null
  last_visit_at: string | null
  created_at: string
  updated_at: string
  is_active: boolean
  level_expires_at: string | null
}

export type MemberInsert = Omit<Member, 'id' | 'created_at' | 'updated_at' | 'total_visits' | 'total_spent' | 'level'> & {
  id?: string
  created_at?: string
  updated_at?: string
  total_visits?: number
  total_spent?: number
  level?: number
}

export type MemberUpdate = Partial<MemberInsert>

export type Visit = {
  id: string
  member_id: string
  visit_date: string
  amount: number
  weather: string | null
  arrival_time: string | null
  referrer_id: string | null
  created_at: string
  notes: string | null
}

export type VisitInsert = Omit<Visit, 'id' | 'created_at'> & {
  id?: string
  created_at?: string
}

export type VisitUpdate = Partial<VisitInsert>

export type AchievementCondition =
  | { type: 'visit_count'; value: number }
  | { type: 'consecutive_weeks'; value: number }
  | { type: 'single_spend'; value: number }
  | { type: 'total_spend'; value: number }
  | { type: 'weather'; value: string }
  | { type: 'late_night'; value: string }
  | { type: 'birthday_week' }
  | { type: 'referral_count'; value: number }
  | { type: 'event_type'; value: string; count: number }
  | { type: 'month'; value: number }
  | { type: 'from_outside_taipei' }

export type Achievement = {
  id: string
  code: string
  name: string
  description: string | null
  category: string
  condition: AchievementCondition
  is_hidden: boolean
  sort_order: number
  created_at: string
}

export type AchievementInsert = Omit<Achievement, 'id' | 'created_at'> & {
  id?: string
  created_at?: string
}

export type AchievementUpdate = Partial<AchievementInsert>

export type MemberAchievement = {
  id: string
  member_id: string
  achievement_id: string
  unlocked_at: string
  trigger_visit_id: string | null
}

export type MemberAchievementInsert = Omit<MemberAchievement, 'id' | 'unlocked_at'> & {
  id?: string
  unlocked_at?: string
}

export type MemberAchievementUpdate = Partial<MemberAchievementInsert>

export type Referral = {
  id: string
  referrer_id: string
  referred_id: string
  referral_month: string
  created_at: string
}

export type ReferralInsert = Omit<Referral, 'id' | 'created_at'> & {
  id?: string
  created_at?: string
}

export type ReferralUpdate = Partial<ReferralInsert>
