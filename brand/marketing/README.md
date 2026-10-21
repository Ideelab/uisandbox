# Marketing materials

All rendered from the real app (nothing drawn by hand). Regenerate after a design change, with the dev server on :5190.

| file | what | made by |
|---|---|---|
| `og-site-light.png` | **the OG image in use** (`public/og.png`, scaled to 1200×630): shadcn/ui's Dashboard six ways in Pick a look, one brand colour, the knobs beside it; 2400×1260 | `node scripts/og/og-from-site.mjs` |
| `og-site-dark.png` | the same, in the app's dark mode | idem |
| `site-hero-light-1440.png` | the editor as it opens, on the Dashboard, 1440 wide @2x: README header, Product Hunt gallery, X | idem |
| `launch.mp4`, `launch.gif` | **the clip**: the four steps on the real app, ~19 s. A kit as it ships, its Dashboard six ways, Soft picked, the colour through five and the dark mode, then SB Admin 2 brought in with those knobs, checked 1:1, and Take it home. The mp4 is also `public/how-it-works.mp4` (How it works), its poster the six looks | `node scripts/og/clip.mjs` |

Older, from before the four steps (kept for reference, not in use): `og-panel-template.png`, `stage-acme-brand-crimson.png`, `verify-card.png`, `sb-admin-2-before-after.png`, `gif/` (the drop-zone demo clips and the ten-site montage).

Lines to use with them: *Play with your app's design. Right in the browser.* (the claim) · *Bring your app, pick a look, tune it, take it home.* (the four steps) · *Your own app, six ways, on its own values.* (second line).

## Social preview (GitHub)

Repo → Settings → General → *Social preview* → Edit → upload `og-site-light.png` (the same image the site's link card uses). Topics: `design-tokens`, `design-system`, `theming`, `css`, `sandbox`, `mcp`, `mcp-server`, `claude-code`, `shadcn`, `ai`.

Copy per channel: [`copy.md`](copy.md).
