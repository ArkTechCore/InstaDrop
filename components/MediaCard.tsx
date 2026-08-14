"use client";

import type { InstagramMediaItem } from "@/lib/types";
import { Download, ExternalLink, ImageIcon, Video } from "lucide-react";

interface MediaCardProps {
  item: InstagramMediaItem;
  index: number;
}

export default function MediaCard({ item, index }: MediaCardProps) {
  const label = item.type === "video" ? "Download Video" : "Download Photo";
  const dimensions = item.width && item.height ? `${item.width} x ${item.height}` : "Best public source";
  const downloadUrl = `/api/download?url=${encodeURIComponent(item.url)}`;

  return (
    <article className="card-pop animate-soft-rise overflow-hidden rounded-lg border border-white/80 bg-white/85 p-2.5 shadow-xl shadow-slate-200/70 backdrop-blur sm:p-3">
      <div className="relative aspect-[3/4] overflow-hidden rounded-md bg-slate-100 sm:aspect-[4/5]">
        {item.type === "video" ? (
          <video
            className="h-full w-full object-cover"
            src={item.url}
            poster={item.thumbnail}
            controls
            playsInline
            preload="metadata"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="h-full w-full object-cover" src={item.url} alt={`Instagram media ${index}`} />
        )}
        <span className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-slate-950/82 px-3 py-1.5 text-xs font-black text-white shadow-sm backdrop-blur">
          {item.type === "video" ? <Video className="h-3.5 w-3.5" /> : <ImageIcon className="h-3.5 w-3.5" />}
          {item.type === "video" ? "Video" : "Photo"} {index}
        </span>
      </div>
      <div className="px-1.5 pb-1.5 pt-3 sm:px-2 sm:pb-2 sm:pt-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-slate-950">
              {item.type === "video" ? "Reel / Video" : "Photo"}
            </h3>
            <p className="mt-1 text-sm text-slate-500">{dimensions}</p>
          </div>
        </div>
        <a
          className="focus-ring mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-orange-700 sm:mt-5 sm:min-h-12 sm:py-3"
          href={downloadUrl}
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          <span>{label}</span>
        </a>
        <a
          className="focus-ring mt-2 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-stone-300 hover:text-slate-950"
          href={item.url}
          target="_blank"
          rel="noreferrer"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          Open source
        </a>
      </div>
    </article>
  );
}
