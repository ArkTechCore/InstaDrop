"use client";

import type { ExtractResponseBody, InstagramPost } from "@/lib/types";
import { validateInstagramUrl } from "@/lib/validation";
import { CheckCircle2, Clipboard, Loader2, RotateCcw, Search, X } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import ErrorMessage from "./ErrorMessage";
import LoadingState from "./LoadingState";
import MediaPreview from "./MediaPreview";

type ViewState = "IDLE" | "LOADING" | "SUCCESS" | "ERROR";

export default function DownloaderForm() {
  const [url, setUrl] = useState("");
  const [state, setState] = useState<ViewState>("IDLE");
  const [error, setError] = useState("");
  const [post, setPost] = useState<InstagramPost | null>(null);

  const isLoading = state === "LOADING";
  const supportLabel = useMemo(
    () => ["Photos", "Reels", "Videos", "Carousels"].join(" / "),
    []
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPost(null);

    let normalizedUrl: string;
    try {
      normalizedUrl = validateInstagramUrl(url).normalizedUrl;
    } catch (validationError) {
      setState("ERROR");
      setError(
        validationError instanceof Error
          ? validationError.message
          : "Please enter a valid Instagram post or Reel URL."
      );
      return;
    }

    setState("LOADING");
    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ url: normalizedUrl })
      });
      const data = (await response.json()) as ExtractResponseBody;

      if (!data.success) {
        setState("ERROR");
        setError(data.error.message);
        return;
      }

      setPost(data.post);
      setState("SUCCESS");
    } catch {
      setState("ERROR");
      setError("Network error. Please check your connection and try again.");
    }
  }

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text.trim());
      setError("");
    } catch {
      setState("ERROR");
      setError("Clipboard access was blocked. Paste the URL manually.");
    }
  }

  function handleClear() {
    setUrl("");
    setError("");
    setPost(null);
    setState("IDLE");
  }

  return (
    <div id="download" className="mx-auto w-full max-w-6xl">
      <div className="glass-panel mx-auto max-w-3xl animate-soft-rise rounded-xl p-3 sm:p-5 lg:p-6">
        <div className="mb-4 flex items-center justify-between gap-3 sm:mb-5 sm:gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-700">
              Download panel
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950 sm:text-2xl">Paste the link</h2>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="focus-ring grid h-11 w-11 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:text-slate-950"
            aria-label="Reset form"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div>
            <label htmlFor="instagram-url" className="sr-only">
              Public Instagram URL
            </label>
            <div className="grid gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-inner shadow-slate-100 sm:grid-cols-[1fr_auto] sm:gap-3">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  id="instagram-url"
                  name="url"
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  placeholder="https://www.instagram.com/reel/..."
                  value={url}
                  disabled={isLoading}
                  onChange={(event) => {
                    setUrl(event.target.value);
                    setError("");
                  }}
                  className="focus-ring min-h-12 w-full rounded-lg border-0 bg-transparent py-2.5 pl-11 pr-12 text-sm font-medium text-slate-950 placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-14 sm:py-3 sm:pl-12 sm:text-base"
                  aria-describedby="url-hint"
                />
                {url ? (
                  <button
                    type="button"
                    onClick={handleClear}
                    disabled={isLoading}
                    className="focus-ring absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed"
                    aria-label="Clear URL"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                onClick={handlePaste}
                disabled={isLoading}
                className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-stone-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-14 sm:py-3"
              >
                <Clipboard className="h-4 w-4" aria-hidden="true" />
                Paste
              </button>
            </div>
            <p id="url-hint" className="mt-2 text-xs font-medium text-slate-500 sm:mt-3 sm:text-sm">
              Supports: {supportLabel}
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="focus-ring inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-70 sm:min-h-14 sm:gap-3 sm:px-6 sm:py-4 sm:text-base"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                Finding the real media...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                Get Media
              </>
            )}
          </button>
        </form>

        {state === "ERROR" && error ? <ErrorMessage message={error} /> : null}
      </div>

      {state === "LOADING" ? <LoadingState /> : null}
      {state === "SUCCESS" && post ? (
        <MediaPreview post={post} onReset={handleClear} />
      ) : null}
    </div>
  );
}
