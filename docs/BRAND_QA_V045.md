# V0.4.5 Logo integration QA

## Source of truth
- `brand/original/IMG_5483(2).jpeg` preserved from user upload, unchanged.
- Three master copies verified byte identical in Node tests; derivatives are only padded/scaled for platform requirements.
- AI-redrawn alternatives explicitly excluded from source and app UI.

## Updated surfaces
- Web prototype header, desktop hero logo, favicon; explicit static routes and JPEG MIME.
- Native React Native Header image, app icon, Android adaptive icon, Expo splash.
- Main UI semantic colors dark/light adjusted to charcoal / ivory / red; retained functional names.

## Manual device visual QA still required
- iPhone Home Screen icon at real 60pt and 40pt sizes; iOS splash, Dynamic Island and safe area.
- Android adaptive icon crop at launchers, splash, dark/light themes.
- Logo readability on 320px screens; compare exact logo artwork to user upload.
- Both themes, contrast, touch targets, keyboard, accessibility.
- This change does not verify SFU voice, private chat, release readiness.

## Browser tests
- Chromium at 320, 390, 430, 1280 px: logo image decoded at 676 × 401, all 5 navigation tabs present, no page error observed.
- Automated integration additionally asserts that `/assets/logo-original.jpeg` serves identical bytes to the provided file.
- Native icons are generated assets, not verified on physical iOS/Android devices.
