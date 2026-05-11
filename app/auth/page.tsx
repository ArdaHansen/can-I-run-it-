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
          const isRateLimit = result.error.status === 429 || String(result.error.message).toLowerCase().includes('rate limit')
          if (isRateLimit) {
            setMessage('❌ Zu viele Anfragen. Bitte warte kurz (1-2 Minuten) und versuche es erneut.')
          } else {
            setMessage(`❌ SignUp Fehler: ${result.error.message}`)
          }
          setLoading(false)
          return
        }

        if (result.data?.session || result.data?.user) {
          setSuccess(true)
          setMessage('✅ Account erstellt! Du bist jetzt eingeloggt.')
          setTimeout(() => router.push('/dashboard'), 500)
          return
        }

        setSuccess(true)
        setMessage('✅ Account erstellt! Bitte bestätige deine E-Mail und logge dich dann ein.')
        setMode('login')
        setPassword('')
        setLoading(false)
        return
      }

      result = await supabase.auth.signInWithPassword({ email, password })
      if (result.error) {
        setMessage(`❌ Login fehlgeschlagen: ${result.error.message}`)
        setLoading(false)
        return
      }

      if (result.data?.session || result.data?.user) {
        setSuccess(true)
        setMessage('✅ Erfolgreich eingeloggt!')
        setTimeout(() => router.push('/dashboard'), 500)
        return
      }

      setMessage('❌ Authentifizierung fehlgeschlagen. Bitte versuche es erneut.')
    } catch (err: any) {
      setMessage(`❌ Fehler: ${err?.message || 'Bitte versuche es später erneut'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative grid min-h-screen place-items-center px-5 py-10">
      <Glow />
      <div className="glass card w-full max-w-md p-8 shadow-glow">
        <Link href="/" className="text-sm text-white/50 hover:text-white transition">← Zurück zur Startseite</Link>

        {/* Modus-Auswahl Tabs */}
        <div className="mt-8 flex rounded-xl bg-white/5 p-1">
          <button
            onClick={() => {
              setMode('login')
              setMessage('')
              setSuccess(false)
            }}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
              mode === 'login'
                ? 'bg-cyan-500/20 text-cyan-100 shadow-sm'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Anmelden
          </button>
          <button
            onClick={() => {
              setMode('signup')
              setMessage('')
              setSuccess(false)
            }}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
              mode === 'signup'
                ? 'bg-cyan-500/20 text-cyan-100 shadow-sm'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Registrieren
          </button>
        </div>

        {/* Header */}
        <div className="mt-6">
          <h1 className="text-3xl font-black">
            {mode === 'signup' ? 'Neuen Account erstellen' : 'Willkommen zurück'}
          </h1>
          <p className="mt-2 text-white/70">
            {mode === 'signup'
              ? 'Erstelle einen kostenlosen Account, um deine Laufdaten zu speichern und zu analysieren.'
              : 'Melde dich an, um auf deine gespeicherten Läufe und Analysen zuzugreifen.'
            }
          </p>
        </div>

        {/* Success State */}
        {success && (
          <div className="mt-6 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-cyan-500/20 p-2">
                <svg className="h-5 w-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-cyan-100">{message}</p>
                {mode === 'signup' && !message.includes('eingeloggt') && (
                  <p className="text-sm text-cyan-200/80 mt-1">
                    Schau in dein E-Mail-Postfach und bestätige deinen Account.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        {!success && (
          <form onSubmit={submit} className="mt-8 space-y-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-white/90 mb-2">
                  E-Mail-Adresse
                </label>
                <input
                  id="email"
                  className="input w-full"
                  type="email"
                  placeholder="deine@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={loading}
                  required
                  autoComplete="email"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-white/90 mb-2">
                  Passwort
                </label>
                <input
                  id="password"
                  className="input w-full"
                  type="password"
                  placeholder={mode === 'signup' ? 'Mindestens 6 Zeichen' : 'Dein Passwort'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={loading}
                  required
                  minLength={6}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                />
                {mode === 'signup' && (
                  <p className="text-xs text-white/50 mt-1">
                    Mindestens 6 Zeichen, inklusive Buchstaben und Zahlen.
                  </p>
                )}
              </div>
            </div>

            {/* Error Message */}
            {message && !success && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-red-500/20 p-1 mt-0.5">
                    <svg className="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <p className="text-sm text-red-100">{message}</p>
                </div>
              </div>
            )}

            <button
              className="btn btn-primary w-full"
              disabled={loading}
              type="submit"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                  Wird verarbeitet...
                </div>
              ) : (
                mode === 'signup' ? 'Kostenlosen Account erstellen' : 'Anmelden'
              )}
            </button>
          </form>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-white/10">
          <p className="text-center text-sm text-white/50">
            {mode === 'signup'
              ? 'Hast du bereits einen Account?'
              : 'Noch keinen Account?'
            }
            <button
              onClick={() => {
                setMode(mode === 'signup' ? 'login' : 'signup')
                setMessage('')
                setSuccess(false)
              }}
              className="ml-2 text-cyan-400 hover:text-cyan-300 font-medium transition"
            >
              {mode === 'signup' ? 'Hier anmelden' : 'Jetzt registrieren'}
            </button>
          </p>
        </div>
      </div>
    </main>
  )
}
