import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const dist = path.join(process.cwd(), 'dist');
const attributes = ['data-stars-count', 'data-dlcount', 'data-discord-count'];
const destinationReplacements = new Map([
  ['https://opencoven.ai/cave', 'https://github.com/OpenCoven/coven-cave/releases/latest'],
  ['https://opencoven.ai/cli', 'https://www.npmjs.com/package/@opencoven/cli'],
  ['https://opencoven.ai/code', 'https://github.com/OpenCoven/coven-code'],
]);

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await htmlFiles(absolute));
    else if (entry.isFile() && entry.name.endsWith('.html')) files.push(absolute);
  }
  return files;
}

let proofReplacements = 0;
let destinationReplacementCount = 0;
for (const file of await htmlFiles(dist)) {
  let html = await readFile(file, 'utf8');
  const before = html;
  for (const attribute of attributes) {
    const pattern = new RegExp(
      `(<span\\b(?=[^>]*\\b${attribute}(?:=""|(?=[\\s>])))[^>]*>)\\s*0\\s*(<\\/span>)`,
      'g',
    );
    html = html.replace(pattern, (_match, open, close) => {
      proofReplacements += 1;
      return `${open}${close}`;
    });
  }
  for (const [from, to] of destinationReplacements) {
    const pattern = new RegExp(`href="${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g');
    html = html.replace(pattern, () => {
      destinationReplacementCount += 1;
      return `href="${to}"`;
    });
  }
  if (html !== before) await writeFile(file, html, 'utf8');
}

const homepage = await readFile(path.join(dist, 'index.html'), 'utf8');
for (const attribute of attributes) {
  const zero = new RegExp(
    `<span\\b(?=[^>]*\\b${attribute}(?:=""|(?=[\\s>])))[^>]*>\\s*0\\s*<\\/span>`,
  );
  if (zero.test(homepage)) {
    throw new Error(`Built homepage still exposes zero-valued fallback for ${attribute}`);
  }
}

for (const from of destinationReplacements.keys()) {
  for (const file of await htmlFiles(dist)) {
    const html = await readFile(file, 'utf8');
    if (html.includes(`href="${from}"`)) {
      throw new Error(
        `Built public page still exposes nonexistent destination ${from}: ${path.relative(process.cwd(), file)}`,
      );
    }
  }
}

console.log(
  `Sanitized ${proofReplacements} zero-valued public proof fallback${proofReplacements === 1 ? '' : 's'} and remapped ${destinationReplacementCount} known dead destination${destinationReplacementCount === 1 ? '' : 's'} in built HTML.`,
);
