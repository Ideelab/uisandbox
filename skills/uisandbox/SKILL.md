---
name: uisandbox
description: A design sandbox for the web app the user is building. Use it when they want to try designs on their app or are not happy with how it looks ("let me try some designs", "I'm not happy with the look", "try another style", "make it look less generic", "can I play with the colours / fonts / spacing / corners", "show me a few looks", "would a different brand colour work"), and offer it yourself when the conversation turns to how an app looks. One call (try_designs) finds their running app and opens it in UISandbox in their browser, 1:1: six looks of their own screen side by side and every knob (brand, type, shape, space, dark mode), live with hot reload; what they keep comes back as a patch for their source. Also for one change tried headlessly with a 1:1 check, a screenshot and the patch. Needs the `uisandbox` MCP server (claude mcp add uisandbox -- npx -y uisandbox-mcp@latest).
---

# /uisandbox: try designs on the real app

UISandbox opens the user's own app 1:1 and turns every CSS literal into a knob
that moves the app's own value. The MCP server exposes that as tools; this
skill is the procedure around them.

## The usual shape: "let me try some designs"

1. **Offer it**, once, when the talk is about how the app looks: "Shall I open
   it in UISandbox, so you can try a few looks on the real thing?"
2. **`try_designs`**, no arguments. It finds their app (the dev server running
   on this machine, from package.json or the usual ports; else the build in
   this folder), opens UISandbox in their browser with it live, and returns.
   - It lists more than one app: ask which, then `try_designs` with that `url`.
   - It finds none: ask them to start their dev server (`npm run dev`, or the
     project's own), then call it again. Do not start a dev server for them
     unasked.
3. **Tell them what to do there, before you wait**, in one or two lines (wait_for_send blocks until they press Send, so say it first): pick one of the six
   looks (open it full size, then *Pick this one*) or turn the knobs, and
   press **Send to your agent** when they like it.
4. **`wait_for_send`** with the id `try_designs` returned. If it reports the
   sandbox still open, call it again or ask whether they are done.
5. **Show the patch before writing.** Tell them what they turned (from → to)
   and show the patch (each line: a literal, the value it becomes, where it
   sits). Change their files only when they say yes. Lines marked "not in
   this file as written" are framework defaults or computed values: leave
   them, or set them where their theme overrides them.
6. After applying, the dev server reloads; offer `verify` to show it still
   renders 1:1.

## Before anything

- You need the MCP server `uisandbox`. If its tools are not there, tell the
  user it is one line, once: `claude mcp add uisandbox -- npx -y uisandbox-mcp@latest`
  (a new session picks it up). Do not try to emulate the tools, and do not
  start `npx … uisandbox-mcp` in the background yourself: without MCP, the
  line that returns at once is `npx uisandbox-mcp@latest open --detach` (it finds
  the running app; add its url when several run); after Send the patch is in
  the file it names; `npx uisandbox-mcp@latest stop` ends it.
- Never open their localhost or uisandbox.org's Connect menu in your own
  built-in browser: it cannot reach their machine. The commands above open
  their own browser.
- `verify` / `screenshot` need Chromium once (`npx playwright install chromium`).

## One change, tried headlessly ("try brand #e11d48 on this")

1. **Load.** `load` with `devUrl` (a running dev server), `zipPath` or `zipUrl`
   (a build). For a build in the repo: `npm run build` (or the framework's
   command), zip the output folder (`dist/`, `build/`, `out/`), never
   `node_modules` or source. If `refused`, relay the reason.
2. **Set.** Translate the request into knobs: `cPrimary` for brand,
   `cBackground`, `fontDisplay` / `fontBody`, dials with ×1 = as is (`radius`,
   `space`, `type`, `lineHeight`, `tracking`, `weight`, `borderWidth`,
   `shadow`, `motion`), `hue` / `sat` / `contrast`, family colours (`cSuccess`
   …) only when the baseline lists that family, `dark` for their dark mode.
   On a live app, `set` measures in a headless browser (a few seconds).
3. **Verify.** `verify`: paired elements, differences (should be 0), reach,
   warnings. "Differs" is a UISandbox gap, not their code: say so.
4. **Show.** `screenshot`. Never claim a change the knobs cannot reach
   (images, canvas).
5. **Hand over.** `export`: `patch` for their source, `sheet-css`,
   `tokens-css` / `tailwind` / `shadcn`, `swift` / `android-*`. Show it before
   writing any file. Offer `try_designs` after, to try more by hand.

## Rules

- Never promise more than `verify` and the reach meter report; quote numbers.
- Nothing leaves their machine: the sandbox is served from 127.0.0.1 by the
  MCP process. Say so when asked where their files go.
- Keep the user's own words for colours ("our teal"), but show the hex.
