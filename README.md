# InstaDrop

InstaDrop is a lightweight personal web app by Mohammed Yousuf Qadri for downloading media from public Instagram post and Reel URLs. It has a polished Next.js frontend and serverless backend routes for validation, extraction, and safe download redirects.

It does not use accounts, analytics, cookies, a database, paid APIs, Redis, or permanent storage of pasted URLs or downloaded media.

## Stack

- Next.js App Router
- TypeScript strict mode
- Tailwind CSS
- Cloudflare Workers via OpenNext
- Vitest for validation tests

## Features

- Public Instagram photo post support
- Public Reel and video support when Instagram exposes public media metadata
- Public carousel support when embedded public page data is available
- URL validation before any backend request
- Isolated extraction architecture in `lib/instagram.ts`
- SSRF-aware download URL validation
- Basic in-memory, best-effort rate limiting per Cloudflare isolate
- No database, login, analytics, history, or permanent storage

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Run checks:

```bash
npm run lint
npm test
npm run build
```

Preview the Cloudflare Worker build locally:

```bash
npm run preview
```

## GitHub

Create and push a repository:

```bash
git init
git add .
git commit -m "Initial InstaDrop app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/instadrop.git
git push -u origin main
```

## Deployment

This project uses the current Cloudflare Workers + OpenNext path for full-stack Next.js.

1. Push the project to GitHub.
2. In Cloudflare, create a Workers application connected to the GitHub repository.
3. Use these build settings:
   - Build command: `npm run deploy`
   - Deploy command if Cloudflare asks separately: `npx opennextjs-cloudflare deploy`
   - Output/assets are configured by `wrangler.jsonc`.
4. Keep the free Workers plan selected.
5. No environment variables are required.
6. After deploy, open the Workers URL and test with a public Instagram `/p/`, `/reel/`, or `/reels/` URL.

CLI deploy after logging into Cloudflare:

```bash
npm install
npm run deploy
```

## URL Types

Accepted input patterns:

```text
https://www.instagram.com/p/SHORTCODE/
https://instagram.com/p/SHORTCODE/
https://www.instagram.com/reel/SHORTCODE/
https://www.instagram.com/reels/SHORTCODE/
https://m.instagram.com/p/SHORTCODE/
```

Rejected input includes non-HTTPS URLs, non-Instagram hosts, Stories, profiles, Explore pages, malformed URLs, localhost, and private network URLs.

## How Extraction Works

`POST /api/extract` receives a URL, validates it, fetches the public Instagram page, and attempts these legitimate public-content strategies:

1. Embedded page JSON such as `shortcode_media` or `xdt_shortcode_media`.
2. `application/ld+json` media metadata.
3. Open Graph image/video tags.

The app never logs into Instagram, asks for credentials, bypasses private content, or stores media. If Instagram does not expose usable public metadata, the API returns a clear extraction error.

`GET /api/download?url=...` validates that the target is HTTPS and belongs to an approved Instagram/CDN media host, then redirects the browser to the media URL. It does not proxy arbitrary websites through Cloudflare.

## Limitations

- Private posts are unsupported.
- Deleted or unavailable posts are unsupported.
- Stories and profile pages are unsupported.
- Instagram may change or remove public page metadata.
- Extraction can stop working if Instagram changes its responses or blocks unauthenticated requests.
- Cloudflare free-tier limits apply.
- The built-in rate limiter is best-effort because it uses per-isolate memory and no paid database.

## Troubleshooting

- `Please enter a valid Instagram post or Reel URL.`: The URL is malformed, unsupported, or not an accepted Instagram host.
- `This post may be private or unavailable.`: The public page did not expose retrievable media.
- `Instagram temporarily blocked the request.`: Instagram rejected the unauthenticated public request. Try later.
- `The request took too long.`: The upstream page request exceeded the timeout.
- `Too many requests.`: Wait a minute and try again.

## Privacy

InstaDrop does not permanently store pasted URLs, IP addresses, downloaded media, browsing history, Instagram usernames, or post history. Requests exist only long enough to process the current extraction or download redirect.

Not affiliated with Instagram or Meta. Only download content you have permission to save.
