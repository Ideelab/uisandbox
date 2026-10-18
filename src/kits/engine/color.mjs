/**
 * THE COLOUR MATHS. Lifted whole from the archived engine, not rewritten.
 *
 * This is the one place a design system generator is allowed to COMPUTE rather
 * than read. A kit publishes its defaults; nobody publishes YOUR ramp. Turning
 * one colour into a scale is arithmetic in OKLCH — not a taste — and the
 * alternative is asking a person for nine hexes they do not have.
 *
 * From tag archive/cockpit-2026-08-17 (src/tokens/color.ts), where it was swept
 * against contrast floors across sixty theme x mode x density combinations.
 * Taken WHOLE and type-stripped rather than a subset: pulling out four functions
 * meant chasing their helpers one error at a time, and a maths module missing a
 * helper is a maths module that is wrong somewhere you have not looked yet.
 *
 *   okAccentScale   one colour -> ten steps; step 9 IS the colour you gave
 *   okNeutralScale  greys, optionally TINTED toward a hue — Relume's neutral
 *                   tint, and what makes a system read as one thing
 *   nameColor       a hex -> a name, so a system has words and not codes
 *   contrast        the floor everything gets checked against
 */
function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (mx + mn) / 2;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return [h * 360, s * 100, l * 100];
}
function hexToOklch(hex) {
  const lin = (v) => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  const r = lin(parseInt(hex.slice(1, 3), 16) / 255);
  const g = lin(parseInt(hex.slice(3, 5), 16) / 255);
  const b = lin(parseInt(hex.slice(5, 7), 16) / 255);
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  const C = Math.sqrt(A * A + B * B);
  let H = Math.atan2(B, A) * 180 / Math.PI;
  if (H < 0) H += 360;
  return [L, C, H];
}
const oklch = (L, C, H, a) => {
  const Lp = (Math.max(0, Math.min(1, L)) * 100).toFixed(1);
  const Cs = Math.max(0, C).toFixed(4);
  const Hs = ((H % 360 + 360) % 360).toFixed(1);
  return a === void 0 ? `oklch(${Lp}% ${Cs} ${Hs})` : `oklch(${Lp}% ${Cs} ${Hs} / ${a})`;
};
function oklchToLinear(L, C, H) {
  const hr = H * Math.PI / 180;
  const a = C * Math.cos(hr);
  const b = C * Math.sin(hr);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
  ];
}
/**
 * Whether sRGB can show this colour AT ALL, before anything clips it.
 *
 * oklchToHex clamps each channel, and clamping does not dim a colour — it TURNS
 * it: a 224° teal pushed past the gamut came back at 196°, a hue nobody asked
 * for. Asking first is the difference between drawing the boundary and drawing
 * a lie beyond it. The epsilon is for the float, not for the eye.
 */
function inSrgb(L, C, H) {
  return oklchToLinear(L, C, H).every((v) => v >= -1e-4 && v <= 1.0001);
}
/**
 * The most chroma this hue can reach AT THIS LIGHTNESS.
 *
 * The gamut is a wedge, not a rectangle: hue 200 tops out at 0.15 near white
 * and at a third of that in the middle. A picker with one chroma axis for the
 * whole slice therefore leaves most of its box unreachable, which reads as a
 * broken control rather than as a fact about sRGB. So each row gets its own
 * edge, and the axis means "as far as this lightness can go".
 */
function maxChroma(L, H) {
  let lo = 0, hi = 0.45;
  for (let k = 0; k < 18; k++) {
    const mid = (lo + hi) / 2;
    if (inSrgb(L, mid, H)) lo = mid; else hi = mid;
  }
  return lo;
}
/** The most chroma this hue can reach in sRGB, and the lightness where it does. */
function peakChroma(H, steps = 48) {
  let best = { c: 0, l: 0.5 };
  for (let i = 0; i <= steps; i++) {
    const l = i / steps;
    let lo = 0, hi = 0.45;
    for (let k = 0; k < 18; k++) {
      const mid = (lo + hi) / 2;
      if (inSrgb(l, mid, H)) lo = mid; else hi = mid;
    }
    if (lo > best.c) best = { c: lo, l };
  }
  return best;
}
function oklchToHex(L, C, H) {
  const [lr, lg, lb] = oklchToLinear(L, C, H);
  const enc = (v) => {
    const c = v <= 31308e-7 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
    return Math.round(Math.max(0, Math.min(1, c)) * 255).toString(16).padStart(2, "0");
  };
  return `#${enc(lr)}${enc(lg)}${enc(lb)}`;
}
const hsl = (h, s, l) => {
  const [L, C, H] = hexToOklch(hslToHex(h, Math.max(0, s), Math.max(0, Math.min(100, l))));
  return oklch(L, C, H);
};
const hslA = (h, s, l, a) => {
  const [L, C, H] = hexToOklch(hslToHex(h, Math.max(0, s), Math.max(0, Math.min(100, l))));
  return oklch(L, C, H, a);
};
/* CSS allows lightness as a percentage OR as a number from 0 to 1, and kits use
 * both: daisyUI writes oklch(76% 0.177 163) and shadcn writes
 * oklch(0.577 0.245 27.325). A regex that demanded the percent sign read every
 * shadcn colour as #000000 and said nothing about it. */
/* `none` is a component, not a syntax error.
 *
 * CSS Color 4 lets any channel be the keyword `none`, and Tailwind uses it:
 * --color-zinc-50 is `oklch(98.5% 0 none)`, a hueless near-white. The old
 * pattern demanded three numbers, missed, and returned #000000 — so the
 * lightest step of that ramp read as PURE BLACK, and every role taken from
 * zinc came out one step off with nothing to say why. For conversion a missing
 * component is zero, which is what the specification says and what a chroma of
 * zero means anyway. */
const oklchStrToHex = (str) => {
  const num = "([\\d.]+|none)";
  const m = String(str).match(new RegExp(`oklch\\(\\s*${num}(%?)\\s+${num}\\s+${num}`, "i"));
  if (!m) return "#000000";
  const n = (v) => (v === "none" ? 0 : parseFloat(v));
  const l = m[2] === "%" ? n(m[1]) / 100 : n(m[1]);
  return oklchToHex(l, n(m[3]), n(m[4]));
};
const SCALE_L_LIGHT = [0.995, 0.98, 0.958, 0.937, 0.916, 0.892, 0.858, 0.8, 0.64, 0.605, 0.503, 0.16];
const SCALE_L_DARK = [0.176, 0.213, 0.254, 0.285, 0.317, 0.355, 0.423, 0.536, 0.64, 0.693, 0.775, 0.945];
const SCALE_C_ACCENT = [0.07, 0.13, 0.22, 0.33, 0.44, 0.55, 0.68, 0.84, 1, 0.97, 0.79, 0.55];
const SCALE_C_NEUTRAL = [0.4, 0.45, 0.5, 0.55, 0.55, 0.55, 0.6, 0.65, 0.8, 0.85, 1, 1];
function okNeutralScale(tHue, tSat, dark, mono, tintMul = 1) {
  const L = dark ? SCALE_L_DARK : SCALE_L_LIGHT;
  if (mono || tSat <= 0 || tintMul <= 0) return L.map((l) => oklch(l, 0, 0));
  const [, cRef, hRef] = hexToOklch(hslToHex(tHue, Math.max(tSat, 8), 50));
  const baseC = Math.min(Math.min(cRef * 0.65, 0.014) * tintMul, 0.04);
  return L.map((l, i) => oklch(l, baseC * (SCALE_C_NEUTRAL[i] ?? 1), hRef));
}
function okAccentScale(solidHex, dark) {
  const [Ls, Cs, Hs] = hexToOklch(solidHex);
  const L = (dark ? SCALE_L_DARK : SCALE_L_LIGHT).slice();
  L[8] = Ls;
  L[9] = dark ? Math.min(Ls + 0.05, 0.99) : Math.max(Ls - 0.05, 0.05);
  return L.map((l, i) => oklch(l, Cs * (SCALE_C_ACCENT[i] ?? 1), Hs));
}
function paletteSet(h, s, mono, dark, harmony) {
  const factor = Math.max(0, Math.min(1.5, harmony?.spreadFactor ?? 1));
  const xm = Math.max(0, Math.min(2, harmony?.exprMul ?? 1));
  const soften = 1 - Math.min(1, xm);
  const xs = (v) => Math.min(96, Math.round(v * xm));
  let hsls;
  if (mono || s === 0 || xm === 0) {
    const ls = dark ? [78, 68, 58, 49, 40, 32] : [30, 42, 52, 61, 70, 78];
    hsls = ls.map((l) => [h, 0, l]);
  } else {
    const dh = [0, 42, 96, 168, 220, 292];
    const baseL = dark ? 56 : 54;
    const softL2 = dark ? 56 : 80;
    hsls = dh.map((d, i) => [
      (h + d * factor) % 360,
      xs(dark ? 74 : 76),
      baseL + (softL2 - baseL) * soften - (soften > 0.5 && !dark && i % 2 ? 3 : 0)
    ]);
  }
  if (!(mono || s === 0 || xm === 0)) {
    if (factor < 0.999) {
      const ls = dark ? [78, 68, 58, 49, 40, 32] : [30, 42, 52, 61, 70, 78];
      hsls = hsls.map(([H, S, L], i) => [H, S, L + ((ls[i] ?? L) - L) * (1 - factor)]);
    }
    hsls = hsls.map(([H, S, L]) => dislikeFix(H, S, L));
  }
  if (!(mono || s === 0)) {
    const ORDER = [0, 2, 4, 1, 3, 5];
    hsls = ORDER.map((i) => hsls[i]);
  }
  const base = hsls.map(([H, S, L]) => hsl(H, S, L));
  const ink = hsls.map(([H, S, L]) => aaInk(hslToHex(H, S, L)));
  const softL = dark ? 26 + 6 * soften : 87 + 7 * soften;
  const softSCap = 80 - 22 * soften;
  const soft = hsls.map(([H, S]) => hsl(H, mono || s === 0 ? 0 : Math.min(S, softSCap), softL));
  const softFgL = dark ? 82 : 22 + 6 * soften;
  const softFg = hsls.map(([H, S]) => hsl(H, mono || s === 0 ? 0 : Math.min(S + 10, 84), softFgL));
  const grad = hsls.map(([H, S, L]) => {
    const partner = hsl((H + 18) % 360, Math.max(S - 6, 0), Math.min(L + (dark ? 10 : 12), 92));
    return `linear-gradient(135deg, ${hsl(H, S, L)}, ${partner})`;
  });
  return { base, ink, soft, softFg, grad };
}
function hslToHex(h, s, l) {
  const H = h / 360;
  const S = s / 100;
  const L = l / 100;
  const f = (n) => {
    const k = (n + H * 12) % 12;
    const a = S * Math.min(L, 1 - L);
    const c = L - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
function assertHex(hex, fn) {
  if (typeof hex === "string" && /^#[0-9a-f]{6}$/i.test(hex)) return;
  const msg = `${fn}() needs a 6-digit hex and got: ${String(hex).slice(0, 60)}`;
  if (import.meta.env?.DEV || import.meta.env?.MODE === "test") throw new TypeError(msg);
  else if (typeof console !== "undefined") console.error(`[uicockpit] ${msg}`);
}
function relLum(hex) {
  assertHex(hex, "relLum");
  const c = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const contrast = (a, b) => {
  const l1 = relLum(a);
  const l2 = relLum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};
const readableInk = (hex) => relLum(hex) > 0.42 ? "#16160c" : "#ffffff";
const aaInk = (hex) => {
  const pick = readableInk(hex);
  if (contrast(hex, pick) >= 4.5) return pick;
  const alt = pick === "#ffffff" ? "#16160c" : "#ffffff";
  return contrast(hex, alt) >= 4.5 ? alt : pick;
};
const dislikeFix = (h, s, l) => h >= 90 && h <= 111 && s > 16 && l < 65 ? [h, s, 70] : [h, s, l];
const harmonizeHue = (h, toward) => {
  const d = (toward - h + 540) % 360 - 180;
  const rot = Math.min(Math.abs(d) / 2, 15) * Math.sign(d);
  return (h + rot + 360) % 360;
};
function clampToAA(hue, sat, requestedL) {
  for (let l = requestedL; l > 8; l--) {
    const hex = hslToHex(hue, sat, l);
    const fg = readableInk(hex);
    if (contrast(hex, fg) >= 4.6) return l;
  }
  return 25;
}
const TEMP = {
  neutral: { h: 255, s: 3 }
};
const HUE_FAMILIES = [
  { max: 14, name: "Red" },
  { max: 30, name: "Coral" },
  { max: 45, name: "Orange" },
  { max: 60, name: "Amber" },
  { max: 75, name: "Yellow" },
  { max: 95, name: "Lime" },
  { max: 150, name: "Green" },
  { max: 170, name: "Emerald" },
  { max: 190, name: "Teal" },
  { max: 205, name: "Cyan" },
  { max: 240, name: "Blue" },
  { max: 265, name: "Indigo" },
  { max: 290, name: "Violet" },
  { max: 320, name: "Purple" },
  { max: 345, name: "Magenta" },
  { max: 360, name: "Red" }
];
function nameColor(hex) {
  const [h, s, l] = hexToHsl(hex);
  if (s < 8) {
    if (l < 10) return "Near Black";
    if (l < 26) return "Charcoal";
    if (l < 45) return "Slate Gray";
    if (l < 62) return "Gray";
    if (l < 80) return "Light Gray";
    if (l < 94) return "Mist";
    return "Near White";
  }
  const fam = (HUE_FAMILIES.find((f) => h <= f.max) ?? HUE_FAMILIES[0]).name;
  let light = "";
  if (l < 22) light = "Deep";
  else if (l < 38) light = "Dark";
  else if (l > 82) light = "Pale";
  else if (l > 66) light = "Light";
  let sat = "";
  if (s < 32) sat = "Muted";
  else if (s > 78 && l > 40 && l < 70) sat = "Vivid";
  return [sat, light, fam].filter(Boolean).join(" ");
}
export {
  TEMP,
  aaInk,
  clampToAA,
  contrast,
  dislikeFix,
  harmonizeHue,
  hexToHsl,
  hexToOklch,
  hsl,
  hslA,
  hslToHex,
  nameColor,
  okAccentScale,
  okNeutralScale,
  oklch,
  inSrgb,
  maxChroma,
  oklchStrToHex,
  oklchToHex,
  peakChroma,
  paletteSet,
  readableInk,
  relLum
};
