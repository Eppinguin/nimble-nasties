import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { test } from 'node:test';

// Asset references use Vite's public directory and must keep working offline.
test('supplied logo and app icon are wired into the header and web metadata', () => {
  const app = readFileSync('src/header/AppHeader.tsx', 'utf8');
  const html = readFileSync('index.html', 'utf8');
  const stylesheet = readdirSync('src/styles')
    .map((file) => readFileSync(`src/styles/${file}`, 'utf8'))
    .join('\n');
  assert.match(app, /nimble-nasties-logo\.webp/);
  assert.match(app, /nimble-nasties-icon\.webp/);
  for (const name of ['favicon.ico', 'favicon-16.png', 'favicon-32.png', 'apple-touch-icon.png', 'manifest.webmanifest']) {
    assert.match(html, new RegExp(name.replace('.', '\\.')));
    assert.ok(statSync(`public/${name}`).size > 0, `${name} must have content`);
  }
  for (const image of ['nimble-nasties-logo.webp', 'nimble-nasties-icon.webp', 'icon-192.png', 'icon-512.png']) {
    assert.ok(statSync(`public/${image}`).size > 1000, `${image} must have image bytes`);
  }
  assert.match(stylesheet, /--signal:\s*#ff7a33/);
  assert.match(stylesheet, /\.app-header\s*\{\s*background:\s*#11100e/);
});

test('install icon sizes and theme colors are valid', () => {
  const manifest = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8'));
  assert.equal(manifest.name, 'Nimble Nasties — Encounter Manager');
  assert.equal(manifest.theme_color, '#13100d');
  for (const icon of manifest.icons) {
    const data = readFileSync(`public/${icon.src.replace(/^\//, '')}`);
    assert.equal(data.toString('hex', 0, 8), '89504e470d0a1a0a');
  }
});
