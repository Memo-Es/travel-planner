# Planner UI rules

Keep the three-column planner, warm neutral surfaces, muted lavender accent and
custom itinerary calendar. Shared components live in `src/components/ui`; these are
source-owned shadcn-style components built on Radix primitives. `components.json`
is configured for the existing Tailwind 3 project. Add only components we use.

## Visual hierarchy

- Use 12px for metadata and labels, 14px for controls and list content, 20px for
  panel headings and 24px for the calendar month and trip title.
- Use regular and medium weights for content; reserve semibold for headings,
  key amounts and selected emphasis. Dates and costs use tabular numerals.
- Space related controls by 8–12px, fields by 12–16px and sections by 24px.
- Use 12px corners for controls (buttons, inputs), 16px for soft cards and form
  boxes, 24px for panels, dialogs and sheets, and full pills for chips, status
  badges and segmented controls.
- Type uses the platform UI face (`system-ui`: SF Pro on Apple). Key figures are
  large display numbers (`text-3xl`/`text-4xl` semibold, tabular) with gray
  supporting text beneath; avoid boxing them in.
- Use quiet borders and light shadows for surfaces. Stronger shadows belong to
  floating menus and dialogs. Use the shared theme tokens rather than new colors.
- No gradients, glows or backdrop blur. Surfaces are flat; overlays dim with a
  plain `bg-ink/20` scrim.
- Headings use `text-balance`, body copy `text-pretty`. Do not change letter
  spacing (`tracking-*`); labels are sentence case. Use Tailwind type sizes, not
  arbitrary `text-[…]` values.
- Stacking uses the named `z-*` scale in `tailwind.config.ts` (bar → toast).
  Never add an arbitrary `z-[…]`.
- Palette: neutrals and buttons use Tailwind `stone` (primary buttons are
  stone-900, hover stone-800). Chatelle (lavender) is the one accent: selection,
  links and today. Pale Leaf (sage) marks scheduled/completed status; a muted
  brick red is reserved for errors and destructive actions.
  Stops pick from Lavender, Sage, Clay, Khaki and Stone. Keep text on these at
  WCAG AA (4.5:1) — use the 700/800 steps for text, 100/200 for fills. Pair color
  with text.

## Surface patterns

A calm, mostly monochrome style with soft fills instead of outlines (the Trips
and Finances panels are the reference); reuse these patterns rather than
inventing new ones.

- No outlined controls: secondary buttons and inputs are soft stone fills. Inputs
  turn white with a ring halo on focus. Form boxes that hold inputs are white with
  a hairline border so the soft fields stay visible.
- Display headings: trip and stop names at `text-2xl` semibold, the calendar month
  at `text-3xl` bold with the year in gray, weekday labels small uppercase.
- The calendar has Month, 2 weeks and Week views (a text-only segmented control;
  full width under the title on mobile). Week views title the date range, list a
  day's plans under its bars and step by their own length.
- Month view gives each day one plan line, sized to the day's measured width so
  nothing reaches the next day: under 70px (phones) one dot per plan in its
  stop's colour, "+n" after three; under 100px the time and "+n"; wider, the time,
  name and "+n". A name only shows with room for a few letters, never cut to one.
- Opening a stop zooms the calendar to the tightest view that shows it whole
  (week, 2 weeks or month) and gives it the calendar to itself: other stops,
  holidays and their plans are hidden and days outside it are grayed; closing it returns to the
  previous view unless one was picked in between.
- Tapping a plan on the calendar opens it where its itinerary is: on mobile, that
  day's plans in a bottom sheet (with the stop's day tabs); on wider screens, the itinerary beside the
  calendar on that plan's day. Either way the tapped plan is highlighted and
  scrolled into view.
- A stop's own details are edited from its header: a visible Edit button (also the
  date line and the ⋯ menu) opens one form under the header with its name, arrival
  and departure, showing the night count as the dates change. Save or Cancel;
  Escape cancels. Colour and icon are set directly below it.
- Plan rows read: title, time, notes, link and PDF chips, then Join, with one ⋯
  menu (edit, move to a day, remove). A stop's activities show one day at a
  time behind day tabs, which also take a dragged plan.
- Status chip: a full-width `rounded-full bg-secondary` pill with one line of
  centered status ("Starts in 25 days", "Day 3 of 19").
- Focus rings: standalone buttons get a ring just outside them; rows, card
  headers and pill tabs that fill their container use `focus-inset`, a ring
  inside that follows their own rounded corners.
- Stops show a city icon in their color (lib/cityIcons: Hugeicons landmarks plus
  ones drawn here on the same 24px grid with open rounded strokes), matched from
  the stop's name or picked by hand, falling back to the pin. No photos.
- New accounts get their own empty trip plus a sample trip (pretend travel
  buddies, timed plans, shared costs) and a one-time welcome walkthrough that
  ends in "Start my own trip" or "Explore the sample trip". The sample shows a
  "Sample trip · Start my own" chip in the Trips panel.
- Phones: the Trips / Calendar / Finances tabs sit at the bottom, in thumb reach.
  Form fields use 16px text below the sm breakpoint so iOS doesn't zoom on focus.
  On touch screens every button, tab and pill reaches 44px to the finger via an
  invisible ::after margin (`ui-button`, `tap-target`), calendar bars are taller,
  menu items are 44px, and a booking form's actions stay pinned as it scrolls.
- Panel headers share one rhythm so their tops line up: a 40px row of controls
  (Trips: label + settings; Calendar: view switcher + arrows; Finances: category
  filter; an open stop: dates + menu), then the headline 12px below (trip name,
  month, the amount with "Total spent" under it).
- Add rows: the last row of a list is a dashed-square placeholder ("Add stop") in
  gray, not a separate outlined button (`AddRow`).
- Lists have no dividers: rows are borderless, separated by spacing, with a soft
  hover fill. Plans show schedule only (time, notes, who's going); costs and
  booking links stay out of the schedule.
- Mobile bottom sheets show a grab handle.

- Soft cards: `rounded-2xl bg-secondary`, no border, 16px padding; title left,
  gray detail beneath, value right, optionally in a `rounded-full bg-hover-2` pill.
- Segmented control: text-only options; the selected one sits on a soft gray pill
  (`AnimatedBackground`); unselected options are gray text, no container. On a
  soft gray card the pill is white with a light shadow instead, since a gray
  pill disappears there (Finances' All / By stop / By person).
- A panel's scroll area and whatever is pinned under it share one right edge
  (Finances' cards over "Add expense", the expense form over its buttons). The
  column is a `panel-col` and its scroll area a `panel-col-scroll`, which keeps
  the scrollbar in the panel's own padding instead of narrowing only what
  scrolls. A column inside a panel takes `min-w-0`, so content that is too wide
  scrolls or tightens inside it and never pushes the column past the panel:
  Finances' filters lose a little padding beside the close button, and the
  expense form's Delete drops to its icon (`panel-col-label`).
- Chevrons in a card sit in one column: a row's own chevron takes the same 28px
  box as the card's chevron chip.
- Lists: rows separated by dotted stone-300 dividers; a plain gray icon leads,
  amounts or times align right.
- One primary call to action per surface: `Button size="lg"` (48px, 16px corners,
  semibold), near-black.
- People appear as `Avatar` (initials in a soft accent circle) next to their name.

## Interaction

- Use Button variants consistently: primary for save/create, secondary (soft
  fill) for other actions, ghost for contextual actions, accent for an "on" toggle
  state (Going), soft-destructive for inline removal, destructive for confirmed
  deletion.
- Keep icon controls at least 36px and provide accessible names. File pickers are
  driven by a labelled button; the native input stays visually hidden.
- Put edit/delete actions in an overflow menu. Stop deletion requires the shared
  confirmation dialog; initial focus belongs on the non-destructive option.
- Use labeled fields, inline validation, visible keyboard focus, and pending states
  that prevent duplicate submissions. Preserve drafts when saving fails.
- Booking links are separate from edit buttons; never nest interactive controls.
- Dialogs trap focus, close on Escape and return focus to the opening control.
  Clicking a stop (one click, no separate open button) widens the Trips panel: the
  stops list stays, then a dotted vertical divider, then that stop's itinerary. On
  wide screens its column grows and the calendar narrows to make room (never below
  440px), and on monitors too small to keep the calendar roomy (640px) Finances
  tucks into its rail. The rail swaps them back: the itinerary folds away (the stop
  stays selected and Finances shows its costs) and clicking the stop unfolds it.
  On compact screens (under ~1240px) both sides start as rails and open one at a
  time, pushing the calendar over, never covering it with a backdrop: Trips or
  Finances takes its column, and the other side stays a rail. An open stop's
  itinerary takes the Trips column alone there (no room for the list beside it);
  its back button returns to the list. Finances narrows to the stop's costs;
  there is no stop drawer.
- Control feedback uses 150ms transitions; overlays use 200ms. Honor reduced motion.
  Animate only `transform` and `opacity`, with the standard `easeOut` curve.
- Keep frequent actions immediate. Do not add decorative or looping animations.
- Support short screens with scrolling panel content. Scroll areas use
  `scroll-quiet`: a thin scrollbar, hidden until the pointer is over the area.
  Use dynamic viewport heights and safe-area padding on mobile.

## Baseline

These rules follow the [UI Skills](https://www.ui-skills.com/) baseline
(`baseline-ui`, `fixing-accessibility`, `fixing-motion-performance`,
`fixing-metadata`). Sign-in, sign-up and invite pages use the same `Input`,
`Button` and field classes as the planner, inside `AuthShell`.

## Verification

Run `npm run lint`, `npx tsc --noEmit` and `npx next build` after generating the
Prisma client. The existing `npm run build` also runs database migrations, so use
it only with the intended database configured.

Review at 1440px, 1024px, 768px, 390px and 320px. Check dialog focus/return, menus,
calendar keyboard activation, inline errors, delete cancellation, empty states,
reduced motion and long content. Verify database-backed saves in a configured
environment; a visual fixture does not cover persistence.

## Motion layer

The motion components in `src/components/motion` draw on Motion Primitives'
[Animated Background](https://motion-primitives.com/docs/animated-background),
[Animated Number](https://motion-primitives.com/docs/animated-number) and
[Transition Panel](https://motion-primitives.com/docs/transition-panel) patterns.
They use Motion for React alongside the existing Radix accessibility behavior.

- Sliding selection highlights use a short, damped spring, scoped to each list.
- Inline forms fade and nudge in (opacity/transform only; never height). Exiting
  fields become inert so keyboard users cannot tab into content that is disappearing.
- An expense is its own thing, not a field on a booking: a plan can carry zero,
  one or several (a museum ticket and the taxi there are two expenses on one
  activity), and a cost can also sit loose on a stop with no plan behind it at
  all (a tip, a shared snack). Adding or editing one is always the same small
  form (name, amount, paid by), reached from Finances' "Add expense" button or
  by tapping an expense row; a booking's own form (name, link, day, time, notes,
  documents) has no cost field at all. It only ever opens from Finances, so it
  takes Finances' own column instead of floating a drawer over the page - no
  backdrop, no separate surface, the same "push, never cover" rule as the
  stop and Finances columns themselves.
  In full mode, with room for `EXPENSE_W` (720px), the form opens BESIDE
  Finances' own list - a fixed 320px list, a dotted divider, the form taking
  what's left - exactly the way an open stop sits beside the Trips list at
  `STOP_W`. Below that width, or in compact/mobile, it falls back to swapping
  Finances' content for the form in place, the same way a cramped stop takes
  its own column alone rather than squeezing in beside the list. `EXPENSE_W`
  is sized for its three parts plus the aside's own padding - widen any of
  them and widen the constant with it, or the row overflows its own column
  (measured once: the list rendered 37px past the aside's left edge before
  the constant was corrected from a guessed 640 to the real 720 the three
  parts and the padding add up to).
- Transport and activities can carry an end time alongside the start - a
  flight or a museum visit has a finish worth knowing, where a stay's own form
  has no time fields at all (checking in is what its day already means). End
  time sits beside Start time once a day is picked, disabled until there's a
  start to be relative to, and clears itself if the start time or day is
  cleared - the same dependency a start time already has on its day. It must
  be strictly after the start; the form and the server both check this, and
  the field carries the error inline rather than only a banner. Shown
  anywhere a time already was, as "10:00–11:30" instead of "10:00", via
  `fmtTimeRange` in lib/itinerary.ts - except the month calendar's own compact
  chips, which keep the bare start time for space.
- Activities only - not transport, not stay - can carry a Location: a real
  place, not a typed address, from the same Google Places lookup check_place
  already uses (`searchActivityLocation` in actions/places.ts), debounced as
  the field is typed into. Picking a result sets both the shown text and its
  Maps link; editing the text by hand afterward clears the link, since it
  should only ever point at what's shown, never a stale place for new words.
  Without a team Places API key (or on a transient failure) the field is
  still plain text with a quiet hint, never blocked - the same fallback
  `placesKeySet` already governs for the agent-facing toast. Shown as a
  MapPin line under the time, a plain link when it has a Maps URL and plain
  text otherwise, in both the stop panel's rows and the day sheet.
- A human's own location search and an agent's check_place call both spend
  the same Google Places quota and both get logged, but only the agent's is
  worth a "the agent just checked X" toast - a person is not news to
  themselves about their own search. `PlacesCall.source` ("agent" default,
  "human" for the Location field) is how `placesCallsSince` tells them apart
  for that toast; `getPlacesUsage`'s count stays unsplit, since Google bills
  per call regardless of who triggered it.
- With no stop open and at least one expense anywhere, Finances' stop list
  offers an All / By stop / By person toggle: All lists every expense across
  the whole trip with which stop and plan it's under (or "Not on a plan"); By
  stop totals each stop; By person totals who fronted it, across every stop
  they paid on (member order, "Nobody yet" last), so nothing is only reachable
  by opening a particular stop first. In By stop or By person, tapping a group
  expands its own expenses inline, under that row, rather than jumping over to
  open the stop; tapping one of those expense rows (or a row in All) opens it
  for editing, same as a stop's own expense rows do.
- Opening a stop narrows Finances to its costs, but that narrowing has its own
  way out: an "All stops" link beside "Spent in {stop}" drops it without
  closing the stop on the calendar, and reading everything again shouldn't
  mean giving that up. It flips back to "{stop} only" once clicked, and the
  override itself resets whenever a different stop opens, so a newly opened
  stop always starts narrowed rather than inheriting the last one's choice.
- Accordions (Finances' stop list and balance card) follow Motion Primitives'
  Accordion: `AccordionBody` animates height and opacity together on a no-bounce
  spring (~350ms), so one card closing while the other opens trades space instead
  of jumping. Card corners animate through Motion, and list rows that enter or
  leave with a filter use the same motion. Height animation is allowed only on
  these small, isolated surfaces.
- Drawers/dialogs (the day sheet, trip settings, onboarding) enter in 200ms and
  exit in 150ms; focus returns after dismissal. Keep conditional dialogs inside
  AnimatePresence so exit motion can complete. The expense form is not one of
  these - see above.
- Month labels crossfade with a small vertical shift; do not animate the calendar
  grid or drag coordinates, which must stay aligned with pointer movement.
- Counts and totals tween to the latest value in 450ms with ease-out (a fixed
  duration, not a spring, so large jumps never creep). Screen readers receive the
  exact current value; currency totals retain cents and respond to currency changes.
- Cards lift 2px on hover-capable devices. Button presses compress by 3%. There
  are no continuous decorative loops.
- MotionConfig respects the user's motion preference. Individual components also
  disable height, number, blur and opacity animation when reduced motion is enabled.
- Opening a stop replaces the Month/2 weeks/Week calendar with that stop's own
  days as cards, stacked one after another in date order instead of sharing a
  calendar row's height - a 2-night stop no longer inherits a full week's worth
  of empty weekday columns, and a 2-event day no longer stretches to match a
  6-event one. They're a single column rather than a wrapping grid: a stop's
  days are a timeline, and reading several cards per row breaks that
  chronological thread, where one column top to bottom reads the same way the
  schedule itself does. The Month/2 weeks/Week switcher (and its zoom state)
  stays for the general, no-stop-open view, where lining a day up under its
  weekday is what makes scanning a whole trip's pattern work - the stacked
  column is only for a single focused stop. The header swaps to the stop's own
  icon, name and date range with an "All stops" link back; on mobile the
  existing stop pill already covers this, so the switcher and this header both
  stay hidden there instead of doubling up. Tapping a plan on a card opens it
  the same way a calendar bar does - inline in the Trips panel on desktop, the
  day sheet on mobile.
