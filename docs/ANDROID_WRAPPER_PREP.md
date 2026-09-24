# Android Wrapper Prep - Phase 20

Tool Tile Match now includes Capacitor configuration and helper scripts for creating the Android wrapper locally.

This document is kept as the short reference. See `docs/PHASE20_ANDROID_WRAPPER_SETUP.md` for the full workflow.

## Safe local order

```powershell
npm.cmd config set registry https://registry.npmjs.org/
npm.cmd install --registry=https://registry.npmjs.org/
npm.cmd run build
npm.cmd run android:doctor
npm.cmd run android:create
npm.cmd run android:open
```

## Important

Do not create a Netlify build for normal Android testing. Build and preview locally first.

Do not commit or move forward with the generated `android/` folder until the regular React/Vite game builds cleanly.
