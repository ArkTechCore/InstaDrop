import type { InstagramPost } from "@/lib/types";
import { Files, RotateCcw } from "lucide-react";
import MediaCard from "./MediaCard";

interface MediaPreviewProps {
  post: InstagramPost;
  onReset: () => void;
}

export default function MediaPreview({ post, onReset }: MediaPreviewProps) {
  const count = post.items.length;

  return (
    <section className="mt-5 w-full animate-soft-rise sm:mt-8" aria-labelledby="media-results">
      <div className="mb-4 flex flex-col justify-between gap-3 rounded-xl border border-white/80 bg-white/85 p-3 shadow-lg shadow-slate-200/60 backdrop-blur sm:mb-5 sm:flex-row sm:items-center sm:p-4">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">
            <Files className="h-4 w-4" aria-hidden="true" />
            Ready
          </p>
          <h2 id="media-results" className="mt-1 text-xl font-semibold text-slate-950 sm:mt-2 sm:text-2xl">
            {count} media {count === 1 ? "file" : "files"} found
          </h2>
          {post.caption ? (
            <p className="mt-2 line-clamp-2 max-w-3xl text-sm leading-6 text-slate-500">
              {post.caption}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onReset}
          className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-stone-300 hover:text-slate-950"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Download another
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
        {post.items.map((item, index) => (
          <MediaCard key={`${item.id}-${item.url}`} item={item} index={index + 1} />
        ))}
      </div>
    </section>
  );
}
