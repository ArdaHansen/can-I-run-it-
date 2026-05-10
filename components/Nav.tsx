import Link from 'next/link';

export function Nav() {
  return (
    <header className="fixed left-0 right-0 top-0 z-50 px-4 py-4">
      <div className="glass mx-auto flex max-w-6xl items-center justify-between rounded-3xl px-5 py-3">
        <Link href="/" className="flex items-center gap-3 font-semibold tracking-tight">
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-white text-black">C</span>
          <span>Can I Run It?</span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-slate-300 md:flex">
          <a href="/#features">Features</a>
          <a href="/#how">So läuft’s</a>
          <a href="/#pricing">Preis</a>
        </nav>
        <Link href="/auth" className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:scale-[1.02]">
          Starten
        </Link>
      </div>
    </header>
  );
}
