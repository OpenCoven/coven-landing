# coven-landing

Standalone static landing page for OpenCoven/Coven.

## Preview

```sh
npm run preview
```

Then open <http://localhost:4173>.

## Verify

```sh
npm run check
```

The site is dependency-free: plain HTML/CSS plus static image assets, suitable for any static host.

## Files

- `index.html` — landing page markup and metadata
- `brand.css` — page styling
- `assets/` — OpenCoven color and typography tokens
- `favicon.svg`, `apple-touch-icon.png`, `og.svg`, `og.png` — brand/social assets
- `scripts/verify-static.mjs` — local static sanity checks
