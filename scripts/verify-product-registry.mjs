import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  activeProducts,
  activeQuickstartGuides,
  allQuickstartGuides,
  archivedProducts,
  archivedQuickstartGuides,
  canonicalFoundationCommands,
  publicProducts,
} from '../src/data/products.ts';

const root = process.cwd();
const allowedLifecycles = new Set(['active', 'archived']);
const allowedMaturities = new Set([
  'available',
  'beta',
  'gated-beta',
  'archived',
]);
const expectedActiveIds = ['coven-cli', 'coven-code', 'coven-cave', 'github'];
const expectedActiveNames = [
  'Coven CLI',
  'Coven Code',
  'Coven Cave',
  'OpenCoven for GitHub',
];
const forbiddenDestinations = [
  'https://opencoven.ai/cave',
  'https://opencoven.ai/cli',
  'https://opencoven.ai/code',
];

const unique = (values) => new Set(values).size === values.length;
const fail = (message) => {
  throw new Error(`Public product registry: ${message}`);
};

if (publicProducts.length !== 5) {
  fail(`expected four active products plus one archive record; found ${publicProducts.length}`);
}
if (!unique(publicProducts.map((product) => product.id))) {
  fail('product ids must be unique');
}
if (!unique(publicProducts.map((product) => product.name))) {
  fail('public product names must be unique');
}

for (const product of publicProducts) {
  if (!allowedLifecycles.has(product.lifecycle)) {
    fail(`${product.id} has unsupported lifecycle ${product.lifecycle}`);
  }
  if (!allowedMaturities.has(product.maturity)) {
    fail(`${product.id} has unsupported maturity ${product.maturity}`);
  }
  for (const field of [
    'category',
    'eyebrow',
    'summary',
    'bestFor',
    'statusLabel',
    'platforms',
    'canonicalUrl',
    'repositoryUrl',
    'ownerRepository',
    'verifiedAt',
    'sourceRevision',
  ]) {
    if (!product[field] || typeof product[field] !== 'string') {
      fail(`${product.id} is missing required string field ${field}`);
    }
  }
  if (!product.ownerRepository.startsWith('OpenCoven/')) {
    fail(`${product.id} ownerRepository must be an OpenCoven owner/name`);
  }
  if (!Array.isArray(product.evidenceUrls) || product.evidenceUrls.length === 0) {
    fail(`${product.id} must have at least one evidence URL`);
  }
  if (!product.primaryAction?.label || !product.primaryAction?.href) {
    fail(`${product.id} must have a primary action`);
  }
  for (const destination of [
    product.canonicalUrl,
    product.primaryAction.href,
    product.docsUrl,
    product.repositoryUrl,
    ...product.evidenceUrls,
  ].filter(Boolean)) {
    if (forbiddenDestinations.includes(destination)) {
      fail(`${product.id} retains nonexistent destination ${destination}`);
    }
  }
  if (product.lifecycle === 'archived') {
    if (product.recommended) fail(`${product.id} is archived but recommended`);
    if (product.maturity !== 'archived') {
      fail(`${product.id} is archived but maturity is ${product.maturity}`);
    }
    if (!product.successor) fail(`${product.id} archive record must name a successor`);
  } else {
    if (!product.recommended) fail(`${product.id} is active but absent from recommended starts`);
    if (product.maturity === 'archived') {
      fail(`${product.id} is active with archived maturity`);
    }
  }
}

const activeIds = activeProducts.map((product) => product.id);
if (JSON.stringify(activeIds) !== JSON.stringify(expectedActiveIds)) {
  fail(`active product order must be ${expectedActiveIds.join(', ')}; found ${activeIds.join(', ')}`);
}
if (archivedProducts.length !== 1 || archivedProducts[0].id !== 'castcodes') {
  fail('CastCodes must be the single explicit archive record');
}
if (archivedProducts[0].successor !== 'coven-code') {
  fail('CastCodes successor must be Coven Code');
}
const code = publicProducts.find((product) => product.id === 'coven-code');
if (code?.predecessor !== 'castcodes') {
  fail('Coven Code must record CastCodes as its predecessor');
}

const commandContract = canonicalFoundationCommands.map(({ id, command }) => ({
  id,
  command,
}));
const expectedCommands = [
  { id: 'install-cli', command: 'npm install -g @opencoven/cli' },
  { id: 'doctor', command: 'coven doctor' },
  { id: 'launch', command: 'coven' },
];
if (JSON.stringify(commandContract) !== JSON.stringify(expectedCommands)) {
  fail('canonical foundation must remain install → doctor → coven');
}
if (canonicalFoundationCommands.some(({ command }) => /\bcoven init\b/i.test(command))) {
  fail('canonical foundation must never contain coven init');
}

// The procedural guide arrays remain an internal compatibility surface until
// their legacy data module is removed. They are not the public route source.
const allGuideIds = allQuickstartGuides.map((guide) => guide.id);
if (JSON.stringify(allGuideIds) !== JSON.stringify(publicProducts.map((product) => product.id))) {
  fail('internal procedural guides must follow stable registry order');
}
if (
  JSON.stringify(activeQuickstartGuides.map((guide) => guide.id))
  !== JSON.stringify(expectedActiveIds)
) {
  fail('active internal procedural guides must derive from the active registry set');
}
if (
  archivedQuickstartGuides.length !== 1
  || archivedQuickstartGuides[0].id !== 'castcodes'
  || !/Archived/.test(archivedQuickstartGuides[0].status)
) {
  fail('archived internal procedural guide must remain visibly marked as archived');
}

const pageSource = await readFile(path.join(root, 'src/pages/quickstart.astro'), 'utf8');
for (const required of [
  "from '../data/products.ts'",
  'activeProducts.map',
  'archivedProducts.map',
  'canonicalFoundationCommands.map',
  'data-active-product-grid',
  'data-archived-product-grid',
  'data-product-lifecycle="archived"',
  'Historical lineage stays visible, not recommended.',
]) {
  if (!pageSource.includes(required)) {
    fail(`quickstart source is missing registry consumer contract: ${required}`);
  }
}
for (const forbidden of [
  "import { quickstartProducts } from '../data/quickstart'",
  'activeQuickstartGuides.map',
  'archivedQuickstartGuides.map',
  'allQuickstartGuides.map',
  'retiredCompatibilityCopy',
]) {
  if (pageSource.includes(forbidden)) {
    fail(`quickstart route retains legacy procedural consumer: ${forbidden}`);
  }
}

const builtPath = path.join(root, 'dist', 'quickstart', 'index.html');
if (existsSync(builtPath)) {
  const html = await readFile(builtPath, 'utf8');
  const activeGrid = html.match(
    /<div\s+class="product-grid"[^>]*data-active-product-grid[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/section>/,
  )?.[1];
  if (!activeGrid) fail('built quickstart is missing the active product grid');
  const activeCards = activeGrid.match(/data-product-lifecycle="active"/g) ?? [];
  if (activeCards.length !== 4) {
    fail(`built quickstart must contain four active cards; found ${activeCards.length}`);
  }
  if (/CastCodes/.test(activeGrid)) {
    fail('CastCodes must not appear in the active recommended product grid');
  }

  const archiveGrid = html.match(
    /<div\s+class="archive-stack"[^>]*data-archived-product-grid[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/section>/,
  )?.[1];
  if (!archiveGrid) fail('built quickstart is missing the archive grid');
  const archiveCards = archiveGrid.match(/data-product-lifecycle="archived"/g) ?? [];
  if (archiveCards.length !== 1) {
    fail(`built quickstart must contain one archived record; found ${archiveCards.length}`);
  }
  if (!/CastCodes/.test(archiveGrid) || !/Archived · use Coven Code/.test(archiveGrid)) {
    fail('built archive record must identify CastCodes and its Coven Code successor');
  }

  const jsonBlocks = [...html.matchAll(
    /<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/g,
  )].map((match) => JSON.parse(match[1]));
  const documents = jsonBlocks.flatMap((entry) => (Array.isArray(entry) ? entry : [entry]));
  const collection = documents.find((entry) => entry['@type'] === 'CollectionPage');
  if (!collection) fail('built quickstart is missing CollectionPage JSON-LD');
  const items = collection.mainEntity?.itemListElement;
  if (!Array.isArray(items) || items.length !== 4) {
    fail('quickstart CollectionPage JSON-LD must contain exactly four active products');
  }
  const jsonNames = items.map((item) => item.name);
  if (JSON.stringify(jsonNames) !== JSON.stringify(expectedActiveNames)) {
    fail(`quickstart JSON-LD names drifted: ${jsonNames.join(', ')}`);
  }
  if (jsonNames.includes('CastCodes')) {
    fail('quickstart active JSON-LD must not include CastCodes');
  }
  if (/name="description"[^>]*CastCodes/i.test(html)) {
    fail('current quickstart metadata must not promote CastCodes');
  }
}

console.log(
  'Verified four registry-backed active products, one non-recommended CastCodes archive/successor record, active-only JSON-LD, and the canonical three-command foundation.',
);
