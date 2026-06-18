import { SITE } from '../config/site';

type SchemaObject = Record<string, unknown>;

export type BreadcrumbItem = {
  name: string;
  href: string;
};

export type FaqItem = {
  question: string;
  answer: string;
};

export function normalizePathname(pathname: string) {
  if (!pathname || pathname === '/') return '/';
  return pathname.replace(/\/+$/, '') || '/';
}

export function absoluteUrl(pathOrUrl: string) {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const normalized = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return new URL(normalized, SITE.url).href;
}

export function canonicalUrl(pathname: string) {
  return absoluteUrl(normalizePathname(pathname));
}

export function formatTitle(title: string) {
  return title.includes(SITE.name) ? title : `${title} · ${SITE.name}`;
}

export function createOrganizationSchema(): SchemaObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE.url}/#organization`,
    name: SITE.name,
    alternateName: SITE.shortName,
    url: SITE.url,
    logo: absoluteUrl(SITE.logo),
    description: SITE.description,
    email: SITE.email,
    sameAs: [...SITE.sameAs],
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: SITE.email,
        availableLanguage: ['en'],
      },
    ],
  };
}

export function createWebSiteSchema(): SchemaObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE.url}/#website`,
    name: SITE.name,
    alternateName: SITE.shortName,
    url: SITE.url,
    inLanguage: 'en-US',
    publisher: {
      '@id': `${SITE.url}/#organization`,
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE.url}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function createSoftwareApplicationSchema(): SchemaObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': `${SITE.url}/#softwareapplication`,
    name: SITE.name,
    alternateName: SITE.shortName,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'macOS, Linux, Windows',
    description: SITE.description,
    url: SITE.url,
    downloadUrl: SITE.githubUrl,
    softwareHelp: {
      '@type': 'CreativeWork',
      url: SITE.docsUrl,
    },
    author: {
      '@id': `${SITE.url}/#organization`,
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    sameAs: [...SITE.sameAs],
  };
}

export function createWebPageSchema(options: {
  title: string;
  description: string;
  url: string;
  type?: string;
  breadcrumbs?: BreadcrumbItem[];
}): SchemaObject {
  const schema: SchemaObject = {
    '@context': 'https://schema.org',
    '@type': options.type ?? 'WebPage',
    '@id': `${options.url}#webpage`,
    name: options.title,
    description: options.description,
    url: options.url,
    inLanguage: 'en-US',
    isPartOf: {
      '@id': `${SITE.url}/#website`,
    },
    about: {
      '@id': `${SITE.url}/#organization`,
    },
  };

  if (options.breadcrumbs && options.breadcrumbs.length > 0) {
    schema.breadcrumb = {
      '@id': `${options.url}#breadcrumbs`,
    };
  }

  return schema;
}

export function createBreadcrumbSchema(items: BreadcrumbItem[], pageUrl: string): SchemaObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `${pageUrl}#breadcrumbs`,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.href),
    })),
  };
}

export function createFaqSchema(items: FaqItem[]): SchemaObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

export function createHowToSchema(options: {
  title: string;
  description: string;
  url: string;
  steps: Array<{ name: string; text: string }>;
}) {
  const { title, description, url, steps } = options;

  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: title,
    description,
    url,
    step: steps.map((item, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: item.name,
      text: item.text,
    })),
  };
}
