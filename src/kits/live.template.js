/* UISandbox live — the bridge.
 *
 * Put this one line in your app's <head>, then open uisandbox.org, choose
 * "Your running app" and paste the address your app runs on. UISandbox frames
 * your app and this script answers it: which of the nine kits the page runs
 * on, and — when asked — the values of that kit's own variables as your page
 * computes them, so what UISandbox writes for you starts from YOUR app rather
 * than from the kit's defaults.
 *
 * It does nothing else. No network, no storage, no tracking. It reads only the
 * computed values of the CSS custom properties it is asked for by name — never
 * your markup, your text or your data — and only while this page is framed by
 * an allowed origin. It is inert everywhere else. Remove the line when you are
 * done.
 *
 * Built by scripts/live-build.mjs from src/kits/live.template.js, with the kit
 * rules inlined from src/kits/engine/detect.mjs: the same rules decide a build
 * dropped into the sandbox and an app talking to it here. Ported from
 * UIcockpit's live.js (Ideelab/uicockpit dsg/live.js at 37ed9bc). The message
 * names keep their uicockpit: prefix until the cutover renames them in one
 * sweep (MERGE-INTO-UISANDBOX.md, phase 4).
 */
(function () {
  if (window.parent === window) return
  var ALLOW = /^https:\/\/(www\.)?uisandbox\.org$|^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/
  var root = document.documentElement
  var OUR_ATTRS = ['data-theme', 'data-bs-theme', 'data-mantine-color-scheme', 'data-accent-color', 'data-gray-color', 'data-radius', 'data-scaling']
  var OUR_CLASSES = ['dark', 'light', 'dark-theme', 'light-theme']

  function sheet() {
    var s = document.getElementById('uicockpit-live')
    if (!s) { s = document.createElement('style'); s.id = 'uicockpit-live'; (document.head || root).appendChild(s) }
    return s
  }

  /*DETECT*/

  /* The values of the variables asked for, as this page computes them. Only
     custom properties, only by name: a name that is not a custom property is
     not answered. */
  function read(names) {
    var cs = getComputedStyle(root), out = {}
    for (var i = 0; i < (names || []).length && i < 400; i++) {
      var n = String(names[i])
      if (!/^--[\w-]+$/.test(n)) continue
      var v = cs.getPropertyValue(n).trim()
      if (v) out[n] = v
    }
    return out
  }

  function apply(m) {
    sheet().textContent = typeof m.css === 'string' ? m.css : ''
    var i
    for (i = 0; i < OUR_CLASSES.length; i++) root.classList.remove(OUR_CLASSES[i])
    for (i = 0; i < OUR_ATTRS.length; i++) if (!m.keep || m.keep.indexOf(OUR_ATTRS[i]) < 0) root.removeAttribute(OUR_ATTRS[i])
    var rt = m.root || {}
    var classes = rt.classes || []
    for (i = 0; i < classes.length; i++) if (classes[i]) root.classList.add(classes[i])
    var attrs = rt.attrs || {}
    for (var a in attrs) if (Object.prototype.hasOwnProperty.call(attrs, a)) root.setAttribute(a, attrs[a])
    root.style.colorScheme = m.scheme === 'dark' ? 'dark' : 'light'
    var fonts = m.fonts || []
    for (i = 0; i < fonts.length; i++) {
      if (document.querySelector('link[href="' + fonts[i] + '"]')) continue
      var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = fonts[i]
      ;(document.head || root).appendChild(l)
    }
  }

  function hello(origin) {
    parent.postMessage({ type: 'uicockpit:ready', kit: detectKit(document), title: document.title, href: location.href }, origin || '*')
  }

  addEventListener('message', function (e) {
    if (!ALLOW.test(e.origin) || !e.data) return
    if (e.data.type === 'uicockpit:theme') apply(e.data)
    else if (e.data.type === 'uicockpit:hello') hello(e.origin)
    // Answered to the asking origin only, never to '*': these are the app's values.
    else if (e.data.type === 'uicockpit:read') parent.postMessage({ type: 'uicockpit:values', id: e.data.id, values: read(e.data.names) }, e.origin)
  })
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', function () { hello() })
  else hello()
})()
