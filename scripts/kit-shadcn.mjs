#!/usr/bin/env node
/**
 * SHADCN/UI, READ AGAIN FROM SHADCN.
 *
 *   node scripts/kit-shadcn.mjs        rewrites src/kits/engine/kits/shadcn.json
 *
 * The other kits' data came across from UIcockpit as it was fetched (SOURCE.md);
 * their fetcher stayed behind. shadcn is the one that moved: its CLI's
 * `init --defaults` now installs the preset base-nova (Base UI primitives, the
 * nova style, neutral, Lucide, Geist) and ui.shadcn.com renders it, while the
 * kit was still new-york-v4. So this reads what `init --defaults` really
 * installs, from the same places the CLI reads it (decision 208):
 *
 *   ui.shadcn.com/init?…preset=base-nova    the theme: colours, radius, packages
 *   `shadcn add <the 23 parts>`              the components as the CLI writes
 *                                            them into that project, read by
 *                                            registry-read.mjs; the registry's
 *                                            raw JSON carries cn- markers the
 *                                            CLI rewrites on the way in
 *   r/styles/base-nova/font-geist.json      the letter, and the package it is in
 *   npm shadcn                               its tailwind.css: the data-checked,
 *                                            data-open, data-horizontal variants
 *                                            Base UI's attributes need
 *   `shadcn init --base base --preset nova`  run for real in an empty Vite app,
 *                                            for the @theme inline block it
 *                                            writes: Geist as --font-sans and a
 *                                            radius scale by multiplication
 *                                            (sm ×0.6 … 4xl ×2.6), where
 *                                            new-york subtracted pixels. The
 *                                            CLI builds that block in code, so
 *                                            running it is the only way to read
 *                                            it rather than type it.
 *
 * Nothing typed: a part, variable or package that has gone missing throws.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const ENGINE = join(root, 'src/kits/engine')
const { readInstalled, STYLE } = await import(join(ENGINE, 'registry-read.mjs'))

/* Every shadcn component the wall renders, as UIcockpit's fetcher named them. */
const PARTS = ['button', 'badge', 'alert', 'card', 'input', 'textarea', 'select', 'checkbox',
  'radio-group', 'switch', 'slider', 'progress', 'table', 'tabs', 'avatar', 'separator', 'label',
  'breadcrumb', 'sidebar', 'navigation-menu', 'empty', 'item', 'dropdown-menu',
  /* the screens' newer parts (decision 211): what floats, what waits, and the
     controls a sign-in and a list need */
  'dialog', 'tooltip', 'skeleton', 'spinner', 'pagination', 'toggle-group', 'toggle', 'field',
  /* and what the showcase screens open (decision 214): a drawer, a command
     palette, a popover, the calendar a date field opens */
  'sheet', 'command', 'popover', 'calendar', 'input-group']

/* The preset, as the CLI spells it out (shadcn 4.22.1: `nova` in its preset
   table, `base` for the component library). */
const PRESET = { base: 'base', style: 'nova', baseColor: 'neutral', theme: 'neutral', iconLibrary: 'lucide',
  font: 'geist', rtl: 'false', menuAccent: 'subtle', menuColor: 'default', radius: 'default' }

const json = async (url) => {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`${url} answered ${r.status}`)
  return r.json()
}
const npmVersion = (pkg) => execFileSync('npm', ['view', pkg, 'version'], { encoding: 'utf8' }).trim()

const init = await json(`https://ui.shadcn.com/init?${new URLSearchParams({ ...PRESET, preset: `${PRESET.base}-${PRESET.style}` })}`)
if (init.name !== STYLE) throw new Error(`init answered ${init.name}, not ${STYLE}`)
if (!init.cssVars?.light || !init.cssVars?.dark) throw new Error('init carries no cssVars')
const pre = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => ['--' + k, v]))

const fontItem = await json(`https://ui.shadcn.com/r/styles/${STYLE}/font-${PRESET.font}.json`)
const font = fontItem.font
if (!font?.family || !font?.dependency || font.variable !== '--font-sans') throw new Error(`font-${PRESET.font} is not the --font-sans it was`)

/* What init writes into a project's CSS: run it, then read the @theme inline
   block back. An empty Vite app with Tailwind is the smallest project init
   accepts; it installs the packages itself. */
function initProject(cli) {
  const dir = mkdtempSync(join(tmpdir(), 'shadcn-init-'))
  mkdirSync(join(dir, 'src'))
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'x', private: true, type: 'module',
    dependencies: { react: '^19.0.0', 'react-dom': '^19.0.0' },
    devDependencies: { vite: '^7.0.0', tailwindcss: '^4', '@tailwindcss/vite': '^4', typescript: '^5', '@types/react': '^19.0.0' } }))
  writeFileSync(join(dir, 'vite.config.ts'), `import { defineConfig } from 'vite'\nimport tailwindcss from '@tailwindcss/vite'\nexport default defineConfig({ plugins: [tailwindcss()], resolve: { alias: { '@': '/src' } } })\n`)
  const ts = JSON.stringify({ compilerOptions: { baseUrl: '.', paths: { '@/*': ['./src/*'] }, jsx: 'react-jsx', module: 'esnext', moduleResolution: 'bundler' }, include: ['src'] })
  writeFileSync(join(dir, 'tsconfig.json'), ts); writeFileSync(join(dir, 'tsconfig.app.json'), ts)
  writeFileSync(join(dir, 'src/index.css'), '@import "tailwindcss";\n')
  writeFileSync(join(dir, 'src/main.tsx'), 'export {}\n')
  execFileSync('npm', ['install', '--silent', '--no-audit', '--no-fund'], { cwd: dir, stdio: 'pipe' })
  execFileSync('npx', ['--yes', `shadcn@${cli}`, 'init', '--base', PRESET.base, '--preset', PRESET.style, '--yes', '--no-monorepo'],
    { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, CI: '1' } })
  const css = readFileSync(join(dir, 'src/index.css'), 'utf8')
  const at = css.indexOf('@theme inline')
  if (at < 0) throw new Error('init wrote no @theme inline block')
  const block = css.slice(css.indexOf('{', at) + 1, css.indexOf('}', at))
  const theme = Object.fromEntries([...block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]))
  const style = JSON.parse(readFileSync(join(dir, 'components.json'), 'utf8')).style
  if (style !== STYLE) throw new Error(`init installed ${style}, not ${STYLE}`)
  execFileSync('npx', ['--yes', `shadcn@${cli}`, 'add', ...PARTS, '--yes', '--overwrite'],
    { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, CI: '1' } })
  return { theme, parts: readInstalled(PARTS, join(dir, 'src/components/ui'), (f) => readFileSync(f, 'utf8')) }
}

const file = join(ENGINE, 'kits/shadcn.json')
const kit = JSON.parse(readFileSync(file, 'utf8'))
const anim = { npm: 'tw-animate-css', version: npmVersion('tw-animate-css'), license: 'MIT' }
const cli = npmVersion('shadcn')
const { theme, parts } = initProject(cli)
const declared = [...new Set(Object.values(parts).flatMap((p) => p.needs))]
const behaviour = declared.includes('@base-ui/react') ? '@base-ui/react' : declared.includes('radix-ui') ? 'radix-ui' : null
if (!behaviour) throw new Error(`no behaviour package among ${declared.join(', ')}`)
if (theme['--font-sans'] !== font.family.replace(/"/g, "'")) throw new Error(`init's --font-sans (${theme['--font-sans']}) is not font-${PRESET.font}'s ${font.family}`)
Object.assign(kit, {
  style: STYLE,
  parts,
  animates: anim,
  /* their own tailwind.css, which init imports beside tw-animate-css: without
     it data-checked: and data-open: are classes with no rule */
  prelude: { npm: 'shadcn', version: cli, import: 'shadcn/tailwind.css' },
  /* the @theme inline block init writes, as it writes it */
  theme,
  /* the command that installs this, for the export (--preset takes the style
     name; base-nova is what --defaults calls the pair) */
  init: `npx shadcn@latest init --base ${PRESET.base} --preset ${PRESET.style}`,
  /* the letter the preset names, carried in the kit build as a file */
  font: { family: font.family, npm: `${font.dependency}`, variable: font.variable, subsets: font.subsets },
  runsIn: { framework: 'React', from: ['react'], what: `every component it installs imports ${declared.filter((d) => d === behaviour || d === 'lucide-react').join(' and ')}` },
  bands: { ...kit.bands, behaviour: behaviour === '@base-ui/react'
    ? { by: '@base-ui/react', what: 'Base UI, the unstyled primitives under base-nova: focus, keyboard and ARIA', from: ['@base-ui/react'] }
    : kit.bands.behaviour, tokens: Object.keys(init.cssVars.light).length },
  source: `ui.shadcn.com/init (preset ${STYLE}, as shadcn ${cli} init --defaults installs it) · cssVars, the components as shadcn add writes them, font-${PRESET.font} (${font.dependency}), shadcn/tailwind.css and tw-animate-css@${anim.version}`,
  modes: { light: pre(init.cssVars.light), dark: pre(init.cssVars.dark) },
})
writeFileSync(file, JSON.stringify(kit, null, 2) + '\n')
console.log(`shadcn/ui ${STYLE}: ${PARTS.length} parts, ${Object.keys(kit.modes.light).length} variables, ${Object.keys(theme).length} in @theme inline, behaviour ${behaviour}, font ${font.family}, shadcn ${cli}`)
