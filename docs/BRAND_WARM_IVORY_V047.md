# Túttt v0.4.7 — Warm Ivory Brand Integration

## Decision
Use the original supplied JPEG, byte-for-byte, on a warm ivory interface rather than poorly extracting its cream background. This follows the user's alternative instruction. No AI-generated redraw is used.

Original source: `brand/original/IMG_5483(2).jpeg`
SHA-256: `f342f417fdcba88229ece6ba33c4e472db61a56559809620ba2a899c7f263004`.

## Implementation
- Default theme switched from dark to warm ivory in web and React Native.
- Web header and desktop marketing panel use the untouched `logo-original.jpeg` directly, without image-card borders/shadow or duplicate wordmark.
- Logo edges harmonized with a matching paper canvas through presentation-only CSS blending and mask restricted to outer image margins.
- App icon, splash and adaptive icons rebuilt from the full original JPEG on an ivory canvas (no image segmentation or AI recreation).
- React Native header uses original JPEG over a full-width ivory header.
- Dark theme kept optionally, with full-width cream header for uninterrupted brand presentation.
- Cream surface, readable charcoal text, vermilion interactive accents throughout app.

## Verification boundary
Automated backend and static checks are not evidence of native device or audio functionality. Before release, test app icon on physical iOS and Android, mic permissions, font scaling, screen readers, dark-mode transitions, small phone widths, and colour contrast.
