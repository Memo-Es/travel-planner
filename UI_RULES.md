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
- Status chip: a full-width `rounded-full bg-secondary` pill with one line of
  centered status ("Starts in 25 days", "Day 3 of 19").
- Add rows: the last row of a list is a dashed-square placeholder ("Add stop") in
  gray, not a separate outlined button (`AddRow`).
- Lists have no dividers: rows are borderless, separated by spacing, with a soft
  hover fill. Plans show schedule only (time, notes, who's going); costs and
  booking links stay out of the schedule.
- Mobile bottom sheets show a grab handle.

- Soft cards: `rounded-2xl bg-secondary`, no border, 16px padding; title left,
  gray detail beneath, value right, optionally in a `rounded-full bg-hover-2` pill.
- Segmented control: text-only options; the selected one sits on a soft gray pill
  (`AnimatedBackground`); unselected options are gray text, no container.
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
  Clicking a stop (one click, no separate open button) widens the Trips panel over
  the calendar: the stops list stays, then a dotted vertical divider, then that
  stop's itinerary. Finances narrows to the stop's costs; there is no stop drawer.
- Control feedback uses 150ms transitions; overlays use 200ms. Honor reduced motion.
  Animate only `transform` and `opacity`, with the standard `easeOut` curve.
- Keep frequent actions immediate. Do not add decorative or looping animations.
- Support short screens with scrolling panel content.
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
- Accordions (Finances' stop list and balance card) follow Motion Primitives'
  Accordion: `AccordionBody` animates height and opacity together on a no-bounce
  spring (~350ms), so one card closing while the other opens trades space instead
  of jumping. Card corners animate through Motion, and list rows that enter or
  leave with a filter use the same motion. Height animation is allowed only on
  these small, isolated surfaces.
- Drawers/dialogs enter in 200ms and exit in 150ms; focus returns after dismissal.
  Keep conditional dialogs inside AnimatePresence so exit motion can complete.
- Month labels crossfade with a small vertical shift; do not animate the calendar
  grid or drag coordinates, which must stay aligned with pointer movement.
- Counts and totals tween to the latest value in 450ms with ease-out (a fixed
  duration, not a spring, so large jumps never creep). Screen readers receive the
  exact current value; currency totals retain cents and respond to currency changes.
- Cards lift 2px on hover-capable devices. Button presses compress by 3%. There
  are no continuous decorative loops.
- MotionConfig respects the user's motion preference. Individual components also
  disable height, number, blur and opacity animation when reduced motion is enabled.
