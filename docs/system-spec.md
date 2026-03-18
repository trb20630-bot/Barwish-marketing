# 欲室 BAR WISH 會員系統開發規格

## 專案概述

為台北西門町酒吧「欲室 BAR WISH」開發一套遊戲化會員管理系統。

### 品牌定位
> 「懂得藏起來喝酒的大人」

### 商業目標
- 短期（3個月內）：月營收 60 萬
- 中期（明年2月前）：月營收 80 萬
- 長期穩定：月營收 100 萬

---

## 技術需求

### 建議技術棧
- **前端**：Next.js 14+ (App Router) + TypeScript + Tailwind CSS
- **後端**：Next.js API Routes 或 Supabase Edge Functions
- **資料庫**：Supabase (PostgreSQL)
- **認證**：Supabase Auth（支援 Line Login）
- **通知**：Telegram Bot API（優先）或 Line Messaging API
- **部署**：Vercel

### 為什麼選這些
- Supabase 免費額度夠小型店家用
- Next.js 前後端一體，維護簡單
- Telegram Bot API 最穩定，Line OA 作為備選

---

## 資料庫設計

### 會員表 `members`
```sql
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100),
  line_id VARCHAR(100),
  telegram_id VARCHAR(100),
  
  -- 會員等級：1=基礎, 2=銅, 3=銀, 4=VVIP
  level INTEGER DEFAULT 1,
  
  -- 統計數據
  total_visits INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  
  -- 時間戳
  first_visit_at TIMESTAMP,
  last_visit_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- 會員狀態
  is_active BOOLEAN DEFAULT TRUE,
  level_expires_at TIMESTAMP -- 等級維護期限
);
```

### 來店記錄表 `visits`
```sql
CREATE TABLE visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES members(id),
  
  visit_date DATE NOT NULL,
  amount DECIMAL(10,2) DEFAULT 0,
  
  -- 環境條件（用於彩蛋判定）
  weather VARCHAR(20), -- sunny, rainy, cloudy
  arrival_time TIME,
  
  -- 來源追蹤
  referrer_id UUID REFERENCES members(id), -- 引路人
  
  created_at TIMESTAMP DEFAULT NOW(),
  notes TEXT
);
```

### 成就條件表 `achievements`
```sql
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  code VARCHAR(50) UNIQUE NOT NULL, -- 內部代碼
  name VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- 分類：visits, products, spending, events, hidden
  category VARCHAR(20) NOT NULL,
  
  -- 條件設定（JSON 格式）
  condition JSONB NOT NULL,
  -- 例如：{"type": "visit_count", "value": 10}
  -- 例如：{"type": "single_spend", "value": 2000}
  -- 例如：{"type": "weather", "value": "rainy"}
  
  -- 是否公開
  is_hidden BOOLEAN DEFAULT FALSE,
  
  -- 排序權重
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 會員成就解鎖表 `member_achievements`
```sql
CREATE TABLE member_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES members(id),
  achievement_id UUID REFERENCES achievements(id),
  
  unlocked_at TIMESTAMP DEFAULT NOW(),
  
  -- 解鎖時的相關記錄
  trigger_visit_id UUID REFERENCES visits(id),
  
  UNIQUE(member_id, achievement_id)
);
```

### 引路人記錄表 `referrals`
```sql
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  referrer_id UUID REFERENCES members(id), -- 引路人
  referred_id UUID REFERENCES members(id), -- 被帶來的人
  
  -- 記錄月份（用於限制每月次數）
  referral_month VARCHAR(7), -- 格式：2024-03
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(referrer_id, referred_id)
);
```

### 活動表 `events`
```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  name VARCHAR(200) NOT NULL,
  -- 類型：talkshow, private_chef, live_music, special
  event_type VARCHAR(50) NOT NULL,
  
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  
  max_capacity INTEGER,
  current_bookings INTEGER DEFAULT 0,
  
  -- 優先報名設定
  vvip_booking_start TIMESTAMP, -- VVIP 優先報名開始
  public_booking_start TIMESTAMP, -- 一般報名開始
  
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 活動報名表 `event_bookings`
```sql
CREATE TABLE event_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  event_id UUID REFERENCES events(id),
  member_id UUID REFERENCES members(id),
  
  seats INTEGER DEFAULT 1,
  status VARCHAR(20) DEFAULT 'confirmed', -- confirmed, cancelled, attended
  
  booked_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(event_id, member_id)
);
```

### VVIP 謝位記錄表 `vvip_visits`
```sql
CREATE TABLE vvip_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  member_id UUID REFERENCES members(id),
  visit_id UUID REFERENCES visits(id),
  
  -- 謝位序號（累積）
  visit_number INTEGER NOT NULL,
  
  -- 特別備註
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 元老投票表 `polls`
```sql
CREATE TABLE polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  title VARCHAR(200) NOT NULL,
  description TEXT,
  
  -- 投票選項（JSON 陣列）
  options JSONB NOT NULL,
  -- 例如：[{"id": 1, "name": "櫻花特調"}, {"id": 2, "name": "威士忌酸"}]
  
  -- 投票期間
  start_at TIMESTAMP NOT NULL,
  end_at TIMESTAMP NOT NULL,
  
  -- 只有 VVIP 可投
  vvip_only BOOLEAN DEFAULT TRUE,
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 投票記錄表 `poll_votes`
```sql
CREATE TABLE poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  poll_id UUID REFERENCES polls(id),
  member_id UUID REFERENCES members(id),
  
  option_id INTEGER NOT NULL, -- 對應 polls.options 中的 id
  
  voted_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(poll_id, member_id)
);
```

---

## 功能模組

### 1. 會員管理（店家後台）

#### 1.1 會員列表
- 顯示所有會員，可依等級、最後來店日期篩選
- 搜尋功能（電話、姓名）
- 快速查看會員詳情

#### 1.2 會員詳情頁
- 基本資料
- 等級與進度（已解鎖 X / 50 項）
- 來店記錄
- 解鎖成就列表
- 引路人記錄（帶了誰來、被誰帶來）
- VVIP 謝位記錄

#### 1.3 新增來店記錄
- 輸入會員電話快速查詢
- 記錄消費金額
- 自動判斷天氣（串接天氣 API 或手動選擇）
- 自動檢查並解鎖成就
- 引路人登記（若有）

#### 1.4 會員等級維護
- 顯示即將到期的會員
- 手動調整等級
- 批次發送維護提醒

### 2. 成就系統

#### 2.1 成就管理
- 新增/編輯/停用成就
- 設定解鎖條件
- 設定是否為隱藏彩蛋

#### 2.2 成就條件類型
```typescript
type AchievementCondition = 
  // 來店次數
  | { type: 'visit_count', value: number }
  // 連續週數來店
  | { type: 'consecutive_weeks', value: number }
  // 單次消費金額
  | { type: 'single_spend', value: number }
  // 累積消費金額
  | { type: 'total_spend', value: number }
  // 天氣條件
  | { type: 'weather', value: 'rainy' | 'sunny' }
  // 時間條件
  | { type: 'late_night', value: '02:00' } // 凌晨2點後
  // 生日條件
  | { type: 'birthday_week' }
  // 引路人次數
  | { type: 'referral_count', value: number }
  // 活動參與
  | { type: 'event_type', value: string, count: number }
  // 特定月份
  | { type: 'month', value: number } // 1-12
  // 遠距來店
  | { type: 'from_outside_taipei' }
```

#### 2.3 自動解鎖邏輯
每次來店記錄新增時：
1. 更新會員統計數據
2. 遍歷所有未解鎖成就
3. 檢查條件是否滿足
4. 解鎖並發送通知

### 3. 引路人系統

#### 3.1 引路人登記
- 來店時登記「誰帶來的」
- 自動檢查引路人本月次數
- 雙方都觸發成就解鎖檢查

#### 3.2 引路人限制
- 基礎/銅/銀會員：每月 3 次
- VVIP：每月 5 次

#### 3.3 引路人成就
- 帶 1 位朋友來
- 帶 5 位朋友來
- 帶 10 位朋友來
- 單月帶 3 位朋友來

### 4. 活動管理

#### 4.1 活動 CRUD
- 新增活動（Talk Show、私廚、駐唱等）
- 設定容量上限
- 設定 VVIP 優先報名時間

#### 4.2 報名管理
- 顯示報名名單
- 標記出席狀態
- 候補名單管理

### 5. 元老系統（VVIP 專屬）

#### 5.1 謝位記錄
- 每次 VVIP 來店自動記錄
- 累積謝位次數
- 顯示謝位牆（可匯出）

#### 5.2 投票系統
- 建立投票（例：下季限定調酒）
- 僅 VVIP 可投票
- 投票結果統計

### 6. 通知系統

#### 6.1 通知類型
- 成就解鎖通知
- 等級升級通知
- 等級維護提醒（到期前 2 週）
- 活動報名開放通知
- 投票開始通知

#### 6.2 通知管道
- Telegram Bot（優先）
- Line OA（備選）

### 7. 會員端介面（可選）

#### 7.1 會員查詢頁
- 輸入電話查詢自己的等級
- 查看已解鎖成就
- 查看進度（已解鎖 X / 50）
- 不顯示未解鎖的隱藏成就

#### 7.2 活動報名頁
- 查看即將舉辦的活動
- 線上報名（需驗證會員身份）

---

## 預設成就清單

### 來店次數（約 10 項）
| 代碼 | 名稱 | 條件 | 隱藏 |
|------|------|------|------|
| visit_2 | 二訪成員 | 來店 2 次 | ❌ |
| visit_5 | 常客入門 | 來店 5 次 | ❌ |
| visit_10 | 熟面孔 | 來店 10 次 | ❌ |
| visit_25 | 老朋友 | 來店 25 次 | ❌ |
| visit_50 | 欲室之友 | 來店 50 次 | ❌ |
| visit_100 | 傳奇常客 | 來店 100 次 | ❌ |
| consecutive_4 | 週週報到 | 連續 4 週來店 | ✅ |
| consecutive_8 | 月月相見 | 連續 8 週來店 | ✅ |

### 消費金額（約 8 項）
| 代碼 | 名稱 | 條件 | 隱藏 |
|------|------|------|------|
| spend_600 | 小酌一杯 | 單次消費 600+ | ❌ |
| spend_1000 | 微醺之夜 | 單次消費 1,000+ | ❌ |
| spend_2000 | 歡聚時刻 | 單次消費 2,000+ | ❌ |
| spend_3000 | 派對主人 | 單次消費 3,000+ | ❌ |
| total_10000 | 萬元俱樂部 | 累積消費 10,000+ | ❌ |
| total_50000 | 五萬大戶 | 累積消費 50,000+ | ❌ |
| total_100000 | 十萬尊榮 | 累積消費 100,000+ | ❌ |

### 活動參與（約 8 項）
| 代碼 | 名稱 | 條件 | 隱藏 |
|------|------|------|------|
| event_talkshow_1 | Talk Show 初體驗 | 參加 1 次 Talk Show | ❌ |
| event_talkshow_3 | Talk Show 愛好者 | 參加 3 次 Talk Show | ❌ |
| event_chef_1 | 私廚饕客 | 參加 1 次私廚活動 | ❌ |
| event_chef_3 | 私廚常客 | 參加 3 次私廚活動 | ❌ |
| event_music_1 | 音樂之夜 | 參加 1 次駐唱活動 | ❌ |
| event_all_types | 活動全勤 | 各類型活動都參加過 | ✅ |

### 引路人（約 6 項）
| 代碼 | 名稱 | 條件 | 隱藏 |
|------|------|------|------|
| referral_1 | 引路人 | 帶 1 位朋友來 | ❌ |
| referral_3 | 熱心引路 | 帶 3 位朋友來 | ❌ |
| referral_5 | 人脈王 | 帶 5 位朋友來 | ❌ |
| referral_10 | 傳教士 | 帶 10 位朋友來 | ❌ |
| referral_month_3 | 月度引路王 | 單月帶 3 位朋友 | ✅ |

### 隱藏彩蛋（約 10 項）
| 代碼 | 名稱 | 條件 | 隱藏 |
|------|------|------|------|
| weather_rainy | 雨中漫步 | 下雨天來店 | ✅ |
| late_night | 夜貓子 | 凌晨 2 點後還在 | ✅ |
| birthday | 生日快樂 | 生日當週來店 | ✅ |
| new_year | 跨年同歡 | 跨年夜來店 | ✅ |
| valentine | 浪漫情人 | 情人節來店 | ✅ |
| christmas | 聖誕老人 | 聖誕節來店 | ✅ |
| early_bird | 開店第一人 | 開店第一組客人 | ✅ |
| last_call | 最後一杯 | 打烊前最後一組 | ✅ |
| group_5 | 派對召集人 | 帶超過 5 人同行 | ✅ |
| solo | 獨酌時光 | 獨自來店 | ✅ |

---

## 等級計算規則

### 等級門檻
| 等級 | 名稱 | 解鎖成就數 | 標誌物 |
|------|------|-----------|--------|
| 1 | 基礎會員 | 0 | 無 |
| 2 | 銅級會員 | 10 (20%) | 銅標誌物 |
| 3 | 銀級會員 | 40 (80%) | 銀標誌物 |
| 4 | VVIP | 50 (100%) | 金標誌物 |

### 等級維護規則
- 每季（3個月）需來店至少 1 次
- 到期前 2 週發送提醒
- 逾期降一級
- 降級後可透過引路人任務快速回升

---

## API 設計

### 會員相關
```
GET    /api/members              # 會員列表
GET    /api/members/:id          # 會員詳情
POST   /api/members              # 新增會員
PUT    /api/members/:id          # 更新會員
GET    /api/members/:id/achievements  # 會員成就
GET    /api/members/:id/visits   # 來店記錄
```

### 來店記錄
```
POST   /api/visits               # 新增來店記錄（自動觸發成就檢查）
GET    /api/visits               # 來店記錄列表
```

### 成就相關
```
GET    /api/achievements         # 成就列表
POST   /api/achievements         # 新增成就
PUT    /api/achievements/:id     # 更新成就
```

### 引路人
```
POST   /api/referrals            # 登記引路
GET    /api/members/:id/referrals # 會員的引路記錄
```

### 活動相關
```
GET    /api/events               # 活動列表
POST   /api/events               # 新增活動
GET    /api/events/:id           # 活動詳情
POST   /api/events/:id/book      # 報名活動
GET    /api/events/:id/bookings  # 報名名單
```

### 投票相關
```
GET    /api/polls                # 投票列表
POST   /api/polls                # 新增投票
POST   /api/polls/:id/vote       # 投票
GET    /api/polls/:id/results    # 投票結果
```

---

## UI/UX 設計原則

### 店家後台
- 簡潔直覺，現場可快速操作
- 最常用功能：新增來店記錄
- 大按鈕、大字體，適合昏暗酒吧環境
- 支援手機/平板操作

### 配色建議
- 主色：琥珀色 #BA7517（呼應酒吧氛圍）
- 強調色：青色 #1D9E75（成就解鎖）
- 背景：深色 #1a1a18（護眼、酒吧氛圍）
- 文字：淺色 #e8e6df

### 關鍵互動
- 來店登記 < 10 秒完成
- 成就解鎖時有明顯動畫/音效
- 會員查詢時顯示進度環

---

## 開發優先順序

### Phase 1：核心功能（2-3 週）
1. 資料庫建立
2. 會員 CRUD
3. 來店記錄
4. 成就系統（基礎）
5. 等級計算

### Phase 2：進階功能（2 週）
1. 引路人系統
2. 成就自動解鎖
3. Telegram 通知
4. 活動管理

### Phase 3：完善體驗（2 週）
1. 會員端查詢頁
2. 投票系統
3. VVIP 謝位記錄
4. 數據統計報表

### Phase 4：優化（持續）
1. 效能優化
2. 錯誤處理
3. 備份機制
4. 新成就擴充

---

## 注意事項

### 安全性
- 店家後台需登入驗證
- 會員資料加密儲存
- API 需驗證 token

### 備份
- 每日自動備份資料庫
- 會員資料可匯出 CSV

### 擴充性
- 成就條件設計為 JSON，方便新增類型
- 預留 webhook 接口，未來可串接 POS

---

## 附錄：品牌元素

### 品牌使命
> 「懂得藏起來喝酒的大人」

### 社群口號選項
- 「藏得好，喝得好」
- 「欲室不是秘密，是你的秘密」

### 犧牲行動（強調可信度）
1. 關閉 Google 定位
2. 不做廣告投放
3. VVIP 封頂 2,000 人

這些元素可融入 UI 文案與會員溝通中。
