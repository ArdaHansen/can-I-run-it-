'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, Flame, LogOut, Target, UploadCloud } from 'lucide-react';
import { Glow } from '@/components/Glow';
import { supabase } from '@/lib/supabase';
import { analyzeRun } from '@/lib/analysis';
import { isSafeImage } from '@/lib/validators';

type RunRow = {
  id: string;
  distance: number | null;
  pace: string | null;
  duration: string | null;
  avg_hr: number | null;
  readiness_score: number | null;
  analysis: string | null;
  uploaded_at: string;
  screenshot_url: string | null;
};

type Profile = {
  id: string;
  username: string | null;
  age: number | null;
  weight: number | null;
  weekly_km: number | null;
  target_race: string | null;
  target_time: string | null;
  streak: number | null;
  best_streak: number | null;
  last_run_date: string | null;
};

export default function Dashboard() {
  const router = useRouter();
  const [userId, setUserId] = useState<string>('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({ distance: '10', duration: '00:50:00', pace: '5:00', avgHr: '155', weeklyKm: '40', goalDistance: 'MARATHON', goalTime: '03:30:00' });

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push('/auth');
        return;
      }
      setUserId(data.user.id);
      await load(data.user.id);
      setLoading(false);
    }
    init();
  }, [router]);

  async function load(uid: string) {
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    if (!prof) {
      await supabase.from('profiles').insert({ id: uid, username: 'runner' });
      const { data: newProf } = await supabase.from('profiles').select('*').eq('id', uid).single();
      setProfile(newProf as Profile);
    } else setProfile(prof as Profile);

    const { data: runData } = await supabase.from('runs').select('*').eq('user_id', uid).order('uploaded_at', { ascending: false }).limit(20);
    setRuns((runData || []) as RunRow[]);
  }

  const latest = runs[0];
  const avgScore = useMemo(() => {
    const scores = runs.map(r => r.readiness_score).filter((s): s is number => typeof s === 'number');
    return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  }, [runs]);

  async function saveRun(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    setMessage('');
    try {
      let screenshotPath: string | null = null;
      if (file) {
        if (!isSafeImage(file)) throw new Error('Nur PNG, JPG oder WEBP bis 5 MB erlaubt.');
        const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
        const path = `${userId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from('run-screenshots').upload(path, file, { cacheControl: '3600', upsert: false });
        if (error) throw error;
        screenshotPath = path;
      }

      const result = analyzeRun({
        distance: Number(form.distance),
        duration: form.duration,
        pace: form.pace,
        avgHr: form.avgHr ? Number(form.avgHr) : null,
        weeklyKm: form.weeklyKm ? Number(form.weeklyKm) : null,
        goalDistance: form.goalDistance as '5K' | '10K' | 'HALF' | 'MARATHON',
        goalTime: form.goalTime
      });

      const { error: insertError } = await supabase.from('runs').insert({
        user_id: userId,
        screenshot_url: screenshotPath,
        distance: Number(form.distance),
        pace: form.pace,
        duration: form.duration,
        avg_hr: form.avgHr ? Number(form.avgHr) : null,
        readiness_score: result.score,
        analysis: `${result.verdict}. ${result.weaknesses.join(' · ')}. ${result.nextWorkout}`
      });
      if (insertError) throw insertError;

      const today = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const current = profile?.streak || 0;
      const best = profile?.best_streak || 0;
      const last = profile?.last_run_date;
      const newStreak = last === today ? current : last === yesterday ? current + 1 : 1;
      await supabase.from('profiles').update({
        weekly_km: Number(form.weeklyKm),
        target_race: form.goalDistance,
        target_time: form.goalTime,
        streak: newStreak,
        best_streak: Math.max(best, newStreak),
        last_run_date: today
      }).eq('id', userId);

      setFile(null);
      setMessage('Lauf gespeichert. Streak aktualisiert.');
      await load(userId);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Upload fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/');
  }

  if (loading) return <main className="grid min-h-screen place-items-center bg-[#05070a] text-white"><Glow /><p>Lädt Dashboard...</p></main>;

  return (
    <main className="min-h-screen bg-[#05070a] px-5 py-6 text-white">
      <Glow />
      <div className="mx-auto max-w-7xl">
        <header className="glass flex items-center justify-between rounded-3xl px-5 py-4">
          <div><p className="text-sm text-slate-400">Willkommen zurück</p><h1 className="text-2xl font-black">{profile?.username || 'Runner'}</h1></div>
          <button onClick={signOut} className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-slate-200"><LogOut size={16} className="inline mr-2" />Logout</button>
        </header>

        <section className="mt-6 grid gap-4 md:grid-cols-4">
          <Stat title="Current Streak" value={`${profile?.streak || 0}`} icon={<Flame />} accent="text-orange-300" />
          <Stat title="Best Streak" value={`${profile?.best_streak || 0}`} icon={<Flame />} accent="text-orange-300" />
          <Stat title="Avg Score" value={avgScore ? `${avgScore}%` : '–'} icon={<Target />} accent="text-cyan-300" />
          <Stat title="Runs saved" value={`${runs.length}`} icon={<Activity />} accent="text-cyan-300" />
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[.95fr_1.05fr]">
          <form onSubmit={saveRun} className="glass rounded-[2rem] p-6">
            <h2 className="text-3xl font-black">Run hochladen</h2>
            <p className="mt-2 text-sm text-slate-400">Screenshot ist optional. Die Analyse läuft in V1 über deine Zahlen plus sichere Supabase-Speicherung.</p>

            <label className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-white/20 bg-black/30 p-7 text-center hover:bg-white/5">
              <UploadCloud className="mb-3 text-cyan-300" />
              <span className="font-semibold">Garmin/Strava Screenshot auswählen</span>
              <span className="mt-1 text-xs text-slate-400">PNG, JPG, WEBP bis 5 MB</span>
              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
              {file && <span className="mt-3 rounded-full bg-cyan-400/15 px-3 py-1 text-xs text-cyan-100">{file.name}</span>}
            </label>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Distanz km" value={form.distance} onChange={v => setForm({ ...form, distance: v })} />
              <Field label="Pace min/km" value={form.pace} onChange={v => setForm({ ...form, pace: v })} />
              <Field label="Dauer hh:mm:ss" value={form.duration} onChange={v => setForm({ ...form, duration: v })} />
              <Field label="Ø HF" value={form.avgHr} onChange={v => setForm({ ...form, avgHr: v })} />
              <Field label="Wochenkilometer" value={form.weeklyKm} onChange={v => setForm({ ...form, weeklyKm: v })} />
              <Field label="Zielzeit hh:mm:ss" value={form.goalTime} onChange={v => setForm({ ...form, goalTime: v })} />
            </div>

            <label className="mt-4 block text-sm text-slate-300">Ziel
              <select value={form.goalDistance} onChange={e => setForm({ ...form, goalDistance: e.target.value })} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 outline-none">
                <option value="5K">5K</option><option value="10K">10K</option><option value="HALF">Halbmarathon</option><option value="MARATHON">Marathon</option>
              </select>
            </label>

            <button disabled={saving} className="mt-6 w-full rounded-3xl bg-white px-5 py-4 font-black text-black transition hover:scale-[1.01] disabled:opacity-60">{saving ? 'Speichert...' : 'Analyse speichern'}</button>
            {message && <p className="mt-4 rounded-2xl bg-white/8 p-4 text-sm text-slate-200">{message}</p>}
          </form>

          <div className="space-y-6">
            <div className="glass rounded-[2rem] p-6">
              <h2 className="text-3xl font-black">Aktueller Goal Check</h2>
              {latest ? (
                <div className="mt-6 grid gap-6 md:grid-cols-[220px_1fr]">
                  <div className="grid place-items-center"><div className="grid h-48 w-48 place-items-center rounded-full border-[13px] border-cyan-300 shadow-glow"><div className="text-center"><div className="text-5xl font-black">{latest.readiness_score}%</div><div className="text-sm text-slate-400">realistic</div></div></div></div>
                  <div><p className="leading-7 text-slate-200">{latest.analysis}</p><div className="mt-5 grid grid-cols-3 gap-3 text-center text-sm"><Mini label="km" value={latest.distance || '-'} /><Mini label="Pace" value={latest.pace || '-'} /><Mini label="HF" value={latest.avg_hr || '-'} /></div></div>
                </div>
              ) : <p className="mt-4 text-slate-400">Noch kein Lauf gespeichert.</p>}
            </div>

            <div className="glass rounded-[2rem] p-6">
              <h2 className="text-2xl font-black">Letzte Läufe</h2>
              <div className="mt-4 space-y-3">
                {runs.map(run => <div key={run.id} className="rounded-2xl bg-white/7 p-4 text-sm"><div className="flex justify-between"><span>{run.distance} km · {run.pace}/km</span><span className="font-bold text-cyan-200">{run.readiness_score}%</span></div><p className="mt-1 text-xs text-slate-400">{new Date(run.uploaded_at).toLocaleString('de-DE')}</p></div>)}
                {!runs.length && <p className="text-sm text-slate-400">Noch leer.</p>}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Stat({ title, value, icon, accent }: { title: string; value: string; icon: React.ReactNode; accent: string }) {
  return <div className="glass rounded-3xl p-5"><div className={accent}>{icon}</div><p className="mt-4 text-sm text-slate-400">{title}</p><p className="mt-1 text-3xl font-black">{value}</p></div>;
}
function Mini({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-2xl bg-white/7 p-3"><p className="text-xs text-slate-400">{label}</p><p className="font-black">{value}</p></div>;
}
function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <label className="block text-sm text-slate-300">{label}<input value={value} onChange={e => onChange(e.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-cyan-300" /></label>;
}
