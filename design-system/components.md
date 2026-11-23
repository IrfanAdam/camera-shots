# Component Specs

All specs reference `tokens.json` by name. No raw values below — resolve via the token map.

## Doc Tabs (pitch header, active-dot style)

**Purpose**
Switch document panels within one page shell while keeping brand and export controls mounted.

**Anatomy**
Row container; text-only tab buttons; 5px active dot (`::after`, centered under active tab); hidden panels with one active panel.

**Variants**

| Variant | Description | Key differences |
|---|---|---|
| Pitch header tabs | Brand left, tabs right, sticky header | Dot token `color.pitch.accent`; type `typography.size.small` |
| Wiki step tabs | Underline style, not dot | Active = ink text + amber underline (`color.wiki.light.amber`) |
| Wiki chip tabs | Pill filter chips | Active = filled accent pill |

**States**
Default (muted, regular) | Hover (ink) | Active (ink, semibold, dot visible) | Focus-visible (accent outline) | Panel swap (fadeSlideIn, `motion.duration.tab` + rise, opacity-led).

**Token Usage**

| Property | Token |
|---|---|
| Tab text default | color.pitch.muted |
| Tab text active/hover | color.pitch.ink |
| Active dot | color.pitch.accent |
| Focus outline | color.pitch.accent |
| Panel animation | motion.duration.tab / motion.easing.standard |
| Scroll offset under sticky header | layout + scroll-margin (see Patterns) |

**Dos and Don'ts**
- DO keep tabs text-only; the dot is the only indicator.
- DO NOT add underline + dot together.
- DO move focus to panel top on switch.

**Accessibility**
Min target `touch.min`; `role=tablist`, `aria-selected`; keyboard arrow navigation.

## Transport Bar (engine / pro feel)

**Purpose**
Playback and edit-action cluster for canvas and timeline control.

**Anatomy**
Icon-only button cluster, no background container; frame counter readout; grouped edit actions (cut, split, duplicate, trim).

**Variants**

| Variant | Description | Key differences |
|---|---|---|
| Canvas tools | Engine header row | Tool-surface buttons (`color.engine.tool`) |
| Pro transport | Reference feel | Containerless icons; active = full primary vs dimmed secondary |

**States**
Default | Hover (accent border) | Active/selected (accent) | Disabled (`opacity.disabled`, no hover shift).

**Token Usage**

| Property | Token |
|---|---|
| Button surface | color.engine.tool |
| Button hover surface | color.engine.tool.hover |
| Icon/text | color.engine.ink |
| Secondary label | color.engine.muted |
| Active edge | color.engine.accent |
| Destructive hover | color.semantic.danger |
| Radius | radius.sm |
| Target size | touch.min minimum, touch.pro for transport |

**Dos and Don'ts**
- DO keep transport containerless; buttons carry the affordance.
- DO NOT shrink transport targets below `touch.min`.

**Accessibility**
Every icon button has `aria-label`; frame counter uses tabular numbers (`typography.size.timecode`).

## Timeline Chips (pro track segments)

**Purpose**
Color-coded selectable segments on track lanes: FX, title/graphics, audio.

**Anatomy**
Rounded bar; leading glyph icon; short label; selection handles on active chip.

**Variants**

| Variant | Description | Key differences |
|---|---|---|
| FX chip | Color/effect segment | `color.pro.track.fx` fill |
| Title chip | Graphics/title segment | `color.pro.track.title` fill |
| Audio chip | Music/dialogue segment | `color.pro.track.audio` fill |
| Selected chip | Any active segment | `color.pro.selection` border + handles |

**States**
Default | Hover (brightness lift) | Selected (selection border + handles) | Muted/locked track (dimmed).

**Token Usage**

| Property | Token |
|---|---|
| FX fill | color.pro.track.fx |
| Title fill | color.pro.track.title |
| Audio fill | color.pro.track.audio |
| Selection edge/handles | color.pro.selection |
| Label text | color.pro.text.primary |
| Radius | radius.sm |
| Handle thickness | touch.handle.timeline |

**Dos and Don'ts**
- DO keep one hue per track type, always.
- DO NOT use neon fills; saturated mid-tones only.

**Accessibility**
Selected state must never rely on color alone — handles + label change required; contrast against surface per audit checklist.

## Inspector Pills (floating status overlays)

**Purpose**
Transient floating status over the canvas (selection length, applied effect + navigation).

**Anatomy**
Dark translucent pill; optional split: white active segment + dark navigation segment.

**Variants**

| Variant | Description | Key differences |
|---|---|---|
| Status pill | One-line readout (e.g. selection length) | Single dark segment |
| Split pill | Effect state + drill-in | White segment + dark `>` segment |

**States**
Visible | Hidden (no selection) | Hover on navigation segment.

**Token Usage**

| Property | Token |
|---|---|
| Pill surface | color.engine.panel + scrim translucency (`opacity.scrim` family) |
| Active segment | color.engine.ink surface with dark text |
| Text | color.engine.ink / color.pro.text.primary |
| Shadow | elevation.popover |
| Radius | radius.pill |
| Padding | spacing.sm / spacing.md |

**Dos and Don'ts**
- DO keep pills overlay-only; they never push layout.
- DO NOT stack more than two pills over the canvas.

**Accessibility**
Pills are `role=status` live regions; never the sole carrier of critical state.

## Cards

**Purpose**
Grouped content blocks in pitch articles and wiki panels.

**Anatomy**
Surface container; title; body; optional gate/qualifier line.

**Variants**

| Variant | Description | Key differences |
|---|---|---|
| Pitch card | Dark surface block | `color.pitch.surface.1`, `radius.lg` |
| Pitch accent card | Gated/emphasis block | Accent border |
| Wiki panel | Light/dark dual-theme panel | `color.wiki.*.card`, `radius.md` |

**States**
Default | Hover (subtle lift, linked cards only) | Accent (gate state).

**Token Usage**

| Property | Token |
|---|---|
| Surface | color.pitch.surface.1 / color.wiki.light.card / color.wiki.dark.card |
| Border | color.pitch.rule / color.wiki.light.rule / color.wiki.dark.rule |
| Title | color.pitch.ink / color.wiki.*.ink |
| Body | color.pitch.muted / color.wiki.*.muted |
| Gate line | color.pitch.accent / color.wiki.*.accent |
| Radius | radius.lg (pitch) / radius.md (wiki) |
| Padding | spacing.md |

**Dos and Don'ts**
- DO put one idea per card.
- DO NOT nest cards more than one level.

**Accessibility**
Card titles are real headings; linked cards are single `<a>` wrappers, not div-soup.

## Buttons

**Purpose**
Primary, secondary, and destructive actions across all three surfaces.

**Anatomy**
Label (+ optional icon); pill or rounded-rect container.

**Variants**

| Variant | Description | Key differences |
|---|---|---|
| Primary | Single main action | Accent fill, dark ink text |
| Ghost/secondary | Companion actions | Transparent, bordered |
| Danger | Destructive (delete drawer item) | Danger border/text; armed fill state |
| Export pill | Small export trigger | Compact pill, muted → ink hover |

**States**
Default | Hover (brightness/border shift) | Armed (danger confirm, two-tap) | Disabled (`opacity.disabled`).

**Token Usage**

| Property | Token |
|---|---|
| Primary fill | color.pitch.accent / color.engine.accent (surface-appropriate) |
| Primary text | color.pitch.accent.ink |
| Ghost border | color.pitch.rule / color.engine.border.strong |
| Danger | color.semantic.danger |
| Radius | radius.pill (pitch CTAs) / radius.sm (engine tools) |
| Disabled | opacity.disabled |

**Dos and Don'ts**
- DO use one primary per view.
- DO require armed two-tap for destructive actions.

**Accessibility**
Min target `touch.min`; visible focus ring; danger actions announced.

## Search / Filter Input

**Purpose**
Filter lists in place (wiki concept filter).

**Anatomy**
Pill input, full-width flex; optional theme toggle companion.

**Variants**

| Variant | Description | Key differences |
|---|---|---|
| Filter pill | In-list filter | Surface fill, rule border, pill radius |

**States**
Default | Focus (accent border) | Populated (clearable).

**Token Usage**

| Property | Token |
|---|---|
| Surface | color.wiki.*.card |
| Border / focus | color.wiki.*.rule → color.wiki.*.accent on focus |
| Text | color.wiki.*.ink |
| Radius | radius.pill |
| Type | typography.size.small |

**Dos and Don'ts**
- DO filter in place; never navigate away on keystroke.
- DO pair with `/` keyboard shortcut where applicable.

**Accessibility**
Real `<label>` (visually hidden ok); `type=search`.

## Drawers (edit panel / plan panel)

**Purpose**
Side editing surface that preserves canvas/article context.

**Anatomy**
Slide-in panel; header with close + export; scrollable body; scrim backdrop.

**Variants**

| Variant | Description | Key differences |
|---|---|---|
| Engine drawer | Narrow asset editor | `layout.drawer.width` |
| Pitch drawer | Wide plan/fund sheet | `layout.drawer.pitch.width` |

**States**
Closed (translated off) | Open | Body scroll-locked while open.

**Token Usage**

| Property | Token |
|---|---|
| Surface / border | color.engine.panel / color.engine.border.strong |
| Scrim | color.pitch.overlay.scrim + opacity.scrim |
| Motion | motion.duration.base + motion.easing.drawer |
| Close target | touch.min circle |

**Dos and Don'ts**
- DO close on scrim click + Escape.
- DO NOT trap transforms on ancestors of fixed drawers.

**Accessibility**
`role=dialog`, focus-trapped, returns focus on close.

## Toast + Confirm Row

**Purpose**
Transient action feedback with optional undo/confirm.

**Anatomy**
Floating bar; message; action button; optional danger arm.

**Variants**

| Variant | Description | Key differences |
|---|---|---|
| Toast | Action feedback | Panel surface, popover shadow |
| Danger arm | Delete confirm | Two-tap arm → filled danger |

**States**
Hidden | Visible (auto-dismiss) | Armed (danger).

**Token Usage**

| Property | Token |
|---|---|
| Surface / border | color.engine.panel / color.engine.border.strong |
| Action fill | color.engine.accent |
| Danger | color.semantic.danger |
| Shadow | elevation.sheet |
| Radius | radius.md |

**Dos and Don'ts**
- DO auto-dismiss; never block canvas.
- DO NOT use toasts for errors needing decisions — use dialogs.

**Accessibility**
`role=status`; action button keyboard-reachable.

## Track Headers + Asset List Rows

**Purpose**
Per-lane controls (lock/mute/visibility) and media-bin rows.

**Anatomy**
Icon column per track; row = thumb + label + meta + badge.

**Variants**

| Variant | Description | Key differences |
|---|---|---|
| Track header | Lane controls | Small icon stack |
| Asset row | Bin entry | Thumb, label, duration/meta |

**States**
Default | Hover | Locked/muted (dimmed + icon swap) | Missing media (placeholder).

**Token Usage**

| Property | Token |
|---|---|
| Icons | color.engine.muted → color.engine.ink on hover |
| Row surface | color.engine.panel |
| Meta text | typography.size.meta + muted tokens |
| Badge fills | color.semantic.* |

**Dos and Don'ts**
- DO show a placeholder for missing media, never a broken thumb.
- DO NOT overload rows with more than two actions.

**Accessibility**
State toggles are real buttons with `aria-pressed`.
