# Android Studio First Test Checklist

Use this after `npm.cmd run android:create` successfully creates the Android folder.

## Before opening Android Studio

Run:

```powershell
npm.cmd run android:doctor
```

You want the main checks to pass. Java and Android SDK may still need Android Studio setup.

## First Android Studio tasks

1. Open Android Studio.
2. Open the generated `android` folder.
3. Let Gradle finish syncing.
4. Plug in your Android phone with USB debugging turned on, or start an emulator.
5. Run the app.
6. Confirm Tool Tile Match opens full-screen enough to feel app-like.

## First installed-phone tests

Test these before worrying about Google Play:

- launch screen / icon
- start screen fit
- campaign level start
- Daily Job start
- Quick Play start
- sound toggle
- vibration setting
- back button behavior
- game survives screen rotation or stays portrait
- progress saves after closing the app
- app reopens without a blank screen

## Known early wrapper risks

- Android back button may need custom handling later.
- Safe-area spacing may need adjustment for notches/status bars.
- PWA service worker may behave differently inside the Android wrapper.
- LocalStorage should work, but needs installed-app testing.
