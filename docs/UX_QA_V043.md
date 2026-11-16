# Túttt v0.4.3 — UX quality pass

## Implemented
- Full-viewport mobile presentation instead of a desktop phone frame on narrow screens.
- iOS safe-area padding for top/bottom; keyboard and viewport require real-device verification.
- Minimum 44px targets for key navigation and icon buttons.
- Search input font size 16px to avoid iOS automatic zoom.
- Stronger visible keyboard focus; focus entry, basic focus trap, and return on closing modal sheets.
- Reduced-motion preference respected.
- Preview labels explicitly say that audio is not verified.

## Not yet verified
- Real-device iPhone/Android touch, screen reader, dynamic text sizing.
- WCAG 2.2 AA audit, all modal states, keyboard overlay and RTL.
- Native app screens: this pass changes the web prototype only.
- Real LiveKit audio and production performance.

## Manual QA checklist
1. 320px, 375px, 390px, 430px and desktop widths.
2. Keyboard navigation across all five tabs; open/close modal with Tab, Shift+Tab and Escape.
3. Check contrast of muted text in both themes.
4. Open Chat and Live with empty, loading and disconnected states.
5. Test microphone permission denied, revoked and device audio interrupted on real hardware.
6. Enable Reduce Motion in OS settings.
7. Test browser 200% zoom and long Vietnamese text.
