# Monki World

**Play it here: https://dvd248.github.io/monki-world/**

## Hosting

The game is hosted for free on GitHub Pages. Every push to the default branch
redeploys it through [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml);
check progress in the **Actions** tab.

First-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

How the workflow decides what to publish:

- If there's a `package.json` with a `build` script, it runs the build and publishes
  `dist/`, `build/` or `out/`. For Vite projects, it sets the asset base path to `/monki-world/` automatically.
- Otherwise it publishes the folder that contains `index.html`: the repo root, or the
  only subfolder that has one.
- To publish a specific folder, set `SITE_DIR` at the top of the workflow.

Engine notes:

- **Godot 4**: export with *Thread Support* off. GitHub Pages can't send the
  cross-origin isolation headers that threaded exports need.
- **Unity**: set *Compression Format* to Gzip or Disabled, or turn on
  *Decompression Fallback*. GitHub Pages doesn't serve the headers that
  pre-compressed Brotli builds need.
