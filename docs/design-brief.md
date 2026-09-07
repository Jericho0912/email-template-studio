> Generated 2026-09-08 by a structured analysis of the reference screenshots (composition, hierarchy, spacing, badges, dialogs, microcopy), then synthesised into an original brief. It is an input document; `docs/DESIGN.md` records what the MVP actually implements. Token values here differ slightly from `src/index.css`, which is the source of truth.

# Email Template Studio — Design Brief

Internal tool for authoring, previewing and diagnosing transactional email templates. The product should feel like a well-kept lab bench: everything is labelled, nothing is decorative, and the artefact (the email) is always the brightest thing on screen.

---

## 1. Principles

1. **One grey does the pressing.** A single muted fill token is used for selected nav, active tab, inputs, secondary buttons and table headers; hierarchy comes from fill-vs-text, never colour. _(Evidence: #e9e9e9 reused across nav, tabs, inputs, headers, kbd chips.)_
2. **Hairlines, not shadows, define containers.** Two border weights only — strong for cards/inputs/top bar, subtle for row dividers and rail edges. Shadows are reserved for floating popovers and menus. _(Evidence: #d3–d6 vs #ebebeb–ececec, "no shadow" on cards.)_
3. **Colour means state.** Green = valid, amber = warning, red = error, blue = informational; the chrome is otherwise greys on off-white. Every status is a pale tint fill with dark same-hue text — never white-on-saturated. _(Evidence: badge tints L≈94–96 with text L≈35–40; hue appears only in badges, toasts, banners.)_
4. **Near-black is the only brand surface.** The primary button and the code editor share it, so the editor reads as the primary object on the page. _(Evidence: #000 primary + #000 editor slab; "never two black buttons on one bar".)_
5. **Tool vs artefact.** The editor is a dark rounded slab on a slightly darker ground; the preview is a white sheet that sits marginally higher. The pair should read as instrument beside specimen. _(Evidence: editor y=143 on #efefef, preview y=150 white with hairline edge.)_
6. **Editing owns the viewport.** Entering the studio collapses the sidebar to an icon rail and replaces the page title with a centred breadcrumb; state words like "Draft" are typographic, not badges. _(Evidence: 90px rail, "Broadcasts / Untitled Draft".)_
7. **Metadata is uppercase noun over value.** Tracked 11px caps labels in mid-grey, 14px near-black values, 4-column grid; identifiers are always mono chips with a copy affordance. _(Evidence: FROM/SUBJECT/TO/ID grid at ~355px pitch, mono ID chip with copy icon.)_
8. **Friction scales with irreversibility.** Toast for success; disabled-with-reason for preconditions; hold-to-confirm for data loss; type-to-confirm for deletion. The reason is stated in plain language before the control. _(Evidence: hold-to-confirm popover, "Type <name> to confirm", soft-red disabled destructive button.)_
9. **Code is one material.** Editor, payload viewer and snippets share a near-monochrome syntax palette with exactly one accent hue for strings. _(Evidence: greys #a8–#48 plus mint strings across editor, JSON viewer, onboarding snippet.)_
10. **Generous rhythm, dense information.** 36–40px controls, 44px form rows, 64px list rows, 80–96px content inset; density comes from alignment and mono columns, not from shrinking type. _(Evidence: 40px controls, 48px form rows, 72px list rows, 100px gutter at 1.33x.)_

---

## 2. Colour tokens (shadcn / Tailwind v4)

All values are new — same families as the reference, different measurements. Light is default; dark overrides under `.dark`.

```css
@import 'tailwindcss';

:root {
  /* Neutral shell */
  --background: #f6f6f4; /* oklch(0.973 0.003 106.4)  app ground, warm off-white */
  --card: #ffffff; /* oklch(1.000 0 0)          panels, preview sheet */
  --popover: #ffffff; /* oklch(1.000 0 0) */
  --muted: #ededeb; /* oklch(0.946 0.003 106.5)  the one "pressed/selected/input" fill */
  --muted-strong: #e4e4e1; /* oklch(0.918 0.004 106.5)  hover on muted, table header */
  --border: #d9d9d6; /* oklch(0.884 0.004 106.5)  strong hairline: cards, inputs, top bar */
  --border-subtle: #ebebe8; /* oklch(0.939 0.004 106.5)  row dividers, rail edge */
  --input: #d9d9d6;
  --ring: #2f6fd1; /* oklch(0.554 0.165 259.0)  focus ring + unsaved dot */

  /* Text ramp (one family, four steps) */
  --foreground: #111110; /* oklch(0.177 0.002 106.6)  titles, values */
  --foreground-secondary: #2e2e2c; /* oklch(0.300 0.004 106.6)  nav, body, tab text */
  --foreground-meta: #5a5a57; /* oklch(0.467 0.005 106.6)  uppercase labels, helper */
  --foreground-placeholder: #8f8f8b; /* oklch(0.649 0.006 106.6) */
  --muted-foreground: var(--foreground-meta);

  /* Brand-neutral primary */
  --primary: #161615; /* oklch(0.200 0 0) */
  --primary-foreground: #ffffff;
  --secondary: var(--muted);
  --secondary-foreground: #2e2e2c;
  --accent: var(--muted);
  --accent-foreground: var(--foreground);

  /* Editor slab */
  --editor: #0b0b0c; /* oklch(0.150 0.002 286.1)  not pure black: keeps hairlines visible */
  --editor-gutter: #6d6d6a; /* oklch(0.534 0.005 106.6) */
  --editor-plain: #a6a6a3; /* oklch(0.724 0.004 106.5) */
  --editor-string: #c5ebd8; /* oklch(0.908 0.047 163.7)  the single accent */
  --editor-comment: #5a5a57;

  /* Status: pale fill / dark text / tinted border */
  --success: #deefe6; /* oklch(0.937 0.022 163.0) */
  --success-foreground: #1b5f42; /* oklch(0.435 0.083 161.1) */
  --success-border: #bcd9c8; /* oklch(0.859 0.039 159.8) */
  --info: #e3eff9; /* oklch(0.946 0.019 243.0) */
  --info-foreground: #24567f; /* oklch(0.439 0.086 246.3) */
  --info-border: #bcd3e8; /* oklch(0.856 0.038 245.8) */
  --warning: #fbf3cf; /* oklch(0.961 0.048 96.8) */
  --warning-foreground: #7a5a0e; /* oklch(0.488 0.095 82.9) */
  --warning-border: #e6d78f; /* oklch(0.875 0.093 97.8) */
  --destructive: #fbeaea; /* oklch(0.951 0.019 17.5)   soft tint, never solid red */
  --destructive-foreground: #8a2b2e; /* oklch(0.434 0.129 22.6) */
  --destructive-border: #e8bfc0; /* oklch(0.841 0.047 16.5) */
  --planned: #ededeb; /* neutral badge */
  --planned-foreground: #3a3a38; /* oklch(0.348 0.003 106.6) */

  --radius: 0.5rem;
}

.dark {
  --background: #131314; /* oklch(0.187 0.002 286.2) */
  --card: #1a1a1c; /* oklch(0.219 0.004 286.1) */
  --popover: #202024; /* oklch(0.245 0.008 285.8) */
  --muted: #26262a; /* oklch(0.270 0.007 285.9) */
  --muted-strong: #2e2e33; /* oklch(0.303 0.009 285.9) */
  --border: #34343a; /* oklch(0.327 0.011 285.8) */
  --border-subtle: #26262a;
  --input: #34343a;
  --ring: #6c9be6; /* oklch(0.688 0.123 259.4) */

  --foreground: #ececea; /* oklch(0.943 0.003 106.5) */
  --foreground-secondary: #c4c4c0; /* oklch(0.819 0.006 106.5) */
  --foreground-meta: #9a9a96; /* oklch(0.685 0.006 106.6) */
  --foreground-placeholder: #6d6d6a; /* oklch(0.534 0.005 106.6) */

  --primary: #f2f2f0; /* oklch(0.961 0.003 106.4) */
  --primary-foreground: #131314;
  --secondary-foreground: #c4c4c0;

  --editor: #0b0b0c; /* the slab stays the same in both themes */
  --editor-gutter: #6d6d6a;
  --editor-plain: #b4b4b0; /* oklch(0.769 0.006 106.5) */
  --editor-string: #c5ebd8;
  --editor-comment: #5a5a57;

  --success: #14301f; /* oklch(0.281 0.047 155.2) */
  --success-foreground: #8fd4ab; /* oklch(0.813 0.091 157.6) */
  --success-border: #245a3d; /* oklch(0.422 0.076 157.3) */
  --info: #12283b; /* oklch(0.269 0.045 246.6) */
  --info-foreground: #8ec0ee; /* oklch(0.789 0.084 246.8) */
  --info-border: #234b6e; /* oklch(0.401 0.075 247.3) */
  --warning: #3a2f0d; /* oklch(0.310 0.052 91.0) */
  --warning-foreground: #e6c25b; /* oklch(0.826 0.128 90.1) */
  --warning-border: #6b5418; /* oklch(0.458 0.082 87.0) */
  --destructive: #3b1a1b; /* oklch(0.266 0.052 19.3) */
  --destructive-foreground: #f09a9c; /* oklch(0.773 0.103 18.2) */
  --destructive-border: #7a2f31; /* oklch(0.413 0.105 21.3) */
  --planned: #26262a;
  --planned-foreground: #c4c4c0;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-muted: var(--muted);
  --color-border: var(--border);
  --color-primary: var(--primary);
  --color-success: var(--success);
  --color-info: var(--info);
  --color-warning: var(--warning);
  --color-destructive: var(--destructive);
  --color-editor: var(--editor);
  --radius-sm: calc(var(--radius) - 2px);
  --radius-md: var(--radius);
  --radius-lg: calc(var(--radius) + 4px);
  --radius-xl: calc(var(--radius) + 8px);
}
```

Rules: status fills are never used as button backgrounds except the soft destructive tint; `--ring` blue is the only saturated blue outside the info badge; `--editor` does not change with theme.

---

## 3. Typography

**Sans (UI):** a neutral grotesk with a tall x-height and tabular figures (e.g. Inter-class, or the company's existing UI face). **Mono (code / meta):** a mono with slashed zero and clear `{}` `[]`, 13px default (e.g. JetBrains Mono / Geist Mono class). Weights used: 400 and 600 only. 500 is permitted for badge text and tab labels; 700 is never used in chrome.

| Role                                     | Size / line   | Weight            | Tracking           | Colour                                 |
| ---------------------------------------- | ------------- | ----------------- | ------------------ | -------------------------------------- |
| h1 — page / template title               | 26px / 32px   | 600               | −0.01em            | `--foreground`                         |
| h2 — card / panel title                  | 18px / 24px   | 600               | −0.005em           | `--foreground`                         |
| h3 — dialog / popover title              | 16px / 22px   | 600               | 0                  | `--foreground`                         |
| Uppercase section label                  | 11px / 16px   | 500               | +0.06em, uppercase | `--foreground-meta` — 8px gap to value |
| Body / nav / tabs / buttons              | 14px / 20px   | 400 (buttons 500) | 0                  | `--foreground-secondary`               |
| Small — timestamps, helper               | 12.5px / 18px | 400               | 0                  | `--foreground-meta`                    |
| Mono — IDs, slugs, variables, DNS values | 13px / 18px   | 400               | 0                  | `--foreground` on `--muted` chip       |
| Mono — code editor                       | 13px / 20px   | 400               | 0                  | `--editor-plain` on `--editor`         |
| Eyebrow (object type above h1)           | 13px / 18px   | 400               | 0                  | `--foreground-meta`                    |

Numbers in tables and diagnostics use `font-variant-numeric: tabular-nums`. Body text in the _preview_ renders at the template's own scale — the studio never restyles the email.

**Display serif — recommendation: do not use one in the chrome.** The reference achieves warmth with generous spacing, not with a second family. If leadership wants a signature, allow a serif only in one place: the empty-state title on the Templates index (26px / 32px, 400, `--foreground`). Never in nav, buttons, badges, dialogs or the editor. If the serif is adopted, its fallback stack must hold the same line-height so layouts do not shift.

---

## 4. Spacing, radius, borders

**Spacing scale (px):** 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80. Grid is 4px; 8px is the working unit.

- Sidebar 240px; icon rail (studio mode) 64px; top bar 56px.
- Content inset from sidebar edge 80px; right margin 80px; max content width 1120px, then centred.
- Card inner padding 24px; dialog padding 24px; popover padding 16px.
- Page header → meta grid 40px; meta grid → first card 40px; card → card 24px.
- Control row height 36px (36 for every button, input, select, tab, chip host). Form rows 44px pitch. List/diagnostic rows 56px pitch. Nav items 36px with 4px gap.
- Editor ↔ preview gutter 12px; split 44 / 56.

**Radius scale:** 4px (kbd chip, variable chip), 6px (badge, mono chip), 8px (buttons, inputs, tabs, nav item), 12px (cards, editor slab, preview sheet, popover), 16px (dialog, template card, entity tile). Larger surface → larger radius; nothing is a full pill except the environment badge.

**Borders:** 1px always. `--border` on cards, inputs, top bar, dialogs, template cards. `--border-subtle` on row dividers, sidebar edge, rail edge, preview header rows. No 2px borders. Focus: 2px `--ring` ring with 2px offset, replacing the border colour rather than adding to it.

**Elevation:** none on cards. Popovers/menus/toasts: `0 4px 16px rgba(17,17,16,0.08)` light, `0 4px 16px rgba(0,0,0,0.40)` dark. Dialog backdrop: `--background` at 85% opacity with 4px blur — the page fades, it does not go dark.

---

## 5. Component inventory

### Top nav (dashboard mode)

56px, `--card` bg, bottom hairline `--border`. Left: workspace switcher (14px/500, chevron). Centre: nothing. Right: environment badge, "Docs" ghost, "Feedback" secondary with `F` kbd chip, 28px avatar. **Studio mode:** same height, bg `--background`, no bottom line; left home icon button; centre breadcrumb `Templates / <name>` (parent `--foreground-secondary` 400, current `--foreground` 600, 14px) followed by 12px gap and "Draft" in 13px `--foreground-meta`; right cluster avatar · secondary · primary.

### Environment badge

Pill (full radius), 24px tall, 12px padding, 11px/500 uppercase +0.06em. `sandbox` = `--warning`/`--warning-foreground`; `production` = `--planned`/`--planned-foreground` with a 6px `--success-foreground` dot; `local` = `--info`. Always present in the top nav; never hidden in studio mode.

### Page header

Detail: 72px entity tile (radius 16, `--border`, inner `--info` radial at 40%) left of eyebrow (13px, object type) over h1. Right side: at most one primary plus icon buttons. Index: h1 with primary right-aligned on the same baseline, 24px to the search row.

### Buttons (all 36px, radius 8, 14px/500, 16px horizontal padding, 8px icon gap)

- **Primary:** `--primary` bg, `--primary-foreground` text. Hover: 92% opacity. Active: 100%, translate none. One per bar.
- **Secondary:** `--muted` bg, `--secondary-foreground`, no border. Hover `--muted-strong`.
- **Ghost:** transparent, `--foreground-secondary`; hover `--muted`. Used for Docs, Cancel-in-destructive, inline "Reply-to".
- **Icon:** 36px square (or 32px in dense rows), hairline `--border`, radius 8; hover `--muted`.
- **Disabled-with-reason:** bg `--muted-strong`, text `--foreground-meta`, cursor default, `aria-disabled`; a 12.5px reason line sits 6px beneath or in a tooltip on hover/focus — e.g. "Fix 2 errors to publish". Never dim to 40% without a reason.
- **Destructive:** `--destructive` bg, `--destructive-foreground` text, `--destructive-border`; disabled until type-to-confirm matches.
- **kbd chips inside buttons:** 20px, radius 4, 11px mono, bg `rgba(0,0,0,.18)` on primary / `--muted-strong` on secondary.

### Status badge

24px, radius 6, 10px padding, 12.5px/500. Text is always dark-hue on pale tint:

- **valid** `--success`/`--success-foreground` · **warning** `--warning`/`--warning-foreground` · **error** `--destructive`/`--destructive-foreground` · **neutral** `--planned`/`--planned-foreground` · **planned** `--planned` with dashed 1px `--border` and `--foreground-meta` text.
  Optional 6px leading dot in the foreground colour. Selected-row variant deepens the fill by one step.

### Tabs

Segmented text tabs, no container. 32px, radius 8, 12px padding, 14px. Active: `--muted` fill, `--foreground` 500. Inactive: transparent, `--foreground-secondary` 400; hover `--muted` at 50%. Keyboard: arrow keys move, focus ring on the pill.

### Device toggle

Two-segment icon control (monitor / phone) inside a 32px `--muted` track, radius 8, 2px inner padding; active segment `--card` fill with `--border` hairline. Labels "Desktop 640" and "Mobile 375" appear as 11px mono to the right. Persists per template.

### Editor chrome

Toolbar row 36px above the slab: left label "HTML source" (14px/500) + language pill (mono 11px on `--muted`); right: "Format", "Copy", lock-gated "Edit source" when a visual layer exists. Slab: `--editor` bg, radius 12, 1px `--border` at 40% for dark mode, 56px gutter with right-aligned numbers in `--editor-gutter`, code starts at 72px. Current line: `rgba(255,255,255,.04)` band. Syntax: tags/plain `--editor-plain`, attribute names one step darker (#8f8f8b), punctuation #7a7a77, comments `--editor-comment`, strings `--editor-string` (only accent). Error squiggle: 1px dotted `--destructive-foreground`; warning: dotted `--warning-foreground`. Minimum height 480px; resizable via 12px gutter handle.

### Payload panel

Collapsible right/bottom panel titled with uppercase label "PAYLOAD" and a "Sample · Live" tab pair. JSON viewer uses the editor palette (keys `--editor-plain` at 100% white in dark, strings mint, brackets #7a7a77). Each top-level key has an inline "Insert `{{key}}`" ghost action on hover. Invalid JSON shows an error row beneath, not a toast. Footer: "Last fetched 14s ago" 12.5px mono.

### Preview mail-frame

White sheet `--card`, radius 12, hairline `--border`, sits 8px higher than the editor slab. Envelope header rows at 44px pitch, label column 120px in `--foreground-meta` 13px, values 14px `--foreground`, dividers `--border-subtle`: From · To · Subject · Preheader. Below: the rendered email inside a fixed-width frame — **Desktop 640px** or **Mobile 375px** — centred on a 20px dot-grid stage (dots `--border` 1px at 12px pitch) to make the frame width legible. Frame has 1px `--border` and radius 8; body is never scaled. Top-right of frame: mono width label "640 px" / "375 px". Plain-text and raw-HTML views are tabs above the frame.

### Diagnostics rows

List under uppercase labels "NEEDS ATTENTION" / "PASSING" / "PLANNED CHECKS". 56px rows, `--border-subtle` dividers. Leading 12px chevron (`--foreground-meta`) then 18px icon: error = circle-x `--destructive-foreground`; warning = triangle `--foreground-meta` (grey, not amber, so the page reads as mostly fine); pass = check-circle `--success-foreground`. Text 14px; right side optional badge and a mono location `line 42`. Expanded row shows a 12.5px explanation and one ghost action ("Jump to line"). Footer: "Checked at 11:18 PM" 12.5px with time in 500.

### Template cards

Grid of 320×204 cards, radius 16, `--card`, `--border`. Thumbnail: 240px-wide framed preview with radius 8 top corners and soft shadow, offset so it crops out of the card's bottom edge. Name (14px/600) and mono slug (13px `--foreground-meta`) sit _below_ the card, 8px apart. Hover: `--border` darkens to `--foreground-placeholder`, 32px icon "…" button appears top-right. **Selected:** 2px `--ring` outline at 2px offset, card bg `--muted` at 40%; name switches to `--foreground`. Menu: 200px, radius 12, 40px items, divider before "Delete template" (text `--destructive-foreground`).

### Footer

40px, bg `--background`, top hairline `--border-subtle`. Left: version `v2.3.1` mono 12.5px; centre: "Preview rendered 14s ago"; right: "Docs · Shortcuts (?)" ghost links. In studio mode the footer becomes a 28px status strip: cursor position `Ln 42, Col 8`, `HTML`, `LF`, `UTF-8`, and validation summary "2 errors · 1 warning".

### Toast

Bottom-right, 24px margin, 400×64 max, radius 12, `--card` with a left-to-right tint gradient (status fill → `--card` by 40%) and tinted border. Leading 16px filled dot in the status foreground. 14px/500 text, one sentence, full stop. Auto-dismiss 4s (success), 8s (warning), persistent with close for error. Max three stacked.

### Dialog

Max 560×auto, radius 16, `--card`, `--border`, shadow; padding 24px; backdrop `--background` at 85% with blur. Title h3, 12px × close top-right. Fields: label 14px, 8px gap, input 36px `--muted` fill with `--border`, radius 8; helper 12.5px `--foreground-meta` 6px below. Footer left-aligned: primary with `⌘ ↵` chips, then "Cancel" secondary with `Esc` chip. Destructive variant: impact list with 600 counts, red question line, "Type `<slug>` to confirm." mono chip with copy, then soft-red button disabled until match; Cancel becomes ghost.

---

## 6. Microcopy guide

Rules: labels are single nouns; statuses are past participles or single adjectives; actions are verb + object; full sentences with periods only in toasts, helpers, banners and confirmations. No exclamation marks. Name the exact control when instructing.

1. Meta labels — `FROM` · `SUBJECT` · `PREHEADER` · `SLUG` · `UPDATED` · `OWNER`
2. Section labels — `NEEDS ATTENTION` · `PASSING` · `PLANNED CHECKS` · `PAYLOAD` · `VERSIONS`
3. Status badges — `Valid` · `Warning` · `Error` · `Draft` · `Planned`
4. Primary CTA — `Create template`
5. Primary CTA — `Publish version`
6. Secondary — `Send test`
7. Disabled reason — `Fix 2 errors to publish.`
8. Disabled reason — `Add a subject line to send a test.`
9. Toast (success) — `Template published as v4.`
10. Toast (success) — `Test sent to two addresses.`
11. Toast (error) — `Publish failed. The API returned 502; nothing was changed.`
12. Helper — `Separate multiple addresses with commas or line breaks.`
13. Helper — `Slug is used in the API and cannot be changed after publishing.`
14. Banner (info) — `Sample payload is stale. Fetch a live payload to preview current fields.`
15. Banner (warning) — `Preview uses sample data. Missing keys render as empty strings.`
16. Diagnostic row — `Image is missing alt text · line 42`
17. Diagnostic row — `Unknown variable {{user.plan_name}} · not in payload`
18. Confirm (data loss) — `Switching to source will replace the visual layout and can't be undone.` → `Hold to confirm`
19. Confirm (delete) — `Deleting welcome-v2 removes 3 published versions. Type welcome-v2 to confirm.`
20. Empty state — `No templates yet` / `Create a template or import HTML to reuse across sends.` / `Create template`

Also fixed: search placeholder `Search templates…`; filter default `All statuses`; relative time `just now · 4 min ago · 3 h ago · Sep 7`; breadcrumb `Templates / welcome-v2  Draft`.

---

## 7. Motion

- **Durations:** 120ms for hover/focus/fill changes; 160ms for tabs, toggles, badge swaps; 200ms for popovers, menus, toasts; 240ms for dialogs and the sidebar ↔ rail collapse. Nothing exceeds 240ms.
- **Easing:** `cubic-bezier(0.2, 0, 0, 1)` for entrances, `cubic-bezier(0.4, 0, 1, 1)` for exits. No bounce, no overshoot.
- **What moves:** opacity and ≤8px translate only. Popovers/menus fade + 4px rise from the anchor; toasts fade + 8px rise; dialogs fade with a 0.98 → 1 scale; the device toggle animates frame _width_ over 200ms with the email re-laying out live.
- **What does not move:** colour of text, borders, layout of the editor slab, status badges (they swap, they do not pulse). Hold-to-confirm fills the button left-to-right over 1200ms linear and resets in 160ms on release.
- **Loading:** an indeterminate 2px bar at the top of the preview sheet in `--foreground-placeholder`; spinners only inside buttons (14px, 800ms rotation).
- **Reduced motion:** under `prefers-reduced-motion: reduce`, all translate/scale become none, durations drop to 0ms except opacity (80ms), the hold-to-confirm fill becomes a numeric countdown, and the frame-width change is instant.

---

## 8. Anti-patterns

- Solid-colour badges or white text on saturated fills. Status is always pale tint + dark same-hue text.
- Two primary buttons on one bar, or a primary in a card header.
- Shadows on cards; dark scrim behind dialogs. Containers are hairlines; backdrops fade to off-white.
- Amber for "pending" or "planned". Reserve amber for warnings that need a decision; planned and neutral are grey.
- Multi-hue syntax highlighting in the editor. One accent (strings) only; user-content code blocks in the email may be colourful, chrome may not.
- Scaling the preview to fit. Show 640 or 375 at 1:1 and let it scroll.
- Disabling a button without stating the reason nearby.
- Confirmation dialogs for reversible actions; toasts for irreversible ones.
- Decorative gradients, icons with fills, or illustration in empty states. One title, one sentence, one CTA.
- Bold (700), letter-spaced body text, or more than two type weights in chrome.
- A serif anywhere in nav, controls, dialogs or the editor.
- Radii larger than 16px, borders thicker than 1px, controls taller than 36px in the shell.
- Copying the reference product's name, logo, exact hex values or its "Slide to publish" control; Studio uses hold-to-confirm and type-to-confirm only.
