/**
 * ONE TABLE PER KIT. Adding a kit is adding a table.
 *
 * Two of these render markup the kit does not literally ship, and it is worth
 * saying which and why:
 *
 *   · shadcn/ui is React source over Radix. Its LOOK is Tailwind classes, so
 *     the preview borrows the composition it ships and the package tells you to
 *     run `shadcn add`. Same call the A2UI bindings made, same reason.
 *   · Material Web is custom elements, not classes. The frame loads Google's
 *     real @material/web bundle, so <md-filled-button> below IS their button
 *     running their code — see material-elements.mjs. What Material has no
 *     component for at all is listed in COMPONENT_GAPS (generate.mjs).
 *
 * Everything else here is the kit's own classes, verbatim.
 */
import { esc, list, PHOTO } from './parts.mjs'
import { ANTD_OWNS } from './antd-nodes.mjs'
import { MAP, ROLES } from './roles.mjs'

const cls = (...c) => c.filter(Boolean).join(' ')
const A = (n, k, tag, c, extra = '') => `<${tag} class="${c}"${extra}>${n.text != null ? esc(n.text) : k}</${tag}>`

/* ── the icons ────────────────────────────────────────────────────────────
 * Read at build time and HANDED IN — the same hand-in as Mantine's class map,
 * and for the same reason: this module is also inlined into a page where
 * there is no filesystem to read a package from. Two hand-ins now: the flat
 * lucide map (the fallback, and the whole answer for kits that name no icon
 * set), and the per-set maps from icon-sets.mjs. iconKit() points at the set
 * the kit being rendered actually ships with, so a Tailwind frame draws
 * Heroicons and an Ant frame draws Ant's own, from their own packages.
 * A name a set does not have is an error at build time, never a blank. */
let IC = {}
let IC_SETS = {}
let IC_CUR = null
export const useIcons = (map) => { IC = map ?? {} }
export const useIconSets = (sets) => { IC_SETS = sets ?? {} }
export const iconKit = (setId) => { IC_CUR = (setId && IC_SETS[setId]) || null }

export const ico = (name, size = 16, cls = '') => {
  const own = IC_CUR?.[name]
  if (own) {
    const paint = own.stroke
      ? ` fill="none" stroke="currentColor" stroke-width="${own.stroke}" stroke-linecap="round" stroke-linejoin="round"`
      : ' fill="currentColor"'
    return `<svg${cls ? ` class="${cls}"` : ''} width="${size}" height="${size}" viewBox="${own.box}"${paint} aria-hidden="true">${own.body}</svg>`
  }
  /* An icon that was never handed in used to come out as an empty <svg>, and an
     empty svg inside a ghost button is an invisible button. The toolbar shipped
     that way in the multi-kit preview and looked like a blank card. A hole is
     drawn as a hole. */
  const d = IC[name]
  const body = d || '<rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="3 2"/><path d="M8 16 16 8"/>'
  return `<svg${cls ? ` class="${cls}"` : ''} width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${d ? '' : ' data-no-icon="' + name + '"'}>${body}</svg>`
}

/* ── what this kit really calls each role ─────────────────────────────────
 * The colour card every kit's own site has is a row of squares with variable
 * names under them. Ours reads those names out of the routing table instead of
 * carrying a list, so it is right per kit — and where a kit has NO variable for
 * a role it says which, which is the one thing a page of squares on someone
 * else's site can never tell you.
 *
 * Six answers, the same six the export uses: a variable, a variable we added, a
 * value the kit computes, a named setting it takes instead of a value, a value
 * only its build can change, and nothing at all. */
const LABEL = Object.fromEntries(ROLES.map((r) => [r.id, r.label]))
/**
 * `shown` is the variable that CARRIES a role the kit will not let you set.
 *
 * Material computes its whole scheme from one seed and Radix takes a named
 * accent, so for most roles there is no variable to write — but there is one to
 * read, and leaving the tile blank said "this kit has no page colour" when the
 * truth is "this kit decides your page colour for you". The swatch shows the
 * colour; the line under it still says you cannot set it.
 */
export function swatchRows(kit, roles, shown = {}) {
  return list(roles).map((id) => {
    const e = MAP[kit]?.[id]
    const paint = e?.var ? `var(${e.var})` : shown[id] ? `var(${shown[id]})` : null
    const note = !e ? 'no variable'
      : e.var ? (e.new ? `${e.var} — added` : e.needsBuild ? `${e.var} — compiled` : e.var)
      : e.derives ? `derived from ${LABEL[e.derives] ? LABEL[e.derives].toLowerCase() : e.derives}`
      : e.choice ? 'a named setting, not a value'
      : e.needsBuild ? 'only its build can change this'
      : 'no variable'
    return { id, label: LABEL[id] ?? id, paint, note }
  })
}

/* The two numbers a bar chart needs, as percentages of the tallest bar, so a
 * scene can carry plain figures and every kit draws the same shape. */
export const bars = (n) => {
  const rows = list(n.bars)
  const top = Math.max(1, ...rows.flatMap((b) => [b.a ?? 0, b.b ?? 0]))
  return rows.map((b) => ({ label: b.label, a: Math.round(((b.a ?? 0) / top) * 100), b: Math.round(((b.b ?? 0) / top) * 100) }))
}

/* ── Tailwind, using the semantic names our package adds ─────────────────── */
/* The semantic names our package ADDS, doing their job.
 *
 * These used to be bg-green-50 / bg-amber-50 / bg-red-600 — Tailwind's stock
 * palette — while the generated theme dutifully wrote --color-success and
 * friends. So the three semantic knobs wrote variables nothing on the wall
 * read, and turning them changed not one pixel here. Counted, not noticed. */
const TW_BTN = { brand: 'bg-brand text-brand-foreground hover:opacity-90', secondary: 'bg-surface text-ink border border-line',
  ghost: 'text-ink hover:bg-surface', danger: 'bg-danger text-white' }
const TW_TONE = { neutral: 'bg-surface text-ink border-line', brand: 'bg-brand/10 text-brand border-brand/25',
  success: 'bg-success/10 text-success border-success/25', warning: 'bg-warning/10 text-warning border-warning/25',
  danger: 'bg-danger/10 text-danger border-danger/25' }
/* THE RING, ON EVERYTHING YOU CAN TAB INTO — which is what the line above
   this one used to claim while three components carried it. A button, a tab, a
   checkbox, a slider and every link in a nav had no focus ring at all, and
   Tailwind is the one kit here where that is nobody's fault but ours: it
   publishes the utility, we simply never wrote it. --color-ring is the focus
   role, so the ring is the colour the knob sets. */
const TW_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-page'
const tailwind = {
  _id: 'Tailwind',
  stack:   (n, k) => `<div class="flex flex-col gap-${n.gap ?? 3}">${k}</div>`,
  row:     (n, k) => `<div class="flex flex-wrap items-center gap-${n.gap ?? 2}${n.between ? ' justify-between' : ''}">${k}</div>`,
  grid:    (n, k) => `<div class="grid gap-3" style="grid-template-columns:repeat(${n.cols ?? 2},minmax(0,1fr))">${k}</div>`,
  panel:   (n, k) => `<div class="rounded-lg border border-line bg-surface p-4">${k}</div>`,
  divider: () => `<hr class="border-line">`,
  heading: (n, k) => A(n, k, `h${n.level ?? 3}`, `font-heading font-strong tracking-normal text-ink ${n.level === 2 ? 'text-xl' : 'text-base'}`),
  text:    (n, k) => A(n, k, 'p', 'text-sm tracking-normal text-ink'),
  muted:   (n, k) => A(n, k, 'p', 'text-sm text-ink-muted'),
  label:   (n, k) => A(n, k, 'label', 'text-sm font-medium text-ink'),
  button:  (n, k) => A(n, k, 'button', cls('inline-flex min-h-9 items-center rounded-lg px-4 text-sm font-medium', TW_RING, TW_BTN[n.tone ?? 'brand'])),
  input:   (n) => `<input class="min-h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink ${TW_RING}" value="${esc(n.value ?? '')}" placeholder="${esc(n.placeholder ?? '')}">`,
  select:  (n) => `<select class="min-h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink ${TW_RING}">${list(n.options).map((o) => `<option>${esc(o)}</option>`).join('')}</select>`,
  checkbox: (n) => `<label class="inline-flex min-h-6 items-center gap-2 text-sm text-ink"><input type="checkbox" class="size-4 accent-brand ${TW_RING}"${n.on ? ' checked' : ''}>${esc(n.text ?? '')}</label>`,
  switch:  (n) => `<label class="inline-flex min-h-6 items-center gap-2 text-sm text-ink"><input type="checkbox" role="switch" class="h-5 w-9 appearance-none rounded-full ${TW_RING} ${n.on ? 'bg-brand' : 'bg-line'}"${n.on ? ' checked' : ''}>${esc(n.text ?? '')}</label>`,
  badge:   (n, k) => A(n, k, 'span', cls('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', TW_TONE[n.tone ?? 'neutral'])),
  alert:   (n, k) => `<div class="${cls('rounded-lg border p-3 text-sm', TW_TONE[n.tone ?? 'neutral'])}">${n.text != null ? esc(n.text) : k}</div>`,
  stat:    (n) => `<div class="rounded-lg border border-line bg-surface p-4"><div class="text-sm text-ink-muted">${esc(n.label)}</div><div class="text-2xl font-semibold text-ink">${esc(n.value)}</div></div>`,
  table:   (n) => `<table class="w-full text-left text-sm"><thead class="border-b border-line text-xs uppercase text-ink-muted"><tr>${list(n.cols).map((c) => `<th class="py-2 pr-3 font-medium">${esc(c)}</th>`).join('')}</tr></thead><tbody>${list(n.rows).map((r) => `<tr class="border-b border-line">${list(r).map((c) => `<td class="py-2 pr-3 text-ink">${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`,
  avatar:  (n) => `<span class="inline-grid size-8 place-items-center rounded-full bg-brand text-xs font-semibold text-brand-foreground">${esc(n.text)}</span>`,
  /* the semantic names our package ADDS — the same ones the manifest tells you
     to reference, shown doing their job */
  navbar:  (n, k) => `<header class="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-line bg-surface px-4 py-3">
    <span class="font-semibold text-ink">${esc(n.brand)}</span>
    <nav class="flex flex-wrap gap-4 text-sm text-ink-muted">${list(n.items).map((t) => `<a href="#" class="hover:text-ink ${TW_RING}">${esc(t)}</a>`).join('')}</nav>
    <div class="ml-auto flex items-center gap-2">${k}</div></header>`,
  mediacard: (n) => `<article class="flex flex-col overflow-hidden rounded-lg border border-line bg-surface">
    <div class="flex aspect-video items-center justify-center bg-page text-ink-muted">${PHOTO}</div>
    <div class="flex flex-col gap-2 p-4"><h3 class="text-base font-semibold text-ink">${esc(n.title)}</h3>
    <p class="text-sm text-ink-muted">${esc(n.text)}</p>
    <a href="#" class="text-sm font-medium text-brand ${TW_RING}">${esc(n.action ?? 'Read on')}</a></div></article>`,
  footer:  (n) => `<footer class="border-t border-line bg-surface px-4 py-6">
    <div class="grid gap-6" style="grid-template-columns:repeat(${list(n.groups).length || 1},minmax(0,1fr))">${
      list(n.groups).map((g) => `<div class="flex flex-col gap-2"><p class="text-xs font-semibold text-ink">${esc(g.title)}</p>${
        list(g.items).map((t) => `<a href="#" class="text-sm text-ink-muted hover:text-ink ${TW_RING}">${esc(t)}</a>`).join('')}</div>`).join('')}</div>
    <p class="mt-6 text-sm text-ink-muted">${esc(n.note)}</p></footer>`,
  elevation: (n) => `<div class="flex flex-wrap items-center gap-4">${list(n.levels).map((lv) =>
    `<div class="flex h-16 w-24 items-center justify-center rounded-lg bg-surface text-xs text-ink-muted shadow-${lv}">${esc(lv)}</div>`).join('')}</div>`,
  /* A tab is a button with a role, even when the kit is only utilities: a row
     of spans cannot be reached by a keyboard and says nothing to a screen
     reader, and there is no Tailwind class that would have fixed either. */
  tabs:    (n) => `<div role="tablist" class="flex gap-4 border-b border-line text-sm">${list(n.items).map((t, i) => `<button role="tab" aria-selected="${i === 0}" class="${TW_RING} ${i === 0 ? 'border-b-2 border-brand pb-2 font-medium text-ink' : 'pb-2 text-ink-muted'}">${esc(t)}</button>`).join('')}</div>`,

  /* ── the rest of a real screen ─────────────────────────────────────────── */
  textarea: (n) => `<textarea rows="3" class="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink ${TW_RING}" placeholder="${esc(n.placeholder ?? '')}">${esc(n.value ?? '')}</textarea>`,
  radio:   (n) => `<div class="flex flex-col gap-2">${list(n.items).map((t, i) => `<label class="inline-flex min-h-6 items-center gap-2 text-sm text-ink"><input type="radio" name="${esc(n.name ?? 'g')}" class="size-4 accent-brand ${TW_RING}"${i === (n.on ?? 0) ? ' checked' : ''}>${esc(t)}</label>`).join('')}</div>`,
  slider:  (n) => `<input type="range" max="100" value="${n.value ?? 60}" class="h-9 w-full accent-brand ${TW_RING}">`,
  progress: (n) => `<div class="h-2 w-full overflow-hidden rounded-full bg-line"><div class="h-full rounded-full bg-brand" style="width:${n.value ?? 60}%"></div></div>`,
  iconrow: (n) => `<div class="flex flex-wrap gap-1">${list(n.items).map((i) => `<button aria-label="${esc(i)}" class="inline-flex size-9 items-center justify-center rounded-lg text-ink hover:bg-surface ${TW_RING}">${ico(i)}</button>`).join('')}</div>`,
  breadcrumb: (n) => `<nav class="flex flex-wrap items-center gap-2 text-sm text-ink-muted">${list(n.items).map((t, i, a) => `${i ? '<span class="text-ink-muted">/</span>' : ''}<a href="#" class="${i === a.length - 1 ? 'font-medium text-ink' : 'hover:text-ink'}">${esc(t)}</a>`).join('')}</nav>`,
  menu:    (n) => `<div class="relative inline-block">
    <button aria-haspopup="menu" aria-expanded="true" class="inline-flex min-h-9 items-center gap-2 rounded-lg border border-line bg-surface px-4 text-sm text-ink ${TW_RING}">${esc(n.trigger ?? 'Actions')}${ico('chevron-down', 14)}</button>
    <div class="mt-1 min-w-48 overflow-hidden rounded-lg border border-line bg-surface p-1 shadow-md">
      <p class="px-2 py-1.5 text-xs font-medium text-ink-muted">${esc(n.label ?? '')}</p>
      ${list(n.items).map((t) => `<a href="#" class="flex items-center rounded-md px-2 py-1.5 text-sm text-ink hover:bg-page ${TW_RING}">${esc(t)}</a>`).join('')}
      <hr class="-mx-1 my-1 border-line">
      <a href="#" class="flex items-center rounded-md px-2 py-1.5 text-sm text-danger hover:bg-page ${TW_RING}">${esc(n.danger ?? 'Delete')}</a></div></div>`,
  sidenav: (n) => `<nav class="flex flex-col gap-4">${list(n.groups).map((g) => `<div class="flex flex-col gap-1">
    <p class="px-2 text-xs font-medium text-ink-muted">${esc(g.title)}</p>${list(g.items).map((it) => `<a href="#"${it.on ? ' aria-current="page"' : ''} class="flex min-h-9 items-center gap-2 rounded-lg px-2 text-sm ${TW_RING} ${it.on ? 'bg-surface font-medium text-ink' : 'text-ink-muted hover:bg-surface'}">${ico(it.icon)}<span>${esc(it.text)}</span>${it.count ? `<span class="ml-auto rounded-full bg-brand/10 px-2 text-xs text-brand">${esc(it.count)}</span>` : ''}</a>`).join('')}</div>`).join('')}</nav>`,
  list:    (n) => `<div class="flex flex-col">${list(n.rows).map((r) => `<div class="flex min-h-12 items-center gap-3 border-b border-line py-2 last:border-0">
    <span class="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface text-ink-muted">${ico(r.icon)}</span>
    <span class="min-w-0 flex-1"><span class="block truncate text-sm font-medium text-ink">${esc(r.title)}</span><span class="block text-xs text-ink-muted">${esc(r.sub ?? '')}</span></span>
    <span class="shrink-0 text-sm tabular-nums text-ink-muted">${esc(r.meta ?? '')}</span></div>`).join('')}</div>`,
  kv:      (n) => `<div class="flex flex-col gap-2">${list(n.rows).map(([k2, v]) => `<div class="flex min-h-9 items-center gap-3 rounded-lg border border-line bg-surface px-3">
    <code class="flex-1 truncate font-mono text-xs text-ink">${esc(k2)}</code><span class="font-mono text-xs text-ink-muted">${esc(v)}</span></div>`).join('')}</div>`,
  chart:   (n) => `<div class="flex flex-col gap-3"><div class="flex h-28 items-end gap-2">${bars(n).map((b) => `<div class="flex flex-1 flex-col items-center gap-1">
    <div class="flex h-24 w-full items-end justify-center gap-0.5"><div class="w-1/2 rounded-t-sm bg-brand" style="height:${b.a}%"></div><div class="w-1/2 rounded-t-sm bg-brand/30" style="height:${b.b}%"></div></div>
    <span class="text-xs text-ink-muted">${esc(b.label)}</span></div>`).join('')}</div>
    <div class="flex gap-4 text-xs text-ink-muted">${list(n.legend).map((t, i) => `<span class="inline-flex items-center gap-1.5"><span class="size-2 rounded-full ${i ? 'bg-brand/30' : 'bg-brand'}"></span>${esc(t)}</span>`).join('')}</div></div>`,
  empty:   (n, k) => `<div class="flex flex-col items-center gap-2 py-8 text-center">
    <span class="inline-flex size-10 items-center justify-center rounded-lg border border-line bg-surface text-ink-muted">${ico(n.icon, 18)}</span>
    <p class="text-sm font-medium text-ink">${esc(n.title)}</p><p class="max-w-56 text-sm text-ink-muted">${esc(n.text)}</p>${k}</div>`,
  swatches: (n) => `<div class="grid gap-3" style="grid-template-columns:repeat(auto-fill,minmax(88px,1fr))">${swatchRows('tailwind', n.roles).map((r) => `<div class="flex flex-col gap-1.5">
    ${r.paint ? `<span class="h-10 rounded-lg border border-line" style="background:${r.paint}"></span>` : '<span class="h-10 rounded-lg border border-dashed border-line"></span>'}
    <span class="text-xs font-medium text-ink">${esc(r.label)}</span><code class="font-mono text-[10px] leading-tight text-ink-muted">${esc(r.note)}</code></div>`).join('')}</div>`,
  typespec: (n) => `<div class="flex flex-col gap-4">${list(n.rows).map((r) => `<div class="flex flex-col gap-1">
    <code class="font-mono text-[10px] uppercase tracking-wide text-ink-muted">${esc({ xl: 'text-4xl', lg: 'text-2xl', md: 'text-base', sm: 'text-sm' }[r.size])}</code>
    <p class="${{ xl: 'text-4xl font-semibold', lg: 'text-2xl font-semibold', md: 'text-base', sm: 'text-sm' }[r.size]} text-ink">${esc(r.text)}</p></div>`).join('')}</div>`,
  shapes:  () => `<div class="flex flex-col gap-4"><div class="flex flex-wrap items-end gap-3">${['rounded-sm', 'rounded-md', 'rounded-lg', 'rounded-xl'].map((c) => `<div class="flex flex-col items-center gap-1"><span class="size-12 border border-line bg-surface ${c}"></span><code class="font-mono text-[10px] text-ink-muted">${esc(c)}</code></div>`).join('')}</div>
    <div class="flex flex-wrap items-center gap-3">${['border', 'border-2', 'border-4'].map((c) => `<span class="inline-flex h-8 items-center rounded-lg ${c} border-line px-3 font-mono text-[10px] text-ink-muted">${esc(c)}</span>`).join('')}</div></div>`,
}

/* ── daisyUI ─────────────────────────────────────────────────────────────── */
const DA_BTN = { brand: 'btn-primary', secondary: '', ghost: 'btn-ghost', danger: 'btn-error' }
const DA_TONE = { neutral: 'badge-neutral', brand: 'badge-primary', success: 'badge-success', warning: 'badge-warning', danger: 'badge-error' }
const DA_ALERT = { neutral: '', brand: 'alert-info', success: 'alert-success', warning: 'alert-warning', danger: 'alert-error' }
const daisyui = {
  _id: 'daisyUI',
  stack:   (n, k) => `<div class="flex flex-col gap-${n.gap ?? 3}">${k}</div>`,
  row:     (n, k) => `<div class="flex flex-wrap items-center gap-${n.gap ?? 2}${n.between ? ' justify-between' : ''}">${k}</div>`,
  grid:    (n, k) => `<div class="grid gap-3" style="grid-template-columns:repeat(${n.cols ?? 2},minmax(0,1fr))">${k}</div>`,
  panel:   (n, k) => `<div class="card card-border bg-base-100"><div class="card-body">${k}</div></div>`,
  divider: () => `<div class="divider"></div>`,
  heading: (n, k) => A(n, k, `h${n.level ?? 3}`, n.level === 2 ? 'card-title text-xl' : 'card-title text-base'),
  text:    (n, k) => A(n, k, 'p', 'text-sm'),
  muted:   (n, k) => A(n, k, 'p', 'text-sm opacity-60'),
  label:   (n, k) => A(n, k, 'label', 'label'),
  button:  (n, k) => A(n, k, 'button', cls('btn', DA_BTN[n.tone ?? 'brand'])),
  input:   (n) => `<input class="input w-full" value="${esc(n.value ?? '')}" placeholder="${esc(n.placeholder ?? '')}">`,
  select:  (n) => `<select class="select w-full">${list(n.options).map((o) => `<option>${esc(o)}</option>`).join('')}</select>`,
  checkbox: (n) => `<label class="label"><input type="checkbox" class="checkbox"${n.on ? ' checked' : ''}><span>${esc(n.text ?? '')}</span></label>`,
  switch:  (n) => `<label class="label"><input type="checkbox" class="toggle"${n.on ? ' checked' : ''}><span>${esc(n.text ?? '')}</span></label>`,
  badge:   (n, k) => A(n, k, 'span', cls('badge badge-soft', DA_TONE[n.tone ?? 'neutral'])),
  alert:   (n, k) => `<div role="alert" class="${cls('alert alert-soft', DA_ALERT[n.tone ?? 'neutral'])}"><span>${n.text != null ? esc(n.text) : k}</span></div>`,
  stat:    (n) => `<div class="stats bg-base-100"><div class="stat"><div class="stat-title">${esc(n.label)}</div><div class="stat-value text-2xl">${esc(n.value)}</div></div></div>`,
  table:   (n) => `<div class="overflow-x-auto"><table class="table table-zebra"><thead><tr>${list(n.cols).map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${list(n.rows).map((r) => `<tr>${list(r).map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`,
  avatar:  (n) => `<div class="avatar avatar-placeholder"><div class="bg-primary text-primary-content w-8 rounded-full"><span class="text-xs">${esc(n.text)}</span></div></div>`,
  /* daisyUI ships BOTH of these as real components: .navbar with its three
     regions, and .footer with .footer-title. Nothing here is composed by hand. */
  navbar:  (n, k) => `<div class="navbar bg-base-200 border-b border-base-300">
    <div class="navbar-start"><span class="btn btn-ghost text-lg">${esc(n.brand)}</span>
    <ul class="menu menu-horizontal px-1">${list(n.items).map((t) => `<li><a>${esc(t)}</a></li>`).join('')}</ul></div>
    <div class="navbar-end gap-2">${k}</div></div>`,
  mediacard: (n) => `<div class="card bg-base-100 border border-base-300">
    <figure class="bg-base-200 text-base-content" style="aspect-ratio:16/9">${PHOTO}</figure>
    <div class="card-body"><h3 class="card-title text-base">${esc(n.title)}</h3><p>${esc(n.text)}</p>
    <div class="card-actions"><a class="link link-primary">${esc(n.action ?? 'Read on')}</a></div></div></div>`,
  footer:  (n) => `<footer class="footer bg-base-200 text-base-content p-8">${
    list(n.groups).map((g) => `<nav><h6 class="footer-title">${esc(g.title)}</h6>${
      list(g.items).map((t) => `<a class="link link-hover">${esc(t)}</a>`).join('')}</nav>`).join('')}
    </footer><footer class="footer footer-center bg-base-200 text-base-content px-8 pb-6"><aside><p>${esc(n.note)}</p></aside></footer>`,
  elevation: (n) => `<div class="flex flex-wrap items-center gap-4">${list(n.levels).map((lv) =>
    `<div class="card bg-base-100 shadow-${lv} h-16 w-24"><div class="card-body items-center justify-center p-0 text-xs opacity-60">${esc(lv)}</div></div>`).join('')}</div>`,
  tabs:    (n) => `<div role="tablist" class="tabs tabs-border">${list(n.items).map((t, i) => `<a role="tab" class="tab${i === 0 ? ' tab-active' : ''}">${esc(t)}</a>`).join('')}</div>`,

  /* ── the rest of a real screen ─────────────────────────────────────────── */
  /* daisyUI ships a component for nearly all of these: .textarea, .range,
     .progress, .radio, .breadcrumbs, .menu, .list with .list-row. Nothing here
     is composed by hand except the chart, which no kit in this tool ships. */
  textarea: (n) => `<textarea rows="3" class="textarea w-full" placeholder="${esc(n.placeholder ?? '')}">${esc(n.value ?? '')}</textarea>`,
  radio:   (n) => `<div class="flex flex-col gap-2">${list(n.items).map((t, i) => `<label class="label"><input type="radio" name="${esc(n.name ?? 'g')}" class="radio radio-primary"${i === (n.on ?? 0) ? ' checked' : ''}><span>${esc(t)}</span></label>`).join('')}</div>`,
  slider:  (n) => `<input type="range" max="100" value="${n.value ?? 60}" class="range range-primary w-full">`,
  progress: (n) => `<progress class="progress progress-primary w-full" value="${n.value ?? 60}" max="100"></progress>`,
  iconrow: (n) => `<div class="flex flex-wrap gap-1">${list(n.items).map((i) => `<button aria-label="${esc(i)}" class="btn btn-ghost btn-square btn-sm">${ico(i)}</button>`).join('')}</div>`,
  breadcrumb: (n) => `<div class="breadcrumbs text-sm"><ul>${list(n.items).map((t) => `<li><a>${esc(t)}</a></li>`).join('')}</ul></div>`,
  /* .dropdown with .dropdown-content and their .menu — a real daisyUI menu,
     drawn open because a closed one shows nothing on a wall. Their panel is
     absolutely positioned, as it is in their own docs, so the card would
     collapse behind it: the wrapper reserves exactly the room it takes, off
     their own row height rather than a guess. */
  menu:    (n) => `<div class="dropdown dropdown-open" style="min-height:${(list(n.items).length + 1) * 32 + (n.label ? 28 : 0) + 60}px">
    <div tabindex="0" role="button" aria-haspopup="menu" aria-expanded="true" class="btn">${esc(n.trigger ?? 'Actions')}${ico('chevron-down', 14)}</div>
    <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-1 w-56 p-2 shadow-sm">
      ${n.label ? `<li class="menu-title">${esc(n.label)}</li>` : ''}
      ${list(n.items).map((t) => `<li><a>${esc(t)}</a></li>`).join('')}
      <li><a class="text-error">${esc(n.danger ?? 'Delete')}</a></li></ul></div>`,
  sidenav: (n) => `<ul class="menu w-full p-0">${list(n.groups).map((g) => `<li class="menu-title">${esc(g.title)}</li>${
    list(g.items).map((it) => `<li><a${it.on ? ' class="menu-active"' : ''}>${ico(it.icon)}<span>${esc(it.text)}</span>${it.count ? `<span class="badge badge-sm badge-primary badge-soft">${esc(it.count)}</span>` : ''}</a></li>`).join('')}`).join('')}</ul>`,
  list:    (n) => `<ul class="list bg-base-100">${list(n.rows).map((r) => `<li class="list-row items-center">
    <span class="bg-base-200 text-base-content/60 flex size-8 items-center justify-center rounded-box">${ico(r.icon)}</span>
    <div><div class="font-medium">${esc(r.title)}</div><div class="text-xs opacity-60">${esc(r.sub ?? '')}</div></div>
    <span class="text-sm opacity-60 tabular-nums">${esc(r.meta ?? '')}</span></li>`).join('')}</ul>`,
  kv:      (n) => `<ul class="list bg-base-100">${list(n.rows).map(([k2, v]) => `<li class="list-row items-center py-2">
    <code class="font-mono text-xs">${esc(k2)}</code><span class="font-mono text-xs opacity-60">${esc(v)}</span></li>`).join('')}</ul>`,
  chart:   (n) => `<div class="flex flex-col gap-3"><div class="flex h-28 items-end gap-2">${bars(n).map((b) => `<div class="flex flex-1 flex-col items-center gap-1">
    <div class="flex h-24 w-full items-end justify-center gap-0.5"><div class="bg-primary w-1/2 rounded-t-sm" style="height:${b.a}%"></div><div class="bg-primary/30 w-1/2 rounded-t-sm" style="height:${b.b}%"></div></div>
    <span class="text-xs opacity-60">${esc(b.label)}</span></div>`).join('')}</div>
    <div class="flex gap-4 text-xs opacity-60">${list(n.legend).map((t, i) => `<span class="inline-flex items-center gap-1.5"><span class="size-2 rounded-full ${i ? 'bg-primary/30' : 'bg-primary'}"></span>${esc(t)}</span>`).join('')}</div></div>`,
  empty:   (n, k) => `<div class="flex flex-col items-center gap-2 py-8 text-center">
    <span class="bg-base-200 text-base-content/60 flex size-10 items-center justify-center rounded-box">${ico(n.icon, 18)}</span>
    <p class="font-medium">${esc(n.title)}</p><p class="max-w-56 text-sm opacity-60">${esc(n.text)}</p>${k}</div>`,
  swatches: (n) => `<div class="grid gap-3" style="grid-template-columns:repeat(auto-fill,minmax(88px,1fr))">${swatchRows('daisyui', n.roles).map((r) => `<div class="flex flex-col gap-1.5">
    ${r.paint ? `<span class="border-base-300 h-10 rounded-box border" style="background:${r.paint}"></span>` : '<span class="border-base-300 h-10 rounded-box border border-dashed"></span>'}
    <span class="text-xs font-medium">${esc(r.label)}</span><code class="font-mono text-[10px] leading-tight opacity-60">${esc(r.note)}</code></div>`).join('')}</div>`,
  typespec: (n) => `<div class="flex flex-col gap-4">${list(n.rows).map((r) => `<div class="flex flex-col gap-1">
    <code class="font-mono text-[10px] uppercase tracking-wide opacity-60">${esc({ xl: 'text-4xl', lg: 'text-2xl', md: 'text-base', sm: 'text-sm' }[r.size])}</code>
    <p class="${{ xl: 'text-4xl font-semibold', lg: 'text-2xl font-semibold', md: 'text-base', sm: 'text-sm' }[r.size]}">${esc(r.text)}</p></div>`).join('')}</div>`,
  shapes:  () => `<div class="flex flex-col gap-4"><div class="flex flex-wrap items-end gap-3">${['rounded-selector', 'rounded-field', 'rounded-box'].map((c) => `<div class="flex flex-col items-center gap-1"><span class="bg-base-200 border-base-300 size-12 border ${c}"></span><code class="font-mono text-[10px] opacity-60">${esc(c)}</code></div>`).join('')}</div>
    <div class="flex flex-wrap items-center gap-3">${['border', 'border-2', 'border-4'].map((c) => `<span class="border-base-300 rounded-field inline-flex h-8 items-center px-3 font-mono text-[10px] opacity-60 ${c}">${esc(c)}</span>`).join('')}</div></div>`,
}

/* ── Bootstrap ───────────────────────────────────────────────────────────── */
const BS_BTN = { brand: 'btn-primary', secondary: 'btn-secondary', ghost: 'btn-link', danger: 'btn-danger' }
const BS_TONE = { neutral: 'text-bg-secondary', brand: 'text-bg-primary', success: 'text-bg-success', warning: 'text-bg-warning', danger: 'text-bg-danger' }
const BS_ALERT = { neutral: 'alert-secondary', brand: 'alert-primary', success: 'alert-success', warning: 'alert-warning', danger: 'alert-danger' }
/* Bootstrap's docs pair every check with an id and a label[for], and put
 * type="button" on every button that is not submitting a form (none here
 * submits: the cards are scenes, not applications). Deterministic counter:
 * the scenes render in one fixed order, so the ids are stable per document. */
let bsCheck = 0
const bootstrap = {
  _id: 'Bootstrap',
  stack:   (n, k) => `<div class="d-flex flex-column gap-${Math.min(n.gap ?? 3, 5)}">${k}</div>`,
  row:     (n, k) => `<div class="d-flex flex-wrap align-items-center gap-${Math.min(n.gap ?? 2, 5)}${n.between ? ' justify-content-between' : ''}">${k}</div>`,
  grid:    (n, k) => `<div class="d-grid gap-3" style="grid-template-columns:repeat(${n.cols ?? 2},minmax(0,1fr))">${k}</div>`,
  panel:   (n, k) => `<div class="card"><div class="card-body">${k}</div></div>`,
  divider: () => `<hr>`,
  heading: (n, k) => A(n, k, `h${n.level ?? 3}`, n.level === 2 ? 'h4 mb-0' : 'h6 mb-0'),
  text:    (n, k) => A(n, k, 'p', 'mb-0'),
  muted:   (n, k) => A(n, k, 'p', 'mb-0 text-body-secondary small'),
  label:   (n, k) => A(n, k, 'label', 'form-label mb-1'),
  button:  (n, k) => A(n, k, 'button', cls('btn', BS_BTN[n.tone ?? 'brand']), ' type="button"'),
  input:   (n) => `<input class="form-control" value="${esc(n.value ?? '')}" placeholder="${esc(n.placeholder ?? '')}">`,
  select:  (n) => `<select class="form-select">${list(n.options).map((o) => `<option>${esc(o)}</option>`).join('')}</select>`,
  checkbox: (n) => { const id = `bs-check-${++bsCheck}`
    return `<div class="form-check"><input class="form-check-input" type="checkbox" id="${id}"${n.on ? ' checked' : ''}><label class="form-check-label" for="${id}">${esc(n.text ?? '')}</label></div>` },
  switch:  (n) => { const id = `bs-check-${++bsCheck}`
    return `<div class="form-check form-switch"><input class="form-check-input" type="checkbox" role="switch" id="${id}"${n.on ? ' checked' : ''}><label class="form-check-label" for="${id}">${esc(n.text ?? '')}</label></div>` },
  /* not rounded-pill: that is a documented VARIANT, and their own headline
     examples are the plain badge. The sidenav count keeps the pill because
     Bootstrap's own sidebar example puts one there. */
  badge:   (n, k) => A(n, k, 'span', cls('badge', BS_TONE[n.tone ?? 'neutral'])),
  alert:   (n, k) => `<div class="${cls('alert mb-0', BS_ALERT[n.tone ?? 'neutral'])}" role="alert">${n.text != null ? esc(n.text) : k}</div>`,
  stat:    (n) => `<div class="card"><div class="card-body"><div class="text-body-secondary small">${esc(n.label)}</div><div class="fs-3 fw-semibold">${esc(n.value)}</div></div></div>`,
  table:   (n) => `<table class="table"><thead><tr>${list(n.cols).map((c) => `<th scope="col">${esc(c)}</th>`).join('')}</tr></thead><tbody>${list(n.rows).map((r) => `<tr>${list(r).map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`,
  avatar:  (n) => `<span class="d-inline-flex align-items-center justify-content-center rounded-circle bg-primary text-white" style="width:2rem;height:2rem;font-size:.75rem;font-weight:600">${esc(n.text)}</span>`,
  /* Bootstrap ships .navbar and the whole .card-img-top anatomy. It ships no
     footer component at all, so that one is its own utilities on plain markup —
     and the manifest says so rather than implying a component exists. */
  navbar:  (n, k) => `<nav class="navbar navbar-expand bg-body-tertiary border-bottom px-3">
    <span class="navbar-brand">${esc(n.brand)}</span>
    <ul class="navbar-nav me-auto">${list(n.items).map((t) => `<li class="nav-item"><a class="nav-link" href="#">${esc(t)}</a></li>`).join('')}</ul>
    <div class="d-flex gap-2">${k}</div></nav>`,
  mediacard: (n) => `<div class="card h-100"><div class="card-img-top d-flex align-items-center justify-content-center bg-body-secondary" style="aspect-ratio:16/9">${PHOTO}</div>
    <div class="card-body"><h3 class="card-title h6">${esc(n.title)}</h3><p class="card-text">${esc(n.text)}</p>
    <a href="#" class="card-link">${esc(n.action ?? 'Read on')}</a></div></div>`,
  footer:  (n) => `<footer class="border-top bg-body-tertiary p-4">
    <div class="row">${list(n.groups).map((g) => `<div class="col"><h6 class="text-body-emphasis">${esc(g.title)}</h6>
      <ul class="nav flex-column">${list(g.items).map((t) => `<li class="nav-item"><a href="#" class="nav-link px-0">${esc(t)}</a></li>`).join('')}</ul></div>`).join('')}</div>
    <p class="text-body-secondary mb-0 mt-3">${esc(n.note)}</p></footer>`,
  elevation: (n) => `<div class="d-flex flex-wrap align-items-center gap-3">${list(n.levels).map((lv, i) =>
    `<div class="card ${['shadow-sm', 'shadow', 'shadow-lg'][i] ?? 'shadow'} d-flex align-items-center justify-content-center small text-body-secondary" style="width:6rem;height:4rem">${esc(lv)}</div>`).join('')}</div>`,
  /* buttons, as their own 5.3 markup writes them — an <a> with no href can
     never take focus */
  tabs:    (n) => `<ul class="nav nav-tabs" role="tablist">${list(n.items).map((t, i) => `<li class="nav-item" role="presentation"><button type="button" class="nav-link${i === 0 ? ' active' : ''}" role="tab" aria-selected="${i === 0}">${esc(t)}</button></li>`).join('')}</ul>`,

  /* ── the rest of a real screen ─────────────────────────────────────────── */
  /* .form-range, .progress, .breadcrumb, .list-group and .nav-pills are all
     Bootstrap components. It ships no chart and no empty state, so those two
     are its own utilities on plain markup. */
  textarea: (n) => `<textarea rows="3" class="form-control" placeholder="${esc(n.placeholder ?? '')}">${esc(n.value ?? '')}</textarea>`,
  radio:   (n) => `<div>${list(n.items).map((t, i) => { const id = `bs-check-${++bsCheck}`
    return `<div class="form-check"><input class="form-check-input" type="radio" name="${esc(n.name ?? 'g')}" id="${id}"${i === (n.on ?? 0) ? ' checked' : ''}><label class="form-check-label" for="${id}">${esc(t)}</label></div>` }).join('')}</div>`,
  slider:  (n) => `<input type="range" class="form-range" max="100" value="${n.value ?? 60}">`,
  progress: (n) => `<div class="progress" role="progressbar"><div class="progress-bar" style="width:${n.value ?? 60}%"></div></div>`,
  iconrow: (n) => `<div class="btn-group flex-wrap">${list(n.items).map((i) => `<button type="button" aria-label="${esc(i)}" class="btn btn-outline-secondary btn-sm d-inline-flex align-items-center">${ico(i)}</button>`).join('')}</div>`,
  breadcrumb: (n) => `<nav><ol class="breadcrumb mb-0">${list(n.items).map((t, i, a) => `<li class="breadcrumb-item${i === a.length - 1 ? ' active' : ''}">${i === a.length - 1 ? esc(t) : `<a href="#">${esc(t)}</a>`}</li>`).join('')}</ol></nav>`,
  menu:    (n) => `<div class="dropdown">
    <button class="btn btn-secondary dropdown-toggle" type="button" aria-expanded="true">${esc(n.trigger ?? 'Actions')}</button>
    <ul class="dropdown-menu show position-static">
      <li><h6 class="dropdown-header">${esc(n.label ?? '')}</h6></li>
      ${list(n.items).map((t) => `<li><a class="dropdown-item" href="#">${esc(t)}</a></li>`).join('')}
      <li><hr class="dropdown-divider"></li>
      <li><a class="dropdown-item text-danger" href="#">${esc(n.danger ?? 'Delete')}</a></li></ul></div>`,
  sidenav: (n) => `<div class="d-flex flex-column gap-3">${list(n.groups).map((g) => `<div>
    <p class="text-body-secondary text-uppercase small mb-1 px-2">${esc(g.title)}</p>
    <ul class="nav nav-pills flex-column">${list(g.items).map((it) => `<li class="nav-item"><a href="#" class="nav-link d-flex align-items-center gap-2 py-1${it.on ? ' active' : ' link-body-emphasis'}">${ico(it.icon)}<span>${esc(it.text)}</span>${it.count ? `<span class="badge rounded-pill text-bg-secondary ms-auto">${esc(it.count)}</span>` : ''}</a></li>`).join('')}</ul></div>`).join('')}</div>`,
  list:    (n) => `<ul class="list-group list-group-flush">${list(n.rows).map((r) => `<li class="list-group-item d-flex align-items-center gap-3 px-0">
    <span class="d-inline-flex align-items-center justify-content-center rounded bg-body-secondary text-body-secondary" style="width:2rem;height:2rem">${ico(r.icon)}</span>
    <span class="flex-grow-1"><span class="d-block fw-medium">${esc(r.title)}</span><span class="d-block small text-body-secondary">${esc(r.sub ?? '')}</span></span>
    <span class="small text-body-secondary font-monospace">${esc(r.meta ?? '')}</span></li>`).join('')}</ul>`,
  kv:      (n) => `<ul class="list-group">${list(n.rows).map(([k2, v]) => `<li class="list-group-item d-flex justify-content-between align-items-center py-2">
    <code class="small">${esc(k2)}</code><span class="small text-body-secondary font-monospace">${esc(v)}</span></li>`).join('')}</ul>`,
  chart:   (n) => `<div class="d-flex flex-column gap-3"><div class="d-flex align-items-end gap-2" style="height:7rem">${bars(n).map((b) => `<div class="d-flex flex-column align-items-center gap-1 flex-fill">
    <div class="d-flex align-items-end justify-content-center gap-1 w-100" style="height:6rem"><div class="bg-primary rounded-top" style="width:45%;height:${b.a}%"></div><div class="bg-primary-subtle rounded-top" style="width:45%;height:${b.b}%"></div></div>
    <span class="small text-body-secondary">${esc(b.label)}</span></div>`).join('')}</div>
    <div class="d-flex gap-3 small text-body-secondary">${list(n.legend).map((t, i) => `<span class="d-inline-flex align-items-center gap-1"><span class="rounded-circle ${i ? 'bg-primary-subtle' : 'bg-primary'}" style="width:.5rem;height:.5rem"></span>${esc(t)}</span>`).join('')}</div></div>`,
  empty:   (n, k) => `<div class="d-flex flex-column align-items-center gap-2 py-5 text-center">
    <span class="d-inline-flex align-items-center justify-content-center rounded bg-body-secondary text-body-secondary" style="width:2.5rem;height:2.5rem">${ico(n.icon, 18)}</span>
    <p class="fw-medium mb-0">${esc(n.title)}</p><p class="small text-body-secondary mb-0" style="max-width:14rem">${esc(n.text)}</p>${k}</div>`,
  swatches: (n) => `<div class="d-grid gap-3" style="grid-template-columns:repeat(auto-fill,minmax(88px,1fr))">${swatchRows('bootstrap', n.roles).map((r) => `<div class="d-flex flex-column gap-1">
    ${r.paint ? `<span class="rounded border" style="height:2.5rem;background:${r.paint}"></span>` : '<span class="rounded border" style="height:2.5rem;border-style:dashed"></span>'}
    <span class="small fw-medium">${esc(r.label)}</span><code class="text-body-secondary" style="font-size:10px;line-height:1.3">${esc(r.note)}</code></div>`).join('')}</div>`,
  typespec: (n) => `<div class="d-flex flex-column gap-3">${list(n.rows).map((r) => `<div>
    <code class="text-body-secondary text-uppercase d-block" style="font-size:10px">${esc({ xl: 'display-6', lg: 'h4', md: '--bs-body-font-size', sm: 'small' }[r.size])}</code>
    <p class="${{ xl: 'display-6', lg: 'h4', md: '', sm: 'small' }[r.size]} mb-0">${esc(r.text)}</p></div>`).join('')}</div>`,
  shapes:  () => `<div class="d-flex flex-column gap-3"><div class="d-flex flex-wrap align-items-end gap-3">${['rounded-1', 'rounded-2', 'rounded-3', 'rounded-4'].map((c) => `<div class="d-flex flex-column align-items-center gap-1"><span class="bg-body-secondary border ${c}" style="width:3rem;height:3rem"></span><code class="text-body-secondary" style="font-size:10px">${esc(c)}</code></div>`).join('')}</div>
    <div class="d-flex flex-wrap align-items-center gap-3">${['border', 'border-2', 'border-4'].map((c) => `<span class="d-inline-flex align-items-center rounded px-3 text-body-secondary ${c}" style="height:2rem;font-size:10px">${esc(c)}</span>`).join('')}</div></div>`,
}

/* ── shadcn/ui — read from its registry, not typed here ─────────────────────
 *
 * shadcn is not a package: it is a registry of source files you copy in, which
 * is why the export tells you to run `npx shadcn add`. Its class strings used to
 * be typed into this file from a snapshot, and that made it the one kit in the
 * tool that could go stale — and it had. We carried about half of each
 * component, and the half we dropped was always the same one: the STATES. Their
 * button says focus-visible:ring-[3px] disabled:opacity-50
 * aria-invalid:border-destructive; ours said none of it, so a shadcn button on
 * this wall had no focus ring, no disabled state and no invalid state.
 *
 * Now the registry is read at build time (registry-read.mjs) and handed in, the
 * same way Mantine's class map is. Their data-slot and data-variant attributes
 * are carried too — not decoration: half their classes key on them, so
 * data-state="checked" is what makes a checked switch really checked rather
 * than a picture of one. */
let SC = {}, SC_SLOT = {}
export const useShadcnParts = (map) => {
  SC = map ?? {}
  SC_SLOT = {}
  for (const part of Object.values(SC)) for (const [k, v] of Object.entries(part.slots ?? {})) SC_SLOT[k] ??= v
}
/** A slot, by the name shadcn puts in its own data-slot attribute. */
const sSlot = (name) => SC_SLOT[name] ?? `shadcn-missing-${name}`
/** A cva, by the name it is declared under, with the variants picked. */
const sCva = (part, which, pick = {}) => {
  const c = SC[part]?.cva?.[which]
  if (!c) return `shadcn-missing-${which}`
  return [c.base, ...Object.entries(pick).map(([g, k]) => c.variants?.[g]?.[k]).filter(Boolean)].join(' ')
}
/* our tones, in their variant names — the only mapping in here, because they
   ship no success or warning and we will not invent one for them */
const SC_BTN = { brand: 'default', secondary: 'secondary', ghost: 'ghost', danger: 'destructive' }
const SC_BADGE = { neutral: 'secondary', brand: 'default', success: 'default', warning: 'secondary', danger: 'destructive' }
const shadcn = {
  _id: 'shadcn/ui',
  /* layout is Tailwind's, because shadcn ships none */
  stack:   (n, k) => `<div class="flex flex-col gap-${n.gap ?? 3}">${k}</div>`,
  row:     (n, k) => `<div class="flex flex-wrap items-center gap-${n.gap ?? 2}${n.between ? ' justify-between' : ''}">${k}</div>`,
  grid:    (n, k) => `<div class="grid gap-3" style="grid-template-columns:repeat(${n.cols ?? 2},minmax(0,1fr))">${k}</div>`,
  panel:   (n, k) => `<div data-slot="card" class="${sSlot('card')}"><div data-slot="card-content" class="${sSlot('card-content')}">${k}</div></div>`,
  divider: () => `<div data-slot="separator" role="none" data-orientation="horizontal" class="${sSlot('separator')}"></div>`,
  heading: (n, k) => A(n, k, `h${n.level ?? 3}`, n.level === 2 ? 'text-2xl leading-none font-semibold' : 'leading-none font-semibold'),
  text:    (n, k) => A(n, k, 'p', 'text-sm'),
  muted:   (n, k) => A(n, k, 'p', 'text-muted-foreground text-sm'),
  label:   (n, k) => A(n, k, 'label', sSlot('label'), ' data-slot="label"'),
  button:  (n, k) => {
    const variant = SC_BTN[n.tone ?? 'brand']
    return A(n, k, 'button', sCva('button', 'buttonVariants', { variant, size: 'default' }),
      ` data-slot="button" data-variant="${variant}" data-size="default"`)
  },
  iconrow: (n) => `<div class="flex flex-wrap gap-1">${list(n.items).map((i) =>
    `<button aria-label="${esc(i)}" data-slot="button" data-variant="ghost" data-size="icon" class="${sCva('button', 'buttonVariants', { variant: 'ghost', size: 'icon' })}">${ico(i)}</button>`).join('')}</div>`,
  input:   (n) => `<input data-slot="input" class="${sSlot('input')}" value="${esc(n.value ?? '')}" placeholder="${esc(n.placeholder ?? '')}">`,
  textarea: (n) => `<textarea rows="3" data-slot="textarea" class="${sSlot('textarea')}" placeholder="${esc(n.placeholder ?? '')}">${esc(n.value ?? '')}</textarea>`,
  /* their select is a Radix trigger with a popover; a native select wearing the
     trigger's classes is the honest static stand-in, and the manifest says so */
  /* THEIR SELECT IS NOT A <select>.
     select-trigger is the class for a BUTTON that opens a panel of their own
     items; on a native select it styles the closed box and the operating
     system draws the list — so the one thing you were looking at was the one
     thing that was not theirs. Trigger, panel and items are all published in
     their registry; the panel opens on the trigger, which is what the
     component does. */
  select:  (n) => `<div class="relative">
    <button type="button" role="combobox" aria-expanded="false" data-slot="select-trigger" data-size="default" class="${sSlot('select-trigger')} w-full">
      <span data-slot="select-value">${esc(list(n.options)[0] ?? '')}</span>${ico('chevron-down')}</button>
    <div data-slot="select-content" data-state="closed" data-side="bottom" class="${sSlot('select-content')} absolute mt-1 w-full p-1" hidden>${
      list(n.options).map((o, i) => `<div role="option" aria-selected="${i === 0}" data-slot="select-item" class="${sSlot('select-item')}"><span data-slot="select-item-indicator" class="${sSlot('select-item-indicator')}">${i === 0 ? ico('check') : ''}</span>${esc(o)}</div>`).join('')
    }</div></div>`,
  /* their checkbox, radio and switch are Radix buttons whose classes key on
     data-state — so the checked state here is theirs, not a drawing of it */
  checkbox: (n) => `<label class="${sSlot('label')}" data-slot="label"><button type="button" role="checkbox" aria-checked="${!!n.on}" data-slot="checkbox" data-state="${n.on ? 'checked' : 'unchecked'}" class="${sSlot('checkbox')}">${
    n.on ? `<span data-slot="checkbox-indicator" data-state="checked" class="${sSlot('checkbox-indicator')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" class="size-3.5"><path d="M20 6 9 17l-5-5"/></svg></span>` : ''}</button>${esc(n.text ?? '')}</label>`,
  radio:   (n) => `<div role="radiogroup" data-slot="radio-group" class="${sSlot('radio-group')}">${list(n.items).map((t, i) => {
    const on = i === (n.on ?? 0)
    /* their indicator holds a CircleIcon — fill-primary, size-2, centred — and
       an empty span meant no radio on this wall ever looked chosen */
    return `<label class="${sSlot('label')}" data-slot="label"><button type="button" role="radio" aria-checked="${on}" data-slot="radio-group-item" data-state="${on ? 'checked' : 'unchecked'}" class="${sSlot('radio-group-item')}">${
      on ? `<span data-slot="radio-group-indicator" data-state="checked" class="${sSlot('radio-group-indicator')}"><svg viewBox="0 0 24 24" fill="currentColor" class="fill-primary absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2"><circle cx="12" cy="12" r="10"/></svg></span>` : ''}</button>${esc(t)}</label>` }).join('')}</div>`,
  switch:  (n) => `<label class="${sSlot('label')}" data-slot="label"><button type="button" role="switch" aria-checked="${!!n.on}" data-slot="switch" data-size="default" data-state="${n.on ? 'checked' : 'unchecked'}" class="${sSlot('switch')}"><span data-slot="switch-thumb" data-state="${n.on ? 'checked' : 'unchecked'}" class="${sSlot('switch-thumb')}"></span></button>${esc(n.text ?? '')}</label>`,
  /* THE THUMB IS A ROLE, NOT A DECORATION.
     Their component renders role=slider, a tabindex and the three aria-value
     attributes on it; the class strings the registry publishes cannot carry
     those, so leaving them off meant the thumb could not be focused, its own
     focus-visible rule never fired, and nothing on the wall could be dragged.
     Every div-built slider here gets what its real one has. */
  slider:  (n) => `<span data-slot="slider" data-orientation="horizontal" class="${sSlot('slider')}"><span data-slot="slider-track" data-orientation="horizontal" class="${sSlot('slider-track')}"><span data-slot="slider-range" data-orientation="horizontal" class="${sSlot('slider-range')}" style="width:${n.value ?? 60}%"></span></span><span data-slot="slider-thumb" role="slider" tabindex="0" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${n.value ?? 60}" aria-orientation="horizontal" class="${sSlot('slider-thumb')}" style="position:absolute;left:calc(${n.value ?? 60}% - 8px)"></span></span>`,
  progress: (n) => `<div data-slot="progress" class="${sSlot('progress')}"><div data-slot="progress-indicator" class="${sSlot('progress-indicator')}" style="transform:translateX(-${100 - (n.value ?? 60)}%)"></div></div>`,
  badge:   (n, k) => A(n, k, 'span', sCva('badge', 'badgeVariants', { variant: SC_BADGE[n.tone ?? 'neutral'] }), ` data-slot="badge"`),
  alert:   (n, k) => `<div role="alert" data-slot="alert" class="${sCva('alert', 'alertVariants', { variant: n.tone === 'danger' ? 'destructive' : 'default' })}"><div data-slot="alert-description" class="${sSlot('alert-description')}">${n.text != null ? esc(n.text) : k}</div></div>`,
  stat:    (n) => `<div data-slot="card" class="${sSlot('card')}"><div data-slot="card-header" class="${sSlot('card-header')}"><div data-slot="card-description" class="${sSlot('card-description')}">${esc(n.label)}</div><div data-slot="card-title" class="${sSlot('card-title')} text-2xl tabular-nums">${esc(n.value)}</div></div></div>`,
  table:   (n) => `<div data-slot="table-container" class="${sSlot('table-container')}"><table data-slot="table" class="${sSlot('table')}"><thead data-slot="table-header" class="${sSlot('table-header')}"><tr data-slot="table-row" class="${sSlot('table-row')}">${
    list(n.cols).map((c) => `<th data-slot="table-head" class="${sSlot('table-head')}">${esc(c)}</th>`).join('')}</tr></thead><tbody data-slot="table-body" class="${sSlot('table-body')}">${
    list(n.rows).map((r) => `<tr data-slot="table-row" class="${sSlot('table-row')}">${list(r).map((c) => `<td data-slot="table-cell" class="${sSlot('table-cell')}">${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`,
  /* Item is their row: media, content, title, description, actions */
  list:    (n) => `<div data-slot="item-group" class="${sSlot('item-group')}">${list(n.rows).map((r) => `<div data-slot="item" data-variant="default" data-size="default" class="${sCva('item', 'itemVariants', { variant: 'default', size: 'default' })}">
    <div data-slot="item-media" data-variant="icon" class="${sCva('item', 'itemMediaVariants', { variant: 'icon' })}">${ico(r.icon)}</div>
    <div data-slot="item-content" class="${sSlot('item-content')}"><div data-slot="item-title" class="${sSlot('item-title')}">${esc(r.title)}</div>
    <div data-slot="item-description" class="${sSlot('item-description')}">${esc(r.sub ?? '')}</div></div>
    <div data-slot="item-actions" class="${sSlot('item-actions')}"><span class="text-muted-foreground text-sm tabular-nums">${esc(r.meta ?? '')}</span></div></div>`).join('')}</div>`,
  kv:      (n) => `<div class="flex flex-col gap-2">${list(n.rows).map(([k2, v]) => `<div class="bg-muted/40 flex min-h-9 items-center gap-3 rounded-md border px-3">
    <code class="flex-1 truncate font-mono text-xs">${esc(k2)}</code><span class="text-muted-foreground font-mono text-xs">${esc(v)}</span></div>`).join('')}</div>`,
  chart:   (n) => `<div class="flex flex-col gap-3"><div class="flex h-28 items-end gap-2">${bars(n).map((b) => `<div class="flex flex-1 flex-col items-center gap-1">
    <div class="flex h-24 w-full items-end justify-center gap-0.5"><div class="bg-chart-1 w-1/2 rounded-t-sm" style="height:${b.a}%"></div><div class="bg-chart-2 w-1/2 rounded-t-sm" style="height:${b.b}%"></div></div>
    <span class="text-muted-foreground text-xs">${esc(b.label)}</span></div>`).join('')}</div>
    <div class="text-muted-foreground flex gap-4 text-xs">${list(n.legend).map((t, i) => `<span class="inline-flex items-center gap-1.5"><span class="size-2 rounded-full ${i ? 'bg-chart-2' : 'bg-chart-1'}"></span>${esc(t)}</span>`).join('')}</div></div>`,
  avatar:  (n) => `<span data-slot="avatar" class="${sSlot('avatar')}"><span data-slot="avatar-fallback" class="${sSlot('avatar-fallback')}">${esc(n.text)}</span></span>`,
  empty:   (n, k) => `<div data-slot="empty" class="${sSlot('empty')}"><div data-slot="empty-header" class="${sSlot('empty-header')}">
    <div data-slot="empty-media" data-variant="icon" class="${sCva('empty', 'emptyMediaVariants', { variant: 'icon' })}">${ico(n.icon, 18)}</div>
    <div data-slot="empty-title" class="${sSlot('empty-title')}">${esc(n.title)}</div>
    <div data-slot="empty-description" class="${sSlot('empty-description')}">${esc(n.text)}</div></div>
    <div data-slot="empty-content" class="${sSlot('empty-content')}">${k}</div></div>`,
  tabs:    (n) => `<div data-slot="tabs" class="${sSlot('tabs')}"><div role="tablist" data-slot="tabs-list" data-variant="default" class="${sCva('tabs', 'tabsListVariants', { variant: 'default' })}">${
    list(n.items).map((t, i) => `<button role="tab" data-slot="tabs-trigger" data-state="${i === 0 ? 'active' : 'inactive'}" class="${sSlot('tabs-trigger')}">${esc(t)}</button>`).join('')}</div></div>`,
  navbar:  (n, k) => `<header class="bg-background flex flex-wrap items-center gap-x-6 gap-y-2 border-b px-4 py-3">
    <span class="text-sm font-semibold">${esc(n.brand)}</span>
    <nav data-slot="navigation-menu" class="${sSlot('navigation-menu')}"><ul data-slot="navigation-menu-list" class="${sSlot('navigation-menu-list')}">${
      list(n.items).map((t) => `<li data-slot="navigation-menu-item"><a href="#" data-slot="navigation-menu-link" class="${sSlot('navigation-menu-link')}">${esc(t)}</a></li>`).join('')}</ul></nav>
    <div class="ml-auto flex items-center gap-2">${k}</div></header>`,
  sidenav: (n) => `<div data-slot="sidebar-content" class="${sSlot('sidebar-content')} bg-sidebar text-sidebar-foreground rounded-lg p-2">${list(n.groups).map((g) => `<div data-slot="sidebar-group" class="${sSlot('sidebar-group')}">
    <div data-slot="sidebar-group-label" class="${sSlot('sidebar-group-label')}">${esc(g.title)}</div>
    <div data-slot="sidebar-group-content" class="${sSlot('sidebar-group-content')}"><ul data-slot="sidebar-menu" class="${sSlot('sidebar-menu')}">${
      list(g.items).map((it) => `<li data-slot="sidebar-menu-item" class="${sSlot('sidebar-menu-item')}"><a href="#" data-slot="sidebar-menu-button" data-size="default" data-active="${!!it.on}" class="${sCva('sidebar', 'sidebarMenuButtonVariants', { variant: 'default', size: 'default' })}">${ico(it.icon)}<span>${esc(it.text)}</span></a>${
        it.count ? `<div data-slot="sidebar-menu-badge" class="${sSlot('sidebar-menu-badge')}">${esc(it.count)}</div>` : ''}</li>`).join('')}</ul></div></div>`).join('')}</div>`,
  breadcrumb: (n) => `<nav aria-label="breadcrumb" data-slot="breadcrumb"><ol data-slot="breadcrumb-list" class="${sSlot('breadcrumb-list')}">${
    list(n.items).map((t, i, a) => `${i ? `<li role="presentation" data-slot="breadcrumb-separator" class="${sSlot('breadcrumb-separator')}">/</li>` : ''}<li data-slot="breadcrumb-item" class="${sSlot('breadcrumb-item')}">${
      i === a.length - 1 ? `<span role="link" aria-current="page" data-slot="breadcrumb-page" class="${sSlot('breadcrumb-page')}">${esc(t)}</span>`
        : `<a href="#" data-slot="breadcrumb-link" class="${sSlot('breadcrumb-link')}">${esc(t)}</a>`}</li>`).join('')}</ol></nav>`,
  /* their dropdown-menu, open. The content class reads
     --radix-dropdown-menu-content-* variables their primitive sets while
     positioning; on a wall those are simply unset, which is what `origin-()`
     and a max-height with no value mean anyway. */
  menu:    (n) => `<div class="relative inline-block">
    <button data-slot="button" data-variant="outline" data-size="default" aria-haspopup="menu" aria-expanded="true" class="${sCva('button', 'buttonVariants', { variant: 'outline', size: 'default' })}">${esc(n.trigger ?? 'Actions')}${ico('chevron-down', 14)}</button>
    <div data-slot="dropdown-menu-content" data-state="open" data-side="bottom" class="${sSlot('dropdown-menu-content')} mt-1">
      <div data-slot="dropdown-menu-label" class="${sSlot('dropdown-menu-label')}">${esc(n.label ?? '')}</div>
      ${list(n.items).map((t) => `<div role="menuitem" data-slot="dropdown-menu-item" class="${sSlot('dropdown-menu-item')}">${esc(t)}</div>`).join('')}
      <div role="separator" data-slot="dropdown-menu-separator" class="${sSlot('dropdown-menu-separator')}"></div>
      <div role="menuitem" data-slot="dropdown-menu-item" data-variant="destructive" class="${sSlot('dropdown-menu-item')}">${esc(n.danger ?? 'Delete')}</div></div></div>`,
  mediacard: (n) => `<div data-slot="card" class="${sSlot('card')}">
    <div class="text-muted-foreground bg-muted mx-6 flex items-center justify-center rounded-lg" style="aspect-ratio:16/9">${PHOTO}</div>
    <div data-slot="card-header" class="${sSlot('card-header')}"><div data-slot="card-title" class="${sSlot('card-title')}">${esc(n.title)}</div>
    <div data-slot="card-description" class="${sSlot('card-description')}">${esc(n.text)}</div></div>
    <div data-slot="card-footer" class="${sSlot('card-footer')}"><a href="#" class="text-primary text-sm font-medium">${esc(n.action ?? 'Read on')}</a></div></div>`,
  footer:  (n) => `<footer class="bg-background border-t px-4 py-6">
    <div class="grid gap-6" style="grid-template-columns:repeat(${list(n.groups).length || 1},minmax(0,1fr))">${
      list(n.groups).map((g) => `<div class="flex flex-col gap-2"><div class="text-xs font-semibold">${esc(g.title)}</div>${
        list(g.items).map((t) => `<a href="#" class="text-muted-foreground text-sm">${esc(t)}</a>`).join('')}</div>`).join('')}</div>
    <p class="text-muted-foreground mt-6 text-sm">${esc(n.note)}</p></footer>`,
  elevation: (n) => `<div class="flex flex-wrap items-center gap-4">${list(n.levels).map((lv, i) =>
    `<div class="bg-card text-muted-foreground flex h-16 w-24 items-center justify-center rounded-xl border text-xs ${['shadow-xs', 'shadow-sm', 'shadow-lg'][i] ?? 'shadow-sm'}">${esc(lv)}</div>`).join('')}</div>`,
  swatches: (n) => `<div class="grid gap-3" style="grid-template-columns:repeat(auto-fill,minmax(88px,1fr))">${swatchRows('shadcn', n.roles).map((r) => `<div class="flex flex-col gap-1.5">
    ${r.paint ? `<span class="h-10 rounded-md border" style="background:${r.paint}"></span>` : '<span class="h-10 rounded-md border border-dashed"></span>'}
    <span class="text-xs font-medium">${esc(r.label)}</span><code class="text-muted-foreground font-mono text-[10px] leading-tight">${esc(r.note)}</code></div>`).join('')}</div>`,
  typespec: (n) => `<div class="flex flex-col gap-4">${list(n.rows).map((r) => `<div class="flex flex-col gap-1">
    <code class="text-muted-foreground font-mono text-[10px] tracking-wide uppercase">${esc({ xl: 'text-4xl', lg: 'text-2xl', md: 'text-base', sm: 'text-sm' }[r.size])}</code>
    <p class="${{ xl: 'text-4xl font-semibold tracking-tight', lg: 'text-2xl font-semibold', md: 'text-base', sm: 'text-muted-foreground text-sm' }[r.size]}">${esc(r.text)}</p></div>`).join('')}</div>`,
  shapes:  () => `<div class="flex flex-col gap-4"><div class="flex flex-wrap items-end gap-3">${['rounded-sm', 'rounded-md', 'rounded-lg', 'rounded-xl'].map((c) => `<div class="flex flex-col items-center gap-1"><span class="bg-muted size-12 border ${c}"></span><code class="text-muted-foreground font-mono text-[10px]">${esc(c)}</code></div>`).join('')}</div>
    <div class="flex flex-wrap items-center gap-3">${['border', 'border-2', 'border-4'].map((c) => `<span class="text-muted-foreground inline-flex h-8 items-center rounded-md px-3 font-mono text-[10px] ${c}">${esc(c)}</span>`).join('')}</div></div>`,
}

/* ── Material 3 — Google's real custom elements ──────────────────────────── */
/* The parts Material ships no component for are listed once, in generate.mjs,
 * because that list has to travel with the download and not only appear under
 * the preview. */
/* Not M3-flavoured markup: <md-filled-button> and friends, running the code
 * from @material/web, with their own md-typescale classes for the text. The
 * frame loads their bundle; material-elements.mjs proves every tag below is
 * one their package declares AND one the bundle defines.
 *
 * Where a value is set inline it is one of THEIR tokens — a per-instance
 * component token, which is how Material documents theming. The exception is
 * spacing: Material publishes colour and shape tokens and no spacing scale, and
 * ships no layout components, so the gaps between things are ours. That is
 * declared rather than hidden; see gaps() below. */
const MD_BTN = { brand: 'md-filled-button', secondary: 'md-filled-tonal-button', ghost: 'md-text-button', danger: 'md-filled-button' }
const MD_CHIP = { neutral: 'md-assist-chip', brand: 'md-suggestion-chip', success: 'md-assist-chip', warning: 'md-assist-chip', danger: 'md-assist-chip' }
/* their component tokens, the documented way to re-tone one instance */
const MD_CHIP_TOK = {
  success: '--md-assist-chip-label-text-color:var(--md-sys-color-on-tertiary-container);--md-assist-chip-container-shape:var(--md-sys-shape-corner-small)',
  warning: '--md-assist-chip-label-text-color:var(--md-sys-color-on-secondary-container)',
  danger: '--md-assist-chip-label-text-color:var(--md-sys-color-on-error-container);--md-assist-chip-outline-color:var(--md-sys-color-error)',
}
const MD_TYPE = { 2: 'md-typescale-headline-small', 3: 'md-typescale-title-medium' }
/* the roles its generator fills in from the seed — readable, not settable */
const MD_SHOWN = { onBrand: '--md-sys-color-on-primary', page: '--md-sys-color-surface',
  surface: '--md-sys-color-surface-container', ink: '--md-sys-color-on-surface',
  inkMuted: '--md-sys-color-on-surface-variant', line: '--md-sys-color-outline-variant' }
const material = {
  _id: 'Material 3',
  /* layout — Material ships none, so these three are ours and say so */
  stack:   (n, k) => `<div style="display:flex;flex-direction:column;gap:${(n.gap ?? 3) * 4}px">${k}</div>`,
  row:     (n, k) => `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:${(n.gap ?? 2) * 4}px${n.between ? ';justify-content:space-between' : ''}">${k}</div>`,
  grid:    (n, k) => `<div style="display:grid;gap:12px;grid-template-columns:repeat(${n.cols ?? 2},minmax(0,1fr))">${k}</div>`,

  panel:   (n, k) => `<md-outlined-card style="padding:16px">${k}</md-outlined-card>`,
  divider: () => `<md-divider></md-divider>`,
  heading: (n, k) => A(n, k, `h${n.level ?? 3}`, MD_TYPE[n.level ?? 3] ?? MD_TYPE[3], ' style="margin:0"'),
  text:    (n, k) => A(n, k, 'p', 'md-typescale-body-medium', ' style="margin:0"'),
  muted:   (n, k) => A(n, k, 'p', 'md-typescale-body-small', ' style="margin:0;color:var(--md-sys-color-on-surface-variant)"'),
  label:   (n, k) => A(n, k, 'label', 'md-typescale-label-large'),
  button:  (n, k) => {
    const tag = MD_BTN[n.tone ?? 'brand']
    const err = n.tone === 'danger'
      ? ' style="--md-filled-button-container-color:var(--md-sys-color-error);--md-filled-button-label-text-color:var(--md-sys-color-on-error)"' : ''
    return `<${tag}${err}>${n.text != null ? esc(n.text) : k}</${tag}>`
  },
  input:   (n) => `<md-outlined-text-field style="width:100%" label="${esc(n.placeholder ?? '')}" value="${esc(n.value ?? '')}"></md-outlined-text-field>`,
  select:  (n) => `<md-outlined-select style="width:100%">${list(n.options).map((o, i) =>
    `<md-select-option${i === 0 ? ' selected' : ''} value="${esc(o)}"><div slot="headline">${esc(o)}</div></md-select-option>`).join('')}</md-outlined-select>`,
  checkbox: (n) => `<label class="md-typescale-body-medium" style="display:inline-flex;align-items:center;gap:8px"><md-checkbox${n.on ? ' checked' : ''} touch-target="wrapper"></md-checkbox>${esc(n.text ?? '')}</label>`,
  switch:  (n) => `<label class="md-typescale-body-medium" style="display:inline-flex;align-items:center;gap:8px"><md-switch${n.on ? ' selected' : ''}></md-switch>${esc(n.text ?? '')}</label>`,
  badge:   (n, k) => {
    const tag = MD_CHIP[n.tone ?? 'neutral'], tok = MD_CHIP_TOK[n.tone]
    return `<md-chip-set><${tag}${tok ? ` style="${tok}"` : ''} label="${esc(n.text ?? '')}"></${tag}></md-chip-set>`
  },
  /* Material ships no inline alert or banner, so this is their card re-toned
     with their own container token — the closest thing their kit really has. */
  alert:   (n, k) => `<md-filled-card class="md-typescale-body-medium" style="padding:12px 16px;--md-filled-card-container-color:var(--md-sys-color-${
    { danger: 'error-container', warning: 'secondary-container', success: 'tertiary-container' }[n.tone] ?? 'surface-container-high'})">${n.text != null ? esc(n.text) : k}</md-filled-card>`,
  stat:    (n) => `<md-outlined-card style="padding:16px"><div class="md-typescale-label-medium" style="color:var(--md-sys-color-on-surface-variant)">${esc(n.label)}</div><div class="md-typescale-headline-medium">${esc(n.value)}</div></md-outlined-card>`,
  /* Material 3 specifies a data table; @material/web does not ship one. */
  table:   (n) => `<table class="md-typescale-body-medium" style="width:100%;border-collapse:collapse"><thead><tr>${list(n.cols).map((c) =>
    `<th class="md-typescale-label-medium" style="text-align:left;padding:12px 8px;color:var(--md-sys-color-on-surface-variant)">${esc(c)}</th>`).join('')}</tr></thead><tbody>${
    list(n.rows).map((r) => `<tr>${list(r).map((c) => `<td style="padding:12px 8px;border-top:1px solid var(--md-sys-color-outline-variant)">${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`,
  /* nor an avatar */
  avatar:  (n) => `<span class="md-typescale-label-large" style="display:inline-grid;place-items:center;width:40px;height:40px;border-radius:var(--md-sys-shape-corner-full);background:var(--md-sys-color-primary-container);color:var(--md-sys-color-on-primary-container)">${esc(n.text)}</span>`,
  /* Material ships a navigation bar as a custom element. It ships no footer
     and no media card at all — M3 specifies neither — so those two are its own
     tokens on plain markup, and the manifest names both. */
  navbar:  (n, k) => `<header class="md-typescale-title-medium" style="display:flex;flex-wrap:wrap;align-items:center;gap:8px 24px;padding:12px 16px;background:var(--md-sys-color-surface-container);color:var(--md-sys-color-on-surface)">
    <span>${esc(n.brand)}</span>
    <nav class="md-typescale-label-large" style="display:flex;flex-wrap:wrap;gap:16px;color:var(--md-sys-color-on-surface-variant)">${
      list(n.items).map((t) => `<a href="#" style="color:inherit;text-decoration:none">${esc(t)}</a>`).join('')}</nav>
    <span style="margin-left:auto;display:flex;gap:8px">${k}</span></header>`,
  mediacard: (n) => `<md-outlined-card style="display:flex;flex-direction:column;overflow:hidden">
    <div style="display:flex;align-items:center;justify-content:center;aspect-ratio:16/9;background:var(--md-sys-color-surface-container-high);color:var(--md-sys-color-on-surface-variant)">${PHOTO}</div>
    <div style="display:flex;flex-direction:column;gap:8px;padding:16px">
      <h3 class="md-typescale-title-medium" style="margin:0">${esc(n.title)}</h3>
      <p class="md-typescale-body-medium" style="margin:0;color:var(--md-sys-color-on-surface-variant)">${esc(n.text)}</p>
      <md-text-button>${esc(n.action ?? 'Read on')}</md-text-button></div></md-outlined-card>`,
  footer:  (n) => `<footer style="padding:24px 16px;background:var(--md-sys-color-surface-container);color:var(--md-sys-color-on-surface)">
    <div style="display:grid;gap:24px;grid-template-columns:repeat(${list(n.groups).length || 1},minmax(0,1fr))">${
      list(n.groups).map((g) => `<div style="display:flex;flex-direction:column;gap:8px">
        <p class="md-typescale-label-large" style="margin:0">${esc(g.title)}</p>${
        list(g.items).map((t) => `<a href="#" class="md-typescale-body-medium" style="color:var(--md-sys-color-on-surface-variant);text-decoration:none">${esc(t)}</a>`).join('')}</div>`).join('')}</div>
    <p class="md-typescale-body-small" style="margin:24px 0 0;color:var(--md-sys-color-on-surface-variant)">${esc(n.note)}</p></footer>`,
  /* M3 has an elevation model; @material/web ships md-elevation as an element
     and no level tokens, so the specimen is their element at its own levels. */
  elevation: (n) => `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:16px">${list(n.levels).map((lv, i) =>
    `<div style="position:relative;width:96px;height:64px;display:flex;align-items:center;justify-content:center;border-radius:var(--md-sys-shape-corner-medium);background:var(--md-sys-color-surface-container-low);color:var(--md-sys-color-on-surface-variant);font-size:12px"><md-elevation style="--md-elevation-level:${i + 1}"></md-elevation>${esc(lv)}</div>`).join('')}</div>`,
  tabs:    (n) => `<md-tabs>${list(n.items).map((t, i) => `<md-primary-tab${i === 0 ? ' active' : ''}>${esc(t)}</md-primary-tab>`).join('')}</md-tabs>`,

  /* ── the rest of a real screen ─────────────────────────────────────────── */
  /* md-slider, md-radio, md-linear-progress, md-icon-button, md-badge and
     md-list are all Google's elements, running their code. What M3 has no
     element for — a breadcrumb, a chart, an empty state — is drawn from its own
     tokens and named in the manifest rather than passed off as theirs. */
  textarea: (n) => `<md-outlined-text-field type="textarea" rows="3" style="width:100%" label="${esc(n.placeholder ?? '')}" value="${esc(n.value ?? '')}"></md-outlined-text-field>`,
  radio:   (n) => `<div style="display:flex;flex-direction:column;gap:4px">${list(n.items).map((t, i) => `<label class="md-typescale-body-medium" style="display:inline-flex;align-items:center;gap:8px"><md-radio name="${esc(n.name ?? 'g')}"${i === (n.on ?? 0) ? ' checked' : ''} touch-target="wrapper"></md-radio>${esc(t)}</label>`).join('')}</div>`,
  slider:  (n) => `<md-slider labeled value="${n.value ?? 60}" style="width:100%"></md-slider>`,
  progress: (n) => `<md-linear-progress value="${(n.value ?? 60) / 100}"></md-linear-progress>`,
  iconrow: (n) => `<div style="display:flex;flex-wrap:wrap;gap:4px">${list(n.items).map((i, x, a) => x === a.length - 1
    ? `<md-filled-tonal-icon-button aria-label="${esc(i)}">${ico(i, 20)}</md-filled-tonal-icon-button>`
    : `<md-icon-button aria-label="${esc(i)}">${ico(i, 20)}</md-icon-button>`).join('')}</div>`,
  breadcrumb: (n) => `<nav class="md-typescale-body-medium" style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;color:var(--md-sys-color-on-surface-variant)">${
    list(n.items).map((t, i, a) => `${i ? '<span>/</span>' : ''}<a href="#" style="text-decoration:none;color:${i === a.length - 1 ? 'var(--md-sys-color-on-surface)' : 'inherit'}">${esc(t)}</a>`).join('')}</nav>`,
  /* Their own md-menu, drawn open.
   *
   * It positions itself against an anchor by id, which means it is out of flow
   * and the card would collapse behind it — so a span reserves exactly the room
   * the open menu takes, counted off their own 56px item height rather than
   * guessed. `positioning="absolute"` keeps it measured against the card
   * instead of a viewport this wall pans across.
   *
   * The heading is a plain div on their typescale class, not a component:
   * @material/web ships no group header for a menu, and a disabled md-menu-item
   * would be a 56px-tall row pretending to be one.
   *
   * The span is NOT positioned. Their menu measures its offset against the
   * anchor's offsetParent and writes a plain inset, so a positioned span would
   * be a second origin: the two disagreed by the height of the button and the
   * panel hung out of the bottom of the card. */
  menu:    (n) => `<div style="position:relative;display:inline-flex;flex-direction:column;gap:8px;align-items:flex-start">
    <md-outlined-button id="menu-anchor">${esc(n.trigger ?? 'Actions')}</md-outlined-button>
    <span style="display:block;min-width:224px;min-height:${(list(n.items).length + 1) * 56 + (n.label ? 28 : 0) + 33}px">
      <md-menu anchor="menu-anchor" positioning="absolute" open quick default-focus="none" style="min-width:224px">
        ${n.label ? `<div class="md-typescale-label-medium" style="padding:6px 12px;color:var(--md-sys-color-on-surface-variant)">${esc(n.label)}</div>` : ''}
        ${list(n.items).map((t) => `<md-menu-item><div slot="headline">${esc(t)}</div></md-menu-item>`).join('')}
        <md-divider></md-divider>
        <md-menu-item style="--md-menu-item-label-text-color:var(--md-sys-color-error)"><div slot="headline">${esc(n.danger ?? 'Delete')}</div></md-menu-item>
      </md-menu></span></div>`,
  sidenav: (n) => `<div style="display:flex;flex-direction:column;gap:16px">${list(n.groups).map((g) => `<div>
    <p class="md-typescale-title-small" style="margin:0 0 4px;padding:0 12px;color:var(--md-sys-color-on-surface-variant)">${esc(g.title)}</p>
    <md-list style="--md-list-container-color:transparent">${list(g.items).map((it) => `<md-list-item type="button"${it.on ? ' style="--md-list-item-container-color:var(--md-sys-color-secondary-container);--md-list-item-label-text-color:var(--md-sys-color-on-secondary-container)"' : ''}>
      <span slot="start">${ico(it.icon, 20)}</span><div slot="headline">${esc(it.text)}</div>${it.count ? `<div slot="end" style="position:relative;display:flex;align-items:center;min-width:28px;height:20px"><md-badge value="${esc(it.count)}"></md-badge></div>` : ''}</md-list-item>`).join('')}</md-list></div>`).join('')}</div>`,
  list:    (n) => `<md-list style="--md-list-container-color:transparent">${list(n.rows).map((r) => `<md-list-item>
    <span slot="start" style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:var(--md-sys-shape-corner-small);background:var(--md-sys-color-surface-container-high);color:var(--md-sys-color-on-surface-variant)">${ico(r.icon)}</span>
    <div slot="headline">${esc(r.title)}</div><div slot="supporting-text">${esc(r.sub ?? '')}</div>
    <div slot="trailing-supporting-text">${esc(r.meta ?? '')}</div></md-list-item>`).join('')}</md-list>`,
  kv:      (n) => `<md-list style="--md-list-container-color:transparent">${list(n.rows).map(([k2, v]) => `<md-list-item>
    <div slot="headline" style="font-family:ui-monospace,monospace;font-size:12px">${esc(k2)}</div>
    <div slot="trailing-supporting-text" style="font-family:ui-monospace,monospace">${esc(v)}</div></md-list-item>`).join('')}</md-list>`,
  chart:   (n) => `<div style="display:flex;flex-direction:column;gap:12px"><div style="display:flex;align-items:flex-end;gap:8px;height:112px">${bars(n).map((b) => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
    <div style="display:flex;align-items:flex-end;justify-content:center;gap:2px;width:100%;height:96px"><div style="width:45%;height:${b.a}%;border-radius:var(--md-sys-shape-corner-extra-small) var(--md-sys-shape-corner-extra-small) 0 0;background:var(--md-sys-color-primary)"></div><div style="width:45%;height:${b.b}%;border-radius:var(--md-sys-shape-corner-extra-small) var(--md-sys-shape-corner-extra-small) 0 0;background:var(--md-sys-color-primary-container)"></div></div>
    <span class="md-typescale-label-small" style="color:var(--md-sys-color-on-surface-variant)">${esc(b.label)}</span></div>`).join('')}</div>
    <div class="md-typescale-label-small" style="display:flex;gap:16px;color:var(--md-sys-color-on-surface-variant)">${list(n.legend).map((t, i) => `<span style="display:inline-flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:var(--md-sys-shape-corner-full);background:var(--md-sys-color-${i ? 'primary-container' : 'primary'})"></span>${esc(t)}</span>`).join('')}</div></div>`,
  empty:   (n, k) => `<div style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:32px 0;text-align:center">
    <span style="display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:var(--md-sys-shape-corner-medium);background:var(--md-sys-color-surface-container-high);color:var(--md-sys-color-on-surface-variant)">${ico(n.icon, 18)}</span>
    <p class="md-typescale-title-small" style="margin:0">${esc(n.title)}</p>
    <p class="md-typescale-body-small" style="margin:0;max-width:224px;color:var(--md-sys-color-on-surface-variant)">${esc(n.text)}</p>${k}</div>`,
  swatches: (n) => `<div style="display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(88px,1fr))">${swatchRows('material', n.roles, MD_SHOWN).map((r) => `<div style="display:flex;flex-direction:column;gap:6px">
    <span style="height:40px;border-radius:var(--md-sys-shape-corner-small);border:1px solid var(--md-sys-color-outline-variant)${r.paint ? `;background:${r.paint}` : ';border-style:dashed'}"></span>
    <span class="md-typescale-label-medium">${esc(r.label)}</span>
    <span class="md-typescale-label-small" style="font-family:ui-monospace,monospace;line-height:1.3;color:var(--md-sys-color-on-surface-variant)">${esc(r.note)}</span></div>`).join('')}</div>`,
  typespec: (n) => `<div style="display:flex;flex-direction:column;gap:16px">${list(n.rows).map((r) => `<div style="display:flex;flex-direction:column;gap:4px">
    <span class="md-typescale-label-small" style="font-family:ui-monospace,monospace;text-transform:uppercase;color:var(--md-sys-color-on-surface-variant)">${esc({ xl: 'display-small', lg: 'headline-small', md: 'body-large', sm: 'label-medium' }[r.size])}</span>
    <p class="md-typescale-${{ xl: 'display-small', lg: 'headline-small', md: 'body-large', sm: 'label-medium' }[r.size]}" style="margin:0">${esc(r.text)}</p></div>`).join('')}</div>`,
  shapes:  () => `<div style="display:flex;flex-direction:column;gap:16px"><div style="display:flex;flex-wrap:wrap;align-items:flex-end;gap:12px">${['extra-small', 'small', 'medium', 'large'].map((c) => `<div style="display:flex;flex-direction:column;align-items:center;gap:4px"><span style="width:48px;height:48px;background:var(--md-sys-color-surface-container-high);border-radius:var(--md-sys-shape-corner-${c})"></span><span class="md-typescale-label-small" style="font-family:ui-monospace,monospace;color:var(--md-sys-color-on-surface-variant)">corner-${esc(c)}</span></div>`).join('')}</div>
    <p class="md-typescale-body-small" style="margin:0;color:var(--md-sys-color-on-surface-variant)">Material publishes shape tokens and no border-width token, so a border here is one pixel because that is what its own components draw.</p></div>`,
}

/* ── Radix Themes — its own .rt-* classes ────────────────────────────────── */
/* Radix ships its components as React, but their LOOK is plain classes in
 * components.css: .rt-Button, .rt-TextFieldRoot, .rt-TableRoot. A real Radix
 * button is a stack of them — the reset, the base, the size, the variant, the
 * component — so that is what is written here, in that order.
 *
 * Tone is `data-accent-color`, which is how Radix re-tones one element: it
 * remaps the whole twelve-step accent scale for that subtree. Not a colour of
 * ours anywhere. */
/* Which accent a tone wears is NOT ours to decide. It used to be grass, amber
 * and red because I typed those; now each is matched from the colour you chose
 * to the nearest accent Radix publishes, and the element carries a data-tone
 * hook so a running page can re-tone it without re-rendering the markup. */
let RX_TONE = { neutral: 'gray' }
export const useRadixTones = (map) => { RX_TONE = { neutral: 'gray', ...map } }
const rxAccent = (tone) => {
  const t = tone ?? 'neutral'
  const accent = RX_TONE[t]
  /* data-tone on BRAND too: dress() retunes [data-tone=x] when a knob moves,
     and leaving brand off pinned every brand-toned element to the accent the
     page was BUILT with — 254 colours that ignored the knob, found by the
     sweep the day it first ran. Neutral stays bare: gray is gray. */
  return `${accent ? ` data-accent-color="${accent}"` : ''}${t === 'neutral' ? '' : ` data-tone="${t}"`}`
}
const RX_BTN = { brand: 'solid', secondary: 'soft', ghost: 'ghost', danger: 'solid' }
/* the steps of its own scales that carry a role it takes as a SETTING */
const RX_SHOWN = { brand: '--accent-9', onBrand: '--accent-contrast', ink: '--gray-12',
  inkMuted: '--gray-11', line: '--gray-a6', focus: '--focus-8' }
const radix = {
  _id: 'Radix Themes',
  stack:   (n, k) => `<div class="rt-Flex" style="display:flex;flex-direction:column;gap:var(--space-${Math.min(9, n.gap ?? 3)})">${k}</div>`,
  row:     (n, k) => `<div class="rt-Flex" style="display:flex;flex-wrap:wrap;align-items:center;gap:var(--space-${Math.min(9, n.gap ?? 2)})${n.between ? ';justify-content:space-between' : ''}">${k}</div>`,
  grid:    (n, k) => `<div class="rt-Grid" style="display:grid;gap:var(--space-3);grid-template-columns:repeat(${n.cols ?? 2},minmax(0,1fr))">${k}</div>`,
  panel:   (n, k) => `<div class="rt-reset rt-BaseCard rt-Card rt-r-size-2 rt-variant-surface">${k}</div>`,
  divider: () => `<hr class="rt-reset rt-Separator rt-r-size-4">`,
  heading: (n, k) => A(n, k, `h${n.level ?? 3}`, `rt-Heading rt-r-size-${n.level === 2 ? 6 : 4}`),
  text:    (n, k) => A(n, k, 'p', 'rt-Text rt-r-size-2'),
  muted:   (n, k) => A(n, k, 'p', 'rt-Text rt-r-size-2', ' data-accent-color="gray"'),
  label:   (n, k) => A(n, k, 'label', 'rt-Text rt-r-size-2 rt-Strong'),
  button:  (n, k) => A(n, k, 'button', `rt-reset rt-BaseButton rt-r-size-2 rt-variant-${RX_BTN[n.tone ?? 'brand']} rt-Button`, rxAccent(n.tone === 'danger' ? 'danger' : 'brand')),
  input:   (n) => `<div class="rt-TextFieldRoot rt-r-size-2 rt-variant-surface"><input class="rt-reset rt-TextFieldInput" value="${esc(n.value ?? '')}" placeholder="${esc(n.placeholder ?? '')}"></div>`,
  /* Their Select is a button and a panel too, and rt-SelectTrigger on a
     native one handed the list to the operating system. The class names and
     the nesting are read off their own component: trigger, inner, icon;
     content, viewport, item, indicator. */
  select:  (n) => `<div style="position:relative;width:100%">
    <button class="rt-reset rt-SelectTrigger rt-r-size-2 rt-variant-surface" role="combobox" aria-expanded="false" style="width:100%">
      <span class="rt-SelectTriggerInner">${esc(list(n.options)[0] ?? '')}</span>${ico('chevron-down', 16, 'rt-SelectIcon')}</button>
    <div class="rt-SelectContent rt-r-size-2 rt-variant-solid" data-accent-color="" hidden style="position:absolute;inset-inline:0;margin-top:4px;z-index:1">
      <div class="rt-SelectViewport">${list(n.options).map((o, i) => `<div class="rt-SelectItem" role="option" aria-selected="${i === 0}"${i === 0 ? ' data-state="checked"' : ''}>${i === 0 ? `<span class="rt-SelectItemIndicator">${ico('check', 16, 'rt-SelectItemIndicatorIcon')}</span>` : ''}${esc(o)}</div>`).join('')}</div></div></div>`,
  /* Radix's checkbox is a button with an indicator inside, not an <input>:
     rt-reset strips the native appearance, so an input renders as an empty box
     that never fills in. Their markup, their states. */
  /* UNCHECKED IS A STATE, AND SOLID IS NOT A CHECKBOX VARIANT.
     Their checkbox has surface and classic and nothing else, so switching to
     rt-variant-solid when ticked matched no rule at all: a ticked box had no
     box. The variant is a property of the whole control, not of its state —
     data-state is what fills it, in
     .rt-BaseCheckboxRoot:where(.rt-variant-surface):where([data-state='checked'])::before.
     Their surface variant draws the empty one the same way in
     .rt-BaseCheckboxRoot[data-state='unchecked']::before — so leaving the
     attribute off when the box is empty left an empty box with no box: a
     tick floating next to a label, which is what this wall showed. */
  checkbox: (n) => `<label class="rt-Text rt-r-size-2" style="display:inline-flex;align-items:center;gap:var(--space-2)"><button class="rt-reset rt-BaseCheckboxRoot rt-CheckboxRoot rt-r-size-2 rt-variant-surface" role="checkbox" aria-checked="${!!n.on}" data-state="${n.on ? 'checked' : 'unchecked'}">${n.on ? '<svg class="rt-BaseCheckboxIndicator" viewBox="0 0 9 9" fill="currentColor"><path d="M0,4 L3,7 L9,1 L8,0 L3,5 L1,3 Z"/></svg>' : ''}</button>${esc(n.text ?? '')}</label>`,
  switch:  (n) => `<label class="rt-Text rt-r-size-2" style="display:inline-flex;align-items:center;gap:var(--space-2)"><button class="rt-reset rt-SwitchRoot rt-r-size-2 rt-variant-surface" role="switch" aria-checked="${!!n.on}" data-state="${n.on ? 'checked' : 'unchecked'}"><span class="rt-SwitchThumb" data-state="${n.on ? 'checked' : 'unchecked'}"></span></button>${esc(n.text ?? '')}</label>`,
  badge:   (n, k) => A(n, k, 'span', 'rt-reset rt-Badge rt-r-size-1 rt-variant-soft', rxAccent(n.tone)),
  alert:   (n, k) => `<div class="rt-reset rt-BaseCard rt-CalloutRoot rt-r-size-2 rt-variant-soft"${rxAccent(n.tone)}><p class="rt-Text rt-r-size-2">${n.text != null ? esc(n.text) : k}</p></div>`,
  stat:    (n) => `<div class="rt-reset rt-BaseCard rt-Card rt-r-size-2 rt-variant-surface"><p class="rt-Text rt-r-size-1" data-accent-color="gray">${esc(n.label)}</p><p class="rt-Heading rt-r-size-6">${esc(n.value)}</p></div>`,
  table:   (n) => `<div class="rt-TableRoot rt-r-size-2 rt-variant-surface"><table class="rt-TableRootTable"><thead class="rt-TableHeader"><tr class="rt-TableRow">${
    list(n.cols).map((c) => `<th class="rt-TableCell rt-TableColumnHeaderCell">${esc(c)}</th>`).join('')}</tr></thead><tbody class="rt-TableBody">${
    list(n.rows).map((r) => `<tr class="rt-TableRow">${list(r).map((c) => `<td class="rt-TableCell">${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`,
  avatar:  (n) => `<span class="rt-reset rt-AvatarRoot rt-r-size-2 rt-variant-soft"><span class="rt-AvatarFallback">${esc(n.text)}</span></span>`,
  /* Radix writes each tab label TWICE: the visible copy is absolutely
     positioned and a hidden bold copy holds the width open so the row does not
     shift when a tab is selected. Render only the visible one and every label
     collapses onto the same point, which is exactly what happened. */
  /* Radix ships neither a navigation bar nor a footer; what it does ship is
     rt-Link, rt-Inset for a card's edge-to-edge media, and the card itself. */
  navbar:  (n, k) => `<header class="rt-Flex" style="display:flex;flex-wrap:wrap;align-items:center;gap:var(--space-2) var(--space-5);padding:var(--space-3) var(--space-4);background:var(--color-panel-solid);border-bottom:1px solid var(--gray-a5)">
    <span class="rt-Heading rt-r-size-3">${esc(n.brand)}</span>
    <nav style="display:flex;flex-wrap:wrap;gap:var(--space-4)">${
      list(n.items).map((t) => `<a class="rt-reset rt-Text rt-r-size-2 rt-Link rt-underline-auto" href="#" data-accent-color="gray">${esc(t)}</a>`).join('')}</nav>
    <span style="margin-left:auto;display:flex;gap:var(--space-2)">${k}</span></header>`,
  mediacard: (n) => `<div class="rt-reset rt-BaseCard rt-Card rt-r-size-2 rt-variant-surface" style="display:flex;flex-direction:column;gap:var(--space-2)">
    <div class="rt-Inset" data-side="top" style="display:flex;align-items:center;justify-content:center;aspect-ratio:16/9;background:var(--gray-a3);color:var(--gray-a9)">${PHOTO}</div>
    <p class="rt-Heading rt-r-size-3">${esc(n.title)}</p>
    <p class="rt-Text rt-r-size-2" data-accent-color="gray">${esc(n.text)}</p>
    <a class="rt-reset rt-Text rt-r-size-2 rt-Link rt-underline-auto" href="#">${esc(n.action ?? 'Read on')}</a></div>`,
  footer:  (n) => `<footer style="padding:var(--space-5) var(--space-4);background:var(--color-panel-solid);border-top:1px solid var(--gray-a5)">
    <div class="rt-Grid" style="display:grid;gap:var(--space-5);grid-template-columns:repeat(${list(n.groups).length || 1},minmax(0,1fr))">${
      list(n.groups).map((g) => `<div style="display:flex;flex-direction:column;gap:var(--space-2)">
        <p class="rt-Text rt-r-size-1 rt-Strong">${esc(g.title)}</p>${
        list(g.items).map((t) => `<a class="rt-reset rt-Text rt-r-size-2 rt-Link rt-underline-auto" href="#" data-accent-color="gray">${esc(t)}</a>`).join('')}</div>`).join('')}</div>
    <p class="rt-Text rt-r-size-1" data-accent-color="gray" style="margin-top:var(--space-5)">${esc(n.note)}</p></footer>`,
  elevation: (n) => `<div class="rt-Flex" style="display:flex;flex-wrap:wrap;align-items:center;gap:var(--space-4)">${list(n.levels).map((lv, i) =>
    `<div class="rt-reset rt-BaseCard rt-Card rt-r-size-1 rt-variant-surface" style="width:96px;height:64px;display:flex;align-items:center;justify-content:center;box-shadow:var(--shadow-${i + 2})"><span class="rt-Text rt-r-size-1" data-accent-color="gray">${esc(lv)}</span></div>`).join('')}</div>`,
  /* A TabNav marks its current link with data-ACTIVE; data-state is what a Tabs
     trigger uses. Ours said data-state on a TabNavLink, so the base rule read it
     as selected and the rule that styles the label read
     .rt-TabNavLink:not([data-active]) and read it as not — one tab styled two
     ways at once, and the selected one did not look selected. */
  tabs:    (n) => `<nav class="rt-reset rt-BaseTabList rt-r-size-2">${list(n.items).map((t, i) =>
    `<div class="rt-TabNavItem"><a class="rt-reset rt-BaseTabListTrigger rt-TabNavLink"${i === 0 ? ' data-active' : ''}><span class="rt-BaseTabListTriggerInner">${esc(t)}</span><span class="rt-BaseTabListTriggerInnerHidden">${esc(t)}</span></a></div>`).join('')}</nav>`,

  /* ── the rest of a real screen ─────────────────────────────────────────── */
  /* Slider, Progress, RadioGroup, TextArea and DataList are all Radix Themes
     components, written as the stack of classes their React layer emits.
     It ships no sidebar, no breadcrumb, no list and no chart — those four are
     its own tokens on plain markup, and the manifest says so. */
  textarea: (n) => `<div class="rt-TextAreaRoot rt-r-size-2 rt-variant-surface"><textarea rows="3" class="rt-reset rt-TextAreaInput" placeholder="${esc(n.placeholder ?? '')}">${esc(n.value ?? '')}</textarea></div>`,
  radio:   (n) => `<div class="rt-Flex rt-RadioGroupRoot" style="display:flex;flex-direction:column;gap:var(--space-2)">${list(n.items).map((t, i) => `<label class="rt-Text rt-r-size-2" style="display:inline-flex;align-items:center;gap:var(--space-2)"><button class="rt-reset rt-BaseRadioRoot rt-RadioGroupItem rt-r-size-2 rt-variant-surface" role="radio" aria-checked="${i === (n.on ?? 0)}" data-state="${i === (n.on ?? 0) ? 'checked' : 'unchecked'}"></button>${esc(t)}</label>`).join('')}</div>`,
  /* Radix reads data-orientation on every PART, not on the root, and its
     progress bar is a scaleX of --progress-value against --progress-max — not a
     width. Written the way their primitive writes it: a track with no
     orientation is a track with no height, which is exactly the invisible
     slider the first version drew. */
  slider:  (n) => `<span class="rt-SliderRoot rt-r-size-2 rt-variant-surface" data-orientation="horizontal" style="width:100%"><span class="rt-SliderTrack" data-orientation="horizontal"><span class="rt-SliderRange" data-orientation="horizontal" style="left:0;width:${n.value ?? 60}%"></span></span><span class="rt-SliderThumb" data-orientation="horizontal" role="slider" tabindex="0" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${n.value ?? 60}" aria-orientation="horizontal" style="position:absolute;left:${n.value ?? 60}%;transform:translateX(-50%)"></span></span>`,
  progress: (n) => `<div class="rt-ProgressRoot rt-r-size-2 rt-variant-surface" data-orientation="horizontal" style="--progress-value:${n.value ?? 60};--progress-max:100"><div class="rt-ProgressIndicator" data-orientation="horizontal"></div></div>`,
  iconrow: (n) => `<div class="rt-Flex" style="display:flex;flex-wrap:wrap;gap:var(--space-1)">${list(n.items).map((i) => `<button aria-label="${esc(i)}" class="rt-reset rt-BaseButton rt-r-size-2 rt-variant-soft rt-IconButton" data-accent-color="gray">${ico(i)}</button>`).join('')}</div>`,
  breadcrumb: (n) => `<nav class="rt-Flex" style="display:flex;flex-wrap:wrap;align-items:center;gap:var(--space-2)">${list(n.items).map((t, i, a) => `${i ? '<span class="rt-Text rt-r-size-2" data-accent-color="gray">/</span>' : ''}${i === a.length - 1 ? `<span class="rt-Text rt-r-size-2 rt-Strong">${esc(t)}</span>` : `<a class="rt-reset rt-Text rt-r-size-2 rt-Link rt-underline-auto" href="#" data-accent-color="gray">${esc(t)}</a>`}`).join('')}</nav>`,
  /* their own menu classes — BaseMenu is what both the dropdown and the
     context menu are built from, and DropdownMenuContent is the surface */
  menu:    (n) => `<div class="rt-Flex" style="display:inline-flex;flex-direction:column;gap:var(--space-2);align-items:flex-start">
    <button class="rt-reset rt-BaseButton rt-r-size-2 rt-variant-surface rt-Button" data-accent-color="gray" aria-haspopup="menu" aria-expanded="true">${esc(n.trigger ?? 'Actions')}</button>
    <div class="rt-PopperContent rt-BaseMenuContent rt-DropdownMenuContent rt-r-size-2 rt-variant-solid" data-state="open" data-side="bottom" style="min-width:224px">
      <div class="rt-BaseMenuViewport">
        <div class="rt-BaseMenuLabel">${esc(n.label ?? '')}</div>
        ${list(n.items).map((t) => `<div class="rt-reset rt-BaseMenuItem" role="menuitem">${esc(t)}</div>`).join('')}
        <div class="rt-BaseMenuSeparator"></div>
        <div class="rt-reset rt-BaseMenuItem" role="menuitem" data-accent-color="red">${esc(n.danger ?? 'Delete')}</div></div></div></div>`,
  sidenav: (n) => `<div class="rt-Flex" style="display:flex;flex-direction:column;gap:var(--space-4)">${list(n.groups).map((g) => `<div style="display:flex;flex-direction:column;gap:var(--space-1)">
    <p class="rt-Text rt-r-size-1 rt-Strong" data-accent-color="gray" style="padding:0 var(--space-2)">${esc(g.title)}</p>${list(g.items).map((it) => `<a href="#"${it.on ? ' aria-current="page"' : ''} class="rt-Text rt-r-size-2" style="display:flex;align-items:center;gap:var(--space-2);min-height:32px;padding:0 var(--space-2);border-radius:var(--radius-2);text-decoration:none;color:${it.on ? 'var(--accent-11)' : 'var(--gray-11)'};background:${it.on ? 'var(--accent-a3)' : 'transparent'}">${ico(it.icon)}<span>${esc(it.text)}</span>${it.count ? `<span class="rt-reset rt-Badge rt-r-size-1 rt-variant-soft" style="margin-left:auto">${esc(it.count)}</span>` : ''}</a>`).join('')}</div>`).join('')}</div>`,
  list:    (n) => `<div class="rt-Flex" style="display:flex;flex-direction:column">${list(n.rows).map((r) => `<div style="display:flex;align-items:center;gap:var(--space-3);min-height:48px;padding:var(--space-2) 0;border-bottom:1px solid var(--gray-a4)">
    <span style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:var(--radius-3);background:var(--gray-a3);color:var(--gray-11)">${ico(r.icon)}</span>
    <span style="flex:1;min-width:0"><span class="rt-Text rt-r-size-2 rt-Strong" style="display:block">${esc(r.title)}</span><span class="rt-Text rt-r-size-1" data-accent-color="gray" style="display:block">${esc(r.sub ?? '')}</span></span>
    <span class="rt-Text rt-r-size-2" data-accent-color="gray">${esc(r.meta ?? '')}</span></div>`).join('')}</div>`,
  kv:      (n) => `<dl class="rt-DataListRoot rt-r-size-2" data-orientation="horizontal">${list(n.rows).map(([k2, v]) => `<div class="rt-DataListItem">
    <dt class="rt-DataListLabel" style="min-width:9rem"><code class="rt-reset rt-Code rt-r-size-1 rt-variant-soft">${esc(k2)}</code></dt>
    <dd class="rt-DataListValue"><span class="rt-Text rt-r-size-1" data-accent-color="gray">${esc(v)}</span></dd></div>`).join('')}</dl>`,
  chart:   (n) => `<div class="rt-Flex" style="display:flex;flex-direction:column;gap:var(--space-3)"><div style="display:flex;align-items:flex-end;gap:var(--space-2);height:112px">${bars(n).map((b) => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:var(--space-1)">
    <div style="display:flex;align-items:flex-end;justify-content:center;gap:2px;width:100%;height:96px"><div style="width:45%;height:${b.a}%;border-radius:var(--radius-1) var(--radius-1) 0 0;background:var(--accent-9)"></div><div style="width:45%;height:${b.b}%;border-radius:var(--radius-1) var(--radius-1) 0 0;background:var(--accent-6)"></div></div>
    <span class="rt-Text rt-r-size-1" data-accent-color="gray">${esc(b.label)}</span></div>`).join('')}</div>
    <div style="display:flex;gap:var(--space-4)">${list(n.legend).map((t, i) => `<span class="rt-Text rt-r-size-1" data-accent-color="gray" style="display:inline-flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:50%;background:var(--accent-${i ? 6 : 9})"></span>${esc(t)}</span>`).join('')}</div></div>`,
  empty:   (n, k) => `<div style="display:flex;flex-direction:column;align-items:center;gap:var(--space-2);padding:var(--space-6) 0;text-align:center">
    <span style="display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:var(--radius-3);background:var(--gray-a3);color:var(--gray-11)">${ico(n.icon, 18)}</span>
    <p class="rt-Text rt-r-size-2 rt-Strong">${esc(n.title)}</p>
    <p class="rt-Text rt-r-size-2" data-accent-color="gray" style="max-width:224px">${esc(n.text)}</p>${k}</div>`,
  swatches: (n) => `<div class="rt-Grid" style="display:grid;gap:var(--space-3);grid-template-columns:repeat(auto-fill,minmax(88px,1fr))">${swatchRows('radix', n.roles, RX_SHOWN).map((r) => `<div style="display:flex;flex-direction:column;gap:6px">
    <span style="height:40px;border-radius:var(--radius-3);border:1px ${r.paint ? 'solid' : 'dashed'} var(--gray-a6)${r.paint ? `;background:${r.paint}` : ''}"></span>
    <span class="rt-Text rt-r-size-1 rt-Strong">${esc(r.label)}</span>
    <code class="rt-reset rt-Code rt-r-size-1 rt-variant-ghost" data-accent-color="gray" style="line-height:1.3">${esc(r.note)}</code></div>`).join('')}</div>`,
  typespec: (n) => `<div style="display:flex;flex-direction:column;gap:var(--space-4)">${list(n.rows).map((r) => `<div style="display:flex;flex-direction:column;gap:var(--space-1)">
    <code class="rt-reset rt-Code rt-r-size-1 rt-variant-ghost" data-accent-color="gray">${esc({ xl: 'size 8', lg: 'size 6', md: 'size 3', sm: 'size 2' }[r.size])}</code>
    ${r.size === 'xl' || r.size === 'lg' ? `<p class="rt-Heading rt-r-size-${r.size === 'xl' ? 8 : 6}">${esc(r.text)}</p>` : `<p class="rt-Text rt-r-size-${r.size === 'md' ? 3 : 2}">${esc(r.text)}</p>`}</div>`).join('')}</div>`,
  shapes:  () => `<div style="display:flex;flex-direction:column;gap:var(--space-4)"><div style="display:flex;flex-wrap:wrap;align-items:flex-end;gap:var(--space-3)">${[1, 2, 3, 4].map((c) => `<div style="display:flex;flex-direction:column;align-items:center;gap:var(--space-1)"><span style="width:48px;height:48px;background:var(--gray-a3);border-radius:var(--radius-${c})"></span><code class="rt-reset rt-Code rt-r-size-1 rt-variant-ghost" data-accent-color="gray">radius-${c}</code></div>`).join('')}</div>
    <p class="rt-Text rt-r-size-1" data-accent-color="gray">Radix takes a radius SETTING, not a length: none, small, medium, large or full. The nearest one to your value is the one on this page.</p></div>`,
}

/* ── Mantine — the class names read out of its own stylesheets ───────────── */
/* Mantine's component classes are content hashes: .m_77c9d27d is Button. They
 * are not a vocabulary anyone can write, so they are not written here — the kit
 * document carries a name→hash map read from its own styles/<Name>.css, and a
 * release that rehashes them changes the map, not this file.
 *
 * Handed in rather than imported, because this module is also inlined into the
 * page where there is no filesystem. */
let MC = {}
export const useMantineClasses = (map) => { MC = map ?? {} }
/* component + the part within it, both named by Mantine's own module map. The
 * first version took the first class in each stylesheet and invented nine names
 * for parts that have no file of their own. */
const mc = (name, part = 'root') => MC[name]?.[part] ?? `mantine-missing-${name}-${part}`
/* WHAT THEIR REACT LAYER WRITES.
 *
 * Every Mantine component gets a block of custom properties set on it inline —
 * the size, the radius, the colour — and the CSS reads them with fallbacks that
 * do not all agree with the default their components actually use: a button
 * with no --button-fz falls back to font-size-sm, an input with none falls back
 * to md. So our input rendered at 16px next to their 14px, on the same theme.
 * Measured against mantine.dev, one component at a time.
 *
 * Everything named below is declared or read by Mantine's own stylesheet. */
const MN_FOCUS = 'mantine-focus-auto'
const MN_BTN_VARS = '--button-height:var(--button-height-sm);--button-padding-x:var(--button-padding-x-sm);--button-fz:var(--mantine-font-size-sm);--button-radius:var(--mantine-radius-md);'
const MN_INPUT_VARS = '--input-margin-top:calc(var(--mantine-spacing-xs) / 2);--input-height:var(--input-height-sm);--input-fz:var(--mantine-font-size-sm);--input-radius:var(--mantine-radius-md)'
const MN_LABEL_VARS = '--label-fz:var(--mantine-font-size-sm);--label-lh:var(--label-lh-sm)'
/* A checkbox, a radio and a switch share one wrapper: root, body, label wrapper
 * and label all come out of utils/InlineInput. Reading only esm/components left
 * four parts of every one of them unnamed, so we composed a Group and a Text
 * around the two we could name — which is why they lined up with each other on
 * their site and not on ours. */
const mnInline = (root, data, vars, control, label) => `<div class="${cls(root, mc('InlineInput', 'root'))}" data-label-position="right"${data} style="${vars}">
  <div class="${mc('InlineInput', 'body')}">${control}
    <div class="${mc('InlineInput', 'labelWrapper')}"><label class="${mc('InlineInput', 'label')}">${esc(label)}</label></div>
  </div></div>`

const MN_BTN = {
  /* Their React layer passes the contrast colour in as --button-color; without
     it the label falls back to white and the On-brand knob writes a variable
     nothing reads. */
  brand: '--button-color:var(--mantine-primary-color-contrast)', secondary: '--button-bg:var(--mantine-color-default);--button-color:var(--mantine-color-text);--button-bd:1px solid var(--mantine-color-default-border)',
  ghost: '--button-bg:transparent;--button-color:var(--mantine-primary-color-filled)',
  /* their semantic name, not a red I picked */
  danger: '--button-bg:var(--mantine-color-error);--button-color:var(--mantine-color-white)',
}
const MN_BADGE = { neutral: '--badge-bg:var(--mantine-color-default);--badge-color:var(--mantine-color-text)',
  brand: '', success: '--badge-bg:var(--mantine-color-green-light);--badge-color:var(--mantine-color-green-light-color)',
  warning: '--badge-bg:var(--mantine-color-yellow-light);--badge-color:var(--mantine-color-yellow-light-color)',
  danger: '--badge-bg:var(--mantine-color-error);--badge-color:var(--mantine-color-white)' }
const mantine = {
  _id: 'Mantine',
  stack:   (n, k) => `<div class="${mc('Stack')}" style="--stack-gap:calc(${(n.gap ?? 3) * 0.25}rem * var(--mantine-scale))">${k}</div>`,
  row:     (n, k) => `<div class="${mc('Group')}" style="--group-gap:calc(${(n.gap ?? 2) * 0.25}rem * var(--mantine-scale))${n.between ? ';--group-justify:space-between' : ''}">${k}</div>`,
  grid:    (n, k) => `<div style="display:grid;gap:var(--mantine-spacing-md);grid-template-columns:repeat(${n.cols ?? 2},minmax(0,1fr))">${k}</div>`,
  panel:   (n, k) => `<div class="${cls(mc('Paper'), mc('Card'))}" data-with-border="true" data-orientation="vertical" style="--paper-shadow:var(--mantine-shadow-xs);--card-padding:var(--mantine-spacing-lg)">${k}</div>`,
  divider: () => `<div class="${mc('Divider')}"></div>`,
  /* Mantine's Title reads --title-fz/fw/lh, which its React layer fills from
     the theme's own --mantine-h<n>-* variables. Same variables, set here. */
  /* --title-fw comes from theme.headings.fontWeight in their React layer, which
     is --mantine-heading-font-weight. Wiring it to the per-h weight instead
     pinned every heading at 700 and left the weight knob dead. */
  /* the three their Title writes, per level — the weight included, now that the
     six per-level names travel with the knob */
  heading: (n, k) => A(n, k, `h${n.level ?? 3}`, mc('Title'), ` data-order="${n.level ?? 3}" style="--title-fz:var(--mantine-h${n.level ?? 3}-font-size);--title-fw:var(--mantine-h${n.level ?? 3}-font-weight);--title-lh:var(--mantine-h${n.level ?? 3}-line-height)"`),
  text:    (n, k) => A(n, k, 'p', mc('Text')),
  muted:   (n, k) => A(n, k, 'p', mc('Text'), ' style="--text-color:var(--mantine-color-dimmed)"'),
  label:   (n, k) => A(n, k, 'label', mc('Input', 'label')),
  /* their button is Button-root AND UnstyledButton-root, with the focus and
     press classes their own stylesheet defines — ours had neither, so a Mantine
     button on this wall had no focus ring at all */
  button:  (n, k) => A(n, k, 'button', cls(MN_FOCUS, 'mantine-active', mc('Button'), mc('UnstyledButton')),
    ` type="button" style="${MN_BTN_VARS}${MN_BTN[n.tone ?? 'brand']}"`),
  /* wrapper OUTSIDE, input inside: data-variant on the wrapper is what sets
     --input-bd and --input-bg, and an input without it has `border: 1px solid`
     with no colour — an invisible field, which is what the first pass shipped. */
  input:   (n) => `<div class="${mc('Input', 'wrapper')}" data-variant="default" data-size="sm" style="${MN_INPUT_VARS}"><input class="${cls(MN_FOCUS, mc('Input', 'input'))}" data-variant="default" value="${esc(n.value ?? '')}" placeholder="${esc(n.placeholder ?? '')}"></div>`,
  select:  (n) => `<div class="${mc('Input', 'wrapper')}" data-variant="default" data-size="sm" style="${MN_INPUT_VARS}"><select class="${cls(MN_FOCUS, mc('Input', 'input'))}" data-variant="default">${list(n.options).map((o) => `<option>${esc(o)}</option>`).join('')}</select></div>`,
  /* --checkbox-size lives on the ROOT and the input reads it, so an input on
     its own is a zero-sized box. Their nesting, not ours. */
  checkbox: (n) => mnInline(mc('Checkbox'), ' data-variant="filled" data-size="sm"',
    `--checkbox-size:var(--checkbox-size-sm);--checkbox-radius:var(--mantine-radius-sm);--checkbox-color:var(--mantine-primary-color-filled);${MN_LABEL_VARS}`,
    `<div class="${mc('Checkbox', 'inner')}" data-label-position="right"><input type="checkbox" class="${cls(MN_FOCUS, mc('Checkbox', 'input'))}" data-variant="filled"${n.on ? ' checked' : ''}><svg class="${mc('Checkbox', 'icon')}" viewBox="0 0 10 7" fill="none" aria-hidden="true"><path d="M4 4.586L1.707 2.293A1 1 0 1 0 .293 3.707l3 3a.997.997 0 0 0 1.414 0l5-5A1 1 0 1 0 8.293.293L4 4.586z" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"/></svg></div>`,
    n.text ?? ''),
  /* the track is a SIBLING of the input, not the same element: Mantine styles
     it through `input:checked + track`. */
  switch:  (n) => mnInline(mc('Switch'), ` data-size="sm" data-checked="${!!n.on}"`,
    `--switch-height:var(--switch-height-sm);--switch-radius:var(--mantine-radius-xl);--switch-color:var(--mantine-primary-color-filled);${MN_LABEL_VARS}`,
    `<input type="checkbox" role="switch" class="${cls(MN_FOCUS, mc('Switch', 'input'))}" data-checked="${!!n.on}"${n.on ? ' checked' : ''}>
     <span class="${mc('Switch', 'track')}" data-label-position="right" data-without-labels="true">
       <span class="${mc('Switch', 'trackLabel')}"></span>
       <span class="${mc('Switch', 'thumb')}" data-reduce-motion="true"></span></span>`,
    n.text ?? ''),
  badge:   (n, k) => A(n, k, 'span', mc('Badge'), MN_BADGE[n.tone ?? 'neutral'] ? ` style="${MN_BADGE[n.tone ?? 'neutral']}"` : ''),
  /* their default variant is LIGHT: a step-1 tint with the step-8 ink, which is
     what their varsResolver writes. --alert-bg alone with a solid painted the
     wall in saturated slabs no Mantine screen has ever shown. The brand tone
     rides the primary family, which follows the knob now. */
  alert:   (n, k) => {
    const t = { danger: ['var(--mantine-color-red-light)', 'var(--mantine-color-red-light-color)'],
      warning: ['var(--mantine-color-yellow-light)', 'var(--mantine-color-yellow-light-color)'],
      success: ['var(--mantine-color-green-light)', 'var(--mantine-color-green-light-color)'],
    }[n.tone] ?? ['var(--mantine-primary-color-light)', 'var(--mantine-primary-color-light-color)']
    return `<div class="${mc('Alert')}" data-variant="light" style="--alert-bg:${t[0]};--alert-color:${t[1]};--alert-bd:1px solid transparent;--alert-radius:var(--mantine-radius-default)"><div class="${mc('Alert', 'body')}"><div class="${mc('Alert', 'message')}">${n.text != null ? esc(n.text) : k}</div></div></div>`
  },
  stat:    (n) => `<div class="${cls(mc('Paper'), mc('Card'))}" data-with-border="true" data-orientation="vertical" style="--card-padding:var(--mantine-spacing-lg)"><p class="${mc('Text')}" style="--text-color:var(--mantine-color-dimmed);--text-fz:var(--mantine-font-size-sm)">${esc(n.label)}</p><p class="${mc('Title')}" data-order="2" style="--title-fz:var(--mantine-h2-font-size);--title-fw:var(--mantine-h2-font-weight);--title-lh:var(--mantine-h2-line-height)">${esc(n.value)}</p></div>`,
  table:   (n) => `<table class="${mc('Table', 'table')}" data-with-table-border="true" data-with-row-border="true"><thead class="${mc('Table', 'thead')}"><tr class="${mc('Table', 'tr')}">${
    list(n.cols).map((c) => `<th class="${mc('Table', 'th')}">${esc(c)}</th>`).join('')}</tr></thead><tbody class="${mc('Table', 'tbody')}">${
    list(n.rows).map((r) => `<tr class="${mc('Table', 'tr')}" data-with-row-border="true">${list(r).map((c) => `<td class="${mc('Table', 'td')}">${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`,
  avatar:  (n) => `<div class="${mc('Avatar')}"><span class="${mc('Avatar', 'placeholder')}">${esc(n.text)}</span></div>`,
  /* Mantine's AppShell publishes a header AND a footer class — the only kit
     here that ships both — and Card.section is its edge-to-edge media slot. */
  navbar:  (n, k) => `<header class="${mc('AppShell', 'header')}" style="position:static;display:flex;flex-wrap:wrap;align-items:center;gap:var(--mantine-spacing-xs) var(--mantine-spacing-lg);padding:var(--mantine-spacing-sm) var(--mantine-spacing-md)">
    <span class="${mc('Title')}" data-order="4" style="--title-fz:var(--mantine-h4-font-size);--title-fw:var(--mantine-h4-font-weight);--title-lh:var(--mantine-h4-line-height)">${esc(n.brand)}</span>
    <nav style="display:flex;flex-wrap:wrap;gap:var(--mantine-spacing-md)">${
      list(n.items).map((t) => `<a class="${mc('Anchor')}" href="#">${esc(t)}</a>`).join('')}</nav>
    <span style="margin-left:auto;display:flex;gap:var(--mantine-spacing-xs)">${k}</span></header>`,
  mediacard: (n) => `<div class="${cls(mc('Paper'), mc('Card'))}" data-with-border="true" data-orientation="vertical" style="--card-padding:var(--mantine-spacing-md)">
    <div class="${mc('Card', 'section')}" style="display:flex;align-items:center;justify-content:center;aspect-ratio:16/9;background:var(--mantine-color-default);color:var(--mantine-color-dimmed)">${PHOTO}</div>
    <p class="${mc('Title')}" data-order="4" style="--title-fz:var(--mantine-h4-font-size);--title-fw:var(--mantine-h4-font-weight);--title-lh:var(--mantine-h4-line-height);margin-top:var(--mantine-spacing-sm)">${esc(n.title)}</p>
    <p class="${mc('Text')}" style="--text-fz:var(--mantine-font-size-sm);--text-color:var(--mantine-color-dimmed)">${esc(n.text)}</p>
    <a class="${mc('Anchor')}" href="#">${esc(n.action ?? 'Read on')}</a></div>`,
  footer:  (n) => `<footer class="${mc('AppShell', 'footer')}" style="position:static;padding:var(--mantine-spacing-lg) var(--mantine-spacing-md)">
    <div style="display:grid;gap:var(--mantine-spacing-lg);grid-template-columns:repeat(${list(n.groups).length || 1},minmax(0,1fr))">${
      list(n.groups).map((g) => `<div style="display:flex;flex-direction:column;gap:var(--mantine-spacing-xs)">
        <p class="${mc('Text')}" style="--text-fz:var(--mantine-font-size-xs);font-weight:600">${esc(g.title)}</p>${
        list(g.items).map((t) => `<a class="${mc('Anchor')}" href="#" style="--anchor-color:var(--mantine-color-dimmed)">${esc(t)}</a>`).join('')}</div>`).join('')}</div>
    <p class="${mc('Text')}" style="--text-fz:var(--mantine-font-size-sm);--text-color:var(--mantine-color-dimmed);margin-top:var(--mantine-spacing-lg)">${esc(n.note)}</p></footer>`,
  elevation: (n) => `<div class="${mc('Group')}">${list(n.levels).map((lv) =>
    `<div class="${cls(mc('Paper'), mc('Card'))}" data-orientation="vertical" style="--paper-shadow:var(--mantine-shadow-${lv});width:96px;height:64px;display:flex;align-items:center;justify-content:center"><span class="${mc('Text')}" style="--text-fz:var(--mantine-font-size-xs);--text-color:var(--mantine-color-dimmed)">${esc(lv)}</span></div>`).join('')}</div>`,
  /* the variant is a CLASS in their own module map — tab--default, list--default
     — which their React merges in. Without those two, the underline lives in no
     rule that matches and every tab renders as the base box. */
  tabs:    (n) => `<div class="${mc('Tabs')}" data-orientation="horizontal" data-variant="default" style="--tabs-radius:var(--mantine-radius-md);--tabs-color:var(--mantine-primary-color-filled)"><div class="${cls(mc('Tabs', 'list'), mc('Tabs', 'list--default'))}" role="tablist" data-orientation="horizontal" data-variant="default">${
    list(n.items).map((t, i) => `<button type="button" class="${cls(MN_FOCUS, mc('Tabs', 'tab'), mc('Tabs', 'tab--default'))}" role="tab" data-variant="default"${i === 0 ? ' data-active="true"' : ''}><span class="${mc('Tabs', 'tabLabel')}">${esc(t)}</span></button>`).join('')}</div></div>`,

  /* ── the rest of a real screen ─────────────────────────────────────────── */
  /* Mantine ships a component for every one of these but the chart: Slider,
     Progress, Radio, Breadcrumbs, ActionIcon, NavLink, DataList and EmptyState
     are all its own, by the same name→hash map as everything above. */
  textarea: (n) => `<div class="${mc('Input', 'wrapper')}" data-variant="default" data-size="sm" style="${MN_INPUT_VARS}"><textarea rows="3" class="${cls(MN_FOCUS, mc('Input', 'input'))}" data-variant="default" data-multiline="true" placeholder="${esc(n.placeholder ?? '')}">${esc(n.value ?? '')}</textarea></div>`,
  radio:   (n) => `<div class="${mc('Stack')}" style="--stack-gap:var(--mantine-spacing-xs)">${list(n.items).map((t, i) => mnInline(mc('Radio'), ' data-variant="filled" data-size="sm"',
    `--radio-size:var(--radio-size-sm);--radio-radius:var(--mantine-radius-xl);--radio-color:var(--mantine-primary-color-filled);${MN_LABEL_VARS}`,
    `<div class="${mc('Radio', 'inner')}" data-label-position="right"><input type="radio" name="${esc(n.name ?? 'g')}" class="${cls(MN_FOCUS, mc('Radio', 'radio'))}"${i === (n.on ?? 0) ? ' checked' : ''}><svg class="${mc('Radio', 'icon')}" viewBox="0 0 5 5" aria-hidden="true"><circle cx="2.5" cy="2.5" r="2.5" fill="currentColor"/></svg></div>`,
    t)).join('')}</div>`,
  /* their own size, radius and thumb, and the bar positioned the way their
     component positions it — a width and a left of ours put the bar in roughly
     the right place and left the track at no height at all */
  slider:  (n) => `<div class="${mc('Slider')}" data-size="md" style="--slider-size:var(--slider-size-md);--slider-color:var(--mantine-primary-color-filled);--slider-radius:var(--mantine-radius-xl);--slider-thumb-size:calc(var(--slider-size) * 2)">
    <div class="${mc('Slider', 'trackContainer')}"><div class="${mc('Slider', 'track')}">
      <div class="${mc('Slider', 'bar')}" style="--slider-bar-width:calc(${n.value ?? 60}% + 2 * var(--slider-size));--slider-bar-offset:calc(0% - var(--slider-size))"></div>
    </div></div><div class="${cls(MN_FOCUS, mc('Slider', 'thumb'))}" role="slider" tabindex="0" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${n.value ?? 60}" aria-orientation="horizontal" style="--slider-thumb-offset:${n.value ?? 60}%"></div></div>`,
  /* --progress-section-WIDTH was a name of ours that nothing reads: their
     section reads --progress-section-size for the width and
     --progress-section-color for the fill, so this bar had neither. */
  progress: (n) => `<div class="${mc('Progress')}"><div class="${mc('Progress', 'section')}" style="--progress-section-size:${n.value ?? 60}%;--progress-section-color:var(--mantine-primary-color-filled)"></div></div>`,
  iconrow: (n) => `<div class="${mc('Group')}" style="--group-gap:var(--mantine-spacing-xs)">${list(n.items).map((i) => `<button type="button" aria-label="${esc(i)}" class="${cls(MN_FOCUS, 'mantine-active', mc('ActionIcon'), mc('UnstyledButton'))}" data-variant="subtle" style="--ai-size:var(--ai-size-md);--ai-radius:var(--mantine-radius-md);--ai-bg:transparent;--ai-color:var(--mantine-color-text);--ai-hover:var(--mantine-color-default-hover)"><span class="${mc('ActionIcon', 'icon')}">${ico(i)}</span></button>`).join('')}</div>`,
  breadcrumb: (n) => `<div class="${mc('Breadcrumbs')}">${list(n.items).map((t, i, a) => `${i ? `<div class="${mc('Breadcrumbs', 'separator')}">/</div>` : ''}<div class="${mc('Breadcrumbs', 'breadcrumb')}">${i === a.length - 1 ? `<span class="${mc('Text')}">${esc(t)}</span>` : `<a class="${mc('Anchor')}" href="#">${esc(t)}</a>`}</div>`).join('')}</div>`,
  /* THEIR MENU IS A POPOVER WITH A MENU INSIDE IT.
   *
   * Menu.dropdown is four pixels of padding and nothing else — the white, the
   * border and the radius all live on Popover.dropdown, which their own
   * MenuDropdown renders as well. With only the Menu class the panel had no
   * background, no border and square corners, and looked like a list that had
   * lost its card.
   *
   * No shadow: their Popover only gets one from a `shadow` prop, and Menu
   * passes none. Their docs demo writes shadow="md" by hand, which is a choice
   * that demo makes and not what the component does.
   *
   * The item is an UnstyledButton like every other Mantine control, and a red
   * one is --menu-item-color, the variable their own varsResolver writes from
   * the color prop. */
  menu:    (n) => `<div class="${mc('Stack')}" style="--stack-gap:var(--mantine-spacing-xs);align-items:flex-start">
    <button type="button" class="${cls(MN_FOCUS, 'mantine-active', mc('Button'), mc('UnstyledButton'))}" aria-haspopup="menu" aria-expanded="true" style="${MN_BTN_VARS}${MN_BTN.secondary}">${esc(n.trigger ?? 'Actions')}</button>
    <div class="${cls(mc('Popover', 'dropdown'), mc('Menu', 'dropdown'))}" role="menu" aria-orientation="vertical" data-menu-dropdown style="position:static;min-width:224px">
      ${n.label ? `<div class="${mc('Menu', 'label')}">${esc(n.label)}</div>` : ''}
      ${list(n.items).map((t) => `<button type="button" class="${cls(MN_FOCUS, mc('UnstyledButton'), mc('Menu', 'item'))}" role="menuitem" data-menu-item><span class="${mc('Menu', 'itemLabel')}" data-menu-item-label>${esc(t)}</span></button>`).join('')}
      <div class="${mc('Menu', 'divider')}"></div>
      <button type="button" class="${cls(MN_FOCUS, mc('UnstyledButton'), mc('Menu', 'item'))}" role="menuitem" data-menu-item style="--menu-item-color:var(--mantine-color-red-6);--menu-item-hover:var(--mantine-color-red-0)"><span class="${mc('Menu', 'itemLabel')}" data-menu-item-label>${esc(n.danger ?? 'Delete')}</span></button></div></div>`,
  sidenav: (n) => `<div class="${mc('Stack')}" style="--stack-gap:var(--mantine-spacing-md)">${list(n.groups).map((g) => `<div>
    <p class="${mc('Text')}" style="--text-fz:var(--mantine-font-size-xs);--text-color:var(--mantine-color-dimmed);padding:0 var(--mantine-spacing-xs);margin:0 0 4px">${esc(g.title)}</p>${
    list(g.items).map((it) => `<a href="#" class="${cls(MN_FOCUS, mc('UnstyledButton'), mc('NavLink'))}"${it.on ? ' data-active="true"' : ''}><span class="${mc('NavLink', 'section')}" data-position="left">${ico(it.icon)}</span><span class="${mc('NavLink', 'body')}"><span class="${mc('NavLink', 'label')}">${esc(it.text)}</span></span>${it.count ? `<span class="${mc('NavLink', 'section')}" data-position="right"><span class="${mc('Badge')}" style="--badge-height:1.125rem">${esc(it.count)}</span></span>` : ''}</a>`).join('')}</div>`).join('')}</div>`,
  list:    (n) => `<div class="${mc('Stack')}" style="--stack-gap:0">${list(n.rows).map((r) => `<div class="${mc('Group')}" style="--group-gap:var(--mantine-spacing-sm);--group-wrap:nowrap;min-height:48px;padding:var(--mantine-spacing-xs) 0;border-bottom:1px solid var(--mantine-color-default-border)">
    <span class="${mc('ThemeIcon')}" style="--ti-size:2rem;--ti-bg:var(--mantine-color-default);--ti-color:var(--mantine-color-dimmed)">${ico(r.icon)}</span>
    <span style="flex:1;min-width:0"><span class="${mc('Text')}" style="--text-fz:var(--mantine-font-size-sm);display:block;font-weight:500">${esc(r.title)}</span><span class="${mc('Text')}" style="--text-fz:var(--mantine-font-size-xs);--text-color:var(--mantine-color-dimmed);display:block">${esc(r.sub ?? '')}</span></span>
    <span class="${mc('Text')}" style="--text-fz:var(--mantine-font-size-sm);--text-color:var(--mantine-color-dimmed)">${esc(r.meta ?? '')}</span></div>`).join('')}</div>`,
  kv:      (n) => `<dl class="${mc('DataList')}" data-orientation="horizontal" style="--datalist-gap:var(--mantine-spacing-xs)">${list(n.rows).map(([k2, v]) => `<div class="${mc('DataList', 'item')}">
    <dt class="${mc('DataList', 'itemLabel')}" style="min-width:9rem"><code class="${mc('Code')}">${esc(k2)}</code></dt>
    <dd class="${mc('DataList', 'itemValue')}"><span class="${mc('Text')}" style="--text-fz:var(--mantine-font-size-xs);--text-color:var(--mantine-color-dimmed)">${esc(v)}</span></dd></div>`).join('')}</dl>`,
  chart:   (n) => `<div class="${mc('Stack')}" style="--stack-gap:var(--mantine-spacing-sm)"><div style="display:flex;align-items:flex-end;gap:var(--mantine-spacing-xs);height:112px">${bars(n).map((b) => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
    <div style="display:flex;align-items:flex-end;justify-content:center;gap:2px;width:100%;height:96px"><div style="width:45%;height:${b.a}%;border-radius:var(--mantine-radius-sm) var(--mantine-radius-sm) 0 0;background:var(--mantine-primary-color-filled)"></div><div style="width:45%;height:${b.b}%;border-radius:var(--mantine-radius-sm) var(--mantine-radius-sm) 0 0;background:var(--mantine-primary-color-light)"></div></div>
    <span class="${mc('Text')}" style="--text-fz:var(--mantine-font-size-xs);--text-color:var(--mantine-color-dimmed)">${esc(b.label)}</span></div>`).join('')}</div>
    <div class="${mc('Group')}" style="--group-gap:var(--mantine-spacing-md)">${list(n.legend).map((t, i) => `<span class="${mc('Text')}" style="--text-fz:var(--mantine-font-size-xs);--text-color:var(--mantine-color-dimmed);display:inline-flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:50%;background:var(--mantine-${i ? 'primary-color-light' : 'primary-color-filled'})"></span>${esc(t)}</span>`).join('')}</div></div>`,
  empty:   (n, k) => `<div class="${mc('EmptyState')}"><div class="${mc('EmptyState', 'indicator')}">${ico(n.icon, 18)}</div>
    <div class="${mc('EmptyState', 'body')}"><p class="${mc('EmptyState', 'title')}">${esc(n.title)}</p><p class="${mc('EmptyState', 'description')}">${esc(n.text)}</p></div>
    <div class="${mc('EmptyState', 'actions')}">${k}</div></div>`,
  swatches: (n) => `<div style="display:grid;gap:var(--mantine-spacing-sm);grid-template-columns:repeat(auto-fill,minmax(88px,1fr))">${swatchRows('mantine', n.roles).map((r) => `<div style="display:flex;flex-direction:column;gap:6px">
    <span style="height:40px;border-radius:var(--mantine-radius-default);border:1px ${r.paint ? 'solid' : 'dashed'} var(--mantine-color-default-border)${r.paint ? `;background:${r.paint}` : ''}"></span>
    <span class="${mc('Text')}" style="--text-fz:var(--mantine-font-size-xs);font-weight:500">${esc(r.label)}</span>
    <code class="${mc('Code')}" style="font-size:10px;line-height:1.3">${esc(r.note)}</code></div>`).join('')}</div>`,
  typespec: (n) => `<div class="${mc('Stack')}" style="--stack-gap:var(--mantine-spacing-md)">${list(n.rows).map((r) => `<div>
    <code class="${mc('Code')}" style="font-size:10px">${esc({ xl: 'h1-font-size', lg: 'h3-font-size', md: 'font-size-md', sm: 'font-size-sm' }[r.size])}</code>
    ${r.size === 'xl' || r.size === 'lg' ? `<p class="${mc('Title')}" data-order="${r.size === 'xl' ? 1 : 3}" style="--title-fz:var(--mantine-h${r.size === 'xl' ? 1 : 3}-font-size);--title-fw:var(--mantine-heading-font-weight);--title-lh:var(--mantine-h${r.size === 'xl' ? 1 : 3}-line-height);margin:4px 0 0">${esc(r.text)}</p>` : `<p class="${mc('Text')}" style="--text-fz:var(--mantine-font-size-${r.size});margin:4px 0 0">${esc(r.text)}</p>`}</div>`).join('')}</div>`,
  shapes:  () => `<div class="${mc('Stack')}" style="--stack-gap:var(--mantine-spacing-md)"><div class="${mc('Group')}">${['xs', 'sm', 'md', 'lg'].map((c) => `<div style="display:flex;flex-direction:column;align-items:center;gap:4px"><span style="width:48px;height:48px;background:var(--mantine-color-default);border-radius:var(--mantine-radius-${c})"></span><code class="${mc('Code')}" style="font-size:10px">radius-${esc(c)}</code></div>`).join('')}</div>
    <p class="${mc('Text')}" style="--text-fz:var(--mantine-font-size-xs);--text-color:var(--mantine-color-dimmed)">Mantine publishes no border-width variable; a border here is the one its own components draw.</p></div>`,
}

/* ── Ant Design ───────────────────────────────────────────────────────────
 * The one kit on this wall whose markup had to be RUN to exist. Everything
 * else publishes class names you can look up; Ant Design publishes React, and
 * what a Table or a Select wears is only a fact once their component has
 * rendered it. So its components arrive pre-rendered — see antd-tree.mjs — and
 * are handed in the same way Mantine's class map and shadcn's registry are.
 *
 * What is left in this table is exactly what they do NOT ship: the layout you
 * put their components in, and the four specimens that show their tokens. Both
 * are their own variables on plain markup, and the manifest says so rather
 * than letting a div in an ant- class pass for a component.
 */
let ANTD_PRE = {}
export const useAntdParts = (map) => { ANTD_PRE = map ?? {} }

/* the variable that CARRIES a role their generator will not let you hand in */
const ANT_SHOWN = { onBrand: '--ant-color-text-light-solid', focus: '--ant-color-primary-border' }

/* A part they ship but that nothing pre-rendered — a scene added without a new
   fetch, or a render that failed. A hole, drawn as a hole. */
const antHole = (n) => `<span data-missing="${esc(n.p)}" style="display:inline-block;padding:4px 8px;border:1px dashed currentColor;opacity:.6;font-size:12px">${esc(n.p)} — not rendered by antd; run npm run kits</span>`

const antd = {
  _id: 'Ant Design',
  get _pre() { return ANTD_PRE },
  /* Their layout: Flex and Card are components, so those come pre-rendered
     when a scene asks for them by name — but a stack of ours is a stack of
     ours, and it is written as their spacing on a plain div. */
  stack:   (n, k) => `<div style="display:flex;flex-direction:column;gap:calc(var(--ant-margin-xs) * ${Math.max(1, n.gap ?? 3) / 2})">${k}</div>`,
  row:     (n, k) => `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:calc(var(--ant-margin-xs) * ${Math.max(1, n.gap ?? 2) / 2})${n.between ? ';justify-content:space-between' : ''}">${k}</div>`,
  grid:    (n, k) => `<div style="display:grid;gap:var(--ant-margin);grid-template-columns:repeat(${n.cols ?? 2},minmax(0,1fr))">${k}</div>`,
  /* every part they DO ship — answered by the render, never by a string */
  ...Object.fromEntries([...ANTD_OWNS].map((part) => [part, antHole])),

  /* ── the specimens: their tokens, on plain markup ──────────────────────── */
  swatches: (n) => `<div style="display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(88px,1fr))">${swatchRows('antd', n.roles, ANT_SHOWN).map((r) => `<div style="display:flex;flex-direction:column;gap:6px">
    <span style="height:40px;border-radius:var(--ant-border-radius-lg);border:1px ${r.paint ? 'solid' : 'dashed'} var(--ant-color-border)${r.paint ? `;background:${r.paint}` : ''}"></span>
    <span style="font-size:var(--ant-font-size-sm);font-weight:var(--ant-font-weight-strong);color:var(--ant-color-text)">${esc(r.label)}</span>
    <code style="font-family:var(--ant-font-family-code);font-size:12px;line-height:1.3;color:var(--ant-color-text-secondary)">${esc(r.note)}</code></div>`).join('')}</div>`,
  typespec: (n) => `<div style="display:flex;flex-direction:column;gap:20px">${list(n.rows).map((r) => `<div style="display:flex;flex-direction:column;gap:4px">
    <code style="font-family:var(--ant-font-family-code);font-size:12px;color:var(--ant-color-text-secondary)">${esc({ xl: 'heading-1', lg: 'heading-3', md: 'font-size', sm: 'font-size-sm' }[r.size])}</code>
    <p style="margin:0;color:var(--ant-color-text);font-family:var(--ant-font-family);font-weight:${r.size === 'xl' || r.size === 'lg' ? 'var(--ant-font-weight-strong)' : 'inherit'};font-size:var(--ant-font-size${{ xl: '-heading-1', lg: '-heading-3', md: '', sm: '-sm' }[r.size]});line-height:var(--ant-line-height${{ xl: '-heading-1', lg: '-heading-3', md: '', sm: '-sm' }[r.size]})">${esc(r.text)}</p></div>`).join('')}</div>`,
  shapes:  () => `<div style="display:flex;flex-direction:column;gap:20px"><div style="display:flex;flex-wrap:wrap;align-items:flex-end;gap:12px">${['xs', 'sm', '', 'lg'].map((c) => `<div style="display:flex;flex-direction:column;align-items:center;gap:4px"><span style="width:48px;height:48px;background:var(--ant-color-fill-secondary);border-radius:var(--ant-border-radius${c ? '-' + c : ''})"></span><code style="font-family:var(--ant-font-family-code);font-size:12px;color:var(--ant-color-text-secondary)">border-radius${c ? '-' + c : ''}</code></div>`).join('')}</div>
    <div style="display:flex;flex-wrap:wrap;align-items:flex-end;gap:12px">${[1, 2, 4].map((w) => `<div style="display:flex;flex-direction:column;align-items:center;gap:4px"><span style="width:48px;height:48px;border-radius:var(--ant-border-radius);border:${w}px solid var(--ant-color-border)"></span><code style="font-family:var(--ant-font-family-code);font-size:12px;color:var(--ant-color-text-secondary)">${w}px</code></div>`).join('')}</div></div>`,
  elevation: (n) => `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:16px">${list(n.levels).map((lv, i) =>
    `<div style="width:96px;height:64px;display:flex;align-items:center;justify-content:center;border-radius:var(--ant-border-radius-lg);background:var(--ant-color-bg-container);box-shadow:var(--ant-box-shadow${['-tertiary', '', '-secondary'][i] ?? ''})"><span style="font-size:var(--ant-font-size-sm);color:var(--ant-color-text-secondary)">${esc(lv)}</span></div>`).join('')}</div>`,
  /* Ant Design ships no chart; the bars are its own primary at two fills. */
  chart:   (n) => `<div style="display:flex;flex-direction:column;gap:12px"><div style="display:flex;align-items:flex-end;gap:8px;height:112px">${bars(n).map((b) => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
    <div style="display:flex;align-items:flex-end;justify-content:center;gap:2px;width:100%;height:96px"><div style="width:45%;height:${b.a}%;border-radius:var(--ant-border-radius-xs) var(--ant-border-radius-xs) 0 0;background:var(--ant-color-primary)"></div><div style="width:45%;height:${b.b}%;border-radius:var(--ant-border-radius-xs) var(--ant-border-radius-xs) 0 0;background:var(--ant-color-primary-bg)"></div></div>
    <span style="font-size:var(--ant-font-size-sm);color:var(--ant-color-text-secondary)">${esc(b.label)}</span></div>`).join('')}</div>
    <div style="display:flex;gap:16px">${list(n.legend).map((t, i) => `<span style="display:inline-flex;align-items:center;gap:6px;font-size:var(--ant-font-size-sm);color:var(--ant-color-text-secondary)"><span style="width:8px;height:8px;border-radius:50%;background:var(--ant-color-primary${i ? '-bg' : ''})"></span>${esc(t)}</span>`).join('')}</div></div>`,
}

export const WALL = { tailwind, daisyui, bootstrap, shadcn, material, radix, mantine, antd }
