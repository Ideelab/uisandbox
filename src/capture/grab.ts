/**
 * "Take this screen along": the half that runs in THEIR tab.
 *
 * An app behind a login cannot be fetched by URL and may not run on
 * localhost; only the user's own logged-in browser sees it rendered. So the
 * capture runs there, as a bookmarklet (or pasted into the console), and
 * serialises the page as it stands right now:
 *
 *   the DOM          document.documentElement after render, scripts removed
 *                    (a snapshot must not boot the app a second time), open
 *                    shadow roots as declarative <template shadowrootmode>,
 *                    form values, canvases as images
 *   every sheet      <style> as its text, or its CSSOM when JS inserted rules
 *                    the text does not hold (CSS-in-JS "speedy" mode); <link>
 *                    sheets fetched from the page (their cookies, their cache),
 *                    CSSOM when the fetch is refused, named when both are;
 *                    adopted sheets, document and shadow
 *   every asset      images, fonts, background images, @imports, fetched with
 *                    the page's own credentials, so what sits behind the login
 *                    comes along as bytes
 *
 * and hands it to a uisandbox tab through window.open + postMessage, origin
 * checked on both ends. Nothing goes to a server: tab to tab.
 *
 * SELF-CONTAINED ON PURPOSE. The bookmarklet is this function's own source
 * (`grab.toString()`), so it may reference nothing outside its body: no
 * imports, no module-level helpers, no innerHTML (a Trusted Types policy would
 * throw), no data: fetch (connect-src would refuse it).
 */
export async function grab(SANDBOX: string): Promise<void> {
  const t0 = performance.now()
  const NAME = 'uisandbox-capture'
  const toast = (text: string, ms = 4000) => {
    try {
      const el = document.createElement('div')
      el.textContent = text
      // CSSOM, not a style attribute: a strict style-src allows the former.
      el.style.cssText = 'position:fixed;z-index:2147483647;right:16px;bottom:16px;max-width:360px;padding:10px 14px;border-radius:8px;background:#111;color:#fff;font:13px/1.4 system-ui,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.3)'
      document.documentElement.appendChild(el)
      setTimeout(() => el.remove(), ms)
    } catch { /* the page may forbid even this; the sandbox tab says what arrived */ }
  }

  // The tab first, synchronously: a popup is allowed only inside the click.
  // By NAME, so a second click finds the tab the first one opened and adds a
  // screen to it rather than opening another (the sandbox names itself, since
  // a cross-site navigation clears window.name).
  const tab = window.open('', NAME)
  if (!tab) { toast('UISandbox: the browser blocked the new tab. Allow pop-ups for this site and click again.', 8000); return }
  try { if (tab.location.href === 'about:blank') tab.location.href = `${SANDBOX}/?capture=1` } catch { /* cross-origin: our tab, already open */ }

  const ready = new Promise<'ready' | 'cut' | 'silent'>((resolve) => {
    const end = (v: 'ready' | 'cut' | 'silent') => { removeEventListener('message', on); clearInterval(ping); clearTimeout(give); resolve(v) }
    const on = (e: MessageEvent) => { if (e.source === tab && e.origin === SANDBOX && (e.data && e.data.type) === 'uisandbox:ready') end('ready') }
    addEventListener('message', on)
    // A page with Cross-Origin-Opener-Policy loses its handle on the tab the
    // moment that tab goes to another origin: it reads as closed.
    const ping = setInterval(() => { if (tab.closed) end('cut'); else try { tab.postMessage({ type: 'uisandbox:ping' }, SANDBOX) } catch { /* still loading */ } }, 250)
    const give = setTimeout(() => end('silent'), 30000)
  })

  // ── the capture ────────────────────────────────────────────────────────
  const files = new Map<string, Blob>()
  const byUrl = new Map<string, Promise<string | null>>()
  const refused: Array<{ url: string; why: string }> = []
  const stats = { sheets: 0, sheetsFromCssom: 0, sheetsRefused: 0, styles: 0, stylesFromCssom: 0, assets: 0, assetsRefused: 0, shadowRoots: 0, maybeClosedShadow: 0, canvases: 0, canvasesBlank: 0, frames: 0, scripts: 0 }

  // A content address: the same font on two screens is one file.
  const hash = (buf: ArrayBuffer) => {
    const b = new Uint8Array(buf)
    let h = 0x811c9dc5
    for (let i = 0; i < b.length; i++) { h ^= b[i]!; h = Math.imul(h, 0x01000193) }
    return (h >>> 0).toString(36) + b.length.toString(36)
  }
  const EXT: Record<string, string> = { 'text/css': 'css', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/avif': 'avif', 'image/svg+xml': 'svg', 'image/x-icon': 'ico', 'image/vnd.microsoft.icon': 'ico', 'font/woff2': 'woff2', 'font/woff': 'woff', 'font/ttf': 'ttf', 'font/otf': 'otf', 'application/font-woff': 'woff', 'application/font-woff2': 'woff2', 'application/x-font-woff': 'woff', 'application/vnd.ms-fontobject': 'eot' }
  const extOf = (type: string, url: string) => {
    const t = (type || '').split(';')[0]!.trim().toLowerCase()
    if (EXT[t]) return EXT[t]!
    const m = url.split(/[?#]/)[0]!.match(/\.([a-z0-9]{2,5})$/i)
    return m ? m[1]!.toLowerCase() : 'bin'
  }
  const put = async (blob: Blob, ext: string) => {
    const path = `_c/${hash(await blob.arrayBuffer())}.${ext}`
    files.set(path, blob)
    return '/' + path
  }
  const abs = (raw: string, base: string) => { try { return new URL(raw, base).href } catch { return null } }
  const keep = (raw: string) => !raw || /^(data:|#|about:|javascript:)/i.test(raw.trim())

  /** An image, a font: its bytes, with the page's cookies when it is the page's own. */
  const asset = (url: string): Promise<string | null> => {
    if (!byUrl.has(url)) byUrl.set(url, (async () => {
      try {
        const r = await fetch(url, { cache: 'force-cache' })
        if (!r.ok) { refused.push({ url, why: `HTTP ${r.status}` }); stats.assetsRefused++; return null }
        const b = await r.blob()
        stats.assets++
        return put(b, extOf(b.type, url))
      } catch { refused.push({ url, why: 'fetch refused (CORS, or the page\'s connect-src)' }); stats.assetsRefused++; return null }
    })())
    return byUrl.get(url)!
  }

  const URL_RE = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)'"\s]*))\s*\)|@import\s+(?:"([^"]*)"|'([^']*)')/gi
  /** Every url() and @import in a sheet, resolved against `base` and replaced by its captured path. */
  const css = async (text: string, base: string, depth: number): Promise<string> => {
    const found = new Map<string, Promise<string | null>>()
    for (const m of text.matchAll(URL_RE)) {
      const raw = (m[1] ?? m[2] ?? m[3] ?? m[4] ?? m[5] ?? '').trim()
      if (keep(raw) || found.has(raw)) continue
      const isImport = m[4] !== undefined || m[5] !== undefined || /@import\s*$/i.test(text.slice(Math.max(0, m.index! - 12), m.index))
      const a = abs(raw, base)
      found.set(raw, a ? (isImport ? (depth < 6 ? sheetFile(a, depth + 1) : Promise.resolve(null)) : asset(a)) : Promise.resolve(null))
    }
    const done = new Map<string, string>()
    for (const [raw, p] of found) {
      const got = await p
      done.set(raw, got ?? abs(raw, base) ?? raw)
    }
    return text.replace(URL_RE, (all, d1, s1, u1, d2, s2) => {
      const raw = String(d1 ?? s1 ?? u1 ?? d2 ?? s2 ?? '').trim()
      const to = done.get(raw)
      if (!to) return all
      return d2 !== undefined || s2 !== undefined ? `@import "${to}"` : `url("${to}")`
    })
  }
  /** A stylesheet by URL: fetched as text, its own urls captured, stored. */
  const sheetFile = (url: string, depth: number): Promise<string | null> => {
    const key = 'css:' + url
    if (!byUrl.has(key)) byUrl.set(key, (async () => {
      try {
        const r = await fetch(url, { cache: 'force-cache' })
        if (!r.ok) return null
        return put(new Blob([await css(await r.text(), r.url || url, depth)], { type: 'text/css' }), 'css')
      } catch { return null }
    })())
    return byUrl.get(key)!
  }
  /** The rules a sheet's TEXT holds, counted by the browser's own parser. */
  const textRules = (text: string) => {
    try { const s = new CSSStyleSheet(); s.replaceSync(text); return s.cssRules.length } catch { return -1 }
  }
  const cssomText = (sheet: CSSStyleSheet | null) => {
    try { return sheet ? Array.from(sheet.cssRules, (r) => r.cssText).join('\n') : null } catch { return null }
  }
  const cssomCount = (sheet: CSSStyleSheet | null) => { try { return sheet ? sheet.cssRules.length : -1 } catch { return -1 } }

  // The clone lives in an INERT document: its <img> do not load, its custom
  // elements do not upgrade, its scripts never run.
  const inert = document.implementation.createHTMLDocument('')
  const root = inert.importNode(document.documentElement, true) as HTMLElement

  /** Live and clone, element by element: importNode keeps the tree identical. */
  const pairs: Array<[Element, Element]> = []
  const hosts: Array<[Element, HTMLTemplateElement]> = []
  const walk = (live: Node, clone: Node) => {
    const lw = document.createTreeWalker(live, NodeFilter.SHOW_ELEMENT)
    const cw = inert.createTreeWalker(clone, NodeFilter.SHOW_ELEMENT)
    let l: Node | null = live.nodeType === 1 ? live : lw.nextNode()
    let c: Node | null = clone.nodeType === 1 ? clone : cw.nextNode()
    while (l && c) {
      pairs.push([l as Element, c as Element])
      const sr = (l as Element).shadowRoot
      if (sr) {
        stats.shadowRoots++
        const tpl = inert.createElement('template')
        tpl.setAttribute('shadowrootmode', 'open')
        for (const n of Array.from(sr.childNodes)) tpl.content.appendChild(inert.importNode(n, true))
        hosts.push([l as Element, tpl])
        walk(sr, tpl.content)
      } else if ((l as Element).localName.includes('-') && customElements.get((l as Element).localName) && !(l as Element).firstElementChild) stats.maybeClosedShadow++
      l = lw.nextNode(); c = cw.nextNode()
    }
  }
  walk(document.documentElement, root)

  const work: Promise<unknown>[] = []
  const drop: Element[] = []
  for (const [live, clone] of pairs) {
    const tag = live.localName
    // Nothing that runs: no scripts, no handlers, no javascript: URLs.
    for (const a of Array.from(clone.attributes)) {
      if (/^on/i.test(a.name) || a.name === 'nonce' || a.name === 'integrity' || /^\s*javascript:/i.test(a.value)) clone.removeAttribute(a.name)
    }
    if (tag === 'script') { stats.scripts++; drop.push(clone); continue }
    if (tag === 'base' || (tag === 'meta' && /refresh|content-security-policy/i.test(live.getAttribute('http-equiv') ?? ''))) { drop.push(clone); continue }
    if (tag === 'link') {
      const rel = (live.getAttribute('rel') ?? '').toLowerCase()
      const l = live as HTMLLinkElement
      if (/\bstylesheet\b/.test(rel) && l.href) {
        stats.sheets++
        work.push((async () => {
          let to = await sheetFile(l.href, 0)
          // A sheet JS added rules to after load, or one the fetch was refused
          // for while the CSSOM is readable (crossorigin="anonymous"): the CSSOM.
          const n = cssomCount(l.sheet)
          if (n >= 0 && (!to || (await (async () => { const f = files.get(to!.slice(1)); return f ? textRules(await f.text()) : n })()) < n)) {
            const t = cssomText(l.sheet)
            if (t !== null) { to = await put(new Blob([await css(t, l.href, 1)], { type: 'text/css' }), 'css'); stats.sheetsFromCssom++ }
          }
          if (to) { clone.setAttribute('href', to); clone.removeAttribute('crossorigin') }
          else { stats.sheetsRefused++; refused.push({ url: l.href, why: 'stylesheet: fetch and CSSOM both refused (cross-origin without CORS)' }); clone.setAttribute('href', l.href) }
        })())
      } else if (/\bicon\b/.test(rel) && l.href) {
        work.push(asset(l.href).then((to) => { clone.setAttribute('href', to ?? l.href) }))
      } else if (/preload|prefetch|preconnect|dns-prefetch|manifest/.test(rel)) drop.push(clone)
      continue
    }
    if (tag === 'style') {
      stats.styles++
      const s = live as HTMLStyleElement
      work.push((async () => {
        let text = s.textContent ?? ''
        const n = cssomCount(s.sheet as CSSStyleSheet | null)
        if (n > 0 && textRules(text) < n) { text = cssomText(s.sheet as CSSStyleSheet) ?? text; stats.stylesFromCssom++ }
        clone.textContent = await css(text, document.baseURI, 0)
      })())
      continue
    }
    const style = clone.getAttribute('style')
    if (style && /url\(/i.test(style)) work.push(css(style, document.baseURI, 0).then((t) => clone.setAttribute('style', t)))
    if (tag === 'img') {
      const img = live as HTMLImageElement
      const src = img.currentSrc || img.src
      for (const a of ['srcset', 'sizes', 'loading']) clone.removeAttribute(a)
      if (src && !keep(src)) work.push(asset(src).then((to) => clone.setAttribute('src', to ?? src)))
    } else if (tag === 'source' && live.parentElement?.localName === 'picture') drop.push(clone)
    else if (tag === 'video' || tag === 'audio' || tag === 'source' || tag === 'track') {
      // Media plays from where it lives (too large to carry); the poster comes along.
      for (const a of ['src']) { const v = live.getAttribute(a); if (v && !keep(v)) clone.setAttribute(a, abs(v, document.baseURI) ?? v) }
      const poster = (live as HTMLVideoElement).poster
      if (poster) work.push(asset(poster).then((to) => clone.setAttribute('poster', to ?? poster)))
    } else if (tag === 'image' || tag === 'use' || tag === 'feimage') {
      for (const a of ['href', 'xlink:href']) {
        const v = live.getAttribute(a)
        if (!v || keep(v)) continue
        const u = abs(v, document.baseURI)
        if (!u) continue
        const [file, frag] = u.split('#')
        work.push(asset(file!).then((to) => clone.setAttribute(a, (to ?? file) + (frag !== undefined ? '#' + frag : ''))))
      }
    } else if (tag === 'canvas') {
      stats.canvases++
      const cv = live as HTMLCanvasElement
      const img = inert.createElement('img')
      for (const a of Array.from(clone.attributes)) img.setAttribute(a.name, a.value)
      img.setAttribute('width', String(cv.width)); img.setAttribute('height', String(cv.height))
      clone.replaceWith(img)
      work.push(new Promise<void>((resolve) => {
        try { cv.toBlob(async (b) => { if (b) img.setAttribute('src', await put(b, 'png')); else stats.canvasesBlank++; resolve() }) } catch { stats.canvasesBlank++; resolve() }
      }))
    } else if (tag === 'iframe' || tag === 'frame' || tag === 'embed' || tag === 'object') {
      stats.frames++
      for (const a of ['src', 'srcdoc', 'data']) clone.removeAttribute(a)
    } else if (tag === 'input') {
      const i = live as HTMLInputElement
      if (i.type === 'checkbox' || i.type === 'radio') { if (i.checked) clone.setAttribute('checked', ''); else clone.removeAttribute('checked') }
      // A password is never taken along, not even into a tab of the user's own.
      else if (i.type !== 'password' && i.type !== 'file' && i.type !== 'hidden') clone.setAttribute('value', i.value)
    } else if (tag === 'textarea') clone.textContent = (live as HTMLTextAreaElement).value
    else if (tag === 'option') { if ((live as HTMLOptionElement).selected) clone.setAttribute('selected', ''); else clone.removeAttribute('selected') }
  }

  // Shadow roots: their adopted sheets as a <style> after their own (that is
  // where the cascade puts them), then the declarative template, first child.
  for (const [live, tpl] of hosts) {
    const sr = live.shadowRoot!
    const adopted = Array.from(sr.adoptedStyleSheets ?? []).map(cssomText).filter((t): t is string => !!t)
    if (adopted.length) work.push(css(adopted.join('\n'), document.baseURI, 0).then((t) => { const s = inert.createElement('style'); s.textContent = t; tpl.content.appendChild(s) }))
  }
  const docAdopted = Array.from(document.adoptedStyleSheets ?? []).map(cssomText).filter((t): t is string => !!t)
  if (docAdopted.length) work.push(css(docAdopted.join('\n'), document.baseURI, 0).then(async (t) => {
    const l = inert.createElement('link'); l.setAttribute('rel', 'stylesheet'); l.setAttribute('href', await put(new Blob([t], { type: 'text/css' }), 'css'))
    ;(root.querySelector('body') ?? root).appendChild(l)
  }))

  await Promise.all(work)
  const cloneOf = new Map(pairs)
  for (const [live, tpl] of hosts) { const c = cloneOf.get(live)!; c.insertBefore(tpl, c.firstChild) }
  for (const el of drop) el.remove()

  const doctype = document.compatMode === 'BackCompat' ? '' : '<!DOCTYPE html>'
  const html = doctype + root.outerHTML
  const list = [...files.entries()].map(([path, blob]) => ({ path, blob }))
  const bytes = html.length + list.reduce((n, f) => n + f.blob.size, 0)
  const captureMs = Math.round(performance.now() - t0)

  const answer = await ready
  if (answer === 'cut') { toast('UISandbox: this app cuts its tab off from the tabs it opens (Cross-Origin-Opener-Policy), so the screen cannot be handed over. Nothing was sent.', 10000); return }
  if (answer === 'silent') { toast('UISandbox: the sandbox tab did not answer within 30 s. Is it open on ' + SANDBOX + '?', 8000); return }
  const acked = new Promise<{ ok: boolean; why?: string; screen?: string } | null>((resolve) => {
    const on = (e: MessageEvent) => {
      if (e.source !== tab || e.origin !== SANDBOX || (e.data && e.data.type) !== 'uisandbox:ack') return
      removeEventListener('message', on); clearTimeout(give); resolve(e.data)
    }
    addEventListener('message', on)
    const give = setTimeout(() => { removeEventListener('message', on); resolve(null) }, 60000)
  })
  tab.postMessage({
    type: 'uisandbox:capture', v: 1,
    href: location.href, title: document.title, viewport: { w: innerWidth, h: innerHeight, dpr: devicePixelRatio },
    html, files: list, refused: refused.slice(0, 200), stats, captureMs, bytes, sentAt: Date.now(),
  }, SANDBOX)
  const ack = await acked
  const mb = bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
  if (!ack) toast(`UISandbox: sent (${mb}) but the sandbox tab did not confirm.`, 8000)
  else if (!ack.ok) toast(`UISandbox refused this screen: ${ack.why ?? 'no reason given'}`, 8000)
  else toast(`Taken along to UISandbox: ${ack.screen} (${mb}, ${list.length + 1} files, ${captureMs} ms)${refused.length ? `. ${refused.length} could not be fetched; the sandbox tab names them.` : '.'}`)
}
