'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Nav from '@/components/Nav'
import { supabase } from '@/lib/supabase'

function NewMemberForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [form, setForm] = useState({
    phone: '',
    name: '',
    line_id: '',
    telegram_id: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const phoneParam = searchParams.get('phone')
    if (phoneParam) {
      setForm((prev) => ({ ...prev, phone: phoneParam }))
    }
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!form.phone.trim()) {
      setError('請輸入電話號碼')
      return
    }

    setSaving(true)

    const { data, error: dbError } = await supabase
      .from('members')
      .insert({
        phone: form.phone.trim(),
        name: form.name.trim() || null,
        line_id: form.line_id.trim() || null,
        telegram_id: form.telegram_id.trim() || null,
        is_active: true,
        first_visit_at: null,
        last_visit_at: null,
        level_expires_at: null,
      })
      .select()
      .single()

    if (dbError) {
      if (dbError.code === '23505') {
        setError('此電話號碼已存在')
      } else {
        setError('儲存失敗：' + dbError.message)
      }
      setSaving(false)
      return
    }

    router.push(`/members/${data.id}`)
  }

  return (
    <form onSubmit={handleSubmit} className="px-6 space-y-4">
      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-xl px-4 py-3 text-sm">{error}</div>
      )}

      <div>
        <label className="block text-light-muted text-sm mb-1">電話號碼 *</label>
        <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="0912345678" autoFocus
          className="w-full bg-dark-card border border-dark-border rounded-xl px-4 py-3 text-light text-lg placeholder:text-light-muted/50 focus:outline-none focus:border-amber transition-colors" />
      </div>

      <div>
        <label className="block text-light-muted text-sm mb-1">姓名</label>
        <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="選填"
          className="w-full bg-dark-card border border-dark-border rounded-xl px-4 py-3 text-light placeholder:text-light-muted/50 focus:outline-none focus:border-amber transition-colors" />
      </div>

      <div>
        <label className="block text-light-muted text-sm mb-1">Line ID</label>
        <input type="text" value={form.line_id} onChange={(e) => setForm({ ...form, line_id: e.target.value })}
          placeholder="選填"
          className="w-full bg-dark-card border border-dark-border rounded-xl px-4 py-3 text-light placeholder:text-light-muted/50 focus:outline-none focus:border-amber transition-colors" />
      </div>

      <div>
        <label className="block text-light-muted text-sm mb-1">Telegram ID</label>
        <input type="text" value={form.telegram_id} onChange={(e) => setForm({ ...form, telegram_id: e.target.value })}
          placeholder="選填"
          className="w-full bg-dark-card border border-dark-border rounded-xl px-4 py-3 text-light placeholder:text-light-muted/50 focus:outline-none focus:border-amber transition-colors" />
      </div>

      <button type="submit" disabled={saving}
        className="w-full bg-amber hover:bg-amber-light text-dark font-bold rounded-xl py-4 text-lg transition-colors disabled:opacity-50">
        {saving ? '儲存中...' : '建立會員'}
      </button>
    </form>
  )
}

export default function NewMemberPage() {
  const router = useRouter()

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <Nav />
      <main className="flex-1 pb-20 md:pb-0">
        <header className="px-6 pt-8 pb-4">
          <button onClick={() => router.back()} className="text-light-muted text-sm mb-2 hover:text-light transition-colors">
            &larr; 返回
          </button>
          <h1 className="text-xl font-bold">新增會員</h1>
        </header>
        <Suspense fallback={<div className="px-6 text-light-muted">載入中...</div>}>
          <NewMemberForm />
        </Suspense>
      </main>
    </div>
  )
}
