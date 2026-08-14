import { DownloadCloud, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function Header() {
  return (
    <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="focus-ring inline-flex items-center gap-3 rounded-full text-slate-950"
        aria-label="InstaDrop home"
      >
        <span className="grid h-11 w-11 place-items-center rounded-lg bg-slate-950 text-orange-300 shadow-sm">
          <DownloadCloud className="h-6 w-6" aria-hidden="true" />
        </span>
        <span>
          <span className="block text-xl font-semibold leading-none">InstaDrop</span>
          <span className="block text-xs font-semibold text-slate-500">Personal media saver</span>
        </span>
      </Link>
      <nav aria-label="Primary" className="hidden items-center gap-3 text-sm font-medium text-slate-600 sm:flex">
        <a className="focus-ring rounded-full px-4 py-2 transition hover:bg-stone-100 hover:text-slate-950" href="#download">
          Download
        </a>
        <a className="focus-ring inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-slate-700 shadow-sm transition hover:border-stone-300 hover:text-slate-950" href="#privacy">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          Privacy
        </a>
      </nav>
    </header>
  );
}
