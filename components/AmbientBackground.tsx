export function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-carbon">
      <div
        className="animate-drift1 absolute -left-[10%] top-[-10%] h-[560px] w-[560px] rounded-full blur-[60px] sm:blur-[100px]"
        style={{
          background:
            "radial-gradient(circle at 40% 40%, rgba(225,6,0,0.32), rgba(225,6,0,0) 70%)",
        }}
      />
      <div
        className="animate-drift2 absolute right-[-8%] top-[10%] hidden h-[420px] w-[420px] rounded-full blur-[100px] sm:block"
        style={{
          background:
            "radial-gradient(circle at 60% 60%, rgba(220,38,38,0.22), rgba(220,38,38,0) 70%)",
        }}
      />
      <div
        className="animate-drift3 absolute -bottom-[15%] left-[15%] hidden h-[620px] w-[620px] rounded-full blur-[110px] sm:block"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(30,58,138,0.28), rgba(30,58,138,0) 70%)",
        }}
      />
      <div
        className="absolute bottom-0 right-0 h-[50%] w-[60%] blur-[60px] sm:blur-[100px]"
        style={{
          background:
            "radial-gradient(circle at 80% 100%, rgba(30,58,138,0.24), rgba(30,58,138,0) 70%)",
        }}
      />
    </div>
  );
}
