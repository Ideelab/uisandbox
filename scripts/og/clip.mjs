#!/usr/bin/env node
/**
 * THE CLIP: the editor and Try it on your own app, on the real app, frame by frame.
 *
 *   node scripts/og/clip.mjs [base]        dev server on :5190 by default
 *
 * Writes public/how-it-works.mp4 and its poster (How it works), and
 * brand/marketing/launch.mp4 and launch.gif (the README, posts). Frames are
 * CAPTURED one at a time and held for a set time, so every cut is exact and
 * the pace is a choice, the way launch-clip.mjs did it for the old door.
 *
 * The story (decision 217): a kit's Dashboard six ways, as the editor opens,
 * one picked, the colour turned and the dark mode switched, then Try it on
 * your own app with a real build of somebody else's (SB Admin 2, from
 * fixtures/), what we found, those knobs brought along, the six again,
 * checked 1:1, and taken home.
 */
import { chromium } from 'playwright'
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync, copyFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const base = process.argv[2] ?? 'http://localhost:5190'
const tmp = join(root, '.holdouts', 'clip')
rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true })

const W = 1280, H = 720
const b = await chromium.launch()
const p = await (await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, colorScheme: 'light' })).newPage()
const frames = []
const shot = async (hold) => { const f = join(tmp, `f${String(frames.length).padStart(3, '0')}.png`); await p.screenshot({ path: f }); frames.push([f, hold]) }
const wait = (ms) => p.waitForTimeout(ms)
// exact first, then contains
const click = (text) => p.evaluate((t) => { const all = [...document.querySelectorAll('button')]; const b = all.find((x) => x.textContent.trim() === t) ?? all.find((x) => x.textContent.includes(t)); b?.click(); return !!b }, text)
const set = (patch) => p.evaluate((x) => { const u = window.__us; u.dispatch({ type: 'SET', patch: { ...x, sb: { ...u.cfg.sb, ...(x.sb ?? {}) } } }) }, patch)

// 1. a kit as it ships, its Dashboard six ways: where the editor opens
await p.goto(base, { waitUntil: 'domcontentloaded' })
// the hint pill is for a person at the keys, not for a clip
await p.addStyleTag({ content: '.peek{display:none!important}' }).catch(() => {})
await p.waitForSelector('.stage__foot', { timeout: 90000 }); await wait(7000)
await p.evaluate(() => document.querySelector('.popcard button')?.click())
await shot(2.4)

// 2. one opened, picked
await p.evaluate(() => [...document.querySelectorAll('.looks__card')].find((c) => /^Soft/.test(c.textContent.trim()))?.click()); await wait(2500); await shot(1.4)
await click('Pick this one'); await wait(2500); await shot(1.4)

// 3. Tune: the colour through five, then their own dark mode
for (const c of ['#2f72b3', '#0f766e', '#c2410c', '#be123c', '#4f46e5']) { await set({ cPrimary: c }); await wait(900); await shot(0.55) }
await set({ sb: { dark: 'dark' } }); await wait(1600); await shot(1.6)
await set({ sb: { dark: 'light' } }); await wait(1200)

// Try it on your own app: their own build, what we found, the knobs along
await click('Try it on your own app'); await wait(1000); await shot(2.0)
await click('Bring a zip'); await wait(400)
await p.setInputFiles('input[type=file][accept*="zip"]', join(root, 'fixtures', 'startbootstrap-sb-admin-2-master.zip'))
await p.waitForSelector('.found__facts', { timeout: 120000 }); await wait(2500)
await p.evaluate(() => document.querySelectorAll('.found__opt input')[1]?.click()); await wait(400); await shot(2.2)
await click('See it six ways'); await wait(7000); await shot(2.2)
await p.evaluate(() => document.querySelector('.ebar__view button[title^="One"]')?.click())
await wait(1500); await shot(1.6)

// the 1:1 check
await p.evaluate(() => [...document.querySelectorAll('.stage__foot .chip, .stage__foot button')].find((x) => /Check 1:1/.test(x.textContent))?.click())
await p.waitForFunction(() => /✓|✗|differences|No differences/i.test(document.querySelector('.verify')?.textContent ?? ''), null, { timeout: 120000 }).catch(() => {})
await wait(800); await shot(2.0)
await p.evaluate(() => document.querySelectorAll('.verify button').forEach((b) => { if (/close/i.test(b.textContent)) b.click() }))

// 4. Take it home
await click('Export'); await wait(2500); await shot(2.6)
await b.close()

// assemble: concat with per-frame durations (the last frame listed twice, as the demuxer wants)
const list = frames.map(([f, d]) => `file '${f}'\nduration ${d}`).join('\n') + `\nfile '${frames.at(-1)[0]}'\n`
writeFileSync(join(tmp, 'list.txt'), list)
const run = (args) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' })
const mp4 = join(tmp, 'clip.mp4')
run(['-f', 'concat', '-safe', '0', '-i', join(tmp, 'list.txt'), '-vf', `scale=${W}:${H}:flags=lanczos,fps=30,format=yuv420p`, '-c:v', 'libx264', '-crf', '24', '-preset', 'slow', '-movflags', '+faststart', mp4])
copyFileSync(mp4, join(root, 'public', 'how-it-works.mp4'))
copyFileSync(mp4, join(root, 'brand', 'marketing', 'launch.mp4'))
// the poster is the six looks: the one frame that says what this is
run(['-i', frames[1][0], '-vf', `scale=${W}:${H}:flags=lanczos`, join(root, 'public', 'how-it-works-poster.png')])
const pal = join(tmp, 'pal.png')
run(['-i', mp4, '-vf', 'fps=10,scale=880:-1:flags=lanczos,palettegen=stats_mode=diff', pal])
run(['-i', mp4, '-i', pal, '-lavfi', 'fps=10,scale=880:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5', join(root, 'brand', 'marketing', 'launch.gif')])
console.log(`${frames.length} frames, ${frames.reduce((s, [, d]) => s + d, 0).toFixed(1)} s`)
