# VODEL Catalog Design System

## Direction

The catalog is a premium, high-tech dark water-technology showroom. A deep obsidian-navy foundation, luminous cyan highlights, and semi-transparent dark glass surfaces make water filtration systems, pure water aesthetics, and transparent pricing stand out with high contrast and clarity. Red is reserved for the limited Kaspi campaign ticker and promotional discount tags; WhatsApp emerald green is reserved for primary consultation actions.

## Color Tokens

- Page Background: `#060b18`
- Surface Card (Dark Glass): `rgba(15, 24, 46, 0.8)` / `#0c1527`
- Surface Stage / Inset: `#050914` / `#080f1e`
- Border: `rgba(255, 255, 255, 0.08)` / `#1e293b`
- Border Highlight (Active / Cyan): `rgba(56, 189, 248, 0.35)` / `#38bdf8`
- Text Primary (Headings / Key info): `#f8fafc` / `#ffffff`
- Text Secondary (Specs / Body): `#94a3b8` / `#cbd5e1`
- Text Muted: `#64748b`
- Price Highlight (Cyan): `#38bdf8`
- Promotion Red: `#ef4444` / `#f43f5e`
- WhatsApp Emerald: `#25d366`

## Typography

Use `Manrope` for interface and body copy and `Unbounded` sparingly for the VODEL wordmark and major campaign headings. Prices use tabular numerals and strong weight. Body copy stays compact with a minimum 1.5 line height.

## Composition

- **Kaspi Campaign Ticker**: Commands the top edge with a bold red gradient.
- **Sticky Header**: Dark glass navigation bar with blur (`backdrop-blur-xl`), glowing VODEL logo, trust badges, and WhatsApp button.
- **Hero Viewport**: Deep gradient mesh with water aura, clear headline, value propositions, and trust stats (Гарантия 3 года, Сервис 15 лет).
- **Promotion Cards**: Dark glass cards highlighting AR-01A and daily teapot gifts with clean dark product stages.
- **Catalog Controls**: Dark search and sort bar with glowing focus ring, paired with illuminated filter pill buttons.
- **Product Cards**: Deep slate glass cards with dark image stages, clear 50% discount tags, installment boxes (0-0-12 / 0-0-24), and direct consultation buttons.
- **Sticky Selection Drawer**: Floating dark bar at the bottom with selected chips and direct WhatsApp handoff.

## Components

- **Buttons**: 12–16px corner radii, high contrast, luminous hover states, and visible focus rings.
- **Cards**: 24–32px radii, dark borders, and cyan ambient glow on hover.
- **Filters**: Compact segmented pills; active state is luminous cyan gradient and inactive state is dark slate glass.
- **Modals**: Dark glass container with deep black blur overlay, clean specs table, and clear close control.
- **Cart Drawer**: Sticky bottom dark glass bar with WhatsApp action.

## Motion & Interactivity

- The campaign ticker moves horizontally with smooth loop animation.
- Product cards lift smoothly (-4px) on hover with cyan glow.
- Product images subtly scale (1.05x) on hover.
- Focus, selection, modal, and toast state transitions are smooth and fast (150–250ms).

## Accessibility

- All interactive controls provide visible keyboard focus rings.
- Text contrast exceeds WCAG AA standards against dark backgrounds.
- Semantic HTML tags and descriptive alt text are used throughout.
- Reduced-motion preference disables continuous ticker and heavy transitions.
