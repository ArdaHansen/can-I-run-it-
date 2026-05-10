import Link from 'next/link';
import { Activity, Flame, LineChart, ShieldCheck, UploadCloud, Zap } from 'lucide-react';
import { Glow } from '@/components/Glow';
import { Nav } from '@/components/Nav';

const features = [
  { icon: UploadCloud, title: 'Screenshot rein', text: 'Garmin, Strava oder Nike Run Club: Daten hochladen und strukturiert speichern.' },
  { icon: LineChart, title: 'Goal Score', text: 'Die App bewertet, wie realistisch dein Ziel gerade ist und was noch fehlt.' },
  { icon: Flame, title: 'Streak System', text: 'Jeder hochgeladene Lauf pusht deine Laufserie. Kein unnötiges Social-Gedöns.' },
  { icon: ShieldCheck, title: 'Supabase sicher', text: 'Login, private Uploads und Row Level Security. User sehen nur ihre eigenen Daten.' }
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#05070a] text-white">
      <Glow />
      <Nav />

      <section className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-5 pb-20 pt-32">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100">
              <Zap size={16} /> Race readiness for real runners
            </div>
            <h1 className="max-w-4xl text-5xl font-black tracking-tight text-white md:text-7xl">
              Can I <span className="bg-gradient-to-r from-cyan-300 via-white to-orange-300 bg-clip-text text-transparent">Run It?</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300 md:text-xl">
              Lade deine Laufdaten hoch und finde heraus, ob dein Ziel wirklich realistisch ist. Keine generischen Pläne, sondern ein ehrlicher Check aus Pace, Umfang, Streak und Zielzeit.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/auth" className="rounded-3xl bg-white px-7 py-4 text-center font-bold text-black shadow-glow transition hover:scale-[1.02]">
                Kostenlos starten
              </Link>
              <a href="#how" className="rounded-3xl border border-white/15 px-7 py-4 text-center font-semibold text-white transition hover:bg-white/10">
                Demo ansehen
              </a>
            </div>
          </div>

          <div className="glass relative rounded-[2rem] p-5">
            <div className="absolute -right-5 -top-5 rounded-3xl bg-orange-500 px-4 py-3 text-sm font-black text-black shadow-orangeGlow">🔥 8 Day Streak</div>
            <div className="rounded-[1.5rem] bg-black/40 p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Goal</span>
                <span className="rounded-full bg-cyan-400/15 px-3 py-1 text-sm text-cyan-200">Marathon Sub 3</span>
              </div>
              <div className="mt-7 grid place-items-center">
                <div className="relative grid h-52 w-52 place-items-center rounded-full border-[14px] border-cyan-300/80 shadow-glow">
                  <div className="absolute inset-4 rounded-full border border-white/10" />
                  <div className="text-center">
                    <div className="text-5xl font-black">72%</div>
                    <div className="mt-1 text-sm text-slate-400">realistic</div>
                  </div>
                </div>
              </div>
              <div className="mt-7 space-y-3">
                {['Longruns solide', 'Tempoausdauer fehlt', 'Weekly mileage: ausbaufähig'].map((item) => (
                  <div key={item} className="flex items-center justify-between rounded-2xl bg-white/6 px-4 py-3 text-sm">
                    <span>{item}</span><Activity size={16} className="text-cyan-300" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-5 py-20">
        <div className="mb-10 max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[.25em] text-orange-300">Nicht noch eine Plan-App</p>
          <h2 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">Der Kern ist dein realistischer Ziel-Check.</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => <div key={f.title} className="glass rounded-3xl p-6"><f.icon className="mb-5 text-cyan-300" /><h3 className="text-xl font-bold">{f.title}</h3><p className="mt-3 text-sm leading-6 text-slate-300">{f.text}</p></div>)}
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl px-5 py-20">
        <div className="glass rounded-[2rem] p-8 md:p-12">
          <h2 className="text-4xl font-black">So funktioniert es</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {['Account erstellen', 'Laufdaten eintragen oder Screenshot hochladen', 'Score, Schwächen und nächste Einheit bekommen'].map((step, i) => (
              <div key={step} className="rounded-3xl bg-white/7 p-6"><div className="mb-5 grid h-11 w-11 place-items-center rounded-2xl bg-white text-black font-black">{i + 1}</div><p className="font-semibold">{step}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl px-5 py-20">
        <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-cyan-400/12 to-orange-500/10 p-8 md:p-12">
          <h2 className="text-4xl font-black">Free first. Premium später.</h2>
          <p className="mt-4 max-w-2xl text-slate-300">Diese Version ist bereit für Nutzer: Auth, Datenbank, Uploads, Dashboard und Streaks. Payments kannst du später über Stripe ergänzen.</p>
          <Link href="/auth" className="mt-8 inline-block rounded-3xl bg-white px-7 py-4 font-bold text-black">Dashboard öffnen</Link>
        </div>
      </section>
    </main>
  );
}
