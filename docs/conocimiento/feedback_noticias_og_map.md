---
name: feedback-noticias-og-map
description: Every new article must also be added to NOTICIAS_OG in the Worker and redeployed
metadata: 
  node_type: memory
  type: feedback
---

Whenever a new article is created in `noticias-data.js` — whether manually (user provides data) or automatically — **also add it to the `NOTICIAS_OG` map at the top of `top-secret-worker.js`** and redeploy the Worker via Cloudflare API.

**Why:** The "Copiar link" button in the share modal generates a clean short URL (`/og/<id>`) that points to the Worker. The Worker looks up title and image from `NOTICIAS_OG` to serve WhatsApp-compatible OG meta tags. If the article isn't in the map, the link redirects without any preview.

**How to apply — MANDATORY, no exceptions:**
1. Add the entry to `NOTICIAS_OG` in `top-secret-worker.js` in the SAME session as writing the article.
2. Deploy the Worker via curl ([[reference_cloudflare_y_r2]]) before reporting the task as done.
3. Include `top-secret-worker.js` in the same commit as `noticias-data.js`.
4. Entry format: `t` (title) and `i` (absolute image URL with spaces as `%20`).

**Entry format:**
```js
'article-id': {
  t: 'Article title here',
  i: SITE + 'logos/Image%20Name.png',
},
```

**Related files:** `top-secret-worker.js` (NOTICIAS_OG map at top), `noticias-data.js` (article data)
