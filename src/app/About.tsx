/**
 * /about — the story the homepage used to tell above and below the door.
 *
 * The homepage is the editor now (merge phase 3): a visitor lands on a kit and
 * turns a knob before reading anything. Everything that explains, argues or
 * proves lives here, one link away, unchanged in substance: how it works, the
 * objection a developer reaches for first, how to check it yourself, the
 * privacy claim with its three checks, the agent route, who made it.
 */
import { useEffect, useState } from 'react'
import { ArrowRight, Check, Info, Plug } from 'lucide-react'
import { Mark } from './Mark'
import { InstallLine } from './InstallLine'
import { McpButton } from './McpButton'
import { StarButton } from './StarButton'
import { SiteFooter } from './SiteFooter'
import { Landing, PrivacyCard } from './Intake'

export function About() {
  const [showPrivacy, setShowPrivacy] = useState(false)
  // Its own title and canonical: the SPA fallback serves index.html here,
  // and two URLs claiming to be "/" is one page too many for a search engine.
  useEffect(() => {
    document.title = 'How UISandbox works · Play with your app\'s design, right in the browser'
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', 'https://uisandbox.org/about')
  }, [])
  return (
    <div className="app">
      <header className="app__topbar">
        <a className="app__brand" href="/" title="Open the editor"><span className="app__brand-mark"><Mark size={16} /></span>UISandbox <small>Interface Design Playground</small></a>
        <span className="app__spacer" />
        <div className="app__group">
          <McpButton />
          <StarButton />
        </div>
      </header>
      <div className="app__body app__body--page">
        <div className="intake">
          <section className="hero">
            <div className="intake__mark"><Mark size={44} /></div>
            {/* Each sentence its own line: the break belongs at the full stop. */}
            <h1><span>Play with your app's design.</span><span>Right in the browser.</span></h1>
            <p className="hero__beats">Start from a kit or your own app, turn the knobs, export the code.</p>
            <p className="hero__sub">In your browser, or straight from your agent via MCP. Every colour, font, radius and spacing in its CSS becomes a knob, and the real app follows 1:1. Nothing is sent to a server and nothing is stored: close the tab and it is all undone. What you keep comes out as a design system and a skill for your agent, a patch, or design tokens.</p>
            <div className="hero__ctas">
              <a className="btn btn--primary" href="/">Open the editor <ArrowRight size={15} strokeWidth={1.75} /></a>
              <a className="btn btn--secondary" href="/?tab=app"><Plug size={15} strokeWidth={1.75} /> Bring your own app</a>
            </div>
            <InstallLine compact />
            <ul className="hero__proof" aria-label="In short">
              <li><Check size={13} strokeWidth={2.5} /> Free</li>
              <li><Check size={13} strokeWidth={2.5} /> Open source <a href="https://github.com/Ideelab/uisandbox/blob/main/LICENSE" target="_blank" rel="noopener license">(MIT)</a></li>
              <li><Check size={13} strokeWidth={2.5} /> Your files never leave your browser <button type="button" className="hero__info" onClick={() => setShowPrivacy(true)} aria-label="How your files stay private" title="How your files stay private"><Info size={13} /></button></li>
            </ul>
          </section>
          {showPrivacy && <PrivacyCard onClose={() => setShowPrivacy(false)} />}
          <Landing />
        </div>
        <SiteFooter />
      </div>
    </div>
  )
}
