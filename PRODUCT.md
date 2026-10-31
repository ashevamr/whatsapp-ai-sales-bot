# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Residents of Kazakhstan choosing a home or business water-filtration system, often arriving from Instagram advertising and continuing the purchase conversation in WhatsApp.

## Product Purpose

The public VODEL catalog helps a visitor quickly compare verified filter models, prices, installment amounts, and key benefits, then start a contextual WhatsApp conversation with the sales number +7 700 479 0001. Success means the visitor understands the offer, selects up to three relevant models, and contacts VODEL without receiving misleading logistics or commercial claims.

## Positioning

VODEL presents a broad catalog of original factory-assembled filtration systems with model-specific pricing, 3-year warranty terms, and 15 years of service support, with consultation continuing directly in WhatsApp.

## Operating Context

- Sixteen catalog models are loaded from `public/catalog_products.json`.
- Visitors can search, filter, sort, inspect a model, select up to three models, and continue to WhatsApp.
- The publishable static bundle lives in `catalog-site`; the private bot and its secrets must never be included in that bundle.
- Free delivery and installation may be stated only for confirmed warehouse cities. Other locations require route confirmation.

## Capabilities and Constraints

- All public WhatsApp links use the approved sales number `77004790001`.
- Prices, installments, warranty, service, campaigns, and stock must come from controlled commercial facts rather than duplicated legacy knowledge-base text.
- Product cards show 0-0-12 and 0-0-24 payment amounts without bank names.
- The current time-limited Kaspi 0-0-24 campaign ends on 2026-09-06 and must not be presented as active after that date.
- The current AR-01A campaign includes one gift chosen from a vacuum cleaner or air fryer.
- The current daily campaign offers an electric kettle with any filter and displays the current Kazakhstan date.
- Existing bot safety, anti-repeat, voice-message, media-routing, and human-takeover behavior must remain intact.

## Brand Commitments

The product is named VODEL. Customer-facing copy is concise, concrete, and helpful. The catalog uses a white, blue, and light-blue visual identity with real supplied product and gift imagery. Claims and model names must remain faithful to the source files.

## Evidence on Hand

- Verified model data and images: `public/catalog_products.json` and `public/catalog_assets/`.
- AR-01A official model information: `Vodel content/11_AR-01A/info.txt`.
- User-supplied gift imagery for the vacuum cleaner, air fryer, and kettle.
- Existing automated catalog, bot-safety, voice, and anti-repeat test suites.

No testimonials, customer counts, stock quantities, or medical outcome claims are confirmed for this catalog and must not be fabricated.

## Product Principles

1. Make the current offer understandable within the first screen.
2. Show exact commercial facts without bank or logistics ambiguity.
3. Keep selection and WhatsApp handoff simple and contextual.
4. Preserve customer trust through truthful dates, locations, and model-specific media.
5. Keep the public catalog isolated from the private bot runtime.

## Accessibility & Inclusion

The catalog must remain keyboard accessible, responsive on mobile, legible at high contrast, compatible with reduced-motion preferences, and understandable without relying on color alone.
