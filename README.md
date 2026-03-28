# IKFZ Digital Zulassung – Next.js 14

> KFZ Zulassung online – Auto online anmelden in wenigen Minuten. Offiziell registrierter i-Kfz Dienstleister beim KBA.

## Tech Stack

- **Framework:** Next.js 14 (App Router, SSR)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS 3.4
- **Animations:** Framer Motion
- **Forms:** React Hook Form + Zod
- **Icons:** Lucide React

## Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout with Navbar, Footer, metadata
│   ├── page.tsx                # Homepage (/)
│   ├── globals.css             # Global styles & Tailwind
│   ├── sitemap.ts              # Dynamic sitemap.xml
│   ├── robots.ts               # robots.txt
│   ├── kfz-service/
│   │   └── kfz-online-service/
│   │       └── page.tsx        # Service form (/kfz-service/kfz-online-service/)
│   ├── faq/
│   │   └── page.tsx            # FAQ page (/faq/)
│   ├── kfz-services/
│   │   └── page.tsx            # Services overview (/kfz-services/)
│   ├── evb/
│   │   └── page.tsx            # eVB page (/evb/)
│   ├── impressum/
│   │   └── page.tsx            # Impressum (/impressum)
│   ├── datenschutzerklarung/
│   │   └── page.tsx            # Privacy policy (/datenschutzerklarung)
│   └── agb/
│       └── page.tsx            # Terms (/agb)
├── components/
│   ├── Navbar.tsx              # Responsive navigation
│   ├── Hero.tsx                # Hero section with KBA badge
│   ├── Steps.tsx               # How it works (6 steps)
│   ├── Requirements.tsx        # Required documents
│   ├── PricingBox.tsx          # Pricing cards
│   ├── TrustBadges.tsx         # Guarantee, payment, KBA trust
│   ├── Support.tsx             # Contact channels
│   ├── FAQ.tsx                 # Accordion FAQ
│   ├── VehicleTypes.tsx        # Supported vehicle types
│   ├── ServiceForm.tsx         # Multi-field service form
│   ├── Footer.tsx              # Site footer
│   └── WhatsAppFloat.tsx       # Floating WhatsApp button
├── lib/
│   ├── config.ts               # Site configuration
│   ├── content.ts              # Migrated WordPress content
│   └── utils.ts                # Utility functions (cn, formatPrice)
├── data/
│   └── pages.json              # Migrated WP data
└── scripts/
    └── migrate-wp.ts           # WordPress migration script
```

## Getting Started

### Prerequisites

- Node.js 18.17+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### WordPress Migration

To fetch latest content from the WordPress API:

```bash
npm run migrate
```

This will create/update JSON files in `src/data/`.

### Build for Production

```bash
npm run build
npm start
```

## SEO Features

- ✅ Server-Side Rendering (SSR) for all pages
- ✅ Dynamic `sitemap.xml` at `/sitemap.xml`
- ✅ `robots.txt` at `/robots.txt`
- ✅ OpenGraph & Twitter meta tags
- ✅ JSON-LD Schema (Organization, Service, FAQ)
- ✅ Canonical URLs preserved from WordPress
- ✅ Semantic HTML structure

## URL Structure (Preserved from WordPress)

| Page | URL |
|------|-----|
| Homepage | `/` |
| Service Form | `/kfz-service/kfz-online-service/` |
| FAQ | `/faq/` |
| Services | `/kfz-services/` |
| eVB | `/evb/` |
| Impressum | `/impressum` |
| Datenschutz | `/datenschutzerklarung` |
| AGB | `/agb` |

## Deployment

### Vercel (Recommended)

```bash
npm i -g vercel
vercel
```

### Docker

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Variables

Create `.env.local` for any environment-specific configuration:

```env
NEXT_PUBLIC_SITE_URL=https://ikfzdigitalzulassung.de
```

## Performance Targets

- Lighthouse Score ≥ 95
- Core Web Vitals optimized
- Image optimization via Next/Image
- Lazy loading for non-critical assets
- Font optimization with `next/font`

## License

© iKFZ Digital Zulassung UG (haftungsbeschränkt) – All rights reserved.
