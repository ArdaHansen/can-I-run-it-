export default function Glow() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="absolute top-40 right-[-120px] h-[360px] w-[360px] rounded-full bg-orange-400/20 blur-3xl" />
      <div className="absolute bottom-[-160px] left-[-120px] h-[420px] w-[420px] rounded-full bg-blue-500/15 blur-3xl" />
    </div>
  )
}
