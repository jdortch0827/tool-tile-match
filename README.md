# Tool Tile Match - Phase 21 Mobile Game Polish

Phase 21 is a **local-project-only mobile game presentation polish build**. No Netlify build is included, and no APK is included.

This phase takes inspiration from common mobile Mahjong game patterns the user provided — loading progress, large play-entry buttons, streak/reward visuals, and stronger win celebration — while keeping Tool Tile Match original, construction-themed, and not a copy of another game's artwork or UI.

## What changed in Phase 21

- Updated app version to `0.21.0-beta.1`.
- Updated service worker cache to `tool-tile-match-phase21-v1`.
- Improved the loading screen with:
  - stronger app-icon spotlight
  - more polished progress bar
  - helpful loading tip
- Improved the mode selection area with:
  - more mobile-game-style cards
  - stronger button shine/depth
  - clearer Continue / Daily / Quick / Stats choices
- Added a Daily Job streak lane showing 7-day progress.
- Added a toolbox reward meter on the job map.
- Improved the win modal with:
  - larger celebration hero
  - stronger score treatment
  - star/emblem reward feel
  - post-win toolbox progress meter
- Improved control button feel with stronger press feedback.
- Kept all saves localStorage-only.
- Kept Android wrapper prep scripts from Phase 20.

## What Phase 21 does not do

- No Netlify build.
- No APK.
- No Google Play upload.
- No iOS wrapper.
- No backend.
- No ads.
- No accounts.
- No online leaderboard.
- No copied third-party game artwork.

## Local testing commands

Run from the project folder:

```powershell
npm.cmd config set registry https://registry.npmjs.org/
npm.cmd install --registry=https://registry.npmjs.org/
npm.cmd run dev:host
```

Then open the Vite Network URL on your phone while your phone and computer are on the same Wi-Fi.

## Production preview locally

```powershell
npm.cmd run build
npm.cmd run preview:host
```

## Android prep still available

Only after the local web build works:

```powershell
npm.cmd run android:doctor
npm.cmd run android:create
npm.cmd run android:open
```

## Phase 21 test checklist

Test on phone:

- Loading screen looks polished and not too slow.
- Mode cards are easy to understand.
- Daily streak lane is readable.
- Toolbox meter looks good and does not clutter the start screen.
- Campaign level still starts correctly.
- Daily Job still starts correctly.
- Quick Play still starts correctly.
- Win modal feels more rewarding.
- Score text does not overflow.
- Buttons are easy to tap.
- No horizontal scrolling.
- Local progress still saves after refresh.
- Reset progress still works.
- `?debug=true` tools still appear only in debug mode.

## Notes on visual inspiration

The uploaded reference screenshots show strong mobile game patterns:

- simple loading progress
- large level/start entry button
- visible map/progression feeling
- high-reward win screen
- daily streak reward lane
- bottom booster/action buttons

Tool Tile Match uses those patterns in an original construction/tool style instead of duplicating the exact castle, swan, button graphics, tile faces, or wording from the reference game.
