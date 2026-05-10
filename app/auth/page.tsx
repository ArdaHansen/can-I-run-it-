'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Glow from '../../components/Glow'
import { supabase, hasSupabaseConfig } from '../../lib/supabase'

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup'>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')
    if (!hasSupabaseConfig) return setMessage('Supabase ENV Variablen fehlen.')
    setLoading(true)
    const result = mode === 'signup'
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (result.error) return setMessage(result.error.message)
    router.push('/dashboard')
  }

  return (
    <main className="relative grid min-h-screen place-items-center px-5 py-10">
      <Glow />
      <div className="glass card w-full max-w-md p-6 shadow-glow">
        <Link href="/" className="text-sm text-white/50">← Home</Link>
        <h1 className="mt-6 text-4xl font-black">{mode === 'signup' ? 'Create account' : 'Welcome back'}</h1>
        <p className="mt-3 text-white/60">Speichere deine Runs, Streaks und Race-Readiness Scores.</p>
        <form onSubmit={submit} className="mt-8 grid gap-4">
          <input className="input" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          <input className="input" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          <button className="btn btn-primary" disabled={loading}>{loading ? 'Loading...' : mode === 'signup' ? 'Sign up' : 'Log in'}</button>
        </form>
        {message && <p className="mt-4 rounded-2xl bg-orange-400/10 p-3 text-sm text-orange-100">{message}</p>}
        <button onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')} className="mt-5 text-sm text-cyan-100">
          {mode === 'signup' ? 'Schon Account? Login' : 'Noch keinen Account? Sign up'}
        </button>
      </div>
    </main>
  )
}
