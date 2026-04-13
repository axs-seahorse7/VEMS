export default function LiveButton() {
  return (
    <div className=" flex items-center justify-center">
      {/* Live Badge */}
      <div className="  relative flex items-center gap-2.5 border border-gray-200 rounded-full px-3 py-1 cursor-pointer select-none group hover:border-zinc-600 transition-colors duration-300">

        {/* Pulse rings */}
        <div className="relative flex items-center justify-center w-2 h-2">
          <div className="absolute inline-flex w-full h-full rounded-full bg-emerald-500 opacity-75 animate-ping" />
          <div className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500" />
        </div>

        {/* Label */}
        <div
          className="font-semibold text-emerald-500 tracking-widest uppercase text-[9px]"
          style={{ fontFamily: "'DM Mono', monospace" }}
        >
          Live
        </div>

        {/* Subtle glow on hover */}
        <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ boxShadow: "0 0 20px 2px rgba(239,68,68,0.15)" }}
        />
      </div>

      {/* Google Font import via style tag */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@500&display=swap');
      `}</style>
    </div>
  );
}