import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const root = process.cwd();
const publicDir = path.join(root, 'public');
const distDir = path.join(root, 'dist');
const publicFiles = ['favicon.svg','apple-touch-icon.png','og.png','og.svg','robots.txt'];
for (const file of publicFiles) if (!existsSync(path.join(publicDir,file))) throw new Error(`Missing required public file: ${file}`);

const routes = [
  ['index.html','/'],
  ['quickstart/index.html','/quickstart'],
  ['github/index.html','/github'],
  ['how-it-works/index.html','/how-it-works'],
  ['protocol/index.html','/protocol'],
  ['security/index.html','/security'],
  ['status/index.html','/status'],
  ['privacy/index.html','/privacy'],
  ['terms/index.html','/terms'],
];
const pages = new Map();
for (const [file,route] of routes) {
  const absolute = path.join(distDir,file);
  if (!existsSync(absolute)) throw new Error(`Missing built route: dist/${file}`);
  const html = await readFile(absolute,'utf8');
  pages.set(route,html);
  const canonical = new URL(route,'https://opencoven.ai').toString();
  if (!html.includes(`<link rel="canonical" href="${canonical}"`)) throw new Error(`${route} is missing canonical URL ${canonical}`);
  if (!/<main\b/.test(html)) throw new Error(`${route} has no main landmark`);
  const h1Count=(html.match(/<h1\b/g)||[]).length;
  if (h1Count!==1) throw new Error(`${route} must contain exactly one h1; found ${h1Count}`);
  if (html.includes('fonts.googleapis.com')) throw new Error(`${route} loads remote Google Fonts`);
  if (html.includes('min-width: 1140px') || html.includes('data-r="shell"')) throw new Error(`${route} retains retired hard-width/redesign shell`);
}
if (!existsSync(path.join(distDir,'sitemap-index.xml'))) throw new Error('dist/sitemap-index.xml is missing');

const renderedText = (html) => html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const need=(route,strings)=>{const text=renderedText(pages.get(route));for(const s of strings)if(!text.includes(s))throw new Error(`${route} missing required text: ${s}`);};
need('/', ['Give your agents continuity. Keep authority local.','Identity → authority → continuity.','npm install -g @opencoven/cli','coven doctor']);
need('/quickstart',['Start with one local foundation.','Historical lineage stays visible, not recommended.','Coven CLI','Coven Code','Coven Cave','OpenCoven for GitHub','CastCodes']);
need('/github',['Assign bounded work. Get inspectable delivery back.','Hosted access gated','Public operator path']);
need('/how-it-works',['Coordinate agent work without handing away authority.','Claims make overlap explicit.']);
need('/protocol',['Identity, authority, and continuity stay distinct.','SPAR · continuity profile']);
need('/security',['Report vulnerabilities privately. Verify what you run.']);
need('/status',['Status should come from data, not memory.']);
need('/privacy',['Privacy Policy','Analytics are disabled by default']);
need('/terms',['Terms of Service','Governing Law']);

const quickstart=pages.get('/quickstart');
if ((quickstart.match(/data-product-lifecycle="active"/g)||[]).length!==4) throw new Error('Quickstart must render four active products');
if ((quickstart.match(/data-product-lifecycle="archived"/g)||[]).length!==1) throw new Error('Quickstart must render one archived product');
if (/\bcoven init\b/i.test(renderedText(quickstart))) throw new Error('Quickstart retains obsolete coven init guidance');
const github=renderedText(pages.get('/github'));
for (const forbidden of ['$99/mo','$399/mo','14-day trial','Contact for Pricing','Assign it like a teammate']) if (github.includes(forbidden)) throw new Error(`GitHub route retains unsupported marketing claim: ${forbidden}`);

for (const relative of ['src/pages/index.astro','src/pages/quickstart.astro','src/pages/github.astro','src/pages/how-it-works.astro','src/pages/protocol.astro','src/pages/security.astro','src/pages/status.astro','src/pages/privacy.astro','src/pages/terms.astro','src/layouts/SiteLayout.astro']) {
  const source=await readFile(path.join(root,relative),'utf8');
  if (source.includes('components/redesign/') || source.includes('styles/redesign.css') || source.includes('styles/reforged.css')) throw new Error(`${relative} retains a legacy design-system dependency`);
}

async function jsGzip(html){let total=0;for(const match of html.matchAll(/<script(?![^>]*application\/ld\+json)(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) total+=gzipSync(match[1]).byteLength;for(const match of html.matchAll(/<script\b[^>]*\btype="module"[^>]*\bsrc="([^"]+)"/g)){const clean=match[1].split('?')[0];if(!clean.startsWith('/'))continue;const absolute=path.join(distDir,clean.slice(1));if(existsSync(absolute)) total+=gzipSync(await readFile(absolute)).byteLength;}return total;}
for (const [route,budget] of [['/',75*1024],['/quickstart',25*1024],['/github',20*1024],['/how-it-works',20*1024],['/protocol',20*1024],['/security',20*1024],['/status',20*1024],['/privacy',20*1024],['/terms',20*1024]]) { const bytes=await jsGzip(pages.get(route)); if(bytes>budget) throw new Error(`${route} initial JavaScript is ${bytes} gzip bytes; budget ${budget}`); }

console.log(`Verified ${publicFiles.length} public assets, ${routes.length} canonical routes, legacy retirement, bounded claims, accessibility landmarks, and route JavaScript budgets.`);
