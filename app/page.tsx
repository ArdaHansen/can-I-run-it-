import Link from 'next/link'
import { Activity, Flame, Gauge, Upload, Zap } from 'lucide-react'
import Glow from '../components/Glow'

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden px-5 py-6 md:px-10">
      <Glow />
      <nav className="mx-auto flex max-w-6xl items-center justify-between rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 backdrop-blur-xl">
        <Link href="/" className="font-black tracking-tight">Can I Run It?</Link>
        <Link href="/auth" className="btn btn-primary text-sm">Start now</Link>
      </nav>

      <section className="mx-auto grid max-w-6xl items-center gap-10 pb-20 pt-20 md:grid-cols-[1.1fr_.9fr] md:pt-28">
        <div>
          <div className="mb-5 inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100">
            Screenshot rein. Ziel raus. Wahrheit sehen.
          </div>
          <h1 className="max-w-4xl text-5xl font-black leading-[.95] tracking-tight md:text-7xl">
            Find out if your running goal is actually realistic.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/68">
            Lade deine Laufdaten hoch, gib dein Ziel ein und bekomme sofort einen Race-Readiness Score, klare Schwächen und den nächsten sinnvollen Trainingsschritt.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/auth" className="btn btn-primary">Upload Run</Link>
            <a href="#features" className="btn btn-ghost">Was kann die App?</a>
          </div>
        </div>

        <div className="glass card relative animate-float p-5 shadow-glow">
          <div className="rounded-3xl bg-black/30 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/50">Goal Check</p>
                <h2 className="text-2xl font-black">Sub 3 Marathon</h2>
              </div>
              <div className="rounded-full bg-orange-400/15 p-3 text-orange-200"><Flame /></div>
            </div>
            <div className="my-8 grid place-items-center">
              <div className="grid h-44 w-44 place-items-center rounded-full border-[14px] border-cyan-300/80 bg-cyan-300/10 shadow-glow">
                <div className="text-center">
                  <div className="text-5xl font-black">72%</div>
                  <div className="text-xs uppercase tracking-[.25em] text-white/50">ready</div>
                </div>
              </div>
            </div>
            <div className="grid gap-3">
              {[
                ['Longrun base', 'good'],
                ['Tempo endurance', 'needs work'],
                ['Consistency', 'strong']
              ].map(([a,b]) => (
                <div key={a} className="flex items-center justify-between rounded-2xl bg-white/[0.06] px-4 py-3">
                  <span className="text-white/70">{a}</span><span className="font-bold text-cyan-100">{b}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto grid max-w-6xl gap-4 pb-20 md:grid-cols-3">
        {[
          [Upload, 'Screenshot Analysis', 'Garmin oder Strava Screenshot hochladen und Laufdaten sichern.'],
          [Gauge, 'Readiness Score', 'Direkte Einschätzung, ob dein Ziel gerade realistisch ist.'],
          [Activity, 'Smart Next Step', 'Kein 08/15 Plan, sondern der nächste sinnvolle Trainingsreiz.'],
          [Flame, 'Streak System', 'Jeder gespeicherte Lauf hält deine Serie am Leben.'],
          [Zap, 'Supabase Ready', 'Login, Datenbank und Storage sind vorbereitet.'],
          [Gauge, 'Mobile First', 'Sieht auf dem Handy aus wie eine moderne Running App.']
        ].map(([Icon, title, text]: any) => (
          <div key={title} className="glass card p-6">
            <Icon className="mb-5 text-cyan-200" />
            <h3 className="text-xl font-black">{title}</h3>
            <p className="mt-3 text-white/60">{text}</p>
          </div>
        ))}
      </section>
    </main>
  )
}
