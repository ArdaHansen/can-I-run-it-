'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Glow from '../../components/Glow'
import { supabase, hasSupabaseConfig } from '../../lib/supabase'

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')
    setSuccess(false)
    
    if (!hasSupabaseConfig) {
      return setMessage('❌ Supabase nicht konfiguriert. Kontaktiere den Admin.')
    }

    if (!email || !password) {
      return setMessage('❌ Email und Passwort erforderlich')
    }

    if (password.length < 6) {
      return setMessage('❌ Passwort muss mindestens 6 Zeichen lang sein')
    }

    setLoading(true)

    try {
      let result
      if (mode === 'signup') {
        result = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` }
        })
        if (result.error) {
          setMessage(`❌ SignUp fehler: ${result.error.message}`)
          setLoading(false)
          return
        }
        
        // Bei SignUp: Account erstellt, aber möglicherweise Email-Bestätigung notwendig
        if (result.data?.user) {
          setSuccess(true)
          setMessage('✅ Account erstellt! Du kannst dich jetzt einloggen.')
          setMode('login')
          setPassword('')
          setLoading(false)
          return
        }
      } else {
        // Login
        result = await supabase.auth.signInWithPassword({ email, password })
        
        if (result.error) {
          setMessage(`❌ Login fehlgeschlagen: ${result.error.message}`)
          setLoading(false)
          return
        }

        if (result.data?.user) {
          setSuccess(true)
          setMessage('✅ Erfolgreich eingeloggt!')
          // Warte kurz, damit Session gesetzt wird
          setTimeout(() => {
            router.push('/dashboard')
          }, 500)
          return
        }
      }
    } catch (err: any) {
      setMessage(`❌ Fehler: ${err.message || 'Bitte versuche es später erneut'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative grid min-h-screen place-items-center px-5 py-10">
      <Glow />
      <div className="glass card w-full max-w-md p-6 shadow-glow">
        <Link href="/" className="text-sm text-white/50">← Home</Link>
        <h1 className="mt-6 text-4xl font-black">
          {mode === 'signup' ? 'Neuer Account' : 'Willkommen zurück'}
        </h1>
        <p className="mt-3 text-white/60">
          {mode === 'signup' 
            ? 'Erstelle einen neuen Account um deine Runs zu speichern.'
            : 'Logge dich ein um zu deinem Training zu gelangen.'
          }
        </p>

        {!success && (
          <form onSubmit={submit} className="mt-8 grid gap-4">
            <div>
              <label className="text-xs uppercase tracking-wider text-white/50">Email</label>
              <input 
                className="input mt-1" 
                type="email" 
                placeholder="deine@email.com"
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                disabled={loading}
                required 
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-white/50">Passwort</label>
              <input 
                className="input mt-1" 
                type="password" 
                placeholder="Mindestens 6 Zeichen"
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                disabled={loading}
                required 
                minLength={6} 
              />
            </div>
            <button 
              className="btn btn-primary" 
              disabled={loading}
            >
              {loading ? '⏳ Wird verarbeitet...' : mode === 'signup' ? 'Account erstellen' : 'Einloggen'}
            </button>
          </form>
        )}

        {message && (
          <p className={`mt-4 rounded-2xl p-3 text-sm ${
            success 
              ? 'bg-cyan-400/10 text-cyan-100' 
              : 'bg-orange-400/10 text-orange-100'
          }`}>
            {message}
          </p>
        )}

        <button 
          onClick={() => {
            setMode(mode === 'signup' ? 'login' : 'signup')
            setMessage('')
            setSuccess(false)
          }} 
          className="mt-5 text-sm text-cyan-100 hover:text-cyan-200 transition"
        >
          {mode === 'signup' 
            ? '← Zurück zum Login' 
            : 'Noch kein Account? → Jetzt erstellen'
          }
        </button>
      </div>
    </main>
  )
}
