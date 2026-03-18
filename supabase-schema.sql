-- =============================================
-- 欲室 BAR WISH 會員系統 - Supabase Schema
-- 請在 Supabase SQL Editor 中執行此檔案
-- =============================================

-- 1. 會員表
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100),
  line_id VARCHAR(100),
  telegram_id VARCHAR(100),
  level INTEGER DEFAULT 1,
  total_visits INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  first_visit_at TIMESTAMPTZ,
  last_visit_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  level_expires_at TIMESTAMPTZ
);

-- 2. 來店記錄表
CREATE TABLE visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount DECIMAL(10,2) DEFAULT 0,
  weather VARCHAR(20),
  arrival_time TIME,
  referrer_id UUID REFERENCES members(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- 3. 成就條件表
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(20) NOT NULL,
  condition JSONB NOT NULL,
  is_hidden BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 會員成就解鎖表
CREATE TABLE member_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  trigger_visit_id UUID REFERENCES visits(id),
  UNIQUE(member_id, achievement_id)
);

-- 5. 引路人記錄表
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES members(id) ON DELETE CASCADE,
  referred_id UUID REFERENCES members(id) ON DELETE CASCADE,
  referral_month VARCHAR(7),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referrer_id, referred_id)
);

-- =============================================
-- 索引
-- =============================================
CREATE INDEX idx_members_phone ON members(phone);
CREATE INDEX idx_members_level ON members(level);
CREATE INDEX idx_members_last_visit ON members(last_visit_at);
CREATE INDEX idx_visits_member ON visits(member_id);
CREATE INDEX idx_visits_date ON visits(visit_date);
CREATE INDEX idx_member_achievements_member ON member_achievements(member_id);
CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX idx_referrals_month ON referrals(referral_month);

-- =============================================
-- 自動更新 updated_at
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- 預設成就資料
-- =============================================
INSERT INTO achievements (code, name, description, category, condition, is_hidden, sort_order) VALUES
-- 來店次數
('visit_2', '二訪成員', '來店 2 次', 'visits', '{"type": "visit_count", "value": 2}', false, 1),
('visit_5', '常客入門', '來店 5 次', 'visits', '{"type": "visit_count", "value": 5}', false, 2),
('visit_10', '熟面孔', '來店 10 次', 'visits', '{"type": "visit_count", "value": 10}', false, 3),
('visit_25', '老朋友', '來店 25 次', 'visits', '{"type": "visit_count", "value": 25}', false, 4),
('visit_50', '欲室之友', '來店 50 次', 'visits', '{"type": "visit_count", "value": 50}', false, 5),
('visit_100', '傳奇常客', '來店 100 次', 'visits', '{"type": "visit_count", "value": 100}', false, 6),
('consecutive_4', '週週報到', '連續 4 週來店', 'visits', '{"type": "consecutive_weeks", "value": 4}', true, 7),
('consecutive_8', '月月相見', '連續 8 週來店', 'visits', '{"type": "consecutive_weeks", "value": 8}', true, 8),
-- 消費金額
('spend_600', '小酌一杯', '單次消費 600 元以上', 'spending', '{"type": "single_spend", "value": 600}', false, 10),
('spend_1000', '微醺之夜', '單次消費 1,000 元以上', 'spending', '{"type": "single_spend", "value": 1000}', false, 11),
('spend_2000', '歡聚時刻', '單次消費 2,000 元以上', 'spending', '{"type": "single_spend", "value": 2000}', false, 12),
('spend_3000', '派對主人', '單次消費 3,000 元以上', 'spending', '{"type": "single_spend", "value": 3000}', false, 13),
('total_10000', '萬元俱樂部', '累積消費 10,000 元以上', 'spending', '{"type": "total_spend", "value": 10000}', false, 14),
('total_50000', '五萬大戶', '累積消費 50,000 元以上', 'spending', '{"type": "total_spend", "value": 50000}', false, 15),
('total_100000', '十萬尊榮', '累積消費 100,000 元以上', 'spending', '{"type": "total_spend", "value": 100000}', false, 16),
-- 引路人
('referral_1', '引路人', '帶 1 位朋友來', 'referrals', '{"type": "referral_count", "value": 1}', false, 20),
('referral_3', '熱心引路', '帶 3 位朋友來', 'referrals', '{"type": "referral_count", "value": 3}', false, 21),
('referral_5', '人脈王', '帶 5 位朋友來', 'referrals', '{"type": "referral_count", "value": 5}', false, 22),
('referral_10', '傳教士', '帶 10 位朋友來', 'referrals', '{"type": "referral_count", "value": 10}', false, 23),
-- 隱藏彩蛋
('weather_rainy', '雨中漫步', '下雨天來店', 'hidden', '{"type": "weather", "value": "rainy"}', true, 30),
('late_night', '夜貓子', '凌晨 2 點後還在', 'hidden', '{"type": "late_night", "value": "02:00"}', true, 31),
('birthday', '生日快樂', '生日當週來店', 'hidden', '{"type": "birthday_week"}', true, 32),
('solo', '獨酌時光', '獨自來店', 'hidden', '{"type": "visit_count", "value": 1}', true, 33);
