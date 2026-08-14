import DownloaderForm from "@/components/DownloaderForm";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { BadgeCheck, LockKeyhole } from "lucide-react";

export default function Home() {
  return (
    <main className="app-shell min-h-screen overflow-hidden">
      <Header />
      <section className="mx-auto flex w-full max-w-7xl flex-col items-center px-3 pb-10 pt-3 sm:px-6 sm:pt-6 lg:px-8 lg:pb-20">
        <div className="launcher-hero w-full overflow-hidden rounded-xl border border-stone-200 bg-white p-4 text-center shadow-sm sm:p-6 md:p-8">
          <div className="mx-auto max-w-4xl">
            <p className="mb-3 inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-orange-700 sm:mb-4 sm:px-4 sm:py-2">
              InstaDrop
            </p>
            <h1 className="mx-auto max-w-3xl text-balance text-3xl font-semibold leading-tight tracking-normal text-slate-950 sm:text-5xl lg:text-6xl">
              Download public Instagram media.
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-pretty text-sm leading-6 text-slate-600 sm:text-lg">
              Paste a public post, Reel, video, or carousel URL. InstaDrop finds
              available public media, previews it cleanly, and keeps the session
              private.
            </p>
            <div className="mx-auto mt-5 grid max-w-xl gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-800 sm:px-4 sm:py-3">
                <BadgeCheck className="mr-2 inline h-4 w-4" aria-hidden="true" />
                Public URLs only
              </div>
              <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm font-medium text-slate-700 sm:px-4 sm:py-3">
                <LockKeyhole className="mr-2 inline h-4 w-4" aria-hidden="true" />
                Nothing stored
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 w-full sm:mt-8">
          <DownloaderForm />
        </div>
      </section>
      <Footer />
    </main>
  );
}
