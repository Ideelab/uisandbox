/**
 * WHICH OF THE NINE A PAGE RUNS ON, read from the page itself.
 *
 * The rules are `detect()` from live.js (the bridge), lifted out unchanged and
 * in the same order, so a build dropped into the sandbox and an app talking to
 * it over postMessage get the same answer from the same reasoning. The order
 * is load-bearing: an element or a class is decisive where a variable is only
 * suggestive, and several kits publish a `--primary` or a `--radius`.
 *
 * Nothing is assumed. A page that none of the rules recognise is `null`, and
 * the caller says so rather than guessing a nearest kit.
 *
 * Note for 2c: live.js still carries its own copy of these rules, because it
 * runs as plain ES5 inside somebody else's page and cannot import. When the
 * bridge is ported it inlines THIS function's source, so there is one set of
 * rules again rather than two that drift.
 *
 * @param {Document} [doc]  defaults to the document it runs in, so it can be
 *                           handed to a frame as it is
 * @returns {null | 'material' | 'antd' | 'mantine' | 'radix' | 'bootstrap' | 'daisyui' | 'shadcn' | 'openprops' | 'tailwind'}
 */
export function detectKit(doc = globalThis.document) {
  const root = doc.documentElement
  const cs = (doc.defaultView || globalThis).getComputedStyle(root)
  const has = (v) => cs.getPropertyValue(v).trim() !== ''
  if (doc.querySelector('md-filled-button,md-outlined-button,md-text-button,md-filled-text-field,md-outlined-text-field')) return 'material'
  if (doc.querySelector('.ant-btn,.ant-layout,.ant-input,.ant-menu')) return 'antd'
  if (root.hasAttribute('data-mantine-color-scheme') || doc.querySelector('[class*="mantine-"]')) return 'mantine'
  if (doc.querySelector('.radix-themes')) return 'radix'
  if (has('--bs-primary') || has('--bs-body-bg')) return 'bootstrap'
  if (has('--color-base-100') && has('--color-primary-content')) return 'daisyui'
  if (has('--primary') && has('--card') && has('--radius')) return 'shadcn'
  if (has('--surface-1') && has('--size-3')) return 'openprops'
  if (has('--spacing') && has('--font-sans')) return 'tailwind'
  return null
}
