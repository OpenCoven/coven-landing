// Run after building, with the local preview reachable. The poster is exported
// synchronously from the same procedural scene used by the live enhancement.
import { chromium } from '@playwright/test';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
const require = createRequire(import.meta.resolve('astro'));
const sharp = require('sharp');
const origin = process.argv[2] || 'http://127.0.0.1:4173';
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
  const page = await context.newPage();
  await page.goto(origin);
  await page.locator('[data-hero-sculpture][data-state="live"]').waitFor();
  const data = await page.evaluate(async () => {
    const resource = performance.getEntriesByType('resource').find(entry => entry.name.includes('sculpture-scene'));
    const { mountSculpture } = await import(resource.name);
    const stage = document.createElement('div');
    stage.style.cssText = 'position:fixed;left:0;top:0;width:1000px;height:800px';
    document.body.appendChild(stage);
    const scene = mountSculpture(stage);
    scene.render(0, { x: 0, y: 0 });
    const image = stage.querySelector('canvas').toDataURL('image/png');
    scene.dispose();
    stage.remove();
    return image;
  });
  await mkdir('public/hero', { recursive: true });
  await sharp(Buffer.from(data.split(',')[1], 'base64')).resize(1000, 800).webp({ quality: 88, alphaQuality: 100 }).toFile('public/hero/confluence.webp');
  console.log('Rendered public/hero/confluence.webp from the live scene (1000 × 800).');
} finally {
  await browser.close();
}
