#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

function run(cmd) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

function requirePath(path, message) {
  if (!existsSync(path)) {
    console.error(`\nMissing: ${path}`);
    console.error(message);
    process.exit(1);
  }
}

console.log('\nTool Tile Match Android Wrapper Creator');
console.log('========================================');
requirePath('package.json', 'Run this from the project root.');
requirePath('capacitor.config.ts', 'Capacitor config is required before creating Android.');
requirePath('node_modules/@capacitor/cli', 'Run: npm.cmd install --registry=https://registry.npmjs.org/');
requirePath('node_modules/@capacitor/android', 'Run: npm.cmd install --registry=https://registry.npmjs.org/');

run('npm run build');
requirePath('dist/index.html', 'Build did not create dist/index.html. Fix build errors first.');

if (!existsSync('android')) {
  run('npx cap add android');
} else {
  console.log('\nAndroid folder already exists. Skipping npx cap add android.');
}

run('npx cap sync android');

if (process.argv.includes('--open')) {
  run('npx cap open android');
} else {
  console.log('\nAndroid wrapper is ready for Android Studio.');
  console.log('Open it with: npm.cmd run android:open');
}
