/**
 * The wrapper a kit needs on <html> to be itself.
 *
 * From build-page.mjs in Ideelab/uicockpit at 37ed9bc, where it lived beside
 * the page builder. It moves here because the kit door needs it and the page
 * builder does not move (the UI becomes UISandbox's in phase 3). Every
 * attribute below was found missing the hard way, so the reasons travel with
 * the table: an attribute without its reason is the first thing a tidy-up
 * removes.
 *
 *   daisyUI   without data-theme, daisyUI's dark theme wins on a dark OS and
 *             the frame shows its factory purple — on a page whose whole claim
 *             is that your values won.
 *   Radix     its own <Theme> sets five attributes and two are load-bearing.
 *             Without data-has-background, its rule
 *               .radix-themes:where([data-has-background='true'])
 *                 { background: var(--color-background) }
 *             never fires, so the page colour was written into the variable
 *             and never painted: the page knob did nothing at all for this
 *             kit. Without data-panel-background, --color-panel resolves to
 *             nothing. Measured against their own playground, which sets all.
 *   Bootstrap and Mantine name their light scheme so it is the one in force,
 *             whatever the visitor's operating system prefers.
 */
export const ROOT = {
  daisyui: ' data-theme="yourkit"',
  bootstrap: ' data-bs-theme="light"',
  radix: ' class="radix-themes light" data-is-root-theme="true" data-has-background="true" data-panel-background="translucent"',
  mantine: ' data-mantine-color-scheme="light"',
}
