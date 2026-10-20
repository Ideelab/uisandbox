/**
 * How it works, over the editor (it used to be the /about page).
 *
 * The page sent you away from the editor and needed a way back ("Open the
 * editor"); a dialog closes, and you are where you were, knobs and all. The
 * address stays /about while it is open, so a link to it is still a link:
 * opened cold, /about is the editor with this over it. The hero went with the
 * page: you are already in the editor, so its headline and buttons had
 * nothing left to sell.
 */
import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { InstallLine } from './InstallLine'
import { Mark } from './Mark'

export function AboutDialog({ section, onClose }: { section?: string; onClose: () => void }) {
  const card = useRef<HTMLDivElement>(null)
  // CSS can suppress an animation but not an autoplaying video, so the clip
  // asks here and hands over the controls instead of starting on its own.
  const [stillPlease] = useState(() => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches)
  // Four steps first; everything else folded, open when a link asks for a part of it.
  const [more, setMore] = useState(!!section)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  // /about#agents (the footer's "Run it on your machine") opens at that section.
  useEffect(() => {
    const el = section ? card.current?.querySelector(`#${CSS.escape(section)}`) : null
    if (el) el.scrollIntoView({ block: 'start' })
    else card.current?.focus()
  }, [section])
  return (
    <div className="privacy about-dialog" role="dialog" aria-modal="true" aria-label="How UISandbox works" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="card about-dialog__card" ref={card} tabIndex={-1}>
        {/* The mark the page opened with, kept, on the left; Close on the
            right of the same line, which stays at the top as you scroll. */}
        <div className="about-dialog__head">
          <span className="about-dialog__mark" aria-hidden><Mark size={32} /></span>
          <button type="button" className="btn btn--ghost btn--icon about-dialog__close" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="landing">
          {/* Four steps, the same four as the top bar (decision 216): what to
              do, at a glance. The rest is one click further down. */}
          <section className="landing__sec">
            <h2>How it works</h2>
            <ol className="steps4">
              <li><b>Bring your app.</b> Drag <em>Take this screen along</em> to your bookmarks bar and click it on your app.</li>
              <li><b>Pick a look.</b> See your screen six ways and pick the one that fits.</li>
              <li><b>Tune it.</b> Colour, Type, Shape and Space. Hold Space to see your original.</li>
              <li><b>Take it home.</b> Copy it for your AI, or send it to your agent.</li>
            </ol>
            <p className="steps4__note">Your files never leave this tab.</p>
          </section>
          <details className="about__more" open={more} onToggle={(e) => setMore((e.currentTarget as HTMLDetailsElement).open)}>
            <summary>More about how it works</summary>
          <section className="landing__sec">
            <p className="landing__lead">What would your app look like in another brand colour, a bigger type scale, or dark mode? Find out on the real app in about a minute. Keep what you see as code, or close the tab and nothing happened.</p>
            <ol className="steps">
              <li><b>Start on a kit, then bring your own app.</b> The editor opens on shadcn/ui as it ships, with seven more kits one pick away. Your own app comes in through the Your app tab: click a bookmark on any screen your browser shows, run <code>npx uisandbox-mcp open</code> for a build or a running dev server, or drop a zip, a folder or a public repo. What you turned on the kit comes along.</li>
              <li><b>It is your actual app, not a preview of one.</b> Every CSS literal becomes a variable holding the same value, so the page renders exactly as it was, runtime styles and CDN stylesheets included. <em>Check 1:1</em> proves it.</li>
              <li><b>Turn one knob, the whole app follows.</b> A colour used 144 times moves once. Brand, background, fonts, radius, spacing and your own dark mode come first; text size, elevation, motion and the rest sit under Fine-tune. Every dial has <em>×1 = as in your code</em> at its centre. Or pick a Preset: another kit's own colours, font and corners.</li>
              <li><b>Keep it, or bin it.</b> Keep it and you get code: on a kit, a design system and a <code>SKILL.md</code> in the kit's own names; on your own app, your files patched in place, or design tokens for CSS, Tailwind, shadcn, Swift and Android. <em>Copy link</em> sends the same build with the same knobs. Bin it by closing the tab.</li>
            </ol>
            {/* The boundary, drawn. People have read "drop your build" as "connect
                your project" and expected their own folder to change under them.
                Two sides, one arrow each way, and the rule that nothing crosses
                on its own. */}
            <div className="cross" aria-label="What crosses between your machine and this tab">
              <div className="cross__side">
                <b>Your folder</b>
                <span>Where your build lives. It is read once, and never written to. UISandbox cannot change a file on your machine.</span>
              </div>
              <div className="cross__mid" aria-hidden>
                <span className="cross__arrow"><span className="cross__label">a copy of your build</span><svg viewBox="0 0 64 8" preserveAspectRatio="none"><path d="M0 4h56M52 1l4 3-4 3" /></svg></span>
                <span className="cross__rule">nothing crosses on its own</span>
                <span className="cross__arrow cross__arrow--back"><svg viewBox="0 0 64 8" preserveAspectRatio="none"><path d="M64 4H8M12 1L8 4l4 3" /></svg><span className="cross__label">only when you press Export</span></span>
              </div>
              <div className="cross__side">
                <b>This browser tab</b>
                <span>Where the copy is read, rendered and turned. Close the tab and it is gone: nothing is stored, nothing is sent to a server.</span>
              </div>
            </div>
          </section>
          <figure className="clip">
            <video
              className="clip__vid"
              src="/how-it-works.mp4"
              poster="/how-it-works-poster.png"
              width={1280}
              height={720}
              autoPlay={!stillPlease}
              controls={stillPlease}
              muted
              loop
              playsInline
              preload="metadata"
              aria-label="Four builds in the sandbox: a dashboard's brand colour swept through the spectrum, a documentation site switched to its own dark mode, a docs page's hue rotated and its type swapped to monospace, then the 1:1 check reporting no differences and the export panel"
            />
            <figcaption>Four real builds from public repos, one knob each. Nothing staged.</figcaption>
          </figure>
          {/* The objection an experienced developer reaches for first, with the
              half of it that is true. */}
          <section className="landing__sec">
            <h2>Isn't this just Inspect?</h2>
            <p>Same instinct, different scale. DevTools changes one declaration on one element, and forgets it when you reload. Here every literal becomes a variable first, so a colour moves everywhere it is used, and what you turn comes out as code. <b>What Inspect does better:</b> it is already open, and it changes the live page, scripts and all. Here you work on a copy: a build, or a snapshot of a screen.</p>
          </section>
          <section className="landing__sec">
            <h2>How to check it yourself</h2>
            <p><b>"1:1" is measured.</b> <em>Check 1:1</em> renders the untouched and the tokenised page side by side and compares the computed styles of every element, shadow roots and nested frames included. Zero differences, or it names what differs. <b>The reach meter</b> says how much of what you see the knobs touch, and what lies outside: images, canvas, video. <b>And it says so when it can't help:</b> native projects, WordPress themes and source without a build get a clear message at the door.</p>
          </section>
          <section className="landing__sec">
            <h2 id="privacy">Your files never leave your browser</h2>
            <p>There is no server behind the sandbox, no account, no cookies and no analytics. Your files are read in this tab and served to the frame by a service worker; exports are made here too. Check it: watch the network tab while you drop and export, or go offline and drop a zip. The one exception is a public repo URL, which goes through uisandbox.org to fetch its zip, because GitHub and GitLab do not let a browser fetch it directly. Nothing is stored. <a href="https://github.com/Ideelab/uisandbox/blob/main/notes/security.md" target="_blank" rel="noopener">The full security note.</a></p>
          </section>
          <section className="landing__sec">
            <h2 id="agents">From your terminal, or from your agent</h2>
            <p>The same engine runs as an MCP server and as a <b>Claude Code skill</b>, <code>/uisandbox</code>. Say <em>"open this app in UISandbox"</em> and it opens the real sandbox in your browser; <em>Send to your agent</em> hands what you turned back. Any MCP client (Cursor, Claude Desktop, Codex) gets the server and its <code>/uisandbox:open</code> prompt. Or run <code>npx uisandbox-mcp open</code> in your project, without an agent.</p>
            <InstallLine />
            <p className="landing__more"><b>Or a link.</b> <code>uisandbox.org/?load=</code> followed by a public GitHub or GitLab repo, or a <code>.zip</code> that allows CORS, opens straight into the sandbox: <a href="https://uisandbox.org/?load=https://github.com/edwardtufte/tufte-css" target="_blank" rel="noopener">uisandbox.org/?load=https://github.com/edwardtufte/tufte-css</a>.</p>
          </section>
          <section className="landing__sec landing__sec--quiet">
            <h2>Who made this</h2>
            <p>I'm <a href="https://github.com/AlexanderKaan" target="_blank" rel="noopener">Alexander Kaan</a>, and I build open-source tooling for user interfaces. UISandbox grew out of the design system generator I made before it: I could hand somebody a finished kit, but I could not show them their own app in it. Every decision, including the ones I had to undo, is in the repo's <a href="https://github.com/Ideelab/uisandbox/blob/main/notes/decisions.md" target="_blank" rel="noopener">notes</a>. It's <a href="https://github.com/Ideelab/uisandbox" target="_blank" rel="noopener">MIT</a>, and issues and pull requests are welcome.</p>
          </section>
          </details>
        </div>
      </div>
    </div>
  )
}
