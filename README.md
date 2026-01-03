# Amjad & Hazli

AI-native chartered accounting firm website. Static site built with vanilla HTML, CSS, and JavaScript.

## Quick Start

```bash
python3 -m http.server 3000
# Open http://localhost:3000
```

## Structure

```
├── index.html          # Landing page
├── about.html          # Team & credentials
├── blog.html           # Blog listing
├── resources.html      # Tools & guides
├── schedule.html       # Cal.com booking fallback
├── privacy.html        # Privacy policy
├── terms.html          # Terms of service
│
├── services/
│   ├── bookkeeping.html
│   ├── tax.html
│   ├── cfo.html
│   ├── technology.html
│   └── incorporation.html   # Sdn Bhd registration (Local/Foreigner tabs)
│
├── blog/               # Article pages
├── assets/             # Images & logos
│
├── netlify.toml        # Deployment config
├── sitemap.xml         # SEO sitemap
└── robots.txt
```

## Design Tokens

| Token | Value |
|-------|-------|
| Primary | `#253FF6` |
| Fonts | Playfair Display, Manrope, DM Mono |
| Spacing | 4px base (4, 8, 12, 16, 24, 32, 48, 64, 80px) |
| Radius | 2px (sm), 4px (md), 8px (lg) |
| Tap target | 44px minimum |

## Breakpoints

- Mobile: 375px (base)
- Tablet: 768px
- Desktop: 1024px+

## Integrations

- **Cal.com** — Scheduling modal
- **Phosphor Icons** — Icon library (CDN)
- **Google Fonts** — Typography

## Deployment

Hosted on Netlify. Auto-deploys from `master` branch.

---

© 2025 Amjad & Hazli. All rights reserved.
