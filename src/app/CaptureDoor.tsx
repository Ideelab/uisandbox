/**
 * The tab a bookmarklet opens (`/?capture=1`), before its first screen
 * arrives: what is happening, and, for someone who came here by hand, the
 * bookmarklet to drag. Not linked from the door yet (decision 207).
 */
import { useEffect, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { grab } from '../capture/grab'
import { bookmarklet, consoleLine } from '../capture/receive'

export function CaptureDoor({ waiting }: { waiting: boolean }) {
  const link = useRef<HTMLAnchorElement>(null)
  const [copied, setCopied] = useState(false)
  // React refuses a javascript: href (it would be an XSS sink in any other
  // link); this one is ours, so it is set on the element after render.
  useEffect(() => { link.current?.setAttribute('href', bookmarklet(grab.toString(), location.origin)) }, [])
  const copy = async () => {
    try { await navigator.clipboard.writeText(consoleLine(grab.toString(), location.origin)); setCopied(true); setTimeout(() => setCopied(false), 1400) } catch { /* nothing to fall back to: the bookmarklet is the way */ }
  }
  return (
    <div className="intake intake--door">
      <div className="door">
        <div className="card intake__card">
          {waiting ? (
            <p className="intake__copy" role="status">Waiting for a screen from your app. Keep its tab open: it is sending what it shows right now.</p>
          ) : (
            <>
              <p className="intake__copy">Drag this to your bookmarks bar, open your app where you are logged in, and click it on every screen you want here.</p>
              <div className="intake__choices">
                <a ref={link} className="btn btn--primary" onClick={(e) => e.preventDefault()} title="Drag me to the bookmarks bar">Take this screen along</a>
              </div>
              <p className="intake__note">It copies the page as your browser renders it, with its styles, images and fonts, and hands it to a UISandbox tab. Tab to tab: nothing goes to a server, and no password field is ever copied.</p>
              <p className="intake__note">Does your app's security policy block bookmarklets? Paste this into its console instead. <button type="button" className="btn btn--secondary btn--sm" onClick={copy}>{copied ? <><Check size={13} strokeWidth={2} /> Copied</> : <><Copy size={13} strokeWidth={2} /> Copy the console line</>}</button></p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
