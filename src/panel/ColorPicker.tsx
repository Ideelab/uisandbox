/**
 * The colour field and its picker: ours, not the operating system's.
 *
 * The native <input type="color"> opened macOS's panel (RGB sliders, a
 * format menu, its own chrome) beside a panel that speaks in OKLCH and in
 * "as in your code". This one speaks the same language as the knobs:
 *
 *   - the plane is OKLCH lightness (top light, bottom dark) by chroma (left
 *     grey, right vivid) at one hue, so equal steps look equal, and the edge
 *     of what a screen can show (sRGB) is drawn: past it is hatched, and a
 *     drag there lands on the edge, the most vivid this hue gets;
 *   - one value field, in the notation you pick (HEX, RGB, HSL, OKLCH), that
 *     reads any CSS colour you type or paste;
 *   - the swatch is split: your code on the left, now on the right. Click the
 *     left half and you are back.
 *
 * Closed it is one row, so four status colours stacked in one flyout stay
 * four rows; one picker is open at a time.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ChevronDown, Pipette } from 'lucide-react'
import { hexToHsl, hexToOklch, oklchToHex } from '../tokens/color'
import { parseCssColor, formatCssColor } from '../sandbox/cssColor'

type Hex = `#${string}`
type Fmt = 'hex' | 'rgb' | 'hsl' | 'oklch'
const FMTS: Fmt[] = ['hex', 'rgb', 'hsl', 'oklch']
const FMT_KEY = 'us.colorFormat'

/* OKLCH → linear sRGB, unclamped: the gamut test needs to see past 0..1. */
function linear(L: number, C: number, H: number): [number, number, number] {
  const hr = (H * Math.PI) / 180
  const a = C * Math.cos(hr), b = C * Math.sin(hr)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s]
}
const inGamut = (L: number, C: number, H: number) => linear(L, C, H).every((v) => v >= -0.0001 && v <= 1.0001)
/** The most chroma this lightness and hue can show on an sRGB screen. */
function maxChroma(L: number, H: number): number {
  let lo = 0, hi = 0.4
  for (let i = 0; i < 16; i++) { const mid = (lo + hi) / 2; if (inGamut(L, mid, H)) lo = mid; else hi = mid }
  return lo
}
const enc = (v: number) => { const c = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055; return Math.round(Math.max(0, Math.min(1, c)) * 255) }

function format(hex: Hex, fmt: Fmt): string {
  if (fmt === 'hex') return hex.toUpperCase()
  if (fmt === 'rgb') { const n = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)); return `rgb(${n.join(' ')})` }
  if (fmt === 'hsl') { const [h, s, l] = hexToHsl(hex); return `hsl(${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%)` }
  const [L, C, H] = hexToOklch(hex)
  return `oklch(${(L * 100).toFixed(1)}% ${C.toFixed(3)} ${C < 0.002 ? 0 : Math.round(H)})`
}
/** Anything CSS calls a colour (hex, rgb, hsl, oklch, a name) to opaque hex, or null. */
function parse(text: string): Hex | null {
  const t = text.trim()
  const bare = /^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(t) ? '#' + t : t
  const c = parseCssColor(bare)
  return c ? (formatCssColor({ ...c, a: 1 }).toLowerCase() as Hex) : null
}

const readFmt = (): Fmt => { try { const f = localStorage.getItem(FMT_KEY) as Fmt | null; return f && FMTS.includes(f) ? f : 'hex' } catch { return 'hex' } }

export function ColorField({ label, value, base, onChange, open, onToggle, ring }: {
  label: string
  /** The colour now, as hex. */
  value: string
  /** The colour your code has: the left half of the swatch, and the way back. */
  base?: string
  onChange: (hex: Hex) => void
  open: boolean
  onToggle: () => void
  /** A page background: the swatch gets a ring so white on white still shows. */
  ring?: boolean
}) {
  const hex = (parse(value) ?? '#000000') as Hex
  const baseHex = base ? parse(base) : null
  return (
    <div className={`cpk ${open ? 'cpk--open' : ''}`}>
      <button type="button" className="cpk__head" onClick={onToggle} aria-expanded={open}>
        <span className="cpk__label">{label}</span>
        <span className="cpk__val">
          <span className={`cpk__swatch ${ring ? 'cpk__swatch--ring' : ''}`} aria-hidden>
            {baseHex && baseHex !== hex && <i style={{ background: baseHex }} />}
            <i style={{ background: hex }} />
          </span>
          {hex.toUpperCase()}
        </span>
        <ChevronDown size={13} strokeWidth={2} className="cpk__chev" />
      </button>
      {open && <Picker hex={hex} baseHex={baseHex} onChange={onChange} label={label} />}
    </div>
  )
}

function Picker({ hex, baseHex, onChange, label }: { hex: Hex; baseHex: Hex | null; onChange: (hex: Hex) => void; label: string }) {
  // The hue lives here, not only in the hex: a grey has none, and dragging to
  // the grey edge must not throw the hue slider back to red.
  // A grey has no hue of its own: it opens on blue, where the plane is widest.
  const [lch, setLch] = useState(() => { const [L, C, H] = hexToOklch(hex); return { L, C, H: C < 0.002 ? 255 : H } })
  const emitted = useRef<string>(hex)
  useEffect(() => {
    if (hex === emitted.current) return
    const [L, C, H] = hexToOklch(hex)
    setLch((p) => ({ L, C, H: C < 0.002 ? p.H : H }))
    emitted.current = hex
  }, [hex])
  const [fmt, setFmt] = useState<Fmt>(readFmt)
  const [text, setText] = useState<string | null>(null) // being typed
  const plane = useRef<HTMLCanvasElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const raf = useRef(0)
  // The plane's chroma axis ends a little past this hue's most vivid colour,
  // so the edge always shows and the plane is never mostly empty.
  const cMax = (() => { let m = 0; for (let L = 0.05; L < 1; L += 0.05) m = Math.max(m, maxChroma(L, lch.H)); return Math.max(0.04, m * 1.12) })()

  useLayoutEffect(() => {
    const cv = plane.current
    if (!cv) return
    const w = 116, h = 66 // drawn small, shown large: the plane is all gradients
    cv.width = w; cv.height = h
    const ctx = cv.getContext('2d')!
    const img = ctx.createImageData(w, h)
    for (let y = 0; y < h; y++) {
      const L = 1 - y / (h - 1)
      for (let x = 0; x < w; x++) {
        const C = (x / (w - 1)) * cMax
        const i = (y * w + x) * 4
        const lin = linear(L, C, lch.H)
        if (lin.every((v) => v >= -0.0001 && v <= 1.0001)) { img.data[i] = enc(lin[0]); img.data[i + 1] = enc(lin[1]); img.data[i + 2] = enc(lin[2]); img.data[i + 3] = 255 }
        else img.data[i + 3] = 0
      }
    }
    ctx.putImageData(img, 0, 0)
  }, [lch.H, cMax])

  const emit = (L: number, C: number, H: number) => {
    const c = Math.min(C, maxChroma(L, H))
    setLch({ L, C: c, H })
    const out = oklchToHex(L, c, H) as Hex
    emitted.current = out
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(() => onChange(out))
  }
  const fromPointer = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect()
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
    emit(1 - y, x * cMax, lch.H)
  }
  const onKey = (e: React.KeyboardEvent) => {
    const k = e.shiftKey ? 5 : 1
    const moves: Record<string, [number, number]> = { ArrowUp: [0.01, 0], ArrowDown: [-0.01, 0], ArrowRight: [0, 0.004], ArrowLeft: [0, -0.004] }
    const m = moves[e.key]
    if (!m) return
    e.preventDefault()
    emit(Math.min(1, Math.max(0, lch.L + m[0] * k)), Math.max(0, lch.C + m[1] * k), lch.H)
  }
  const hueStops = Array.from({ length: 13 }, (_, i) => `${oklchToHex(0.72, Math.min(0.13, maxChroma(0.72, i * 30)), i * 30)} ${((i / 12) * 100).toFixed(1)}%`).join(', ')
  const eyedrop = typeof window !== 'undefined' && 'EyeDropper' in window
  const pick = async () => {
    try {
      const r = await new (window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper().open()
      const h = parse(r.sRGBHex); if (h) { const [L, C, H] = hexToOklch(h); emit(L, C, C < 0.002 ? lch.H : H) }
    } catch { /* cancelled */ }
  }
  const commit = () => {
    if (text === null) return
    const h = parse(text)
    if (h) { const [L, C, H] = hexToOklch(h); emit(L, C, C < 0.002 ? lch.H : H) }
    setText(null)
  }
  const cycle = () => { const next = FMTS[(FMTS.indexOf(fmt) + 1) % FMTS.length]!; setFmt(next); setText(null); try { localStorage.setItem(FMT_KEY, next) } catch { /* a private window */ } }

  return (
    <div className="cpk__body">
      <div ref={box} className="cpk__plane" tabIndex={0} role="slider" aria-label={`${label}: lightness and chroma`} aria-valuetext={format(hex, 'oklch')}
        onPointerDown={(e) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); fromPointer(e) }}
        onPointerMove={(e) => { if (e.buttons) fromPointer(e) }} onKeyDown={onKey}>
        <canvas ref={plane} aria-hidden />
        <span className="cpk__thumb" style={{ left: `${(lch.C / cMax) * 100}%`, top: `${(1 - lch.L) * 100}%`, background: hex }} />
        <span className="cpk__edge" aria-hidden>sRGB edge</span>
      </div>
      <input className="cpk__hue" type="range" min={0} max={360} step={1} value={Math.round(lch.H)} aria-label={`${label}: hue`}
        style={{ background: `linear-gradient(to right, ${hueStops})` }}
        onChange={(e) => emit(lch.L, lch.C > 0.002 ? lch.C : 0.08, Number(e.target.value))} />
      <div className="cpk__row">
        {eyedrop && <button type="button" className="cpk__tool" onClick={() => void pick()} title="Pick a colour from the screen" aria-label="Pick a colour from the screen"><Pipette size={14} strokeWidth={1.75} /></button>}
        {baseHex && (
          <button type="button" className="cpk__split" onClick={() => { const [L, C, H] = hexToOklch(baseHex); emit(L, C, C < 0.002 ? lch.H : H) }} disabled={baseHex === hex} title={baseHex === hex ? 'As in your code' : `Back to your code (${baseHex.toUpperCase()})`} aria-label="Back to your code">
            <i style={{ background: baseHex }} /><i style={{ background: hex }} />
          </button>
        )}
        <input className="cpk__text" value={text ?? format(hex, fmt)} spellCheck={false} aria-label={`${label} value`}
          onChange={(e) => setText(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') { commit(); (e.target as HTMLInputElement).blur() } if (e.key === 'Escape') { setText(null); e.stopPropagation() } }} />
        <button type="button" className="cpk__fmt" onClick={cycle} title="Show it as HEX, RGB, HSL or OKLCH">{fmt.toUpperCase()}</button>
      </div>
    </div>
  )
}
