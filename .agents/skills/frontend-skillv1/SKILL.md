---
name: frontend-skillv1
description: Frontend design engineering, UI polish, layout, typography, colors, accessibility, copywriting, component states, animations, and design translation from interfaces.dev (jakubkrehel/skills). Use when building, styling, reviewing, or debugging frontend interfaces, web apps, components, design systems, layouts, CSS, Tailwind, or animations.
license: MIT
metadata:
  source: https://github.com/jakubkrehel/skills
  author: Jakub Krehel (interfaces.dev)
---

# Frontend Skill (v1)

This skill consolidates the complete collection of design engineering and interface craft from [interfaces.dev](https://interfaces.dev/) (`jakubkrehel/skills`). It provides exact principles, prescriptive values, formulas, and verification checks for building and reviewing production web interfaces across:

1. **UI Polish & Motion** (`skills/better-ui/`)
2. **Layout & Adaptivity** (`skills/better-layout/`)
3. **Typography & Typesetting** (`skills/better-typography/`)
4. **Colors & Contrast** (`skills/better-colors/`)
5. **Accessibility & WCAG 2.2** (`skills/better-accessibility/`)
6. **Product Copywriting** (`skills/better-writing/`)
7. **Design Translation & Figma Fidelity** (`skills/build-design/`)
8. **Component Robustness & Testing** (`skills/break/`, `skills/variant/`, `skills/state-machine/`)
9. **Interface Review** (`skills/better-interface/`, `skills/interface-review/`)

---

## 1. UI Polish & Motion (`better-ui`)

- **Concentric Radius Formula**: Where nested surfaces share a visible, even inset:
  `outer_radius = inner_radius + padding + border_width`
  (Past `24px` of padding or with asymmetric padding, treat layers as separate surfaces).
- **Shadows for Elevation, Borders for Structure**:
  - Replace borders used solely for depth with layered transparent `box-shadow` values.
  - Keep borders on dividers, separators, table cells, and form inputs (inputs need 3:1 non-text contrast).
  - Support forced-colors mode with `border: 1px solid transparent` under shadow rings.
- **Image Outlines**: Give content images a `1px` outline inset by `1px`:
  `oklch(0 0 0 / 0.1)` in light mode, `oklch(1 0 0 / 0.1)` in dark mode. Never use tinted neutrals or brand colors.
- **Optical Alignment**:
  - Give buttons `2px` less padding on the icon side.
  - Shift play triangles toward their point (`+1px` to `+2px` X).
  - Optically balance icons where geometric bounding box centers look off.
- **Interactive State Transitions**:
  - High-frequency interactions (keystrokes, row hover, tab switches): instant or `<= 150ms` on `opacity` or `background-color`.
  - Press scaling: scale to `0.96` over `150ms` with `ease-out`; disabled buttons never scale.
  - Contextual icon swaps (copy -> copied, play -> pause): cross-fade with scale `0.25` -> `1`, opacity `0` -> `1`, blur `4px` -> `0px`, duration `300ms`, `cubic-bezier(0.2, 0, 0, 1)`.
  - Staggered entrances: stagger chunks `100ms` apart (opacity, `4px` blur, `12px` translateY over `300ms` `ease-out`).
  - Exits: shorter and smaller (`150ms`, opacity, `4px` blur, `-12px` translateY).
  - **Always gate motion behind `prefers-reduced-motion`** (fall back to an opacity cross-fade).
  - Supporting references: [surfaces.md](skills/better-ui/surfaces.md), [animations.md](skills/better-ui/animations.md), [enter-exit.md](skills/better-ui/enter-exit.md), [icon-transitions.md](skills/better-ui/icon-transitions.md), [performance.md](skills/better-ui/performance.md).

---

## 2. Layout & Adaptivity (`better-layout`)

- **Spatial Grouping & Proximity**:
  - Space between distinct sections must strictly exceed space within a section.
  - Labels must be closer to their inputs than the preceding field (`margin-bottom` on previous input > `margin-bottom` on label).
- **Logical CSS Properties**:
  - Use `margin-inline`, `padding-inline`, `inset-inline`, `border-inline`, `text-align: start/end` instead of physical `left`/`right` for natural RTL support.
- **Expansion Affordances**:
  - Any text truncated with an ellipsis (`text-overflow: ellipsis`) must have a mechanism to reveal full content (tooltip, hover expansion, or popover).
- **Responsive Stacking**:
  - Container queries (`@container`) over rigid viewport media queries where components appear in multiple contexts.
  - Supporting references: [grouping-and-alignment.md](skills/better-layout/grouping-and-alignment.md), [spacing-and-adaptivity.md](skills/better-layout/spacing-and-adaptivity.md).

---

## 3. Typography & Typesetting (`better-typography`)

- **Font Pairing & System Stacks**:
  - Use native system font stacks (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`) for performance and OS cohesion.
  - Menlo, SF Mono, JetBrains Mono for code and monospace numerals.
- **Type Scale & Line Heights**:
  - Body text (`14px` - `16px`): line-height `1.4` to `1.6` (`140%` - `160%`).
  - Headings / titles: tighter line-height `1.1` to `1.25` (`110%` - `125%`).
  - Captions / secondary labels (`11px` - `13px`): line-height `1.3` to `1.4`.
- **Numerals & Metrics**:
  - Use `font-variant-numeric: tabular-nums` (or `font-feature-settings: "tnum"`) for timers, counters, prices, file sizes, and table columns so digits don't jitter when changing.
- **Wrapping & Punctuation**:
  - Use `text-wrap: balance` for headings and card titles.
  - Use `text-wrap: pretty` for body paragraphs to avoid single-word orphans.
  - Straight quotes in code/data; smart typographical quotes `“”` / `‘’` and real apostrophes in editorial copy.
  - Supporting references: [spacing-and-sizing.md](skills/better-typography/spacing-and-sizing.md), [wrapping-and-punctuation.md](skills/better-typography/wrapping-and-punctuation.md), [variable-fonts-and-opentype.md](skills/better-typography/variable-fonts-and-opentype.md), [css-cheat-sheet.md](skills/better-typography/css-cheat-sheet.md).

---

## 4. Colors & Contrast (`better-colors`)

- **Contrast Ratios (WCAG 2.2)**:
  - Normal text (< 18pt or < 14pt bold): minimum **4.5:1** contrast.
  - Large text (>= 18pt or >= 14pt bold): minimum **3:1** contrast.
  - Interactive UI components and borders (inputs, checkboxes, active states): minimum **3:1** contrast.
  - Secondary/muted text must not drop below 4.5:1 against its immediate card/pane surface.
- **Semantic Tokens Over Raw Hex**:
  - Map colors through semantic tokens: `--bg-canvas`, `--bg-surface`, `--bg-subtle`, `--text-primary`, `--text-muted`, `--border-subtle`, `--border-focus`, `--accent`, `--danger`.
  - Avoid raw hex values in individual component classes.
- **Dark Mode Surfaces**:
  - Tint dark surfaces subtly with the theme hue or use pure OLED black `#000000` / `#0a0a0c` where deep contrast is intentional.
  - Elevated surfaces become lighter as they get higher (`#101014` -> `#16171b` -> `#202127`).
  - Supporting references: [contrast.md](skills/better-colors/contrast.md), [palette-generation.md](skills/better-colors/palette-generation.md), [token-naming.md](skills/better-colors/token-naming.md), [color-formats.md](skills/better-colors/color-formats.md).

---

## 5. Accessibility (`better-accessibility`)

- **Hit Areas**:
  - Minimum touch/click target size: **44 × 44 px** (or **24 × 24 px** with adequate spacing per WCAG 2.2 Target Size Minimum).
- **Keyboard Navigation & Focus**:
  - Every interactive element must be reachable and operable via keyboard (`Tab`, `Shift+Tab`, `Enter`, `Space`, Arrows).
  - Never set `outline: none` or `outline: 0` without an explicit `:focus-visible` custom ring.
  - Custom focus rings: `2px` or `2.5px` accent outline with clear contrast against both light and dark surfaces.
- **ARIA & Semantics**:
  - Use native HTML elements (`<button>`, `<a>`, `<input>`, `<dialog>`) before custom `div` implementations.
  - For custom controls, provide explicit `role`, `aria-label`, `aria-checked`/`aria-selected`/`aria-expanded`.
- **Screen Reader Announcements**:
  - Dynamic status changes must use `aria-live="polite"` or `role="status"`.
  - Supporting references: [focus-and-keyboard.md](skills/better-accessibility/focus-and-keyboard.md), [semantics-and-aria.md](skills/better-accessibility/semantics-and-aria.md), [hit-areas.md](skills/better-accessibility/hit-areas.md), [forms.md](skills/better-accessibility/forms.md), [motion-and-zoom.md](skills/better-accessibility/motion-and-zoom.md).

---

## 6. Product Copywriting (`better-writing`)

- **Action-Oriented & Clear**:
  - Button labels describe the action directly: `Delete file`, `Save changes`, `Download invoice` (not vague `OK`, `Yes`, `Submit`).
- **Destructive Actions**:
  - Provide either an explicit confirmation step or an instant Undo notification (e.g. `Moved to trash. Undo`).
- **Error Messages**:
  - State what went wrong clearly in sentence case and tell the user how to fix it or what to do next.
  - Supporting references: [patterns.md](skills/better-writing/patterns.md).

---

## 7. Design Translation (`build-design`)

- Build from design mockups, Figma, or images by mapping directly to the project's existing tokens, radius scales, font families, and components.
- Match exact paddings, insets, and alignments without introducing unneeded dependencies.
- Supporting reference: [figma.md](skills/build-design/figma.md).

---

## Directory Reference Index

All deep reference guides from `jakubkrehel/skills` are bundled in this directory under `skills/`:

```
skills/
├── better-accessibility/      # Focus, keyboard, ARIA, hit areas, forms, screen readers
├── better-colors/             # Palette structure, tokens, contrast, formats
├── better-interface/          # Review orchestration & format
├── better-layout/             # Grouping, alignment, spacing, adaptivity
├── better-typography/         # Type scale, font features, wrapping, punctuation
├── better-ui/                 # Surfaces, radius, shadows, animations, icon transitions
├── better-writing/            # Copywriting patterns, error handling, microcopy
├── break/                     # Scenario testing & component stress tests
├── build-design/              # Figma & design image translation
├── explain-interface/         # Interface inspection & visual effect analysis
├── interface-review/          # Diff-scoped review & regression tracking
├── state-machine/             # State exploration & mock switchers
├── teardown/                  # Technical illustration & exploded views
└── variant/                   # Design variant generation & pickers
```
