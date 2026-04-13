# SSM Command Center

A production-ready React single-page application (SPA) for SKU velocity monitoring and marketplace optimization. Built with Vite, React Router, and a dark theme design system.

## Project Structure

```
src/
  api/
    xano.js          # Xano API client wrapper (base URL, auth, fetch)
    hooks.js          # React hooks for data fetching (useSkuOverview, useSkuDetail, etc.)
  components/
    shared/
      Theme.js        # Theme tokens (T), formatters (fm, fc, pt)
      MetricCard.jsx  # Reusable metric card component
    layout/
      AppLayout.jsx   # Main shell with sidebar + outlet
      Sidebar.jsx     # Navigation sidebar
  pages/
    SkuVelocityOverview.jsx   # Dashboard overview page
    SkuVelocityDetail.jsx     # SKU detail view
    ComponentSkuDetail.jsx    # Component inventory detail
  App.jsx             # Router setup (BrowserRouter, Routes)
  main.jsx            # Entry point
  index.css           # Global dark theme styles
```

## Key Features

- **Routed Single-Page Application** with React Router
- **Dark Theme Design System** (T object with semantic color tokens)
- **Mock Data Support** via USE_MOCK flag in api/xano.js
- **Production Build** with Vite (270KB gzip)
- **Responsive Grid Layouts** with inline styles
- **Real-time Data Hooks** (useSkuOverview, useSkuDetail, useComponentDetail, etc.)
- **Interactive Tables** with sorting and filtering
- **Metric Cards** with actual vs. forecast displays
- **Inventory Projection** charts
- **Price Testing UI** with what-if calculator

## Quick Start

```bash
# Install dependencies
npm install

# Development server
npm run dev
# Open http://localhost:5173

# Build for production
npm run build
# Output in dist/

# Preview production build
npm run preview
```

## API Integration

### Mock Data (Default)

Set `USE_MOCK = true` in `src/api/xano.js` (default). All hooks return mock data.

### Real Xano API

1. Set `USE_MOCK = false` in `src/api/xano.js`
2. Update `XANO_BASE` with your workspace URL
3. Hooks will call real endpoints:
   - `GET /detail?marketplace_sku_id=X`
   - `GET /metrics?marketplace_sku_id=X&period=Y`
   - `GET /category_fees?category=X&channel=Y`
   - `POST /recommendation_feedback`
   - `POST /price_tests`

### Authentication

Store auth token in `localStorage.getItem("xano_token")`. The xanoFetch wrapper automatically includes it in Authorization headers.

## Routing

```
/                      → Redirects to /sku-velocity
/sku-velocity          → Overview dashboard
/sku-velocity/:skuId   → SKU detail page
/components/:componentId → Component inventory detail
/components            → Redirects to /sku-velocity
/price-tests           → Redirects to /sku-velocity (stub)
/settings              → Redirects to /sku-velocity (stub)
```

## Theme System

All colors and formatting use the `T` object from `Theme.js`:

```javascript
import { T, fm, fc, pt } from "../components/shared/Theme";

// Colors
T.bg, T.tx, T.ac (accent), T.gn (green), T.rd (red), T.am (amber), ...

// Formatters
fm(1200000)   // → "$1.2M"
fc(1299.99)   // → "$1,299.99"
pt(32.5)      // → "32.5%"
```

## Building & Deployment

The app is production-ready and compiles to a 270KB gzip bundle:

```bash
npm run build
# dist/
#   index.html          (0.46 KB)
#   assets/index-*.css  (0.83 KB)
#   assets/index-*.js   (270.61 KB gzip)
```

Deploy the `dist/` folder to any static host (Vercel, Netlify, S3 + CloudFront, etc.).

## Notes

- All styling is inline (CSS-in-JS) using the dark theme color system
- The detail mockup (~1980 lines) is kept as a single page component for simplicity
- Mock data is embedded in hooks.js and matches mockup structures exactly
- No external UI libraries (Bootstrap, Material UI, etc.) — pure React + inline styles
- React Router v7 for modern routing with useParams, useNavigate

## Next Steps

1. Connect real Xano endpoints (see API Integration above)
2. Add authentication flow (login, token storage, refresh)
3. Implement additional stub routes (/components, /price-tests, /settings)
4. Add form validations and error boundaries
5. Optimize images and consider code splitting for larger pages
6. Add PWA support (service worker, manifest.json)

