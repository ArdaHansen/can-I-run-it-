'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Glow from '../../components/Glow'
import { supabase, hasSupabaseConfig } from '../../lib/supabase'
import { analyzeRun } from '../../lib/analysis'
import { Flame, LogOut, Upload } from 'lucide-react'

type Run = {
  id: string
  distance_km: number
  pace: string
  avg_hr: number | null
  goal: string
  readiness_score: number
  verdict: string
  recommendation: string
  created_at: string
}

export default function Dashboard() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [runs, setRuns] = useState<Run[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({ distanceKm: '10', pace: '5:00', avgHr: '', weeklyKm: '45', longRunKm: '22', goal: 'Sub 3 Marathon' })

  useEffect(() => {
    async function init() {
      if (!hasSupabaseConfig) { setMessage('Supabase ENV Variablen fehlen.'); setLoading(false); return }
      const { data } = await supabase.auth.getUser()
      if (!data.user) { router.push('/auth'); return }
      setUserId(data.user.id)
      await supabase.from('profiles').upsert({ id: data.user.id, email: data.user.email }, { onConflict: 'id' })
      const { data: runData } = await supabase.from('runs').select('*').eq('user_id', data.user.id).order('created_at', { ascending: false }).limit(20)
      setRuns((runData || []) as Run[])
      setLoading(false)
    }
    init()
  }, [router])

  const latest = runs[0]
  const streak = useMemo(() => {
    const dates = [...new Set(runs.map(r => new Date(r.created_at).toISOString().slice(0,10)))]
    return dates.length
  }, [runs])

  async function logout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  async function saveRun(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    setSaving(true)
    setMessage('')
    const input = {
      distanceKm: Number(form.distanceKm),
      pace: form.pace,
      avgHr: form.avgHr ? Number(form.avgHr) : undefined,
      weeklyKm: form.weeklyKm ? Number(form.weeklyKm) : undefined,
      longRunKm: form.longRunKm ? Number(form.longRunKm) : undefined,
      goal: form.goal
    }
    const result = analyzeRun(input)
    const { data, error } = await supabase.from('runs').insert({
      user_id: userId,
      distance_km: input.distanceKm,
      pace: input.pace,
      avg_hr: input.avgHr || null,
      weekly_km: input.weeklyKm || null,
      long_run_km: input.longRunKm || null,
      goal: input.goal,
      readiness_score: result.score,
      verdict: result.verdict,
      recommendation: result.next
    }).select('*').single()
    setSaving(false)
    if (error) return setMessage(error.message)
    setRuns([data as Run, ...runs])
  }

  if (loading) return <main className="grid min-h-screen place-items-center"><Glow /><p className="text-white/60">Loading dashboard...</p></main>

  return (
    <main className="relative min-h-screen px-5 py-6 md:px-10">
      <Glow />
      <nav className="mx-auto flex max-w-6xl items-center justify-between rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 backdrop-blur-xl">
        <span className="font-black tracking-tight">Can I Run It?</span>
        <button onClick={logout} className="btn btn-ghost gap-2 text-sm"><LogOut size={16}/> Logout</button>
      </nav>

      <section className="mx-auto grid max-w-6xl gap-5 py-10 md:grid-cols-[.95fr_1.05fr]">
        <div className="glass card p-6 shadow-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/50">Current Streak</p>
              <h1 className="mt-1 text-5xl font-black">{streak} 🔥</h1>
            </div>
            <div className="rounded-full bg-orange-400/15 p-4 text-orange-200"><Flame /></div>
          </div>
          <div className="mt-8 rounded-3xl bg-black/30 p-5">
            <p className="text-sm text-white/50">Latest Goal Check</p>
            <h2 className="mt-2 text-2xl font-black">{latest?.goal || 'Noch kein Lauf gespeichert'}</h2>
            <div className="my-6 grid place-items-center">
              <div className="grid h-40 w-40 place-items-center rounded-full border-[12px] border-cyan-300/80 bg-cyan-300/10">
                <div className="text-center"><div className="text-4xl font-black">{latest?.readiness_score ?? 0}%</div><div className="text-xs uppercase tracking-[.2em] text-white/50">ready</div></div>
              </div>
            </div>
            <p className="font-bold text-cyan-100">{latest?.verdict || 'Speichere deinen ersten Run.'}</p>
            <p className="mt-2 text-sm leading-6 text-white/60">{latest?.recommendation || 'Danach bekommst du direkt eine Einschätzung und den nächsten Trainingsschritt.'}</p>
          </div>
        </div>

        <div className="glass card p-6">
          <h2 className="text-3xl font-black">Add run</h2>
          <p className="mt-2 text-white/60">V1 nutzt manuelle Werte. Screenshot-OCR kommt danach stabil oben drauf.</p>
          <form onSubmit={saveRun} className="mt-6 grid gap-4 sm:grid-cols-2">
            <input className="input" placeholder="Distance km" value={form.distanceKm} onChange={e=>setForm({...form,distanceKm:e.target.value})} />
            <input className="input" placeholder="Pace 5:00" value={form.pace} onChange={e=>setForm({...form,pace:e.target.value})} />
            <input className="input" placeholder="Avg HR optional" value={form.avgHr} onChange={e=>setForm({...form,avgHr:e.target.value})} />
            <input className="input" placeholder="Weekly km" value={form.weeklyKm} onChange={e=>setForm({...form,weeklyKm:e.target.value})} />
            <input className="input" placeholder="Longest run km" value={form.longRunKm} onChange={e=>setForm({...form,longRunKm:e.target.value})} />
            <input className="input" placeholder="Goal" value={form.goal} onChange={e=>setForm({...form,goal:e.target.value})} />
            <button className="btn btn-primary gap-2 sm:col-span-2" disabled={saving}><Upload size={18}/> {saving ? 'Saving...' : 'Save & analyze'}</button>
          </form>
          {message && <p className="mt-4 rounded-2xl bg-orange-400/10 p-3 text-sm text-orange-100">{message}</p>}
        </div>
      </section>

      <section className="mx-auto max-w-6xl pb-12">
        <h2 className="mb-4 text-2xl font-black">Recent runs</h2>
        <div className="grid gap-3">
          {runs.map(run => (
            <div key={run.id} className="glass flex flex-col justify-between gap-3 rounded-3xl p-4 md:flex-row md:items-center">
              <div><p className="font-bold">{run.distance_km} km · {run.pace} · {run.goal}</p><p className="text-sm text-white/50">{new Date(run.created_at).toLocaleDateString()}</p></div>
              <div className="text-right"><p className="text-2xl font-black text-cyan-100">{run.readiness_score}%</p><p className="text-sm text-white/55">{run.verdict}</p></div>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
