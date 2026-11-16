# Túttt v0.4.8 — Approved Brand System

## Approved artwork
- The master logo is `brand/approved/tuttt-approved-master.png`, identical to the user-approved generated image.
- Runtime logo is `brand/approved/tuttt-approved-cropped.png`. Only surrounding transparent padding was cropped; the painted pixels were not redrawn, recolored, or segmented.
- The artwork includes a vintage handset **replacing the horizontal stroke of the first T**, red coiled cord, thick ink outlines, warm ivory glyphs, and scarlet highlights. The app name remains **Túttt**; the emblem artwork reads **TUT** by design.
- Web and React Native both embed the same transparent cropped art. No image-card background is required.

## Theme palette
| Token | Warm light | Espresso dark |
|---|---|---|
| Background | #F4EAE0 | #1F1819 |
| Surface | #FFF9F2 | #2B2223 |
| Text | #241B1C | #FFF2E6 |
| Secondary text | #6B5753 | #D4BDB1 |
| Interactive red | #B23B2D | #FF9E86 |
| Hero | #6D2928 → #302021 | #75332D → #291E20 |

## Sizing
- Header logo: 133×77 CSS pixels on standard phone, 118×72 on narrow screens. Alpha source includes its original silhouette and free-space buffer.
- Desktop branding: 275×194 CSS pixels.
- App launcher: 1024×1024 opaque espresso square, artwork inside approximately 835px width.
- Android adaptive foreground: 1024×1024 transparent PNG, approximately 660px central art width.
- Splash: 1200×2400 espresso board with original mark and ample negative space.

## Accessibility and limits
- Do not infer screen reader, native build, or real microphone success from screenshot tests.
- Confirm color contrast across all states, dynamic text, safe areas, Android adaptive mask, splash and icon on physical devices.
- Night mode is charcoal espresso rather than flat black; light mode is warm ivory rather than white.
- Realtime voice remains a technical prototype and is **not** a completed launch-ready feature.
