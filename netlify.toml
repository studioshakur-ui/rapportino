[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"

# AppShell cache hardening:
# - index.html: no-store pour éviter index stale → mauvais chunks
# - assets: immutable long cache (Vite hashed)
[[headers]]
  for = "/index.html"
  [headers.values]
    Cache-Control = "no-store, no-cache, must-revalidate, max-age=0"

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[redirects]]
  from = "/env*"
  to = "/404.html"
  status = 404
  force = true

[[redirects]]
  from = "/config*"
  to = "/404.html"
  status = 404
  force = true

[[redirects]]
  from = "/webpack*"
  to = "/404.html"
  status = 404
  force = true

[[redirects]]
  from = "/next.config.js"
  to = "/404.html"
  status = 404
  force = true

[[redirects]]
  from = "/gatsby-config.js"
  to = "/404.html"
  status = 404
  force = true

[[redirects]]
  from = "/svelte.config.js"
  to = "/404.html"
  status = 404
  force = true

[[redirects]]
  from = "/src/*"
  to = "/404.html"
  status = 404
  force = true

# SPA fallback (doit rester en dernier)
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200