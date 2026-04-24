# SEO Deployment Guide — Session U

4 Brothers Trucking · Marketing track

---

## What's in this batch

Three new files to add to your repo:

1. **`index.html`** — replaces your current one (at repo root)
2. **`sitemap.xml`** — put in `/public/` folder
3. **`robots.txt`** — put in `/public/` folder

Vite's default behavior copies everything in `/public/` to the final build root,
so `/public/sitemap.xml` → `https://4brotherstruck.com/sitemap.xml` after deploy.

---

## Step-by-step deployment

### 1. Replace your index.html

Your existing `index.html` (at repo root, next to `package.json`) has default
meta tags. The new one has full SEO markup. Back up yours first if you have
custom changes, then overwrite with the new file.

### 2. Create the public folder if it doesn't exist

Inside your project root:

```
four-brothers/
  public/
    sitemap.xml      ← put here
    robots.txt       ← put here
    og-image.jpg     ← you need to create this (see below)
    favicon.svg      ← you probably already have this
    logo.png         ← referenced in JSON-LD
```

### 3. Create the OG image (one-time, ~10 min)

When someone shares your URL on LinkedIn, iMessage, Slack, etc., a preview
card appears with this image. Without it, links look broken.

**Specs:** 1200 × 630 pixels, JPG or PNG, under 500KB.

**What to put on it:** Your logo, "4 BROTHERS TRUCKING" text, a tagline like
"DBE · MBE · SB-PW Certified Bay Area Hauling", and ideally a photo of your
trucks. You can design this in Canva with the "Facebook Cover" template —
free tier works. Or in Photoshop/Figma if you prefer.

Save as `og-image.jpg` and drop in `/public/`.

### 4. Commit and deploy

```powershell
git add .
git commit -m "session U: SEO - meta tags, JSON-LD, sitemap, robots"
git push
```

Vercel will redeploy automatically.

### 5. Verify

Once deployed, run each of these checks:

**A. Google's Rich Results Test** — verifies the JSON-LD structured data works:
https://search.google.com/test/rich-results
Paste `https://4brotherstruck.com/` → should report LocalBusiness detected.

**B. Facebook Sharing Debugger** — verifies Open Graph tags:
https://developers.facebook.com/tools/debug/
Paste URL → click "Debug" → should show your og-image and description.

**C. LinkedIn Post Inspector**:
https://www.linkedin.com/post-inspector/
Same check for LinkedIn-specific preview.

**D. View source** — navigate to https://4brotherstruck.com and "View Source"
in your browser. You should see all the `<meta>` tags and JSON-LD at the top.

---

## After deployment: submit to Google

This is what actually gets you indexed.

### Google Search Console (critical, ~15 min)

1. Go to https://search.google.com/search-console
2. Add property → enter `4brotherstruck.com`
3. Verify ownership (usually via DNS TXT record — Vercel makes this easy)
4. Once verified:
   - Sitemaps section → Add new sitemap → enter `sitemap.xml` → Submit
   - Google will start indexing within 24-48 hours
5. Check back weekly for the first month — watch for any indexing errors

### Google Business Profile (critical, ~20 min, free, HUGE impact)

This is arguably more important than the SEO work itself. Local businesses
get most of their discovery via Google Maps / local pack.

1. Go to https://business.google.com
2. Claim/create the business listing
3. Fill in every field:
   - Business name: 4 Brothers Trucking, LLC
   - Category: "Trucking company" + "Construction company" (pick 2-3 relevant)
   - Address: your Bay Point address (or "service area" if you don't want to
     publish an exact address)
   - Phone: (626) 814-5541
   - Website: https://4brotherstruck.com
   - Hours
   - Photos (3-5 of your trucks / job sites work great)
   - Description (200 chars — use the meta description as a starting point)
4. Verify ownership (Google will send a postcard or call)
5. Once verified, ask happy customers to leave Google reviews — this is the
   #1 factor in local search ranking

### Bing Webmaster Tools (nice-to-have, ~5 min)

Bing is small but non-zero traffic. Same concept:
https://www.bing.com/webmasters/ → add site → submit sitemap.

---

## What each file does

### index.html

**Meta tags:**
- `<title>` — what appears in the browser tab + as the Google result headline
- `<meta name="description">` — the 160-char blurb under the Google headline
- `<meta name="keywords">` — honestly mostly ignored by Google now, but
  included for other search engines
- `geo.*` meta tags — tell location-aware search engines your coordinates

**Open Graph (og:)** — controls how the link looks when shared on Facebook,
LinkedIn, iMessage, Slack, Discord, WhatsApp, and many others.

**Twitter Cards (twitter:)** — same thing for Twitter/X.

**JSON-LD structured data** — This is the biggest SEO win. You're telling
Google:
- You're a `LocalBusiness` (not an e-commerce site, not a blog, not a
  government site — a local business)
- Your address, phone, area served
- Your credentials (DBE, MBE, SB-PW, USDOT)
- The specific services you offer

Google uses this to:
- Show you in the "local pack" (the map with 3 businesses at the top of
  local searches)
- Populate a knowledge panel on the right side of search results
- Potentially feature specific services

**noscript block** — the HTML content inside `<noscript>` is what search
engine crawlers that don't run JavaScript see. (Most modern crawlers DO run
JS, but this is insurance.)

### sitemap.xml

Google reads this to know what pages exist on your site. Since you're a
single-page app, there's really only one URL (`/`), but we include the hash
routes for different sections as hints.

### robots.txt

Tells crawlers which areas of the site they can/can't index. Blocks the
private portals (customer tokens, admin, driver submit pages) from being
indexed. They wouldn't show useful content anyway.

---

## Budget for a few more SEO wins over time

Some things that will help further but aren't part of this session:

1. **Backlinks from relevant sites** — If you can get listed on the state DBE
   directory, Caltrans' preferred vendor list, local chambers of commerce,
   and industry directories (GoodFirms, Thomasnet, DOTConnect), each one is
   a signal to Google.

2. **Regular fresh content** — A simple blog with 1 post/quarter about
   projects ("How we moved 12,000 tons for the Salinas Stormwater project")
   helps. Doesn't need to be fancy — real writing about real jobs.

3. **Google reviews** — asked every happy customer after a job completes.
   The customer portal is a good spot to add a "Leave us a review" link
   once you have a Google Business Profile.

4. **Page speed** — your site already loads fast. Vercel + Vite is great.
   Just don't add giant unoptimized images later.

---

## Common pitfalls

- **Don't submit the sitemap before the new index.html is deployed.** Google
  will hit the old page and cache the old meta. Deploy first, submit
  sitemap 24 hours later.

- **The JSON-LD coordinates are for Bay Point ZIP 94565.** If your actual
  address is elsewhere, update `geo` blocks in index.html.

- **`og-image.jpg` is linked but not provided.** Without this file, shared
  links will have no preview image. Make this before launch if possible.

- **If you add pages later (e.g. `/blog`), you need to add them to the
  sitemap.** The current sitemap is just hash routes.

---

## Summary

Time to full deploy: ~1 hour including OG image creation.
Time to see search impact: 2-4 weeks for Google to crawl + index.
Time to see local pack results: 4-8 weeks after Google Business Profile is
verified and has ~5 reviews.

The Google Business Profile setup is the single highest-leverage action on
this list. Don't skip it.
