# Phase 20 - Android Wrapper Setup

Phase 20 prepares Tool Tile Match to create the actual Android project folder locally with Capacitor.

This phase still does not include a generated `android/` folder because that folder should be created on your computer after dependencies install and the web build passes.

## Why create the Android folder locally?

Capacitor generates Android files based on the installed package versions, your Java/Android Studio setup, and your local Gradle environment. Creating it locally avoids stale generated files and keeps the project cleaner.

## Local command order

From the project folder:

```powershell
npm.cmd config set registry https://registry.npmjs.org/
npm.cmd install --registry=https://registry.npmjs.org/
npm.cmd run build
npm.cmd run android:doctor
npm.cmd run android:create
```

Then open Android Studio:

```powershell
npm.cmd run android:open
```

## What `android:doctor` checks

- Node and npm availability
- npm registry
- package version
- Capacitor config
- production `dist` folder
- Capacitor dependencies
- Android folder status
- Java / Android SDK environment variables

## What `android:create` does

- confirms Capacitor dependencies exist
- runs the Vite production build
- creates `android/` using Capacitor if it does not exist
- syncs the web app into the Android wrapper

## Still not included in this phase

- no APK yet
- no Google Play upload
- no Apple/iOS wrapper
- no backend
- no ads
- no accounts
- no online leaderboard
- no Netlify build

## After Android is created

The next phase should be Android Studio setup and installed phone testing with a debug APK.
