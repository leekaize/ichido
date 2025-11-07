# Cloudflare Pages Deployment Guide

## Prerequisites
- GitHub repository connected to Cloudflare Pages
- Node.js 18+ installed locally

## Cloudflare Pages Configuration

### Dashboard Settings
Navigate to your Cloudflare Pages project settings and configure:

**Framework preset:** None (or Vite)

**Build configuration:**
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Root directory:** `/` (leave empty)

**Environment variables:**
- **NODE_VERSION:** `18` (or use .node-version file)

### Branch Configuration
- **Production branch:** `main`
- **Preview branches:** All branches (optional)

## Local Development

```bash
# Install dependencies
npm install

# Run dev server (http://localhost:3000)
npm run dev

# Type check
npm run type-check

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment Process

### Automatic Deployment (Recommended)
1. Push to `main` branch
2. Cloudflare Pages builds automatically
3. Live at: `ichido.leekaize.com`

### Manual Build Check
```bash
# Test production build locally
npm run build
npm run preview

# Verify at http://localhost:4173
```

## Custom Domain Setup
Already configured at `ichido.leekaize.com`

To update DNS:
1. Cloudflare Pages → Custom domains
2. Add domain: `ichido.leekaize.com`
3. Verify DNS records (automatic with Cloudflare DNS)

## Security Headers
Located in `public/_headers` - deployed automatically with build.

## Troubleshooting

**Build fails with "command not found":**
- Verify `NODE_VERSION` environment variable set to 18+
- Check `.node-version` file exists in root

**Icons not loading:**
- Verify `src/main.ts` includes `injectStaticIcons()` call
- Check browser console for errors
- Clear browser cache

**Blank page after deployment:**
- Check `vite.config.ts` has `base: './'`
- Verify `dist/` folder contains `index.html`
- Check Cloudflare Pages build log for errors

## Monitoring
- **Build logs:** Cloudflare Pages dashboard → Deployments
- **Analytics:** Cloudflare Web Analytics (optional, privacy-first)
- **Uptime:** Cloudflare's built-in monitoring

## Rollback
If deployment breaks:
1. Cloudflare Pages → Deployments
2. Find last working deployment
3. Click "Rollback to this deployment"
