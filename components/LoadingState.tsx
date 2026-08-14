export default function LoadingState() {
  return (
    <section
      aria-label="Loading media preview"
      className="mt-8 grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {[1, 2, 3].map((item) => (
        <div key={item} className="overflow-hidden rounded-lg border border-white/70 bg-white/75 p-3 shadow-sm">
          <div className="h-64 rounded-md bg-[linear-gradient(110deg,#ffe4e6_8%,#ecfeff_18%,#dcfce7_33%)] bg-[length:200%_100%] animate-shimmer" />
          <div className="mt-4 h-4 w-28 rounded-full bg-slate-200" />
          <div className="mt-3 h-4 w-20 rounded-full bg-slate-100" />
          <div className="mt-5 h-11 rounded-lg bg-slate-200" />
        </div>
      ))}
    </section>
  );
}
