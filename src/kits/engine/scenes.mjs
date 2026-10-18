import { render, BINDING_ICONS } from './parts.mjs'

/**
 * THE WALL — written once, rendered by whichever kit is on.
 *
 * Every kit's own site has a page like this: a mosaic of specimens you scroll
 * through to decide whether you like it. Two things are wrong with all of them.
 * You can only ever see ONE kit at a time, and the mosaic is a bag of parts —
 * a button here, a card there — rather than a system you could ship.
 *
 * So this is a mosaic you PAN, left to right, through six boards in the order
 * you actually decide things:
 *
 *   Foundations → what the system is made of, before there are components
 *   Controls    → everything a finger or a keyboard touches
 *   Forms       → those controls doing a job, with real copy
 *   Data        → the screens that carry numbers
 *   Navigation  → how you know where you are
 *   A whole page → all of it at once, with a bar on top and a block at the end
 *
 * A board is a set of COLUMNS and a column is an ordered set of cards, because
 * the arrangement is the design: packing this automatically gives you a wall
 * that is merely full. Widths are in pixels because the pan is horizontal and a
 * column that reflows is a column that moves while you are reading it.
 *
 * A card is data. It contains no classes, no colours and no kit names: the
 * moment a card knows which kit it is in, adding a kit stops being a table.
 */
export const BOARDS = [
  /* ── 1 ─────────────────────────────────────────────────────────────────── */
  {
    id: 'foundations', label: 'Foundations',
    note: 'The values everything else is built from, and what this stack calls each one.',
    cols: [
      { w: 440, cards: [
        { id: 'roles', title: 'Colour roles', panel: true, node: { p: 'stack', gap: 3, kids: [
          { p: 'muted', text: 'Every role, painted by the variable this stack really reads, and named where it has one.' },
          { p: 'swatches', roles: ['brand', 'onBrand', 'page', 'surface', 'ink', 'inkMuted', 'line', 'success', 'warning', 'danger', 'focus'] },
        ] } },
        { id: 'shape', title: 'Corners and borders', panel: true, node: { p: 'shapes' } },
      ] },
      { w: 400, cards: [
        { id: 'type', title: 'Type scale', panel: true, node: { p: 'typespec', rows: [
          { size: 'xl', text: 'Rhythm and hierarchy' },
          { size: 'lg', text: 'A heading that has to carry a whole section' },
          { size: 'md', text: 'Body text is the size everything else is measured against. It should sit comfortably at the width a paragraph really gets.' },
          { size: 'sm', text: 'Small print, captions, the row under a field.' },
        ] } },
        { id: 'depth', title: 'Elevation', panel: true, node: { p: 'stack', gap: 3, kids: [
          { p: 'muted', text: 'How strongly a thing lifts off the page.' },
          { p: 'elevation', levels: ['sm', 'md', 'lg'] },
        ] } },
        { id: 'focusring', title: 'Focus ring', panel: true, node: { p: 'stack', gap: 2, kids: [
          { p: 'muted', text: 'The one specimen that cannot be drawn. Tab into the field to see it.' },
          { p: 'input', placeholder: 'Tab here' },
        ] } },
      ] },
    ],
  },

  /* ── 2 ─────────────────────────────────────────────────────────────────── */
  {
    id: 'controls', label: 'Controls',
    note: 'Everything a finger or a keyboard touches, at the sizes this stack ships.',
    cols: [
      { w: 380, cards: [
        { id: 'buttons', title: 'Buttons', panel: true, node: { p: 'stack', gap: 3, kids: [
          { p: 'row', kids: [
            { p: 'button', tone: 'brand', text: 'Primary' },
            { p: 'button', tone: 'secondary', text: 'Secondary' },
            { p: 'button', tone: 'ghost', text: 'Ghost' },
            { p: 'button', tone: 'danger', text: 'Delete' },
          ] },
          { p: 'divider' },
          { p: 'muted', text: 'Icon buttons, the toolbar case' },
          { p: 'iconrow', items: ['copy', 'info', 'trash-2', 'share', 'archive', 'refresh-cw', 'ellipsis', 'plus'] },
        ] } },
        { id: 'badges', title: 'Status', panel: true, node: { p: 'stack', gap: 3, kids: [
          { p: 'row', kids: [
            { p: 'badge', tone: 'brand', text: 'Under review' },
            { p: 'badge', tone: 'success', text: 'Granted' },
            { p: 'badge', tone: 'warning', text: 'Waiting' },
            { p: 'badge', tone: 'danger', text: 'Refused' },
            { p: 'badge', tone: 'neutral', text: 'Draft' },
          ] },
          { p: 'tabs', items: ['Open', 'Decided', 'Withdrawn'] },
        ] } },
        { id: 'ranges', title: 'Ranges', panel: true, node: { p: 'stack', gap: 3, kids: [
          { p: 'label', text: 'Distance' },
          { p: 'slider', value: 62 },
          { p: 'label', text: 'Uploaded' },
          { p: 'progress', value: 65 },
        ] } },
      ] },
      { w: 370, cards: [
        { id: 'fields', title: 'Fields', panel: true, node: { p: 'stack', gap: 3, kids: [
          { p: 'stack', gap: 1, kids: [{ p: 'label', text: 'Reference' }, { p: 'input', value: '2026-04471' }] },
          { p: 'stack', gap: 1, kids: [{ p: 'label', text: 'Category' }, { p: 'select', options: ['Building work', 'Felling', 'Signage'] }] },
          { p: 'stack', gap: 1, kids: [{ p: 'label', text: 'Anything we should know' }, { p: 'textarea', placeholder: 'Optional' }] },
        ] } },
        { id: 'choices', title: 'Choices', panel: true, node: { p: 'stack', gap: 3, kids: [
          { p: 'checkbox', on: true, text: 'This is my own household' },
          /* and one that is OFF. Every checkbox on this wall used to be ticked,
             so the empty state was never on screen — which is how Radix went out
             with no box around an unticked one for weeks. */
          { p: 'checkbox', on: false, text: 'Send me a copy by post' },
          { p: 'switch', on: true, text: 'Notify me by email' },
          { p: 'divider' },
          { p: 'radio', name: 'send', on: 1, items: ['By post', 'By email', 'Collect in person'] },
        ] } },
      ] },
    ],
  },

  /* ── 3 ─────────────────────────────────────────────────────────────────── */
  {
    id: 'forms', label: 'Forms',
    note: 'The controls doing a job, with the copy a real service would use.',
    cols: [
      { w: 390, cards: [
        { id: 'request', title: 'A form', panel: true, node: { p: 'stack', gap: 3, kids: [
          { p: 'heading', text: 'New request' },
          { p: 'stack', gap: 1, kids: [{ p: 'label', text: 'Reference' }, { p: 'input', value: '2026-04471' }] },
          { p: 'stack', gap: 1, kids: [{ p: 'label', text: 'Category' }, { p: 'select', options: ['Building work', 'Felling', 'Signage'] }] },
          { p: 'stack', gap: 1, kids: [{ p: 'label', text: 'Postcode' }, { p: 'input', placeholder: '3011 AA' }] },
          { p: 'checkbox', on: true, text: 'This is my own household' },
          { p: 'row', between: true, kids: [
            { p: 'button', tone: 'ghost', text: 'Cancel' },
            { p: 'button', tone: 'brand', text: 'Submit' },
          ] },
        ] } },
        { id: 'feedback', title: 'When something happens', panel: false, node: { p: 'stack', gap: 2, kids: [
          { p: 'alert', tone: 'success', text: 'Saved. Your changes are live.' },
          { p: 'alert', tone: 'warning', text: 'Check this. The due date is in the past.' },
          { p: 'alert', tone: 'danger', text: 'Not sent. Two fields are missing.' },
        ] } },
      ] },
      { w: 390, cards: [
        { id: 'report', title: 'A form that asks for prose', panel: true, node: { p: 'stack', gap: 3, kids: [
          { p: 'heading', text: 'Report a problem' },
          { p: 'muted', text: 'Tell us what went wrong and we will pass it on.' },
          { p: 'stack', gap: 1, kids: [{ p: 'label', text: 'What is it about' }, { p: 'select', options: ['A decision', 'A payment', 'Something on this site'] }] },
          { p: 'stack', gap: 1, kids: [{ p: 'label', text: 'What happened' }, { p: 'textarea', placeholder: 'Start with what you were trying to do' }] },
          { p: 'switch', on: true, text: 'Send me a copy' },
          { p: 'button', tone: 'brand', text: 'Send report' },
        ] } },
        { id: 'prefs', title: 'Settings rows', panel: true, node: { p: 'stack', gap: 3, kids: [
          { p: 'heading', text: 'Notifications' },
          { p: 'switch', on: true, text: 'A decision on one of my requests' },
          { p: 'switch', on: true, text: 'A reply from a case worker' },
          { p: 'switch', on: false, text: 'Everything else' },
          { p: 'divider' },
          { p: 'row', between: true, kids: [
            { p: 'button', tone: 'ghost', text: 'Reset' },
            { p: 'button', tone: 'brand', text: 'Save' },
          ] },
        ] } },
      ] },
    ],
  },

  /* ── 4 ─────────────────────────────────────────────────────────────────── */
  {
    id: 'data', label: 'Data',
    note: 'The screens that carry numbers, where a type scale either works or does not.',
    cols: [
      { w: 420, cards: [
        { id: 'traffic', title: 'A chart card', panel: true, node: { p: 'stack', gap: 3, kids: [
          { p: 'heading', text: 'Requests by month' },
          { p: 'muted', text: 'Submitted online against submitted at the desk, last six months.' },
          { p: 'chart', legend: ['Online', 'At the desk'], bars: [
            { label: 'Apr', a: 82, b: 34 }, { label: 'May', a: 96, b: 30 }, { label: 'Jun', a: 74, b: 41 },
            { label: 'Jul', a: 110, b: 28 }, { label: 'Aug', a: 91, b: 33 }, { label: 'Sep', a: 124, b: 22 },
          ] },
          { p: 'button', tone: 'brand', text: 'View the report' },
        ] } },
        { id: 'tiles', title: 'Figures', panel: false, node: { p: 'grid', cols: 2, kids: [
          { p: 'stat', label: 'Open requests', value: '128' },
          { p: 'stat', label: 'Median decision', value: '19 days' },
          { p: 'stat', label: 'Overdue', value: '7' },
          { p: 'stat', label: 'Satisfaction', value: '4.4' },
        ] } },
      ] },
      { w: 440, cards: [
        { id: 'queue', title: 'A table', panel: true, node: { p: 'stack', gap: 3, kids: [
          { p: 'row', between: true, kids: [
            { p: 'heading', text: 'Requests' },
            { p: 'button', tone: 'secondary', text: 'Filter' },
          ] },
          { p: 'table', cols: ['Reference', 'Owner', 'Status', 'Due'], rows: [
            ['2026-04471', 'M. Visser', 'Under review', '28 Sep'],
            ['2026-03918', 'K. Boone', 'Granted', 'None'],
            ['2026-03744', 'A. Yildiz', 'Refused', 'None'],
            ['2026-03502', 'T. Okonkwo', 'Under review', '4 Oct'],
          ] },
        ] } },
        { id: 'goals', title: 'Progress', panel: true, node: { p: 'stack', gap: 3, kids: [
          { p: 'stack', gap: 1, kids: [{ p: 'label', text: 'Decided within the term' }, { p: 'progress', value: 78 }] },
          { p: 'stack', gap: 1, kids: [{ p: 'label', text: 'Answered within two days' }, { p: 'progress', value: 54 }] },
          { p: 'stack', gap: 1, kids: [{ p: 'label', text: 'Objections upheld' }, { p: 'progress', value: 12 }] },
        ] } },
      ] },
      { w: 400, cards: [
        { id: 'activity', title: 'A list', panel: true, node: { p: 'stack', gap: 3, kids: [
          { p: 'heading', text: 'Recent activity' },
          { p: 'list', rows: [
            { icon: 'file-text', title: 'Permit granted', sub: '2026-03918 · K. Boone', meta: 'Today' },
            { icon: 'credit-card', title: 'Fee paid', sub: '2026-04471 · online', meta: 'Yesterday' },
            { icon: 'shopping-cart', title: 'Bulky waste booked', sub: 'Kerkstraat 12', meta: '12 Sep' },
            { icon: 'car', title: 'Parking permit renewed', sub: 'Zone C · resident', meta: '11 Sep' },
            { icon: 'coffee', title: 'Terrace licence expired', sub: 'Havenplein 4', meta: '10 Sep' },
          ] },
        ] } },
        { id: 'env', title: 'Key and value', panel: true, node: { p: 'stack', gap: 3, kids: [
          { p: 'heading', text: 'Connections' },
          { p: 'kv', rows: [
            ['REGISTER_URL', 'api.havenstad.example'],
            ['PAYMENT_KEY', '••••••••'],
            ['NOTIFY_FROM', 'no-reply@havenstad'],
          ] },
        ] } },
      ] },
    ],
  },

  /* ── 5 ─────────────────────────────────────────────────────────────────── */
  {
    id: 'navigation', label: 'Navigation',
    note: 'How someone knows where they are: the parts every kit shows last, or not at all.',
    cols: [
      { w: 640, cards: [
        { id: 'topbar', title: 'A bar across the top', panel: false, node: { p: 'navbar', brand: 'Havenstad',
          items: ['Requests', 'Decisions', 'Reports'],
          kids: [{ p: 'button', tone: 'secondary', text: 'Sign in' }, { p: 'button', tone: 'brand', text: 'Start a request' }] } },
        { id: 'trail', title: 'Where you are', panel: true, node: { p: 'stack', gap: 3, kids: [
          { p: 'breadcrumb', items: ['Home', 'Payments', 'Direct debits'] },
          { p: 'divider' },
          { p: 'tabs', items: ['Overview', 'Documents', 'History'] },
        ] } },
        { id: 'team', title: 'Who is on it', panel: true, node: { p: 'row', kids: [
          { p: 'avatar', text: 'MV' }, { p: 'avatar', text: 'KB' }, { p: 'avatar', text: 'AY' },
          { p: 'muted', text: 'and six others on this case' },
        ] } },
        { id: 'end', title: 'The block at the end', panel: false, node: { p: 'footer',
          note: '2026 Gemeente Havenstad · Accessibility statement · Privacy',
          groups: [
            { title: 'Arrange', items: ['Requests', 'Permits', 'Objections'] },
            { title: 'Find', items: ['Opening hours', 'Locations', 'Contact'] },
            { title: 'About', items: ['Council', 'Decisions', 'Vacancies'] },
          ] } },
      ] },
      { w: 300, cards: [
        { id: 'rail', title: 'A sidebar', panel: true, node: { p: 'sidenav', groups: [
          { title: 'Casework', items: [
            { icon: 'layout-dashboard', text: 'Overview', on: true },
            { icon: 'inbox', text: 'Requests', count: '24' },
            { icon: 'arrow-left-right', text: 'Transfers' },
            { icon: 'trending-up', text: 'Trends' },
          ] },
          { title: 'Account', items: [
            { icon: 'user', text: 'Profile' },
            { icon: 'bell', text: 'Notifications' },
            { icon: 'shield', text: 'Security' },
            { icon: 'life-buoy', text: 'Help' },
          ] },
        ] } },
        { id: 'actions', title: 'A menu, open', panel: true, node: { p: 'menu',
          icon: 'chevron-down', trigger: 'Actions', label: 'This request',
          items: ['Assign to someone', 'Ask for documents', 'Put on hold'],
          danger: 'Withdraw' } },
      ] },
      { w: 340, cards: [
        { id: 'nothing', title: 'When there is nothing yet', panel: true, node: { p: 'empty',
          icon: 'inbox', title: 'No requests yet',
          text: 'When someone submits a request it lands here, with the newest at the top.',
          kids: [{ p: 'button', tone: 'brand', text: 'Start a request' }] } },
        { id: 'promo', title: 'A card with a picture', panel: false, node: { p: 'mediacard',
          title: 'Parking permits', text: 'For residents, visitors and trades. Renewals open six weeks ahead.', action: 'Read on' } },
      ] },
    ],
  },

  /* ── 6 ─────────────────────────────────────────────────────────────────── */
  {
    id: 'page', label: 'A whole page',
    note: 'The two things every page has and no component library talks about: the bar on top and the block at the end.',
    cols: [
      { w: 1080, cards: [
        { id: 'site', title: 'A whole page', panel: false, node: { p: 'stack', gap: 0, kids: [
          { p: 'navbar', brand: 'Havenstad', items: ['Requests', 'Decisions', 'Reports'],
            kids: [{ p: 'button', tone: 'secondary', text: 'Sign in' }, { p: 'button', tone: 'brand', text: 'Start a request' }] },
          { p: 'stack', gap: 4, pad: true, kids: [
            { p: 'heading', level: 2, text: 'What you can arrange here' },
            { p: 'text', text: 'Most of it can be done online. Where a form asks for something on paper we say so before you start, and you can always finish it at the desk.' },
            { p: 'grid', cols: 3, kids: [
              { p: 'mediacard', title: 'Building work', text: 'Permission to build, convert or demolish, and what the neighbours are told.', action: 'Read on' },
              { p: 'mediacard', title: 'Waste and recycling', text: 'Collection days, bulky items, and where the containers are.', action: 'Read on' },
              { p: 'mediacard', title: 'Parking permits', text: 'For residents, visitors and trades. Renewals open six weeks ahead.', action: 'Read on' },
            ] },
          ] },
          { p: 'footer', note: '2026 Gemeente Havenstad · Accessibility statement · Privacy',
            groups: [
              { title: 'Arrange', items: ['Requests', 'Permits', 'Objections'] },
              { title: 'Find', items: ['Opening hours', 'Locations', 'Contact'] },
              { title: 'About', items: ['Council', 'Decisions', 'Vacancies'] },
            ] },
        ] } },
      ] },
    ],
  },
]

/* ────────────────────────────────────────────────────────────────────────────
 * THE SIX SCREENS — enough to feel a kit, before anybody pans a wall.
 *
 * The wall answers "what is in this system"; these answer the question that
 * comes first: "what would my app feel like". Six, because that is what it
 * takes and no more — the kit on one sheet, an overview, the working screen,
 * a settings form, one flow moment, and the overview again in the kit's own
 * dark. Every screen is composed from the SAME part vocabulary the boards
 * use, so the meters, the sweep and the tests cover a screen the same way
 * they cover a card — a screen is boards data, not a second renderer.
 *
 * `shot: true` keeps them out of the pan strip (the grid is their room),
 * `caps: true` keeps captions only where they are labels (the kit sheet),
 * and `dark: true` marks the twin the page shows in the kit's own dark.
 */
const overviewScreen = () => ({ p: 'stack', gap: 3, kids: [
  { p: 'row', between: true, kids: [
    { p: 'heading', level: 2, text: 'Casework' },
    { p: 'row', kids: [
      { p: 'button', tone: 'secondary', text: 'Export' },
      { p: 'button', tone: 'brand', text: 'New request' },
    ] },
  ] },
  { p: 'grid', cols: 4, kids: [
    { p: 'stat', label: 'Open requests', value: '128' },
    { p: 'stat', label: 'Median decision', value: '19 days' },
    { p: 'stat', label: 'Overdue', value: '7' },
    { p: 'stat', label: 'Satisfaction', value: '4.4' },
  ] },
  { p: 'grid', cols: 2, kids: [
    { p: 'panel', kids: [{ p: 'stack', gap: 3, kids: [
      { p: 'heading', text: 'Requests by month' },
      { p: 'chart', legend: ['Online', 'At the desk'], bars: [
        { label: 'Apr', a: 82, b: 34 }, { label: 'May', a: 96, b: 30 }, { label: 'Jun', a: 74, b: 41 },
        { label: 'Jul', a: 110, b: 28 }, { label: 'Aug', a: 91, b: 33 }, { label: 'Sep', a: 124, b: 22 },
      ] },
    ] }] },
    { p: 'panel', kids: [{ p: 'stack', gap: 3, kids: [
      { p: 'heading', text: 'Recent activity' },
      { p: 'list', rows: [
        { icon: 'file-text', title: 'Permit granted', sub: '2026-03918 · K. Boone', meta: 'Today' },
        { icon: 'credit-card', title: 'Fee paid', sub: '2026-04471 · online', meta: 'Yesterday' },
        { icon: 'car', title: 'Parking permit renewed', sub: 'Zone C · resident', meta: '11 Sep' },
      ] },
    ] }] },
  ] },
] })

const screenRail = () => ({ p: 'sidenav', groups: [
  { title: 'Casework', items: [
    { icon: 'layout-dashboard', text: 'Overview', on: true },
    { icon: 'inbox', text: 'Requests', count: '24' },
    { icon: 'arrow-left-right', text: 'Transfers' },
    { icon: 'trending-up', text: 'Trends' },
  ] },
  { title: 'Account', items: [
    { icon: 'user', text: 'Profile' },
    { icon: 'bell', text: 'Notifications' },
    { icon: 'shield', text: 'Security' },
  ] },
] })

export const SCREENS = [
  {
    id: 'sheet', label: 'The kit', shot: true, caps: true,
    note: 'Every control on one sheet, in your values.',
    /* the swatch and shape specimens render at the SIZE Foundations proved:
       narrower columns pushed their chips under the sweep's 32px visibility
       gate and reported faint chips the strip never ships */
    cols: [
      { w: 440, cards: [
        { id: 'shot-buttons', title: 'Buttons', panel: true, node: { p: 'stack', gap: 3, kids: [
          { p: 'row', kids: [
            { p: 'button', tone: 'brand', text: 'Publish' },
            { p: 'button', tone: 'secondary', text: 'Preview' },
            { p: 'button', tone: 'ghost', text: 'Later' },
            { p: 'button', tone: 'danger', text: 'Remove' },
          ] },
          { p: 'divider' },
          { p: 'iconrow', items: ['copy', 'info', 'trash-2', 'share', 'archive', 'plus'] },
        ] } },
        { id: 'shot-status', title: 'Status', panel: true, node: { p: 'stack', gap: 3, kids: [
          { p: 'row', kids: [
            { p: 'badge', tone: 'brand', text: 'Under review' },
            { p: 'badge', tone: 'success', text: 'Granted' },
            { p: 'badge', tone: 'warning', text: 'Waiting' },
            { p: 'badge', tone: 'danger', text: 'Refused' },
          ] },
          { p: 'tabs', items: ['Open', 'Decided', 'Withdrawn'] },
        ] } },
        { id: 'shot-roles', title: 'Colour roles', panel: true, node: { p: 'swatches',
          roles: ['brand', 'onBrand', 'page', 'surface', 'ink', 'inkMuted', 'line', 'success', 'warning', 'danger', 'focus'] } },
      ] },
      { w: 380, cards: [
        { id: 'shot-fields', title: 'Fields', panel: true, node: { p: 'stack', gap: 3, kids: [
          { p: 'stack', gap: 1, kids: [{ p: 'label', text: 'Reference' }, { p: 'input', value: '2026-04471' }] },
          { p: 'stack', gap: 1, kids: [{ p: 'label', text: 'Category' }, { p: 'select', options: ['Building work', 'Felling', 'Signage'] }] },
          { p: 'stack', gap: 1, kids: [{ p: 'label', text: 'Anything we should know' }, { p: 'textarea', placeholder: 'Optional' }] },
        ] } },
        { id: 'shot-choices', title: 'Choices', panel: true, node: { p: 'stack', gap: 3, kids: [
          { p: 'checkbox', on: true, text: 'This is my own household' },
          { p: 'checkbox', on: false, text: 'Send me a copy by post' },
          { p: 'switch', on: true, text: 'Notify me by email' },
          { p: 'divider' },
          { p: 'radio', name: 'shotsend', on: 1, items: ['By post', 'By email'] },
        ] } },
        { id: 'shot-ranges', title: 'Ranges', panel: true, node: { p: 'stack', gap: 3, kids: [
          { p: 'label', text: 'Distance' },
          { p: 'slider', value: 62 },
          { p: 'label', text: 'Uploaded' },
          { p: 'progress', value: 65 },
        ] } },
      ] },
      { w: 400, cards: [
        { id: 'shot-type', title: 'Type', panel: true, node: { p: 'typespec', rows: [
          { size: 'lg', text: 'A heading that carries a section' },
          { size: 'md', text: 'Body text is the size everything else is measured against.' },
          { size: 'sm', text: 'Small print and captions.' },
        ] } },
        { id: 'shot-notices', title: 'Notices', panel: false, node: { p: 'stack', gap: 2, kids: [
          { p: 'alert', tone: 'success', text: 'Saved. Your changes are live.' },
          { p: 'alert', tone: 'warning', text: 'Check this. The due date is in the past.' },
          { p: 'alert', tone: 'danger', text: 'Not sent. Two fields are missing.' },
        ] } },
        { id: 'shot-menu', title: 'A menu, open', panel: true, node: { p: 'menu',
          icon: 'chevron-down', trigger: 'Actions', label: 'This request',
          items: ['Assign to someone', 'Ask for documents'], danger: 'Withdraw' } },
        { id: 'shot-shape', title: 'Shape', panel: true, node: { p: 'shapes' } },
      ] },
    ],
  },
  {
    id: 'overview', label: 'An overview', shot: true,
    note: 'The screen a tool opens on: numbers, a chart, what just happened.',
    cols: [
      { w: 224, cards: [{ id: 'shot-ov-rail', title: '', panel: true, node: screenRail() }] },
      { w: 856, cards: [{ id: 'shot-ov-main', title: '', panel: false, node: overviewScreen() }] },
    ],
  },
  {
    id: 'work', label: 'List and detail', shot: true,
    note: 'The screen somebody lives in: a queue on the left, one case on the right.',
    cols: [
      { w: 620, cards: [{ id: 'shot-work-list', title: '', panel: true, node: { p: 'stack', gap: 3, kids: [
        { p: 'row', between: true, kids: [
          { p: 'heading', text: 'Requests' },
          { p: 'row', kids: [
            { p: 'button', tone: 'secondary', text: 'Filter' },
            { p: 'button', tone: 'brand', text: 'New' },
          ] },
        ] },
        { p: 'table', cols: ['Reference', 'Owner', 'Status', 'Due'], rows: [
          ['2026-04471', 'M. Visser', 'Under review', '28 Sep'],
          ['2026-03918', 'K. Boone', 'Granted', 'None'],
          ['2026-03744', 'A. Yildiz', 'Refused', 'None'],
          ['2026-03502', 'T. Okonkwo', 'Under review', '4 Oct'],
          ['2026-03477', 'J. de Wit', 'Waiting', '11 Oct'],
        ] },
      ] } }] },
      { w: 420, cards: [{ id: 'shot-work-case', title: '', panel: true, node: { p: 'stack', gap: 3, kids: [
        { p: 'row', between: true, kids: [
          { p: 'heading', text: '2026-04471' },
          { p: 'badge', tone: 'brand', text: 'Under review' },
        ] },
        { p: 'kv', rows: [
          ['Applicant', 'M. Visser'],
          ['Category', 'Building work'],
          ['Received', '2 Sep 2026'],
          ['Case worker', 'K. Boone'],
        ] },
        { p: 'divider' },
        { p: 'stack', gap: 1, kids: [{ p: 'label', text: 'Term used' }, { p: 'progress', value: 64 }] },
        { p: 'row', between: true, kids: [
          { p: 'button', tone: 'ghost', text: 'Put on hold' },
          { p: 'button', tone: 'brand', text: 'Decide' },
        ] },
      ] } }] },
    ],
  },
  {
    id: 'settings', label: 'A form', shot: true,
    note: 'Settings, the form everybody ships: fields, switches, one save.',
    cols: [
      { w: 560, cards: [{ id: 'shot-set-form', title: '', panel: true, node: { p: 'stack', gap: 3, kids: [
        { p: 'heading', text: 'Settings' },
        { p: 'tabs', items: ['Profile', 'Notifications', 'Security'] },
        { p: 'stack', gap: 1, kids: [{ p: 'label', text: 'Name' }, { p: 'input', value: 'M. Visser' }] },
        { p: 'stack', gap: 1, kids: [{ p: 'label', text: 'Email' }, { p: 'input', value: 'm.visser@havenstad.example' }] },
        { p: 'stack', gap: 1, kids: [{ p: 'label', text: 'Time zone' }, { p: 'select', options: ['Amsterdam', 'Brussels', 'Lisbon'] }] },
        { p: 'divider' },
        { p: 'switch', on: true, text: 'A decision on one of my requests' },
        { p: 'switch', on: false, text: 'Everything else' },
        { p: 'row', between: true, kids: [
          { p: 'button', tone: 'ghost', text: 'Reset' },
          { p: 'button', tone: 'brand', text: 'Save' },
        ] },
      ] } }] },
      { w: 400, cards: [{ id: 'shot-set-side', title: '', panel: false, node: { p: 'stack', gap: 3, kids: [
        { p: 'alert', tone: 'success', text: 'Saved. Your changes are live.' },
        { p: 'panel', kids: [{ p: 'stack', gap: 3, kids: [
          { p: 'heading', text: 'Sessions' },
          { p: 'list', rows: [
            { icon: 'shield', title: 'This device', sub: 'Rotterdam · now', meta: 'Active' },
            { icon: 'user', title: 'Work laptop', sub: 'Last seen 12 Sep', meta: 'Sign out' },
          ] },
        ] }] },
      ] } }] },
    ],
  },
  {
    id: 'flow', label: 'A flow moment', shot: true,
    note: 'The step before the button: a summary, one confirmation, and send.',
    cols: [
      { w: 620, cards: [{ id: 'shot-flow-main', title: '', panel: false, node: { p: 'stack', gap: 3, kids: [
        { p: 'breadcrumb', items: ['Requests', 'New request', 'Check and send'] },
        { p: 'panel', kids: [{ p: 'stack', gap: 3, kids: [
          { p: 'heading', text: 'Check and send' },
          { p: 'muted', text: 'Step 3 of 3. Nothing goes out until you send it.' },
          { p: 'kv', rows: [
            ['Category', 'Building work'],
            ['Address', 'Kerkstraat 12'],
            ['Starts', '1 Nov 2026'],
          ] },
          { p: 'checkbox', on: false, text: 'I filled this in truthfully' },
          { p: 'row', between: true, kids: [
            { p: 'button', tone: 'ghost', text: 'Back' },
            { p: 'button', tone: 'brand', text: 'Send request' },
          ] },
        ] }] },
      ] } }] },
      { w: 380, cards: [{ id: 'shot-flow-side', title: '', panel: true, node: { p: 'stack', gap: 3, kids: [
        { p: 'heading', text: 'What happens next' },
        { p: 'list', rows: [
          { icon: 'file-text', title: 'We confirm by email', sub: 'Straight away', meta: '1' },
          { icon: 'inbox', title: 'A case worker picks it up', sub: 'Within two days', meta: '2' },
          { icon: 'bell', title: 'You hear the decision', sub: 'Within eight weeks', meta: '3' },
        ] },
        { p: 'alert', tone: 'warning', text: 'Building work may also need the neighbours told.' },
      ] } }] },
    ],
  },
  {
    id: 'twin', label: 'The same, dark', shot: true, dark: true,
    note: 'The overview again, in this kit\'s own dark values. Not ours.',
    cols: [
      { w: 224, cards: [{ id: 'shot-tw-rail', title: '', panel: true, node: screenRail() }] },
      { w: 856, cards: [{ id: 'shot-tw-main', title: '', panel: false, node: overviewScreen() }] },
    ],
  },
]

/**
 * A card as it is really rendered.
 *
 * `panel: true` means the card sits in the kit's OWN card component — which is
 * what makes the mosaic look like their site rather than like ours. It is a
 * flag on the card and not markup in the card, so the data stays readable, and
 * this one function is what everything downstream renders.
 */
export const nodeOf = (card) => (card.panel ? { p: 'panel', kids: [card.node] } : card.node)

/**
 * Every card on the wall, flat and in reading order, already wrapped.
 *
 * The meters count classes over the whole wall and the tests render each card
 * in every kit; neither of them cares which column a card sits in. Derived, so
 * a card can never be on the wall and missing from the count — and counted on
 * exactly the markup the wall shows, not on an unwrapped version of it.
 */
export const SCENES = [...BOARDS, ...SCREENS].flatMap((b) => b.cols.flatMap((c) => c.cards.map((card) =>
  ({ ...card, board: b.id, node: nodeOf(card) }))))

/**
 * Every icon a card names, walked out of the cards themselves.
 *
 * The build reads exactly these out of lucide and hands them to the bindings,
 * and lucide throws on a name it does not have. So an icon can be wrong at
 * build time or not at all — never a blank square on the wall, which is how a
 * missing glyph used to ship.
 */
export const ICON_NAMES = (() => {
  const out = new Set(BINDING_ICONS)
  const walk = (n) => {
    if (!n || typeof n !== 'object') return
    if (n.icon) out.add(n.icon)
    if (n.p === 'iconrow') for (const i of n.items ?? []) out.add(i)
    for (const k of ['kids', 'items', 'groups', 'rows']) for (const c of Array.isArray(n[k]) ? n[k] : []) walk(c)
  }
  SCENES.forEach((c) => walk(c.node))
  return [...out].sort()
})()

/* The wall carries a script of its own — the pan — and this module is INLINED
 * into the page's own script block. A literal closing tag anywhere in this
 * source ends that block where it stands and the rest of the page parses as
 * HTML: a blank tool, a heap of SVG errors, and nothing that says why. So the
 * tag is assembled and never written. */
const CLOSE = '</' + 'script>'

/**
 * The wall as JSON, safe to write INTO a script tag.
 *
 * The escape goes on the JSON TEXT, not on the value: escaping the value first
 * makes JSON.stringify double the backslash and what reaches the markup is a
 * literal backslash-slash rather than a closing tag. Both build scripts write
 * the wall into a page, so both need this and neither should have its own.
 */
export const safeJson = (value) => JSON.stringify(value).split('</scr' + 'ipt').join('<\\/scr' + 'ipt')

/**
 * THE WALL FOR ONE KIT, as a strip you pan.
 *
 * One implementation: the page, the quick preview and the hero shot all render
 * this, so what you look at while turning a knob is the arrangement the meters
 * counted. Everything of OURS in this document is four class names and a
 * hairline — the kits are the only things on the page allowed to have a look.
 */
export const wallMarkup = (bind, boards = BOARDS) => `<main id="strip">${boards.map((b) =>
  `<section class="board" id="b_${b.id}" data-board="${b.id}"${b.shot ? ' data-shot' : ''}${b.dark ? ' data-screen-dark' : ''}${b.caps ? '' : b.shot ? ' data-nocaps' : ''}>
    <header class="board__top"><h2 class="board__name">${b.label}</h2><p class="board__note">${b.note}</p></header>
    <div class="board__cols">${b.shot ? '<div class="shotbox">' : ''}${b.cols.map((c) => `<div class="col" style="width:${c.w}px">${c.cards.map((card) =>
      `<figure class="card" data-card="${card.id}"><figcaption class="cap">${card.title}</figcaption>${render(nodeOf(card), bind)}</figure>`).join('')}</div>`).join('')}${b.shot ? '</div>' : ''}</div>
  </section>`).join('')}</main>
<style>/* NO font-family here. The wrapper setting one hard-coded our chrome over
   every kit's own typography, so the font knobs moved the card and nothing
   else — the kit's stylesheet decides what this page is set in. */
*,*::before,*::after{box-sizing:border-box}
html,body{height:100%}
body{margin:0;overflow:hidden}
#strip{height:100%;display:flex;align-items:stretch;overflow:auto;scroll-snap-type:x proximity;overscroll-behavior-x:contain;cursor:grab}
/* ON GLASS the strip stops being a desk you pan and becomes a deck you swipe:
   every board is exactly one screen wide and snap is mandatory, the vertical
   axis lives INSIDE the board, and overscroll stays contained so a swipe on
   the strip never drags the page underneath in two directions at once. */
@media (max-width:560px){
  #strip{scroll-snap-type:x mandatory;overscroll-behavior:contain;overflow-y:hidden}
  .board{width:100vw;min-width:100vw;box-sizing:border-box;padding:16px 16px 20px;
    overflow-y:auto;overscroll-behavior:contain}
  .board__cols{flex-direction:column;align-items:stretch;gap:16px}
}
#strip.pan{cursor:grabbing;user-select:none}
.board{flex:none;display:flex;flex-direction:column;gap:16px;padding:22px 26px;scroll-snap-align:start;border-inline-end:1px solid rgb(128 128 128 / .16)}
.board:last-child{border-inline-end:0}
.board__top{display:flex;flex-direction:column;gap:3px;max-width:62ch}
.board__name{margin:0;font-size:13px;font-weight:650;letter-spacing:.01em;opacity:.9;line-height:1.2}
.board__note{margin:0;font-size:11.5px;line-height:1.45;opacity:.5}
.board__cols{flex:1;min-height:0;display:flex;gap:20px;align-items:flex-start}
.col{flex:none;display:flex;flex-direction:column;gap:20px;min-width:0}
.card{margin:0;display:flex;flex-direction:column;gap:8px;cursor:auto}
.cap{margin:0;font-size:10px;letter-spacing:.1em;text-transform:uppercase;opacity:.42;font-weight:600}

/* ── ONE CARD, ACROSS EVERY FRAME AT ONCE ─────────────────────────────────
 * The compare grid asks six frames to show the SAME card and hide the rest.
 * That is a request from outside: the wall never decides what to hide — it is
 * a strip you pan, and it stays one. Both attributes are set by whoever is
 * holding the frame, and with neither of them present nothing here applies.
 *
 * data-pick   this frame is being compared, so a card can be chosen
 * data-solo   one card is chosen; it carries data-solo too */
/* BY ATTRIBUTE AND BY PATH, NEVER BY CLASS NAME.
 * .card is this wall's own class AND daisyUI's component class AND
 * Bootstrap's — so a rule hiding every .card without data-solo reached inside
 * the one card it meant to keep and hid the daisyUI card in it. Two of the six
 * panes came up as a caption over nothing. .col is Bootstrap's grid class for
 * the same reason. Everything below is addressed by data-card, which only this
 * file writes, or by a path from the strip, which only this file builds.
 * (And no backticks in here: the whole block is a template literal. Sixth.) */
/* A WALL SOMEBODY IS ONLY LOOKING AT.
 * The strip is a thing you pan, and its scrollbars say so — which is right in
 * the tool and wrong in a hero, where two bars around the one picture the page
 * is built on read as a component that overflowed. The bars go, the panning
 * stays: this hides the furniture, it does not take the movement away. */
/* THE STRIP'S OWN FURNITURE CARRIES ITS OWN LETTER. The captions and board
 * names are ours, not the kit's — and Ant Design, alone of the eight, sets no
 * global body font, so ours fell back to the browser's Times inside its frame.
 * Inheritance still lets every kit that styles text win on its own content. */
#strip{font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}
html[data-quiet] #strip{scrollbar-width:none;-ms-overflow-style:none}
/* THE QUIET FRAME IS A BOUQUET, NOT A STRIP. On the homepage the shot is one
   board filling the whole width, so the pan-strip's fixed columns would leave
   the right half empty on a wide screen. The column wrappers dissolve and the
   cards flow into as many masonry columns as the width affords. */
html[data-quiet] #strip{display:block;height:auto;overflow:visible;columns:330px;column-gap:20px;padding:26px;cursor:default}
html[data-quiet] .board,html[data-quiet] .board__cols,html[data-quiet] .board__cols .col{display:contents}
html[data-quiet] .board__top{break-inside:avoid;margin:6px 0 14px}
html[data-quiet] .card{break-inside:avoid;margin:0 0 20px;width:auto}
html[data-quiet] #strip::-webkit-scrollbar{width:0;height:0}
html[data-quiet] #strip{cursor:default}
/* and it starts lower, because a quiet wall is being used as a picture that
 * fades in at its top edge. At the board's own 22px the fade landed across
 * the section heading and half-erased it, which reads as a rendering fault
 * rather than as a picture settling into the ground. Below the fade the
 * heading arrives whole. */
html[data-quiet] #strip > .board{padding-top:66px}

/* ── THE SIX SCREENS, AS A GRID ────────────────────────────────────────────
 * A screen board is not a stop on the strip: the strip hides it, and the grid
 * mode (data-shots on the html, set by whoever holds the frame) hides the
 * strip's boards and lays the screens out as scaled cells instead. The cells
 * scale by measurement, not by a constant: the script below reads each
 * screen's natural size and writes the factor into --s, so a kit whose
 * controls run taller simply gets a taller cell. */
#strip > .board[data-shot]{display:none}
html[data-shots] #strip{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));
  gap:18px;padding:18px 20px;align-content:start;overflow:auto;overflow-x:hidden;cursor:default;scroll-snap-type:none}
/* ON GLASS the 340px floor is wider than the glass: one fluid column, or the
   grid hands the phone the sideways scroll the strip was cured of */
@media (max-width:560px){
  html[data-shots] #strip{grid-template-columns:minmax(0,1fr);gap:14px;padding:12px 14px}
}
html[data-shots] #strip > .board{display:none}
html[data-shots] #strip > .board[data-shot]{display:flex;flex-direction:column;gap:7px;border:0;padding:0;
  width:auto;min-width:0;scroll-snap-align:none}
html[data-shots] .board[data-shot] .board__top{max-width:none}
html[data-shots] .board[data-shot] .board__note{display:none}
/* the window the screen scales inside: height is written by the script as
   natural height times the factor, so nothing is cropped and nothing floats */
html[data-shots] .board[data-shot] .board__cols{display:block;flex:none;overflow:hidden;
  border:1px solid rgb(128 128 128 / .22);border-radius:8px;height:calc(var(--sh,760) * var(--s,.3) * 1px)}
html[data-shots] .board[data-shot] .board__cols > .shotbox{display:flex;gap:20px;align-items:flex-start;
  padding:20px;width:max-content;transform:scale(var(--s,.3));transform-origin:0 0}
html[data-shots] [data-nocaps] .cap{display:none}
/* the dark twin names why it cannot, on the kits whose dark is a media query,
   an algorithm, or absent — set as an attribute by the page, read here */
html[data-shots] .board[data-dark-na] .board__cols{position:relative}
html[data-shots] .board[data-dark-na] .board__cols::after{content:attr(data-dark-na);position:absolute;
  inset:auto 8px 8px 8px;font-size:11px;line-height:1.4;padding:6px 9px;border-radius:6px;
  background:rgb(20 20 22 / .82);color:rgb(240 240 244 / .95)}
/* ── EXPOSE: click a screen, get the screen ───────────────────────────────
 * In the grid a screen is a picture (a third of its size: its controls are
 * not targets, so they do not pretend to be). Click it and it takes the room
 * at working size, controls live; click its margin, or Escape, to put it
 * back. The attribute lives on the html so the parent page never has to know. */
html[data-shots]:not([data-shot-solo]) .board[data-shot]{cursor:zoom-in}
html[data-shots]:not([data-shot-solo]) .board[data-shot] .shotbox{pointer-events:none}
html[data-shots][data-shot-solo] #strip{display:block}
html[data-shots][data-shot-solo] #strip > .board[data-shot]{display:none}
html[data-shots][data-shot-solo] #strip > .board.shotsolo{display:flex;cursor:zoom-out}
html[data-shots][data-shot-solo] .board.shotsolo .board__note{display:block}
html[data-shots][data-shot-solo] .board.shotsolo .board__note::after{content:' · Click the margin or press Escape for all six.'}
/* ── THE AUDIT SEES BOTH ROOMS. The sweep measures computed colours, and an
 * element with no box has none: in grid view the strip's boards are hidden
 * and in strip view the screens are. The audit sets data-audit on the html
 * and everything lays out at natural size at once — these come LAST so they
 * win every earlier display rule at equal specificity. */
html[data-audit] #strip{display:flex;height:auto;overflow:visible;align-items:flex-start}
/* natural height, or flex-shrink quietly flattens a tall screen's cards and
   the meter reports chips the real views never show that small */
html[data-audit] #strip > .board{display:flex;height:auto}
html[data-audit] #strip > .board[data-shot]{display:flex;width:auto;min-width:0}
html[data-audit] .board[data-shot] .board__cols{display:block;height:auto;overflow:visible;border:0}
/* the SAME selector depth as the grid rule it undoes, or it loses the
   specificity tie and the scale stays on during measurement */
html[data-audit] .board[data-shot] .board__cols > .shotbox{transform:none;pointer-events:auto}
html[data-pick] [data-card]{cursor:zoom-in}
html[data-pick] [data-card]:hover{outline:1px solid rgb(128 128 128 / .3);outline-offset:7px;border-radius:2px}
html[data-solo] [data-card]{cursor:zoom-out}
html[data-solo] #strip > .board > .board__top{display:none}
html[data-solo] #strip > .board{border-inline-end:0;padding:14px 16px}
html[data-solo] #strip [data-card]:not([data-solo]){display:none}
html[data-solo] #strip > .board > .board__cols > .col:not(:has(> [data-solo])){display:none}
html[data-solo] #strip > .board:not(:has([data-card][data-solo])){display:none}</style>
<script>(function(){
  var m=document.getElementById('strip')
  /* A mouse has one wheel and this wall runs the other way, so a vertical wheel
     pans — but only while there is nothing to scroll vertically, or a short
     window would trap the bottom of a column off screen. */
  m.addEventListener('wheel',function(e){
    if(m.scrollHeight>m.clientHeight+2)return
    if(Math.abs(e.deltaY)<=Math.abs(e.deltaX))return
    m.scrollLeft+=e.deltaY; e.preventDefault()
  },{passive:false})
  /* and drag, the way a map does — never starting on something you can operate */
  var d=null
  m.addEventListener('pointerdown',function(e){
    if(e.button!==0)return
    if(e.target.closest('input,select,textarea,button,a,label,summary,[role=radio],[role=checkbox],[role=slider]'))return
    d={x:e.clientX,l:m.scrollLeft}; m.classList.add('pan')
  })
  m.addEventListener('pointermove',function(e){ if(d)m.scrollLeft=d.l-(e.clientX-d.x) })
  addEventListener('pointerup',function(){ d=null; m.classList.remove('pan') })

  /* ── AND THE WALL BEHAVES ───────────────────────────────────────────────
   * Four of these kits keep a control's state in ATTRIBUTES and CLASSES
   * rather than in a pseudo-class, because their real components are React
   * and React writes them. Markup on its own writes nothing back, so a
   * switch did not switch, a tab did not move and a slider did not drag —
   * which are the first three things anybody tries.
   *
   * Nothing below decides how a kit should behave. Every rule reads what
   * that kit ALREADY WROTE for the two states it rendered side by side and
   * moves the difference across. The kit whose chosen tab differs by a
   * class gets its class moved; the one that differs by an attribute gets
   * its attribute moved; the one that writes a percentage into a calc()
   * gets a new number inside the same calc(). None of those shapes is one
   * we picked, and a kit we have never seen would work the same way. */

  /* A LINK TO NOWHERE IS STILL A LINK.
     Every kit's nav, breadcrumb and menu is built from anchors, and a wall
     writes href="#" because there is nowhere to go. Inside a srcdoc frame
     that is not inert: the frame resolves it against the PARENT page and
     navigates itself to the whole wall, so one click on a breadcrumb
     replaced five of the seven specimens with a copy of the page they were
     sitting in. It looked like the tool had crashed. Nothing in any kit is
     at fault and nothing in any kit can fix it. */
  m.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('a'),h=a&&a.getAttribute('href')
    if(a&&(!h||h.charAt(0)==='#'))e.preventDefault()
  })

  /* ── THE SCREENS MEASURE THEMSELVES ─────────────────────────────────────
   * A cell shows a whole screen scaled to its width, and the factor is read,
   * not guessed: natural size over cell width. offsetWidth ignores the
   * transform, so measuring and scaling never feed each other. Re-measured
   * when the grid appears, when the window moves, when the fonts arrive and
   * when the live values change a control's height. */
  var shotsQueued=false
  function shots(){
    if(shotsQueued)return
    shotsQueued=true
    requestAnimationFrame(function(){
      shotsQueued=false
      if(!document.documentElement.hasAttribute('data-shots'))return
      var bs=m.querySelectorAll('.board[data-shot]'),i,b,win,box,sw,sh
      for(i=0;i<bs.length;i++){
        b=bs[i]; win=b.querySelector('.board__cols'); box=b.querySelector('.shotbox')
        if(!win||!box)continue
        sw=box.offsetWidth; sh=box.offsetHeight
        if(!sw||!sh)continue
        b.style.setProperty('--sh',String(sh))
        b.style.setProperty('--s',String(Math.min(1,win.clientWidth/sw)))
      }
    })
  }
  addEventListener('resize',shots)
  new MutationObserver(shots).observe(document.documentElement,{attributes:true,attributeFilter:['data-shots','data-shot-solo']})

  /* expose: one attribute out, one class on the chosen screen */
  var H=document.documentElement
  m.addEventListener('click',function(e){
    if(!H.hasAttribute('data-shots'))return
    if(H.hasAttribute('data-shot-solo')){
      if(e.target.closest('input,select,textarea,button,a,label,summary,[role=radio],[role=checkbox],[role=switch],[role=slider],[role=tab],[role=menuitem]'))return
      var s=m.querySelector('.board.shotsolo')
      if(s&&e.target.closest('.card'))return
      H.removeAttribute('data-shot-solo')
      if(s)s.classList.remove('shotsolo')
      return
    }
    var b=e.target.closest('.board[data-shot]')
    if(!b)return
    b.classList.add('shotsolo')
    H.setAttribute('data-shot-solo',b.getAttribute('data-board')||'')
  })
  addEventListener('keydown',function(e){
    if(e.key!=='Escape'||!H.hasAttribute('data-shot-solo'))return
    H.removeAttribute('data-shot-solo')
    var s=m.querySelector('.board.shotsolo')
    if(s)s.classList.remove('shotsolo')
  })
  var liveEl=document.getElementById('live')
  if(liveEl)new MutationObserver(shots).observe(liveEl,{childList:true,characterData:true,subtree:true})
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(shots)
  shots()

  /* EVERY BACKSLASH IN HERE IS DOUBLED, because this whole script is a
     template literal and one of them is eaten on the way out. A split on
     whitespace written with a single backslash shipped as a regular
     expression that matches nothing — so a class list never split, no state
     word was ever found, and Bootstrap's sidebar was the only chooser on the
     wall that did not move. It failed silently in one place out of seven. */

  /* what makes this element different from that one: attribute by
     attribute, class attribute included, and never id or style */
  function sig(el){
    var a=[],x=el.attributes,i
    for(i=0;i<x.length;i++){ if(x[i].name==='style'||x[i].name==='id')continue; a.push(x[i].name+'\\u0001'+x[i].value) }
    return a.sort().join('\\u0002')
  }
  /* the pairs of (name, chosen value, unchosen value) that separate them.
     null on either side means the attribute is simply absent there. */
  function mark(on,off){
    var out=[],seen={},i,n
    for(i=0;i<on.attributes.length;i++){ n=on.attributes[i].name
      if(n==='style'||n==='id')continue; seen[n]=1
      if(off.getAttribute(n)!==on.attributes[i].value)out.push([n,on.attributes[i].value,off.getAttribute(n)]) }
    for(i=0;i<off.attributes.length;i++){ n=off.attributes[i].name
      if(n==='style'||n==='id'||seen[n])continue; out.push([n,null,off.getAttribute(n)]) }
    return out
  }
  function put(el,name,v){ if(v===null)el.removeAttribute(name); else el.setAttribute(name,v) }

  /* THE VOCABULARY OF BEING THE CHOSEN ONE.
     Every kit here says it with one of these names, and the whole point is
     that we do not have to know which. What does NOT count is a difference
     that is merely a difference: a red menu item is not a chosen menu item,
     and a colour class is not a state. Without this the wall let you click
     Delete and watch it stop being red while Rename went red instead. */
  var STATEATTR=/^(data-(state|active|selected|checked|current)|aria-(selected|current|checked|pressed))$/
  var STATECLASS=/(^|[-_])(active|selected|current|checked|open)([-_]|$)/
  function saysChosen(m){
    for(var i=0;i<m.length;i++){
      if(STATEATTR.test(m[i][0]))return true
      if(m[i][0]==='class'){
        var a=(m[i][1]||'').split(/\\s+/),b=(m[i][2]||'').split(/\\s+/),j
        for(j=0;j<a.length;j++)if(b.indexOf(a[j])<0&&STATECLASS.test(a[j]))return true
        for(j=0;j<b.length;j++)if(a.indexOf(b[j])<0&&STATECLASS.test(b[j]))return true
      }
    }
    return false
  }

  /* A CHOOSER IS A ROW WHERE EXACTLY ONE IS DIFFERENT.
     Three or more of the same tag, two shapes between them, one of which
     appears once: that one is the chosen one, whatever this kit calls it.
     Only things you can operate — a link, a button, or anything that names
     its own role — and never a custom element, whose own code already runs.
     Anything a rule above already owns is left to that rule. */
  function chooser(set){
    if(set.length<3)return
    var tag=set[0].tagName,i,el
    if(tag.indexOf('-')>0)return
    for(i=0;i<set.length;i++){ el=set[i]
      if(el.tagName!==tag)return
      if(tag!=='A'&&tag!=='BUTTON'&&!el.getAttribute('role'))return
      if(/^(switch|checkbox|radio)$/.test(el.getAttribute('role')||''))return
    }
    var by={},k
    for(i=0;i<set.length;i++){ k=sig(set[i]); (by[k]=by[k]||[]).push(set[i]) }
    var keys=Object.keys(by); if(keys.length!==2)return
    var one=by[keys[0]].length===1?by[keys[0]][0]:by[keys[1]].length===1?by[keys[1]][0]:null
    if(!one)return
    var other=null
    for(i=0;i<set.length;i++)if(set[i]!==one){other=set[i];break}
    var m=mark(one,other)
    if(!m.length||!saysChosen(m))return
    set.forEach(function(el){ el.addEventListener('click',function(){
      set.forEach(function(o){ m.forEach(function(p){ put(o,p[0],o===el?p[1]:p[2]) }) })
    }) })
  }
  /* THE SET IS A TAG, NOT A ROW.
     A rail is not a clean row of four links: there is a heading above them
     and one of them carries a count. Insisting the whole row be identical in
     shape meant a rail was a chooser in one kit and not in the six others,
     which is an accident and not a decision. So the row is grouped BY TAG and
     each tag with three or more members is offered on its own. */
  function bytag(set,fn){
    var by={},i,t
    for(i=0;i<set.length;i++){ if(!set[i])continue; t=set[i].tagName; (by[t]=by[t]||[]).push(set[i]) }
    for(t in by)if(by[t].length>=3)fn(by[t])
  }
  var all=m.querySelectorAll('*')
  for(var q=0;q<all.length;q++){
    var kids=Array.prototype.slice.call(all[q].children)
    if(kids.length<3)continue
    bytag(kids,chooser)
    /* one wrapper deep, for a kit that puts each choice in its own li or div */
    bytag(kids.map(function(k){return k.firstElementChild}),chooser)
  }

  /* A BUTTON THAT SAYS IT IS A SWITCH, A BOX OR A RADIO.
     Their components put the answer in aria-checked and repeat it in
     data-state down the subtree, so both move together. */
  function checked(el,on){
    el.setAttribute('aria-checked',on?'true':'false')
    var n=[el].concat(Array.prototype.slice.call(el.querySelectorAll('[data-state]')))
    n.forEach(function(x){ var v=x.getAttribute('data-state')
      if(v==='checked'||v==='unchecked')x.setAttribute('data-state',on?'checked':'unchecked') })
  }
  m.addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('button[role=switch],button[role=checkbox],button[role=radio]')
    if(!b)return
    if(b.getAttribute('role')==='radio'){
      var g=b.closest('[role=radiogroup]')||b.parentElement.parentElement
      Array.prototype.forEach.call(g.querySelectorAll('[role=radio]'),function(r){checked(r,false)})
      return checked(b,true)
    }
    checked(b,b.getAttribute('aria-checked')!=='true')
  })
  /* and a kit that uses a real input but repeats the answer on a wrapper */
  m.addEventListener('change',function(e){
    var i=e.target; if(!i.matches||!i.matches('input'))return
    for(var n=i;n&&n!==m;n=n.parentElement)
      if(n.hasAttribute('data-checked'))n.setAttribute('data-checked',i.checked?'true':'false')
  })

  /* A THING THAT SAYS IT IS EXPANDED CAN BE.
     aria-expanded is not a kit's invention, it is the attribute a select
     trigger is REQUIRED to carry — so the panel it opens is found without
     knowing whose select it is: the next element along, hidden. Their own
     data-state moves with it, because that is what their CSS watches. */
  m.addEventListener('click',function(e){
    var t=e.target.closest&&e.target.closest('[aria-expanded]'); if(!t)return
    var pan=t.nextElementSibling; if(!pan)return
    var open=t.getAttribute('aria-expanded')!=='true'
    t.setAttribute('aria-expanded',open?'true':'false')
    pan.hidden=!open
    if(pan.getAttribute('data-state'))pan.setAttribute('data-state',open?'open':'closed')
  })
  /* and clicking away closes it, the way every one of them does — but only
     what was drawn CLOSED. This wall draws its menus open on purpose, since a
     closed one shows nothing, and a menu that vanished on the first stray
     click and had to be hunted back would be a worse specimen, not a truer
     one. Anything that starts closed is a select, and a select closes. */
  Array.prototype.forEach.call(m.querySelectorAll('[aria-expanded=true]'),function(t){t.dataset.wallOpen='1'})
  m.addEventListener('click',function(e){
    Array.prototype.forEach.call(m.querySelectorAll('[aria-expanded=true]'),function(t){
      if(t.dataset.wallOpen)return
      if(t===e.target||t.contains(e.target))return
      var pan=t.nextElementSibling; if(!pan||pan.contains(e.target))return
      t.setAttribute('aria-expanded','false'); pan.hidden=true
      if(pan.getAttribute('data-state'))pan.setAttribute('data-state','closed')
    })
  })

  /* A SLIDER DRAGS.
     Three of these draw theirs out of divs, and each writes the value as a
     percentage somewhere in an inline style — a width, a left, a custom
     property inside a calc(). Which one is not our business: the percent
     that is already there is taken out and the style kept as a stencil, so
     dragging writes the kit's own expression with a different number. */
  Array.prototype.forEach.call(m.querySelectorAll('[role=slider]'),function(th){
    var box=th.offsetParent; if(!box)return
    var now=+th.getAttribute('aria-valuenow'); if(!(now>=0))return
    var cut=String(now)+'%', tpl=[]
    var nodes=[box].concat(Array.prototype.slice.call(box.querySelectorAll('*')))
    nodes.forEach(function(el){ var t=el.style.cssText
      if(t&&t.indexOf(cut)>=0)tpl.push([el,t.split(cut).join('\\u0000')]) })
    if(!tpl.length)return
    function at(pct){
      pct=Math.max(0,Math.min(100,Math.round(pct)))
      tpl.forEach(function(p){ p[0].style.cssText=p[1].split('\\u0000').join(pct+'%') })
      th.setAttribute('aria-valuenow',pct)
    }
    /* Measured on the box itself, padding included. A percentage in a left
       or a width resolves against the containing block, and that is the
       padding box — so a kit that insets its track by half a thumb has
       already accounted for it. Taking the padding off again put its thumb
       three pixels behind the pointer. (No backticks in here: this whole
       block is a template literal. Fifth time.) */
    function from(x){ var r=box.getBoundingClientRect(); return r.width>0?(x-r.left)/r.width*100:0 }
    var drag=false
    box.addEventListener('pointerdown',function(e){ drag=true; box.setPointerCapture&&box.setPointerCapture(e.pointerId); at(from(e.clientX)); e.preventDefault() })
    box.addEventListener('pointermove',function(e){ if(drag)at(from(e.clientX)) })
    addEventListener('pointerup',function(){ drag=false })
    th.addEventListener('keydown',function(e){
      var v=+th.getAttribute('aria-valuenow'),k=e.key
      if(k==='ArrowLeft'||k==='ArrowDown')at(v-1); else if(k==='ArrowRight'||k==='ArrowUp')at(v+1)
      else if(k==='Home')at(0); else if(k==='End')at(100); else return
      e.preventDefault()
    })
  })
})()${CLOSE}`
