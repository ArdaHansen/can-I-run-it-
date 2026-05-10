'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Glow } from '@/components/Glow';
import { supabase } from '@/lib/supabase';

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user) {
          await supabase.from('profiles').upsert({ id: data.user.id, username: username || email.split('@')[0] });
        }
        setMessage('Account erstellt. Falls Supabase Email-Bestätigung aktiv ist, bestätige deine Mail.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/dashboard');
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Etwas ist schiefgelaufen.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#05070a] px-5 py-10 text-white">
      <Glow />
      <Link href="/" className="fixed left-5 top-5 text-sm text-slate-300">← Zurück</Link>
      <div className="mx-auto grid min-h-screen max-w-5xl place-items-center">
        <div className="grid w-full gap-6 md:grid-cols-[.9fr_1.1fr]">
          <div className="hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-cyan-400/15 to-orange-500/10 p-8 md:block">
            <p className="text-sm uppercase tracking-[.25em] text-cyan-200">CIRI Access</p>
            <h1 className="mt-4 text-5xl font-black tracking-tight">Dein Laufziel bekommt jetzt einen ehrlichen Check.</h1>
            <p className="mt-5 leading-7 text-slate-300">Registrieren, Ziel eingeben, Lauf hochladen und Streak starten.</p>
          </div>
          <form onSubmit={submit} className="glass rounded-[2rem] p-7 md:p-9">
            <h2 className="text-3xl font-black">{mode === 'login' ? 'Einloggen' : 'Account erstellen'}</h2>
            <p className="mt-2 text-sm text-slate-400">Supabase Auth ist direkt verbunden.</p>
            {mode === 'register' && (
              <label className="mt-7 block text-sm font-medium text-slate-300">Username
                <input value={username} onChange={e => setUsername(e.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-cyan-300" placeholder="arda_runs" maxLength={32} />
              </label>
            )}
            <label className="mt-5 block text-sm font-medium text-slate-300">E-Mail
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-cyan-300" placeholder="du@mail.de" />
            </label>
            <label className="mt-5 block text-sm font-medium text-slate-300">Passwort
              <input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-cyan-300" placeholder="mind. 8 Zeichen" />
            </label>
            <button disabled={loading} className="mt-7 w-full rounded-3xl bg-white px-5 py-4 font-black text-black transition hover:scale-[1.01] disabled:opacity-60">
              {loading ? 'Lädt...' : mode === 'login' ? 'Einloggen' : 'Registrieren'}
            </button>
            {message && <p className="mt-4 rounded-2xl bg-white/8 p-4 text-sm text-slate-200">{message}</p>}
            <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="mt-5 text-sm text-cyan-200">
              {mode === 'login' ? 'Noch keinen Account? Registrieren' : 'Schon Account? Einloggen'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
