# Túttt 0.5.5 — One Live Layout / Avatar Circle

## Design decision
- One predictable Live Cam layout. Remove Cân bằng / Trong suốt / Ưu tiên chat mode controls and vacant-seat button.
- If the video track is off or unavailable, render a **circular avatar** with the username and role outside the avatar. Do not depict it as a playing video.
- When a verified LiveKit camera track exists, render the actual video in its media tile. Permission to publish ≠ active camera.
- Keep an independent scrollable chat region and fixed compose/actions; Chat / Thành viên / Quản lý remain as content tabs, not view modes.
- Preserve optional tap-to-pin (focus) as an in-place gesture, no persistent mode switch.
- Seat count may be <6, but backend must continue to enforce 6 maximum and host reservation. Hiding vacant positions changes display only.
- Top 3 stays collapsed, and uses **no fake live transactions** when server is connected.

## Status
- Web prototype: round avatars with no fictitious video; can pin by tapping a seat.
- React Native: video track -> rectangular media, no track -> circular avatar; not validated with an actual 2-device LiveKit call.
- Backend roles, invitations, chat moderation carried forward with no permissions changes.
- Native build and camera streaming remain NOT ACCEPTED until device testing.

## Manual acceptance checklist
- 320/390/430 px both Warm Ivory and Espresso Night: circles stay circular, names do not clip, chat and controls remain available.
- 1,2,3,4,5,6 seats layout without empty rectangular cards. Host disconnect reserves its right to return.
- Camera off -> round avatar; camera on -> actual VideoTrack; mic off remains off.
- Tap to pin; focus returns on unpin; no unrelated display mode picker.
- Keyboard open/closed, scrolling chat, moderator menu, invitation accept/decline, small screen/tall screen.
