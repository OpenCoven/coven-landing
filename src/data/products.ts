import {
  quickstartProducts as proceduralQuickstartGuides,
  type QuickstartProduct,
} from './quickstart.ts';

export type PublicProductId =
  | 'coven-cli'
  | 'coven-code'
  | 'coven-cave'
  | 'castcodes'
  | 'github';

export type ProductLifecycle = 'active' | 'archived';
export type ProductMaturity =
  | 'available'
  | 'beta'
  | 'gated-beta'
  | 'archived';

export interface ProductAction {
  label: string;
  href: string;
}

export interface PublicProduct {
  id: PublicProductId;
  name: string;
  category: string;
  eyebrow: string;
  summary: string;
  bestFor: string;
  lifecycle: ProductLifecycle;
  maturity: ProductMaturity;
  statusLabel: string;
  recommended: boolean;
  platforms: string;
  canonicalUrl: string;
  docsUrl: string | null;
  repositoryUrl: string;
  ownerRepository: string;
  primaryAction: ProductAction;
  evidenceUrls: string[];
  predecessor: PublicProductId | null;
  successor: PublicProductId | null;
  verifiedAt: string;
  sourceRevision: string;
}

export interface FoundationCommand {
  id: 'install-cli' | 'doctor' | 'launch';
  command: string;
  label: string;
}

const VERIFIED_AT = '2026-08-30';
const POSITIONING_REVISION = '3268ad7081833af06b84d3f5c721603aea56cfe0';
const COVEN_ONBOARDING_URL = 'https://docs.opencoven.ai/docs/guide/install';

/**
 * Stable public ordering. The archived CastCodes record retains its historical
 * position for compatibility with the old static verifier and deep links; all
 * recommended UI is derived from activeProducts instead.
 */
export const publicProducts: readonly PublicProduct[] = [
  {
    id: 'coven-cli',
    name: 'Coven CLI',
    category: 'Local runtime',
    eyebrow: 'Terminal runtime',
    summary:
      'Install the shared OpenCoven runtime, check your project, and start a provider-backed session.',
    bestFor:
      'Terminal-first control, diagnostics, scripts, and the shared foundation for current OpenCoven surfaces.',
    lifecycle: 'active',
    maturity: 'available',
    statusLabel: 'Recommended foundation',
    recommended: true,
    platforms: 'macOS Apple Silicon · glibc Linux x64 · Windows x64 · also available for macOS Intel x64',
    canonicalUrl: 'https://www.npmjs.com/package/@opencoven/cli',
    docsUrl: COVEN_ONBOARDING_URL,
    repositoryUrl: 'https://github.com/OpenCoven/coven',
    ownerRepository: 'OpenCoven/coven',
    primaryAction: {
      label: 'Install the CLI',
      href: 'https://www.npmjs.com/package/@opencoven/cli',
    },
    evidenceUrls: [
      'https://github.com/OpenCoven/coven',
      COVEN_ONBOARDING_URL,
    ],
    predecessor: null,
    successor: null,
    verifiedAt: VERIFIED_AT,
    sourceRevision: POSITIONING_REVISION,
  },
  {
    id: 'coven-code',
    name: 'Coven Code',
    category: 'Interactive coding cockpit',
    eyebrow: 'Interactive agent TUI',
    summary:
      'Use the unified Coven CLI to enter an interactive, provider-backed coding workspace.',
    bestFor: 'An interactive coding-agent cockpit inside an existing project.',
    lifecycle: 'active',
    maturity: 'beta',
    statusLabel: 'Beta',
    recommended: true,
    platforms: 'macOS Apple Silicon and Intel x64 · Linux x64 and ARM64 · Windows x64',
    canonicalUrl: 'https://github.com/OpenCoven/coven-code',
    docsUrl: null,
    repositoryUrl: 'https://github.com/OpenCoven/coven-code',
    ownerRepository: 'OpenCoven/coven-code',
    primaryAction: {
      label: 'Open Coven Code',
      href: 'https://github.com/OpenCoven/coven-code',
    },
    evidenceUrls: [
      'https://github.com/OpenCoven/coven-code',
      'https://github.com/OpenCoven/coven-code/releases',
    ],
    predecessor: 'castcodes',
    successor: null,
    verifiedAt: VERIFIED_AT,
    sourceRevision: POSITIONING_REVISION,
  },
  {
    id: 'coven-cave',
    name: 'Coven Cave',
    category: 'Human oversight application',
    eyebrow: 'Visual desktop home',
    summary:
      'Connect the desktop app to its local Coven runtime, with an optional iOS companion handoff.',
    bestFor:
      'Visual oversight for projects, familiars, sessions, evidence, approvals, and recovery.',
    lifecycle: 'active',
    maturity: 'available',
    statusLabel: 'Native desktop app',
    recommended: true,
    platforms: 'macOS Apple Silicon and Intel x64 · Windows x64 · Linux x64 · optional iOS companion',
    canonicalUrl: 'https://github.com/OpenCoven/coven-cave/releases/latest',
    docsUrl: COVEN_ONBOARDING_URL,
    repositoryUrl: 'https://github.com/OpenCoven/coven-cave',
    ownerRepository: 'OpenCoven/coven-cave',
    primaryAction: {
      label: 'Download Cave',
      href: 'https://github.com/OpenCoven/coven-cave/releases/latest',
    },
    evidenceUrls: [
      'https://github.com/OpenCoven/coven-cave/releases/latest',
      'https://github.com/OpenCoven/coven-cave/attestations',
    ],
    predecessor: null,
    successor: null,
    verifiedAt: VERIFIED_AT,
    sourceRevision: POSITIONING_REVISION,
  },
  {
    id: 'castcodes',
    name: 'CastCodes',
    category: 'Historical Linux workspace',
    eyebrow: 'Archived predecessor',
    summary:
      'Historical Linux workspace retained for release lineage and migration reference.',
    bestFor:
      'Existing CastCodes users who need archived release or successor information; not a recommended new start.',
    lifecycle: 'archived',
    maturity: 'archived',
    statusLabel: 'Archived · use Coven Code',
    recommended: false,
    platforms: 'Historical Linux x86_64 releases',
    canonicalUrl: 'https://github.com/OpenCoven/cast-codes',
    docsUrl: null,
    repositoryUrl: 'https://github.com/OpenCoven/cast-codes',
    ownerRepository: 'OpenCoven/cast-codes',
    primaryAction: {
      label: 'Use Coven Code instead',
      href: 'https://github.com/OpenCoven/coven-code',
    },
    evidenceUrls: [
      'https://github.com/OpenCoven/cast-codes',
      'https://github.com/OpenCoven/coven-code',
    ],
    predecessor: null,
    successor: 'coven-code',
    verifiedAt: VERIFIED_AT,
    sourceRevision: POSITIONING_REVISION,
  },
  {
    id: 'github',
    name: 'OpenCoven for GitHub',
    category: 'GitHub-triggered familiar delivery',
    eyebrow: 'GitHub delivery',
    summary:
      'Assign bounded GitHub work to a familiar and receive inspectable status, Check Runs, and a draft pull request when commits exist.',
    bestFor:
      'Issue-to-delivery workflows with hosted-gated or self-hosted setup and Cave oversight.',
    lifecycle: 'active',
    maturity: 'gated-beta',
    statusLabel: 'Beta · hosted access gated',
    recommended: true,
    platforms: 'GitHub · hosted beta or self-hosted worker',
    canonicalUrl: '/github',
    docsUrl: 'https://github.com/OpenCoven/coven-github/blob/main/docs/self-hosting.md',
    repositoryUrl: 'https://github.com/OpenCoven/coven-github',
    ownerRepository: 'OpenCoven/coven-github',
    primaryAction: {
      label: 'Choose hosted or self-hosted',
      href: '/github',
    },
    evidenceUrls: [
      'https://github.com/OpenCoven/coven-github',
      'https://github.com/OpenCoven/coven-github/blob/main/docs/self-hosting.md',
    ],
    predecessor: null,
    successor: null,
    verifiedAt: VERIFIED_AT,
    sourceRevision: POSITIONING_REVISION,
  },
] as const;

export const canonicalFoundationCommands: readonly FoundationCommand[] = [
  {
    id: 'install-cli',
    command: 'npm install -g @opencoven/cli',
    label: 'Install the shared OpenCoven CLI/runtime',
  },
  {
    id: 'doctor',
    command: 'coven doctor',
    label: 'Check the current project and provider prerequisites',
  },
  {
    id: 'launch',
    command: 'coven',
    label: 'Open the current project in Coven',
  },
] as const;

export const activeProducts = publicProducts.filter(
  (product) => product.lifecycle === 'active' && product.recommended,
);

export const archivedProducts = publicProducts.filter(
  (product) => product.lifecycle === 'archived',
);

const guidesById = new Map<PublicProductId, QuickstartProduct>(
  proceduralQuickstartGuides.map((guide) => [guide.id as PublicProductId, guide]),
);

function guideFor(product: PublicProduct): QuickstartProduct {
  const guide = guidesById.get(product.id);
  if (!guide) {
    throw new Error(`Missing procedural quickstart guide for public product ${product.id}`);
  }

  return {
    ...guide,
    eyebrow: product.eyebrow,
    name: product.name,
    summary: product.summary,
    bestFor: product.bestFor,
    status: product.statusLabel,
    platforms: product.platforms,
    links:
      product.lifecycle === 'archived'
        ? [
            {
              label: product.primaryAction.label,
              href: product.primaryAction.href,
              primary: true,
            },
            {
              label: 'View the CastCodes archive',
              href: product.repositoryUrl,
            },
          ]
        : guide.links,
  };
}

export const allQuickstartGuides = publicProducts.map(guideFor);
export const activeQuickstartGuides = activeProducts.map(guideFor);
export const archivedQuickstartGuides = archivedProducts.map(guideFor);

export function getPublicProduct(id: PublicProductId): PublicProduct {
  const product = publicProducts.find((entry) => entry.id === id);
  if (!product) throw new Error(`Unknown public product ${id}`);
  return product;
}
