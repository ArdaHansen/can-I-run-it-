export function Glow() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden route-line">
      <div className="absolute left-[-12rem] top-[-10rem] h-[30rem] w-[30rem] rounded-full bg-cyan-500/25 blur-[120px]" />
      <div className="absolute right-[-10rem] top-[14rem] h-[26rem] w-[26rem] rounded-full bg-orange-500/18 blur-[110px]" />
      <div className="absolute bottom-[-15rem] left-[30%] h-[34rem] w-[34rem] rounded-full bg-blue-700/20 blur-[130px]" />
    </div>
  );
}
