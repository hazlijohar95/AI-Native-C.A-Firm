# Amjad & Hazli - Website

A modern, mobile-first website for Amjad & Hazli, an AI-native chartered accounting firm based in Malaysia.

## Overview

This is a static website built with vanilla HTML, CSS, and JavaScript. It features a clean, professional design with mobile-first responsive layouts and smooth interactions.

## Project Structure

```
├── index.html              # Main landing page
├── about.html              # About the team
├── blog.html               # Blog listing page
├── resources.html          # Resources and tools
├── schedule.html           # Scheduling page (Cal.com embed fallback)
├── privacy.html            # Privacy policy
├── terms.html              # Terms of service
├── favicon.svg             # Site favicon
├── sitemap.xml             # XML sitemap for SEO
├── robots.txt              # Robots configuration
├── netlify.toml            # Netlify deployment config
├── dev.sh                  # Development server script
│
├── services/               # Service detail pages
│   ├── bookkeeping.html    # Bookkeeping services
│   ├── tax.html            # Tax compliance services
│   ├── cfo.html            # CFO advisory services
│   └── technology.html     # Technology & automation services
│
├── blog/                   # Blog article pages
│   ├── financial-hygiene.html
│   ├── sst-mistakes.html
│   ├── when-to-hire-cfo.html
│   ├── automating-expenses.html
│   ├── annual-return-deadlines.html
│   ├── investor-ready-books.html
│   └── tech-tax-incentives.html
│
└── assets/                 # Static assets (web-safe names)
    ├── amjad-ahmad.jpg     # Team photo
    ├── hazli-johar.jpg     # Team photo
    └── logos/
        ├── mia-logo.jpg    # MIA certification logo
        └── ssm-logo.webp   # SSM certification logo
```

## Features

### Design System
- **Typography**: Playfair Display (display), Manrope (body), DM Mono (code)
- **Colors**: Primary blue (#253FF6), neutral grays, semantic colors
- **Spacing**: 4px base unit scale (4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96px)
- **Border Radius**: 2px (sm), 4px (md/lg)

### Mobile-First Responsive Design
- Base styles optimized for 375px mobile width
- Breakpoints: 480px, 640px, 768px, 1024px, 1025px+
- Large tap targets (44px minimum) for touch devices
- Hamburger menu on mobile with slide-in navigation
- Full desktop navigation with CTAs at 1025px+

### Interactive Features
- **Schedule Modal**: Cal.com embed in a smooth popup modal
- **Smooth Scrolling**: Anchor links with header offset
- **Mobile Menu**: Full-screen slide-in with body scroll lock
- **Animations**: Subtle reveal animations on scroll

### Pages

| Page | Description |
|------|-------------|
| Home | Hero, services overview, testimonials, pricing, blog |
| About | Team bios, company story, credentials |
| Services | Detailed pages for each service offering |
| Blog | Articles on accounting, tax, and business topics |
| Resources | Tools, guides, and downloadable resources |

## Development

### Local Development

```bash
# Start a local server (requires Python)
./dev.sh

# Or manually with Python
python3 -m http.server 8000

# Or with Node.js
npx serve
```

Then open `http://localhost:8000` in your browser.

### Deployment

The site is configured for Netlify deployment:
- Auto-deploys from main branch
- Custom headers and redirects in `netlify.toml`
- Static site with no build step required

## Third-Party Integrations

- **Cal.com**: Scheduling/booking embed
- **Phosphor Icons**: Icon library (loaded via CDN)
- **Google Fonts**: Playfair Display, Manrope, DM Mono, Inter

## Browser Support

- Chrome/Edge 88+
- Firefox 78+
- Safari 14+
- Mobile Safari (iOS 14+)
- Chrome for Android

## SEO

- Semantic HTML structure
- Open Graph meta tags
- Twitter Card meta tags
- XML sitemap
- robots.txt configured
- Mobile-friendly (responsive design)

## License

© 2025 Amjad & Hazli. All rights reserved.

