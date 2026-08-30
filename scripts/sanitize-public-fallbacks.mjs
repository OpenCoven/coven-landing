import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const dist = path.join(process.cwd(), 'dist');
const attributes = ['data-stars-count', 'data-dlcount', 'data-discord-count'];

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

let replacements = 0;
for (const file of await htmlFiles(dist)) {
  let html = await readFile(file, 'utf8');
  const before = html;
  for (const attribute of attributes) {
    const pattern = new RegExp(
      `(<span\\b(?=[^>]*\\b${attribute}(?:=""|(?=[\\s>])))[^>]*>)\\s*0\\s*(<\\/span>)`,
      'g',
    );
    html = html.replace(pattern, (_match, open, close) => {
      replacements += 1;
      return `${open}${close}`;
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

console.log(
  `Sanitized ${replacements} zero-valued public proof fallback${replacements === 1 ? '' : 's'} from built HTML.`,
);
