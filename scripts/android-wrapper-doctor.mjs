#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const run = (cmd) => {
  try { return execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' }).trim(); }
  catch { return null; }
};

const check = (label, passed, detail = '') => ({ label, passed, detail });
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const registry = run('npm config get registry') || 'unknown';
const checks = [
  check('Node available', Boolean(run('node -v')), run('node -v') || 'not found'),
  check('npm available', Boolean(run('npm -v')), run('npm -v') || 'not found'),
  check('npm public registry', registry.includes('registry.npmjs.org'), registry),
  check('package.json version', pkg.version === '0.21.0-beta.1', pkg.version),
  check('Capacitor config exists', existsSync('capacitor.config.ts'), 'capacitor.config.ts'),
  check('Vite dist exists', existsSync('dist/index.html'), existsSync('dist/index.html') ? 'dist/index.html found' : 'run npm.cmd run build first'),
  check('Capacitor CLI installed', existsSync('node_modules/@capacitor/cli'), existsSync('node_modules/@capacitor/cli') ? 'installed' : 'run npm.cmd install'),
  check('Capacitor Android package installed', existsSync('node_modules/@capacitor/android'), existsSync('node_modules/@capacitor/android') ? 'installed' : 'run npm.cmd install'),
  check('Android folder exists', existsSync('android'), existsSync('android') ? 'android folder found' : 'not created yet'),
  check('JAVA_HOME set', Boolean(process.env.JAVA_HOME), process.env.JAVA_HOME || 'not set'),
  check('ANDROID_HOME or ANDROID_SDK_ROOT set', Boolean(process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT), process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || 'not set')
];

console.log('\nTool Tile Match Android Wrapper Doctor');
console.log('======================================');
for (const c of checks) {
  console.log(`${c.passed ? 'PASS' : 'CHECK'} - ${c.label}${c.detail ? `: ${c.detail}` : ''}`);
}
console.log('\nRecommended local order:');
console.log('1. npm.cmd config set registry https://registry.npmjs.org/');
console.log('2. npm.cmd install --registry=https://registry.npmjs.org/');
console.log('3. npm.cmd run build');
console.log('4. npm.cmd run android:doctor');
console.log('5. npm.cmd run android:create');
console.log('6. npm.cmd run android:open');
console.log('\nNo Netlify is needed for these checks.');
