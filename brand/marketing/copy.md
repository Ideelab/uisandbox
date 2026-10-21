# Copy: the lines, per channel

The three lines, in this order of use: **Play with your app's design. Right in the browser.** (headline) · *Bring your app, pick a look, tune it, take it home.* (the four steps, straight under it) · *Your own app, six ways, on its own values.* (second line, for places that need one). Never claim more than the meter shows: "1:1" is measured, images and canvas are outside, iOS and Android do not render.

## X: the pinned post (with `launch.mp4`, or `og-site-light.png`)

Play with your app's design. Right in the browser.

Your app looks like every app an AI helped build, and you can't say why. UISandbox opens it next to the knobs that decide it.

Bring your app: one bookmark, on any screen your browser shows.
Pick a look: your own screen six ways, side by side.
Tune it: colour, type, shape, space, on the real app, 1:1.
Take it home: one paste for your AI.

Your files never leave your browser. Free, MIT.
https://uisandbox.org

*Thread, one per post (each with a clip cut from `launch.mp4`):*
1. Pick a look: Classic, Compact, Soft, Sharp, Airy and Bold on your own Dashboard. They differ in corners, spacing, depth and type, never in colour, so you compare the style and not the paint.
2. Tune: one colour used 144 times moves once. Every dial has ×1 = as in your code at its centre; hold Space to see your original.
3. Check 1:1: the untouched page and the tokenised one side by side, computed styles of every element diffed. Zero differences, or it says what differs.
4. Take it home: Copy for your AI, one paste for Claude Code, Cursor, Codex, Lovable or v0. On a kit, a DESIGN.md and a SKILL.md in that kit's own names.
5. Agents: `npx uisandbox-mcp open` in your project, or say "open this app in UISandbox" in Claude Code. You turn the knobs, press Send to your agent, and it gets the patch.

## Show HN

**Title:** Show HN: UISandbox: see your own web app six ways, tune it 1:1, hand it to your agent

**First comment (author):**
I built UISandbox because the apps people build with an AI keep coming out looking alike (Inter, an indigo button, three cards with an icon each), and the fix is a handful of choices most people can't name: colour, type, shape, space.

It opens on a UI kit as it ships (shadcn/ui, with Tailwind, daisyUI, Bootstrap, Material 3, Radix Themes, Mantine and Ant Design one pick away), so you can turn something before you bring anything. Then you bring your own app: a bookmark that copies any screen your browser shows (logged in, localhost, staging), `npx uisandbox-mcp open` for a build or a running dev server, or a zip, a folder or a public repo. A service worker serves it inside the page, and every CSS literal is replaced by a variable holding the very same value, so it renders exactly as it was. Pick a look shows that screen in six styles side by side; the knobs then move your own values.

What I cared about most is that it doesn't lie. "1:1" is measured: a check loads the untouched page and the tokenised one side by side and diffs the computed styles of every element. 153 of the 173 real builds in the regression gate render with zero differences; the 15 it can't show (native apps, source without a build) it refuses at the door with the reason. A reach meter says how much of what you see the knobs touch and what lies outside (images, canvas).

What comes out: Copy for your AI, one paste with the design system and how to apply it; on a kit, a DESIGN.md, a theme.css and a SKILL.md in that kit's own variable names; on your own app, your files patched, or tokens for CSS, Tailwind, shadcn, Swift and Android.

Your files never leave your browser: no server behind it, no account, no analytics. The one exception is a public repo URL (GitHub sends no CORS on zips, so a same-origin route fetches it; nothing stored).

Limits, so you don't have to find them: it is for web apps (a native app doesn't render; the door says so), raster logos are outside any knob, very large builds are slow.

MIT. https://uisandbox.org · https://github.com/Ideelab/uisandbox. Happy to answer anything about the rewriter or the 1:1 check.

## Product Hunt

**Name:** UISandbox
**Tagline (≤60):** Play with your app's design. Right in the browser
**Description (≤260):** See your own web app six ways, side by side, then tune colour, type, shape and space on the real thing, 1:1. Take it home in one paste for your AI, or as a design system and a skill. Your files never leave your browser. Free, MIT.
**Topics:** Design Tools · Developer Tools · Open Source · Artificial Intelligence
**Gallery order:** `launch.gif` · `og-site-light.png` · `site-hero-light-1440.png` · `og-site-dark.png`
**First comment:** the Show HN comment, shorter: the problem (two lines), the four steps, the 1:1 paragraph, the agent line, the limits, the ask ("tell me which build it refused").

## The security objection (the ready answer, HN/PH comments)

> Fair worry, and don't take my word for it. There is no server behind it, no
> account, no cookies, no analytics (I stripped even the counter). Three ways
> to verify in a minute: (1) watch the network tab while you bring an app, turn
> knobs and export: no request carries your bytes; (2) load the page, switch
> your network off, then drop the zip: everything still works; (3) it's MIT, the
> file that serves your files is src/sandbox/host.ts and the threat model is
> notes/security.md. The one exception, said plainly: a public GitHub or GitLab
> URL goes through uisandbox.org (no CORS on archives); nothing is stored. Drop
> a zip or folder and not even that leaves your browser.

## LinkedIn / longer post

Same as X, with the why: every app built with an AI starts from the same defaults, and "make it less generic" is not an instruction anyone can follow. The four steps, one paragraph on the 1:1 check, one on handing it to your agent, the link.

## One-liners for directories / bios

- Play with your app's design. Right in the browser. Your own app six ways, tuned 1:1, then one paste for your AI. Free, MIT.
- Bring your app, pick a look, tune it, take it home. Nothing is sent to a server, and closing the tab undoes all of it.

## Sceptical comments, answered (HN/PH-ready, fellow-dev voice)

The register that works: agree with the true part first, give the measurement,
name the limit before they do, invite the build. Never "actually…", never a
feature list as a rebuttal.

**"It's a hosted site. 'Your files never leave your browser' is a promise I
can't verify tomorrow. You could ship different JS next week."**
> Completely fair: a hosted page can't prove its own future. That's why the
> local path exists: `npx uisandbox-mcp open` runs the same app from npm on
> 127.0.0.1, or clone it and `pnpm dev`. For the hosted one: it's static, the
> code is MIT on GitHub, and you can load the page, go offline and drop the
> zip, so today's deployment provably phones nothing. For tomorrow's, pin the
> npm version. If you have a stricter setup in mind I'd like to hear it.

**"So it's… CSS variables. I can do this in DevTools."**
> The mechanism is exactly that, on purpose. What DevTools doesn't give you:
> every literal across a whole build tokenised at once, byte-preserving;
> runtime styles hooked too (styled-components, Emotion and Ant's cssinjs
> insert rules at runtime); a diff that proves the tokenised page renders
> identical to the untouched one; six styles side by side on your own screen;
> and the change handed back as a design system or a patch instead of dying
> with the inspector. What DevTools does better: it is already open, and it
> works on the live page, scripts and all.

**"'1:1', sure. My app will look broken."**
> Maybe! That's why the check is a button, not a promise: it loads your
> untouched page next to the tokenised one and diffs computed styles of every
> element, and it tells you the first differences verbatim. 153 of the 173 real
> builds in the gate pass with zero differences; the ones that don't say so on
> screen. If yours differs, I want the zip: every miss so far became a fixture
> and a fix.

**"My styling is all CSS-in-JS at runtime, this can't work."**
> It hooks the CSSOM before your bundle runs: insertRule and replaceSync get
> the same rewrite as static CSS. Measured on styled-components, Emotion, Lit
> and Ant's cssinjs (those are fixtures in the repo). What it can't do is an
> inline `style=` written every frame by a JS animation: the observer catches
> normal runtime styles, not a 60 fps loop.

**"You're executing arbitrary zip JS same-origin with your page. That's an
XSS playground."**
> Yes, same-origin is forced by the design (a service worker only serves its
> own origin), so the threat model starts there: the origin holds nothing. No
> server, no account, no cookies, no analytics, no storage worth reading. The
> frames drop allow-top-navigation, a guard makes worker takeover a no-op,
> zip-slip names are normalised, and there's a hostile fixture in the gate that
> tries all of it. Full write-up: notes/security.md. If you find a way past it,
> that's a private advisory I'll act on fast.

**"The patch is against built output. My source is SCSS or tokens, so the
export is useless."**
> Half true. The patch is find and replace on literals, which survives into
> source wherever your literals do (plain CSS, Tailwind config values, CSS
> variable themes). Where your build computes values (SCSS math, colour
> functions), it gives you the from and to pairs to apply at the source of
> truth. And Copy for your AI hands your agent the design system and how to
> apply it, which doesn't care how the values got there. It's not a codemod,
> and it doesn't pretend to be.

**"Figma exists."**
> Different moment. Figma is before the code exists; this is after, when the
> review ends with "can we see it on the real thing?". It doesn't replace the
> mockup; it replaces the rebuild you'd do just to try a colour.

**"It got my brand colour wrong."**
> The stand is a heuristic stack (a declared variable beats cascade order
> beats most-painted), measured against 173 builds, but heuristics lose
> sometimes. Two clicks fix it in the panel; sending me the build fixes it for
> everyone after you.

**"Was this vibe-coded with AI?"**
> Built with Claude Code, yes, and held to account like any code: 795 tests, a
> regression gate of 173 real builds that runs on every change to the
> rewriter, and a numbered decisions log in the repo with every trap in it.
> Judge the gate, not the typist.

**"The repo route sends my URL to your server, so something DOES leave."**
> Correct, and the UI says so next to the field: GitHub and GitLab won't serve
> archives to a browser, so that one route proxies the PUBLIC repo zip; nothing
> is stored. Drop a zip or folder instead and nothing leaves at all: that path
> works offline, which is the proof.

**"Your page loads Google Fonts, so 'nothing leaves' is already false."**
> The claim is about your files: they never leave. The tool's own UI pulls its
> typefaces from Google Fonts, and font previews you pick do too; with the
> network off those fall back to system faces and everything else keeps
> working. If that matters to you, the local `npx` app serves everything from
> 127.0.0.1.

**"What about my app behind a login, hitting its APIs?"**
> The bookmark, Take this screen along, copies the screen your browser shows,
> logged in and with its data, so a screen behind a login comes in as you see
> it. To work on the running app as you develop it, `npx uisandbox-mcp open
> http://localhost:3000` puts your dev server in the sandbox, hot reload
> included. A static build that needs its server renders as a shell, and the
> tool says "this looks like a shell, not the app" rather than letting it pass.
