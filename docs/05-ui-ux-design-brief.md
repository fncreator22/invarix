# 05 — UI/UX Design Brief: Reprieve

| Field | Value |
| --- | --- |
| **Product** | Reprieve — the exception debt agent |
| **Version** | 1.0 (draft for build kickoff) |
| **Date** | 2 Oct 2026 |
| **Owner** | Solo founder / developer |
| **Status** | Ready to build |
| **Depends on** | `01-PRD.md` (principles, accessibility NFRs), `02-tech-stack.md` §4.1 (Tailwind v4, shadcn/ui, lucide-react, motion, next-themes, Recharts, react-force-graph-2d, sonner, cmdk), `04-user-flow-and-screens.md` (screens, states, patterns) |
| **Feeds** | `06-implementation-plan.md` |
| **Cross-references from other docs** | `02` §4.1 cites **§4 (fonts)** here; `02` §6 cites **§3 (design tokens)** for `frontend/styles/globals.css`. Keep those section numbers stable. |

---

## 1. Purpose and design principles

This brief defines **how Reprieve looks, feels, and behaves**: theme, color, type, icons, layout, spacing, components, navigation, overlays, feedback, and motion. It is the single reference for building `globals.css`, the shadcn theme, and every product component.

### 1.1 Design principles (each maps to a product principle in PRD §4)

| # | Principle | What it means in the UI |
| --- | --- | --- |
| D1 | **Proof before polish** | Every alert and answer shows its evidence (proof path, citations, score breakdown) in the first view, not behind a click. Explainability *is* the visual centerpiece. |
| D2 | **Calm, serious, alive** | A risk tool must feel trustworthy and quiet; motion and gradient are used to guide attention and reward understanding, never to decorate. |
| D3 | **Color carries meaning, never alone** | Severity, status, and rule colors always pair with an icon or text label. The palette is also readable in grayscale. |
| D4 | **Humans decide** | Agent proposals look different from confirmed facts (dashed outline, "Proposed" label) and always end in an explicit **Approve** control. |
| D5 | **Dense but breathable** | Data-heavy screens use compact rows with generous grouping; whitespace separates ideas, not every element. |
| D6 | **Fast feeling** | Skeletons match final layout; interactions respond in under 100 ms; animation never blocks input. |
| D7 | **One system, two themes** | Dark and light are designed together from the same tokens; neither is an afterthought. |

### 1.2 Brand personality

**Clear. Precise. Quietly confident.** Like a good incident commander: calm under pressure, shows its work, never shouts. Visual references: modern developer and security tooling (restrained dark surfaces, crisp type, luminous accents), editorial clarity for marketing. Avoid: neon-cyberpunk "hacker" looks, red-everywhere alarmism, stock photography, cartoon mascots.

**Name meaning.** *Reprieve* is "a temporary stay". The logo mark and motion language echo a **pause that is easy to forget**: a ring that is not quite closed.

---

## 2. Theme and visual direction

### 2.1 Theme strategy

| Decision | Choice |
| --- | --- |
| Themes | **Dark** and **Light**, plus **System** (default) via `next-themes` (class strategy, `.dark` on `<html>`) |
| Marketing landing | **Designed dark-first** (the aurora gradient reads best on dark) but fully supported in light; first paint follows system to avoid flash |
| App | System default; user toggle in the account menu and Command palette |
| Switching | 200 ms cross-fade of color tokens; disabled when reduced motion is on |
| Print / PDF | Light tokens, graph rendered static |

### 2.2 Visual language ("layered signal")

| Element | Direction |
| --- | --- |
| **Surfaces** | Three to four stacked layers (canvas, surface, raised, overlay). Separation comes from **subtle tone shifts and 1 px borders**, with soft shadows in light and inner top-highlights in dark. |
| **Color** | Near-neutral cool slate base; one **brand violet**; one **signal cyan** reserved for "proof" (paths, citations, live evidence); a four-step **severity scale**. |
| **Gradients ("smart color, not solid")** | A signature **Aurora gradient** (violet → blue → cyan) used sparingly: hero, primary-button glow, proof-path stroke, score-ring highlight, splash, focus glows. Large surfaces use **mesh-like radial gradients at 8 to 14% opacity** over the canvas, never solid saturated blocks. |
| **Depth** | Overlays use **glass**: translucent surface plus backdrop blur. Cards use a faint top-lit gradient in dark. |
| **Shape** | Soft-rounded rectangles (10 to 14 px) for containers, full pills for chips, circles for rings and graph nodes. |
| **Texture** | Optional 2% noise on the hero background only. No textures inside data screens. |
| **Illustration** | Abstract **constellation line-art** (nodes and edges) in brand colors for empty states and marketing. No people, no stock photos. |

---

## 3. Design tokens

All values live as CSS variables in `frontend/styles/globals.css`, exposed to Tailwind v4 via `@theme inline`, and mirrored in `lib/tokens.ts` for canvas and chart code. **Components never use raw hex values.**

### 3.1 Color palette

#### 3.1.1 Neutrals (surfaces and text)

| Token | Dark | Light | Use |
| --- | --- | --- | --- |
| `--bg-canvas` | `#0A0C11` | `#F6F7FA` | App background |
| `--bg-surface` | `#11141B` | `#FFFFFF` | Cards, panels, table body |
| `--bg-raised` | `#171B24` | `#FFFFFF` (with shadow) | Popovers, menus, hovered cards |
| `--bg-overlay` | `#1D222D` | `#FFFFFF` | Dialogs, sheets |
| `--bg-sunken` | `#0D1015` | `#EDEFF4` | Inputs, code, wells, table header |
| `--border-subtle` | `#232937` | `#E3E6EE` | Dividers, card edges |
| `--border-default` | `#2E3546` | `#CDD2DE` | Inputs, table lines |
| `--border-strong` | `#3A4358` | `#8A93A6` | Input outlines that must pass 3:1 (see §15) |
| `--text-primary` | `#EEF1F7` | `#0F1320` | Headings, body |
| `--text-secondary` | `#A9B2C5` | `#4A5367` | Supporting text |
| `--text-muted` | `#8791A6` | `#5E687C` | Metadata, placeholders (still 4.5:1 or better) |
| `--text-on-brand` | `#FFFFFF` | `#FFFFFF` | Text on solid brand buttons |

#### 3.1.2 Brand and signal

| Token | Dark | Light | Use |
| --- | --- | --- | --- |
| `--brand` | `#8B7DFF` | `#5B4BE0` | Primary actions (text and icons), links, selection |
| `--brand-solid` | `#6D5EF6` | `#5B4BE0` | Filled button background (white text, 4.6:1 or better) |
| `--brand-soft` | `rgba(139,125,255,.14)` | `rgba(91,75,224,.08)` | Selected rows, active nav, chips |
| `--proof` | `#22D3EE` | `#0F6F8A` | **Proof paths, citations, evidence** (signature color) |
| `--proof-soft` | `rgba(34,211,238,.12)` | `rgba(15,111,138,.08)` | Proof path highlight backgrounds |
| `--aurora` | `linear-gradient(120deg,#7C6CFF 0%,#4F8BFF 55%,#22D3EE 100%)` | same | Gradient accent (see §2.2) |
| `--aurora-glow` | `0 0 0 1px rgba(139,125,255,.4), 0 8px 32px -8px rgba(124,108,255,.45)` | `0 8px 24px -8px rgba(91,75,224,.35)` | Primary CTA and hero glow |

#### 3.1.3 Semantic: severity and status

Severity bands match scoring bands in `03` §8.4 (low under 25, moderate 25 to under 50, high 50 to under 75, critical 75 and above).

| Token | Dark text/icon | Light text/icon | Soft fill (dark / light) | Icon (paired, mandatory) |
| --- | --- | --- | --- | --- |
| `--sev-low` | `#34D399` | `#0A7A5A` | `rgba(52,211,153,.14)` / `rgba(10,122,90,.09)` | `circle-check` |
| `--sev-moderate` | `#FBBF24` | `#A84B08` | `rgba(251,191,36,.14)` / `rgba(168,75,8,.09)` | `triangle-alert` |
| `--sev-high` | `#FB923C` | `#B8400A` | `rgba(251,146,60,.15)` / `rgba(184,64,10,.09)` | `octagon-alert` |
| `--sev-critical` | `#FB7185` | `#BE123C` | `rgba(251,113,133,.16)` / `rgba(190,18,60,.09)` | `siren` |
| `--info` | `#60A5FA` | `#1D4ED8` | `rgba(96,165,250,.14)` / `rgba(29,78,216,.08)` | `info` |
| `--success` | `#34D399` | `#0A7A5A` | as low | `check` |
| `--warning` | `#FBBF24` | `#A84B08` | as moderate | `triangle-alert` |
| `--danger` | `#FB7185` | `#BE123C` | as critical | `circle-x` |

**Contrast (computed):** in dark, all text and semantic colors measure **5.3:1 or better** on canvas, surface, and raised layers (primary text 15:1 or better). In light, all semantic text colors measure **4.6:1 or better** on white, canvas, and sunken surfaces. Solid brand button with white text is **5.9:1** in light and `#6D5EF6` gives **4.6:1** in dark.

#### 3.1.4 Status chips (non-severity)

| Status | Style |
| --- | --- |
| Active | `--sev-low` outline, dot |
| Expiring (within window) | `--sev-moderate` soft |
| Expired (derived) | `--sev-critical` soft, strikethrough on date |
| Renewed | `--brand-soft`, `repeat` icon |
| Revoked / Closed | neutral soft, `ban` / `circle-slash` icon |
| Draft / Proposed | **dashed border**, `--text-secondary` (agent or unapproved) |
| Snoozed | neutral soft, `bell-off` icon with until-date |

#### 3.1.5 Rule chips (R1 to R8)

Neutral soft chip with mono ID ("R4") and a short label. Rule identity is never encoded by color alone: **text plus icon** (R1 `clock`, R2 `user-x`, R3 `link-2`, R4 `layers`, R5 `repeat`, R6 `calendar-range`, R7 `shield-off`, R8 `route`).

#### 3.1.6 Graph colors (also in `lib/tokens.ts`)

Each node type has a **color and a shape**, so the graph remains readable without color.

| Node | Shape | Dark | Light |
| --- | --- | --- | --- |
| Service | circle | `#8B7DFF` | `#5B4BE0` |
| Exception | diamond | by severity (§3.1.3) | by severity |
| Person | rounded square | `#60A5FA` | `#1D4ED8` |
| Team | hexagon | `#7DD3FC` | `#0369A1` |
| Control | triangle | `#C4B5FD` | `#6D28D9` |
| CompensatingControl | shield | `#5EEAD4` | `#0F766E` |
| CustomerPath | star | `#F0ABFC` | `#A21CAF` |
| Runbook / Evidence | small square | `#94A3B8` | `#475569` |
| Alert | ring around subject | severity color | severity color |

Edges: 1 px `--border-strong` at 50% opacity; **proof-path edges** use `--proof` at 2.5 px with a moving dash. Dimmed (non-path) nodes drop to 20% opacity. Cluster palette (8, colorblind-safe, used only in "color by cluster"): `#8B7DFF #22D3EE #FBBF24 #34D399 #FB7185 #60A5FA #F0ABFC #FB923C`.

### 3.2 Spacing, sizing, shape

**Base unit 4 px.** Scale (`--space-n`): 0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96.

| Context | Rule |
| --- | --- |
| Inside chips and badges | 4 to 8 px |
| Between label and control | 6 px |
| Form field to field | 16 px |
| Card padding | 16 px (compact), 20 px (default), 24 px (spacious) |
| Between cards in a grid | 16 px (24 px at 1440 px and up) |
| Section spacing on app pages | 32 px |
| Marketing section spacing | 96 to 128 px desktop, 64 px mobile |
| Table row height | 40 px (compact), 48 px (default), 56 px (comfortable). Density toggle in R1. |

| Token | Value |
| --- | --- |
| `--radius-sm` | 6 px (chips, inputs inner) |
| `--radius-md` | 10 px (buttons, inputs, menus) |
| `--radius-lg` | 14 px (cards, dialogs) |
| `--radius-xl` | 20 px (marketing cards, hero panels) |
| `--radius-full` | 9999 px (pills, avatars, rings) |

### 3.3 Elevation and borders

| Level | Dark | Light | Used by |
| --- | --- | --- | --- |
| 0 | none | none | Canvas |
| 1 | 1 px `--border-subtle` + top highlight `inset 0 1px 0 rgba(255,255,255,.04)` | 1 px border + `0 1px 2px rgba(15,19,32,.06)` | Cards |
| 2 | `0 8px 24px -8px rgba(0,0,0,.6)` + border | `0 8px 24px -8px rgba(15,19,32,.16)` | Popovers, menus, drawers |
| 3 | `0 24px 64px -16px rgba(0,0,0,.7)` | `0 24px 64px -16px rgba(15,19,32,.24)` | Dialogs, command palette |

### 3.4 Z-index scale

`base 0` · `sticky 10` · `rail 20` · `topbar 30` · `drawer 40` · `popover 50` · `dialog 60` · `toast 70` · `command 80` · `coach-mark 90` · `splash 100`.

### 3.5 Breakpoints (match `04` §9)

`sm 640` · `md 1024` · `lg 1440`; mobile-first. Layout grid in §6.

### 3.6 Token file (excerpt, `frontend/styles/globals.css`, Tailwind v4)

```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));

:root {
  /* light */
  --bg-canvas:#F6F7FA; --bg-surface:#FFFFFF; --bg-raised:#FFFFFF; --bg-overlay:#FFFFFF; --bg-sunken:#EDEFF4;
  --border-subtle:#E3E6EE; --border-default:#CDD2DE; --border-strong:#8A93A6;
  --text-primary:#0F1320; --text-secondary:#4A5367; --text-muted:#5E687C; --text-on-brand:#FFFFFF;
  --brand:#5B4BE0; --brand-solid:#5B4BE0; --brand-soft:rgba(91,75,224,.08);
  --proof:#0F6F8A; --proof-soft:rgba(15,111,138,.08);
  --sev-low:#0A7A5A; --sev-moderate:#A84B08; --sev-high:#B8400A; --sev-critical:#BE123C; --info:#1D4ED8;
  --aurora:linear-gradient(120deg,#7C6CFF 0%,#4F8BFF 55%,#22D3EE 100%);
  --radius-sm:6px; --radius-md:10px; --radius-lg:14px; --radius-xl:20px;
  --ease-out:cubic-bezier(.22,1,.36,1); --ease-in-out:cubic-bezier(.65,0,.35,1);
  --dur-fast:120ms; --dur-base:200ms; --dur-slow:320ms; --dur-draw:700ms;
  /* shadcn semantic mapping */
  --background:var(--bg-canvas); --foreground:var(--text-primary);
  --card:var(--bg-surface); --card-foreground:var(--text-primary);
  --popover:var(--bg-raised); --popover-foreground:var(--text-primary);
  --primary:var(--brand-solid); --primary-foreground:var(--text-on-brand);
  --secondary:var(--bg-sunken); --secondary-foreground:var(--text-primary);
  --muted:var(--bg-sunken); --muted-foreground:var(--text-muted);
  --accent:var(--brand-soft); --accent-foreground:var(--text-primary);
  --destructive:var(--sev-critical); --border:var(--border-default); --input:var(--border-strong); --ring:var(--brand);
  --radius:var(--radius-md);
}
.dark {
  --bg-canvas:#0A0C11; --bg-surface:#11141B; --bg-raised:#171B24; --bg-overlay:#1D222D; --bg-sunken:#0D1015;
  --border-subtle:#232937; --border-default:#2E3546; --border-strong:#3A4358;
  --text-primary:#EEF1F7; --text-secondary:#A9B2C5; --text-muted:#8791A6;
  --brand:#8B7DFF; --brand-solid:#6D5EF6; --brand-soft:rgba(139,125,255,.14);
  --proof:#22D3EE; --proof-soft:rgba(34,211,238,.12);
  --sev-low:#34D399; --sev-moderate:#FBBF24; --sev-high:#FB923C; --sev-critical:#FB7185; --info:#60A5FA;
}
@theme inline {
  --color-canvas:var(--bg-canvas); --color-surface:var(--bg-surface); --color-raised:var(--bg-raised);
  --color-brand:var(--brand); --color-proof:var(--proof);
  --color-sev-low:var(--sev-low); --color-sev-moderate:var(--sev-moderate);
  --color-sev-high:var(--sev-high); --color-sev-critical:var(--sev-critical);
  --font-display:var(--font-bricolage); --font-sans:var(--font-instrument); --font-mono:var(--font-jetbrains);
}
@media (prefers-reduced-motion: reduce) { *,*::before,*::after { animation-duration:.01ms !important; transition-duration:.01ms !important; } }
```

*Note:* the 1 px `--border-strong` is used for form-control outlines so inputs meet the 3:1 non-text contrast rule (`--border-default` is for decorative dividers).

---

## 4. Typography

### 4.1 Typefaces (loaded with `next/font/google`, `display: swap`, subset `latin`)

| Role | Family | Why | Weights |
| --- | --- | --- | --- |
| **Display** (headlines, hero, big numbers) | **Bricolage Grotesque** | Distinctive, confident grotesque with character; stands apart from generic SaaS sans | 600, 700 (variable optical size on) |
| **UI and body** | **Instrument Sans** | Clean, highly legible at small sizes; calm | 400, 500, 600 |
| **Data, IDs, code** | **JetBrains Mono** | Clear character shapes for IDs (`exc_01H…`), node IDs, formulas | 400, 500 |

Fallback stacks: Display `"Bricolage Grotesque", ui-sans-serif, system-ui, sans-serif`; Sans `"Instrument Sans", ui-sans-serif, system-ui, sans-serif`; Mono `"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace`. CSS variables: `--font-bricolage`, `--font-instrument`, `--font-jetbrains`.

### 4.2 Type scale (rem at 16 px base)

| Token | Size / line | Weight | Font | Use |
| --- | --- | --- | --- | --- |
| `display-xl` | 4.5rem / 1.02 (mobile 2.75rem) | 700 | Display | Landing hero |
| `display-lg` | 3rem / 1.08 (mobile 2.25rem) | 700 | Display | Section headlines |
| `h1` | 2rem / 1.2 | 600 | Display | Page titles |
| `h2` | 1.5rem / 1.25 | 600 | Display | Section titles |
| `h3` | 1.125rem / 1.35 | 600 | Sans | Card titles |
| `body-lg` | 1.0625rem / 1.6 | 400 | Sans | Marketing paragraphs |
| `body` | 0.9375rem (15 px) / 1.55 | 400 | Sans | Default app text |
| `body-sm` | 0.8125rem (13 px) / 1.5 | 400/500 | Sans | Table cells, metadata |
| `caption` | 0.75rem / 1.4 | 500 | Sans | Labels, chip text (min size) |
| `overline` | 0.6875rem / 1.2, tracking +0.08em, uppercase | 600 | Sans | Section eyebrows |
| `mono` | 0.8125rem / 1.5 | 400/500 | Mono | IDs, formulas, code |
| `metric` | 2.25rem / 1 (tabular-nums) | 700 | Display | Big numbers on Home |

### 4.3 Rules

- **Never go below 12 px.** App body is 15 px; tables 13 px.
- Numbers in tables, scores, and dates use `font-variant-numeric: tabular-nums`.
- Line length: 60 to 75 characters for prose; chat messages cap at 70ch.
- Letter-spacing: display sizes `-0.02em`; body `0`; overline `+0.08em`.
- Sentence case everywhere; Title Case only for product and feature names.
- IDs always render in mono, truncated in the middle (`exc_01H…9XQ`), copy-on-click with tooltip.
- Markdown from the Steward renders with these styles: headings capped at h3 size, lists with 8 px spacing, code in mono on `--bg-sunken`, sanitized (`rehype-sanitize`).

---

## 5. Iconography

| Decision | Choice |
| --- | --- |
| Library | **lucide-react** only (no mixed sets) |
| Style | 1.5 px stroke, round caps and joins, `currentColor` |
| Sizes | 14 (inline in chips), 16 (default UI), 20 (nav, buttons lg), 24 (empty states, headers), 32+ (illustration) |
| Color | `--text-secondary` default; `--brand` for active; semantic colors only for severity and status |
| Accessibility | Decorative icons `aria-hidden`; icon-only buttons need `aria-label` and a tooltip |
| Custom icons | Logo mark, **Proof-path glyph** (three nodes joined by a cyan line), **Score Ring** (component, not icon), rule glyphs fall back to lucide (§3.1.5) |

**Product icon map**

| Concept | Icon | Concept | Icon |
| --- | --- | --- | --- |
| Home | `layout-dashboard` | Alerts | `bell-ring` |
| Reviews | `clipboard-check` | Exceptions | `file-warning` |
| Graph | `network` | Services | `server` |
| People | `users` | Teams | `users-round` |
| Controls | `shield-check` | Steward | `sparkles` |
| Memory | `brain` | Rules | `sliders-horizontal` |
| Sources | `database` | Activity | `history` |
| Settings | `settings` | Search / Command | `search` |
| Clock / as-of | `calendar-clock` | Proof path | custom glyph |
| Owner | `user-round-check` | Orphaned owner | `user-x` |
| Approve | `check` | Reject / Dismiss | `x` |
| Renew | `repeat` | Revoke | `ban` |
| Close | `circle-slash` | Reassign | `arrow-right-left` |
| Defer | `clock-arrow-up` | Sentinel running | `radar` (animated sweep) |

---

## 6. Layout

### 6.1 App shell dimensions

| Element | Desktop | Tablet | Mobile |
| --- | --- | --- | --- |
| Top bar | 56 px, sticky | 56 px | 52 px |
| Left rail | 248 px expanded / 64 px collapsed | 64 px (icons) | none; **bottom bar 64 px** plus safe-area |
| Steward panel | 400 px (pushes content at 1024 px and up) | overlay 400 px | full-screen sheet |
| Entity drawer | 440 px overlay | 440 px overlay | full-screen sheet |
| Content padding | 24 px (32 px at 1440 px and up) | 20 px | 16 px |
| Content max width | Lists and forms 1200 px; Home 1360 px; Graph full-bleed; Marketing 1200 px (hero 1360 px) | fluid | fluid |

### 6.2 Grid

12 columns on desktop (gutter 16 px, 24 px at wide), 8 on tablet, 4 on mobile. Home layout: main (8 cols) plus context column (4 cols); at 1440 px and up a third column of 3 appears and main becomes 6.

### 6.3 Page patterns

| Pattern | Used by | Structure |
| --- | --- | --- |
| **Overview** | Home | Metric strip, ranked list plus selected-service panel, runway, attention feed |
| **List** | Alerts, exceptions, reviews, registry | Page header (title, count, primary action), filter bar, table, pagination footer |
| **Detail** | Alert, exception, service, person | Header with status chips and actions, two-column body (narrative left, relationships right) |
| **Canvas** | Graph | Full-bleed canvas, floating filter panel, right drawer |
| **Wizard** | Onboarding, import | Centered 560 px card, step indicator, sticky action bar |
| **Conversation** | Steward | Message column 720 px max, composer pinned, tool trace collapsible |
| **Settings** | Settings | Left sub-nav (tabs on mobile), form sections with 24 px spacing |

### 6.4 Page header

Title (`h1`), subtitle (secondary), right-aligned actions (max one primary). Breadcrumbs above on detail pages. Sticky filter bar under the header on list pages (z `sticky`).

---

## 7. Components

Base: **shadcn/ui (Radix)** restyled with the tokens above. Custom domain components are in §8. All components support dark and light, focus-visible, disabled, loading, and error states.

### 7.1 Buttons

| Variant | Appearance | Use |
| --- | --- | --- |
| **Primary** | `--brand-solid` fill with a 1 px inner top highlight; hover adds `--aurora-glow` and lifts 1 px; text `--text-on-brand` | One per view: the main next step |
| **Primary-aurora** | Aurora gradient fill | Marketing CTAs only ("Explore with sample data") |
| **Secondary** | `--bg-surface` fill, `--border-default` border | Alternative actions |
| **Ghost** | Transparent; hover `--brand-soft` | Toolbars, table row actions |
| **Destructive** | `--sev-critical` fill (confirm dialogs) or outline (inline) | Revoke, delete |
| **Link** | `--brand` text, underline on hover | Inline navigation |
| **Icon** | 36 px square, ghost style, tooltip required | Toolbars |
| **Approve (agent proposals)** | Primary with `check` icon, label "Approve" | Steward action cards, staged drafts |

| Size | Height | Padding x | Text |
| --- | --- | --- | --- |
| sm | 32 px | 12 px | `body-sm` 500 |
| md (default) | 36 px | 16 px | `body` 500 |
| lg | 44 px | 20 px | `body` 600 (marketing, mobile primary) |

States: hover (tone up, 120 ms), pressed (scale .98), focus-visible (2 px `--brand` ring with 2 px offset), disabled (50% opacity, `aria-disabled`, no tooltip dependency), **loading** (inline spinner replaces icon, label stays, width locked, `aria-busy`). Mobile primary actions are 44 px tall and may stick to the bottom of sheets.

### 7.2 Form controls

| Control | Spec |
| --- | --- |
| **Text input** | 40 px height; `--bg-sunken` fill; 1 px `--border-strong`; focus ring `--brand` 2 px; label above (13 px, 500); helper text below (`--text-muted`); error replaces helper in `--danger` with `circle-x` icon and `aria-describedby` |
| **Textarea** | Same, min 96 px; the ingestion paste box is 240 px with character counter |
| **Select / combobox** | shadcn Select; searchable combobox for people, services, controls with avatar or type icon in each option |
| **Multi-select** | Chip list inside the field; "+N more" overflow |
| **Date picker** | Calendar popover; typing allowed; shows relative note ("in 5 days") |
| **Severity picker** | Segmented 1 to 5 with band color accents and labels |
| **Checkbox / radio / switch** | 18 px / 18 px / 36x20 px; brand fill; labels clickable |
| **Slider (thresholds)** | Brand track, numeric input beside it |
| **OTP input** | 6 cells, 48 px, auto-advance, paste fills all |
| **Password** | Show/hide toggle, live strength meter (4 segments with text) |
| **Condition expression** | Mono input with inline validation and a token legend |
| **Validation** | On blur and on submit; first invalid field focused; error summary at top of long forms |

### 7.3 Data display

| Component | Spec |
| --- | --- |
| **Table** (TanStack) | Sticky header on `--bg-sunken`; row hover `--brand-soft`; selected row left 2 px brand bar; column resize off; sortable headers show `arrow-up/down`; row actions appear on hover and always on touch; mobile converts to cards |
| **Badge / chip** | 22 px tall, `caption` text, soft fill with matching text color, 14 px icon |
| **Severity badge** | Icon + word ("High"), never color alone |
| **Card** | `--bg-surface`, level 1 elevation, radius lg; interactive cards lift 1 px and brighten the border on hover |
| **Stat tile** | `metric` number, label, delta chip, tiny sparkline |
| **Avatar** | 24/32/40 px, initials on `--brand-soft`; "left" status shows a slash badge |
| **Tag list** | Wraps; max 3 then "+N" popover |
| **Timeline** | Vertical line, 8 px dots colored by event type, relative time with absolute on hover |
| **Key-value list** | Two columns on desktop; label `--text-muted`, value primary; copy button on IDs |
| **Code / formula block** | Mono on `--bg-sunken`, copy button, no syntax-color clutter |
| **Tooltip** | 12 px, dark in both themes, 300 ms delay, never the only source of essential info |

### 7.4 Tabs, accordions, misc

- **Tabs:** underline style with a sliding 2 px brand indicator (200 ms); counts as muted badges; scroll horizontally on mobile.
- **Accordion:** used in "How I got this" (tool trace) and FAQ; chevron rotates 90°.
- **Pagination:** cursor-based "Load more" for feeds; page numbers for registry tables.
- **Segmented control:** for view toggles (Graph / List, density).
- **Breadcrumbs:** `body-sm`, slash separators, last item not a link.

---

## 8. Domain components (custom)

| Component | Spec |
| --- | --- |
| **ScoreRing** | SVG ring 0 to 100. Track `--border-default`; arc uses band color with a faint aurora highlight on the leading edge. Center shows the number (`metric`) and band label beneath. Sizes 32 (list), 72 (card), 160 (detail). Animates fill over 700 ms and counts up the number on first view; subsequent updates animate only the delta. Text label always present for a11y. |
| **ExpiryRunway** | Horizontal 30-day track with day ticks and a "today / as-of" marker. Expiries are stacked pills grouped by team or service; **collisions** (3 or more in 7 days) are bracketed with a high-severity band and a count. Hover shows the exception; click opens the drawer. On mobile it becomes a vertical agenda list. |
| **ProofPath** | Two parts: (1) **mini-graph** of the minimal nodes and edges (typed icons, labels beneath), (2) **step list** ("Checkout path → requires → checkout-api → depends on → payments-core → affected by → EXC-17"). Path edges draw in `--proof` with a traveling glow; **Show on graph** link. Always includes the text list. |
| **GraphView** | Canvas (react-force-graph-2d). Node shapes and colors from §3.1.6; labels appear at zoom thresholds; hover highlights neighbors (others to 35%); selection ring in `--brand`; path mode dims non-path nodes to 20% and animates the path in sequence (staggered 90 ms per hop); legend and filter panel are glass surfaces. Respects reduced motion (instant static highlight). |
| **AlertCard** | Left severity bar (4 px), rule chip, title, subject, score ring (32 px), age, status, hover reveals **Propose review** and **Acknowledge** actions |
| **CitationChip** | Pill with type icon and mono short ID, `--proof-soft` background, `--proof` text; hover preview card; click opens the entity drawer. Visually distinct from ordinary links. |
| **ProposedActionCard** | Dashed `--proof` border, "Proposed by Steward" overline, summary of effects, **Approve** (primary) and **Dismiss** (ghost). After approval: solid border, success state, timestamp. |
| **StewardMessage** | User bubble right-aligned on `--brand-soft`; Steward message left, no bubble (reads like a document) with a small `sparkles` avatar; streaming caret blinks at 1 Hz; tool steps appear as small chips ("Reading risk ranking…") that resolve to a check |
| **DecisionDialog** | Radio cards for Renew / Revoke / Close / Reassign / Defer (icon, title, one-line effect); required note textarea; **effects summary** panel (what will change in the graph); sticky footer with Confirm and Cancel |
| **PrecedentCard** | Quiet card with `history` icon: "Last time (12 Sep): renewed twice, then revoked" with note excerpt and link |
| **ClockControl** | Top-bar chip "Simulated · 17 Oct 2026" with `calendar-clock` icon; popover with date picker, presets ("Quiet Expiry Week"), Apply (confirm that detection reruns) |
| **SentinelPill** | Top-bar pill: idle "Sentinel · up to date 2m ago"; running with sweeping radar icon and shimmer; failed in `--warning` with retry |
| **OwnerResolutionList** | Ranked candidate rows with avatar, name, **reason-code badge** (`Team lead`, `Approver`, `Admin`), tenure |
| **ScoreBreakdown** | Horizontal stacked bar of per-exception contributions plus a table; formula shown in mono with variables highlighted |
| **EmptyState** | 24 px icon or constellation illustration (max 160 px), title, one sentence, one primary action |
| **CoachMark** | Small raised card with arrow, step "2 of 4", Next and Skip |

---

## 9. Navigation

| Pattern | Spec |
| --- | --- |
| **Left rail** | Items from `04` §2.3. 40 px rows, 20 px icons, active item: `--brand-soft` fill, 2 px brand left bar, `--text-primary` label. Badge counts (max "99+") sit right. Collapsed state shows tooltips. Section divider between product areas and admin areas. |
| **Top bar** | Workspace switcher (avatar plus name, chevron), breadcrumbs, search field (shows `⌘K`), as-of chip, Sentinel pill, Steward toggle, bell with unread dot, account menu |
| **Mobile bottom bar** | 5 slots (Home, Alerts, Reviews, Steward, More); active slot shows brand icon and label; unread badges |
| **Command palette** | Centered glass dialog, 560 px; groups (Go to, Entities, Actions, Ask Steward); fuzzy match; arrow-key navigation; recent items; `Esc` closes |
| **Tabs and sub-nav** | Settings and registry use tabs (desktop) and a select menu (mobile) |
| **Breadcrumbs** | Detail pages only |
| **Back behavior** | Browser back restores filters and scroll (URL state, `04` §8) |
| **Skip links** | "Skip to content" first focusable element |
| **Keyboard** | `⌘/Ctrl+K` palette, `g` then letter go-to (R1), `?` help, `Esc` closes topmost layer |
| **Marketing nav** | Transparent over hero, becomes glass with blur on scroll; collapses to a sheet menu on mobile |

---

## 10. Overlays

| Overlay | Component | Spec |
| --- | --- | --- |
| **Dialog** | shadcn Dialog | 480 px (forms 560 px), radius lg, level 3, scrim `rgba(5,7,12,.6)` with 6 px blur; focus trapped, returns to trigger; `Esc` and scrim click close unless dirty. Mobile: bottom sheet with 16 px radius, drag handle |
| **Alert dialog** | shadcn AlertDialog | For destructive confirmations; states consequence in the body; destructive button on the right; typed confirmation for workspace deletion |
| **Sheet / drawer** | shadcn Sheet | Right side 440 px (entity drawer, forms); header with title and close; footer actions sticky; no scrim dimming on the graph page so the canvas stays readable (light 20% scrim only) |
| **Popover** | Radix Popover | Level 2, radius md; used for date pickers, clock control, filters, notifications |
| **Dropdown menu** | Radix DropdownMenu | 36 px items, icons left, shortcuts right, destructive items at the bottom with a divider |
| **Tooltip** | Radix Tooltip | 300 ms delay, 12 px text; never holds essential content |
| **Hover card** | Radix HoverCard | CitationChip and node previews; 200 ms intent delay |
| **Command** | cmdk | See §9 |
| **Coach marks** | Custom | Spotlight cutout around the target with 4 px padding; arrow; focus moves into the mark; skippable |
| **Splash** | Full-screen | See §14.1 |

Rules: only one modal layer at a time (drawer plus dialog allowed for confirm on top of a drawer); every overlay has a visible close control and an accessible name; scroll locked behind modals; overlays use the **glass** treatment (surface at 80 to 88% opacity plus backdrop blur 16 px) with a solid fallback when `backdrop-filter` is unsupported.

---

## 11. Feedback

| Type | Component | Rules |
| --- | --- | --- |
| **Toast** | sonner | Top-right desktop, bottom on mobile; 4 s for success, 6 s for errors, persistent for actions with Undo; max 3 stacked; includes icon and optional action; `aria-live=polite` (errors `assertive`) |
| **Inline banner** | Custom `Alert` | Info, success, warning, danger; icon, title, one sentence, optional action. Used for sample-data banner, degraded AI, conflict, quota |
| **Field errors** | Inline | See §7.2 |
| **Progress, determinate** | Linear bar (4 px, aurora fill) | Imports, provisioning |
| **Progress, stepped** | Vertical stepper | Provisioning (`04` SCR-O-03): pending circle, active pulsing aurora ring, done check |
| **Progress, indeterminate** | Spinner (16/24 px) or shimmer | Inside buttons or small areas only |
| **Skeleton** | Shimmer blocks matching final layout | Show after 300 ms delay to avoid flashing; shimmer 1.4 s, off under reduced motion |
| **Streaming** | Caret plus tool-step chips | Steward replies |
| **Live update highlight** | 800 ms `--proof-soft` fade on a new or changed row, announced via `aria-live` | Alerts, reviews |
| **Success moments** | Check icon draws in (300 ms) with a subtle ring pulse | Review decided, exception activated. Restrained, no confetti. |
| **Empty** | See EmptyState (§8) | |
| **Destructive undo** | Toast with Undo for 8 s where reversible (snooze, acknowledge) | |
| **System status** | Offline banner, cold-start card, degraded-AI banner (`04` §4.1, §7) | Persist until resolved |

**Severity of messaging:** *success* = quiet, *info* = neutral, *warning* = needs attention but not blocking, *danger* = action failed or blocked. Never use red for anything but danger and critical severity.

---

## 12. Motion and animation

### 12.1 Principles

Motion **explains cause and effect** (where did this come from, what changed), **directs attention** (proof path, new alert), and **adds polish** (hover, transitions). It never blocks input, never exceeds 800 ms for UI transitions, and is entirely optional under reduced motion.

### 12.2 Tokens

| Token | Value | Use |
| --- | --- | --- |
| `--dur-fast` | 120 ms | Hover, press, tooltip |
| `--dur-base` | 200 ms | Tabs, menus, theme change |
| `--dur-slow` | 320 ms | Drawers, dialogs, page content |
| `--dur-draw` | 700 ms | Score ring fill, check draw |
| `--dur-path` | 90 ms per hop | Proof-path sequencing |
| `--ease-out` | `cubic-bezier(.22,1,.36,1)` | Entrances |
| `--ease-in-out` | `cubic-bezier(.65,0,.35,1)` | Position changes |
| Spring (motion lib) | stiffness 300, damping 30 | Drawers, sheets |

### 12.3 Signature animations

| Moment | Animation |
| --- | --- |
| **Splash** | Logo ring draws (500 ms) with aurora sweep, wordmark fades up 12 px, then the screen dissolves (200 ms). Shown only when hydration exceeds 400 ms (`04` §4.1). |
| **Landing hero** | Mini-graph breathes (nodes drift 2 to 4 px); hovering a service triggers the proof path to draw across (staggered 90 ms per hop) and exceptions "stack" with a small bounce; headline words rise in with 40 ms stagger. Scroll-triggered fade-up (16 px, 320 ms) for sections, once. |
| **Aurora glow** | Slow 12 s gradient drift behind hero and splash (transform and opacity only) |
| **Proof path draw** | Edges stroke in sequence along the path with a bright leading dot; nodes pop to full opacity; others dim over 200 ms. A loop is not played; replay button available. |
| **Score ring** | Arc fills and number counts up (700 ms) on first view; band color cross-fades if band changes |
| **New alert / review** | Row slides in (200 ms), highlight fade 800 ms, bell dot pulses once |
| **Sentinel running** | Radar sweep icon, shimmer across score values until results land |
| **Page transitions** | Content fades and rises 8 px (200 ms); shell stays fixed |
| **Drawers and sheets** | Spring slide from edge; scrim fades 200 ms |
| **Decision confirm** | Button shows spinner, then check draws; effects summary items tick off in order |
| **Tab indicator** | Slides between tabs (200 ms) |
| **Streaming** | Text appears by chunk (no per-character typewriter); caret blinks |

### 12.4 Performance and accessibility rules

- Animate **only `transform` and `opacity`** (and SVG stroke offsets); never layout properties.
- Target 60 fps; the graph canvas caps simulation work after it settles and pauses when the tab is hidden.
- **`prefers-reduced-motion: reduce`:** replace motion with instant state changes or 120 ms fades; proof path shows a static highlight; no parallax, drift, count-up, or looping effects. A manual "Reduce motion" switch in Settings (R1) overrides system.
- No flashing content above 3 flashes per second.
- Motion library (`motion`) is code-split; the landing hero animation loads after first paint.

---

## 13. Data visualization

| Chart | Style |
| --- | --- |
| Sparkline (risk trend) | 1.5 px line in band color, area fill 10% opacity, last-point dot; no axes |
| Trend chart (service detail) | Recharts line with light grid (`--border-subtle`), band thresholds as dashed reference lines labeled Low/Moderate/High/Critical |
| Contribution bars | Horizontal stacked bar; segments labeled by exception ID; hatch pattern added for the "overdue" multiplier so it is not color alone |
| Score ring / Expiry Runway | Custom SVG (§8) |
| Distribution (alerts by rule) | Horizontal bars with rule chips as labels |

Rules: max 6 series; always label directly where space allows; tooltips show exact values; every chart has a **table alternative** or accessible summary; axis text 12 px `--text-muted`; use band and brand tokens only (no new colors).

---

## 14. Marketing, splash, and auth visuals

### 14.1 Splash and loading

Full-screen `--bg-canvas` with a soft aurora radial glow, centered logo mark, tiny progress line below, microcopy "Warming up your workspace". **Cold-start card** (centered, glass): animated sweep, "Waking the server. First load can take up to a minute.", auto-retry indicator. Both use `--bg-canvas` so there is no flash between splash and app.

### 14.2 Landing page

| Section | Visual |
| --- | --- |
| Hero | Dark canvas with aurora mesh glow, `display-xl` headline in Bricolage, subtle noise, interactive mini-graph on the right, **primary-aurora** CTA |
| Problem | Three glass cards with small looping micro-animations (expiry countdown, owner avatar fading to "left", stacked exceptions) |
| How it works | Four numbered steps along a connecting line that draws on scroll |
| Features | Bento grid (2 large, 4 small cards) with product screenshots and annotated proof paths |
| Explainability | Large static alert-detail mock with highlighted proof path |
| Trust strip | Icon row with short statements |
| FAQ | Accordion |
| Final CTA | Aurora-bordered panel |

Light theme: gradients lower to 10% opacity over `--bg-canvas`, cards gain level 1 shadows. Hero imagery is **generated from the real components** (no static stock art) so screenshots stay true.

### 14.3 Auth screens (Clerk `appearance` theming)

Centered card (400 px) over a calm canvas with a faint aurora glow in one corner; logo above; inputs, buttons, and OTP follow §7; the OAuth buttons (R1) are secondary-style with provider icons; legal links at the bottom. Clerk variables map to tokens (`colorPrimary: var(--brand-solid)`, `colorBackground: var(--bg-surface)`, `colorText: var(--text-primary)`, `borderRadius: 10px`, fonts as §4).

### 14.4 Logo and favicon

Wordmark "Reprieve" in Bricolage 700. Mark: a ring with a small gap and a single node at the gap end (a "pause"). Mono and aurora versions; favicon is the ring on `--bg-canvas`. OG image: dark, headline, mark, aurora glow (1200x630).

---

## 15. Accessibility (WCAG 2.2 AA; PRD §9)

| Area | Requirement |
| --- | --- |
| **Text contrast** | 4.5:1 minimum (large text 3:1). All token pairs in §3 are verified; new pairs must be checked before use. |
| **Non-text contrast** | Form-control borders, focus rings, icons that convey meaning, and chart elements 3:1 minimum (`--border-strong` is used for inputs) |
| **Focus** | Visible on every interactive element: 2 px `--brand` ring (dark: also a 1 px canvas gap), never removed; focus not obscured by sticky bars (scroll padding) |
| **Keyboard** | Everything operable by keyboard; logical order; no traps; `Esc` closes overlays; roving tabindex in menus and tabs; graph nodes reachable via the List view |
| **Target size** | Minimum 24x24 px (WCAG 2.2); 44x44 px for primary touch targets on mobile |
| **Color independence** | Severity and status always include icon and text; graph nodes differ by shape; charts add patterns where color is the only cue |
| **Motion** | Reduced motion honored (§12.4); no auto-playing loops longer than 5 s without a pause control on marketing pages |
| **Screen readers** | Landmarks (`header`, `nav`, `main`, `aside`); headings in order; live regions for toasts, new alerts, streaming completion (not each token); icon buttons labeled; tables use proper headers; dialogs labeled and described |
| **Graph** | Canvas has a text summary and a full **List view** of nodes and edges (required by PRD §9) |
| **Forms** | Labels always visible; errors programmatically associated; do not rely on placeholders; autocomplete attributes set |
| **Zoom and reflow** | Usable at 200% zoom and 320 px width with no horizontal scroll (tables scroll inside their container) |
| **Authentication (2.2)** | No cognitive-test captchas; OTP supports paste |
| **Testing** | `axe` in Playwright on every main screen in both themes; manual keyboard and screen-reader pass before public beta |

---

## 16. Content and microcopy

**Voice:** plain, precise, calm. Short sentences. Say what happened, why, and what to do. No jargon without a one-line explanation; no exclamation marks except in rare success moments; never blame the user.

| Context | Do | Avoid |
| --- | --- | --- |
| Empty state | "No exceptions yet. Add one or paste a ticket or chat thread." | "Oops! Nothing here!" |
| Error | "We couldn't save your changes. Your edits are still here. Try again." | "Error 500" |
| Alert title | "Checkout carries 4 active exceptions" | "CRITICAL RISK DETECTED" |
| Why text | "Four active exceptions sit within two hops of checkout-api, and two expire this week." | "Anomaly in risk graph" |
| Agent label | "Proposed by Steward. Nothing changes until you approve." | "AI did this for you" |
| Sample banner | "Sample data · simulated date" | "Demo mode" |
| Destructive confirm | "This permanently deletes the workspace and both graphs. Type *acme* to confirm." | "Are you sure?" |

Dates: relative with absolute on hover ("in 5 days"; tooltip "22 Oct 2026, 00:00"). Numbers: thousands separators; scores as integers. Product terms: **Exception, Alert, Review, Steward, Sentinel, Proof path, Compensating control**.

---

## 17. Implementation notes

| Topic | Guidance |
| --- | --- |
| **Setup order** | 1) `globals.css` tokens (§3.6) 2) fonts via `next/font` 3) shadcn init and theme mapping 4) base components (Button, Input, Card, Badge, Dialog, Sheet, Tabs, Table, Toast) 5) domain components (§8) |
| **Theming** | `next-themes` with `attribute="class"`, `defaultTheme="system"`, `disableTransitionOnChange` off (use token transitions) |
| **Canvas/charts** | Read colors from `lib/tokens.ts`, which reads CSS variables at runtime so theme switches update the graph |
| **Component rules** | No raw hex; no per-component shadows (use elevation tokens); every interactive component has a Storybook-style demo route `/dev/ui` (excluded from production) covering states in both themes |
| **Assets** | SVG logo, constellation illustrations as inline SVG with `currentColor`; OG image generated at build |
| **Performance budgets** | Landing LCP under 2.5 s; initial app JS under 250 KB gzipped excluding graph chunk; graph and motion code-split; fonts preloaded (3 families, subset) |
| **Browser support** | Latest two versions of Chrome, Edge, Firefox, Safari; `backdrop-filter` and `color-mix` have solid fallbacks |
| **Testing visuals** | Playwright screenshots per main screen and theme at 360, 768, 1440 px; Chromatic-style diff optional |

---

## 18. Design QA checklist (per screen, before "done")

- [ ] Uses only tokens (no raw hex, no ad-hoc spacing)
- [ ] Looks right in dark and light and at 360, 768, 1440 px
- [ ] Loading, empty, error, and degraded states exist (`04` §7)
- [ ] Severity/status uses icon and text, not color alone
- [ ] Keyboard path complete; focus visible; `axe` passes
- [ ] Motion limited to transform/opacity; reduced-motion variant works
- [ ] Copy follows §16; IDs in mono; dates relative
- [ ] Proof path or citation shown wherever a claim or score appears
- [ ] Agent proposals are visually distinct and require Approve
- [ ] Screen matches its spec in `04` and traces to an `FR-*` requirement

---

## 19. Open items

| Item | Owner | Resolved by |
| --- | --- | --- |
| Final logo mark artwork (ring-with-gap concept) | Founder | Before landing build (`06` P6) |
| Confirm Bricolage Grotesque optical-size axis works with `next/font` variable settings | Engineering | Spike in `06` §3 |
| Light-theme gradient strength on real displays | Founder | Visual review at first landing build |
| Table density toggle and "Reduce motion" setting | Engineering | R1 |
| Illustration set (empty states, 6 scenes) | Founder | `06` P6 |
