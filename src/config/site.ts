export const SITE = {
  name: "OpenCoven",
  shortName: "Coven",
  url: "https://opencoven.ai",
  description:
    "OpenCoven is a local-first runtime for persistent AI familiars: named agents with memory, tools, identity, and project-scoped continuity.",
  email: "val@viewdue.ai",
  docsUrl: "https://docs.opencoven.ai",
  githubUrl: "https://github.com/OpenCoven/coven",
  organizationUrl: "https://github.com/OpenCoven",
  discordUrl: "https://discord.gg/opencoven",
  xUrl: "https://x.com/OpenCvn",
  logo: "/favicon.svg",
  socialImage: "/og.png",
  locale: "en_US",
  sameAs: [
    "https://github.com/OpenCoven",
    "https://github.com/OpenCoven/coven",
    "https://discord.gg/opencoven",
    "https://x.com/OpenCvn",
  ],
} as const;

export const HOME_NAV_LINKS = [
  { href: "#architecture", label: "Architecture" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#quickstart", label: "Quick Start" },
  { href: "#faq", label: "FAQ" },
  { href: "#ecosystem", label: "Ecosystem" },
] as const;

export const UTILITY_NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/search", label: "Search" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
] as const;

export const FOOTER_LINKS = [
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/search", label: "Search" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
] as const;

export const HOME_FAQS = [
  {
    question: "What is OpenCoven?",
    answer:
      "OpenCoven is a local-first runtime for persistent AI familiars: named agents that keep memory, tools, identity, and project-scoped continuity across sessions.",
  },
  {
    question: "How is OpenCoven different from a bare harness?",
    answer:
      "A harness is only the agent CLI. OpenCoven adds the runtime layer around it: durable sessions, explicit boundaries, persistent memory, and inspectable tool contracts.",
  },
  {
    question: "What runs locally?",
    answer:
      "Your sessions, files, terminals, and memory stay on your machine by design. OpenCoven is built to keep project work scoped and inspectable instead of centralizing your data.",
  },
  {
    question: "Do I need a cloud account to use it?",
    answer:
      "No. The core runtime is local-first. You can use OpenCoven without sending your conversations, API keys, or project files to a hosted service.",
  },
  {
    question: "Where do I start?",
    answer:
      "Start with the quick start, then open the docs to run doctor, launch a familiar, and resume sessions from the CLI or browser.",
  },
] as const;

export const SEARCH_INDEX = [
  {
    title: "Home",
    href: "/",
    description:
      "OpenCoven landing page and overview of persistent AI familiars.",
    keywords: ["persistent AI familiars", "local-first runtime", "OpenCoven"],
  },
  {
    title: "Architecture",
    href: "/#architecture",
    description: "How the harness, runtime, and project layers fit together.",
    keywords: ["architecture", "runtime layer", "harness adapter"],
  },
  {
    title: "How It Works",
    href: "/#how-it-works",
    description:
      "Memory, sessions, harnesses, and tools in a live working model.",
    keywords: ["memory", "sessions", "tools"],
  },
  {
    title: "Quick Start",
    href: "/#quickstart",
    description: "Three commands to verify, start, and resume a familiar.",
    keywords: ["quick start", "CLI", "doctor"],
  },
  {
    title: "FAQ",
    href: "/#faq",
    description: "Short answers to the most common OpenCoven questions.",
    keywords: ["faq", "questions", "answers"],
  },
  {
    title: "Ecosystem",
    href: "/#ecosystem",
    description: "Community links and ecosystem entry points.",
    keywords: ["ecosystem", "community", "discord"],
  },
  {
    title: "About",
    href: "/about",
    description: "What OpenCoven is, what it is not, and how it is maintained.",
    keywords: ["about", "mission", "trust"],
  },
  {
    title: "Contact",
    href: "/contact",
    description: "Email, GitHub, Discord, and support entry points.",
    keywords: ["contact", "support", "email"],
  },
  {
    title: "Privacy Policy",
    href: "/privacy",
    description: "How OpenCoven handles data, telemetry, cookies, and privacy.",
    keywords: ["privacy policy", "data", "telemetry"],
  },
  {
    title: "Terms of Service",
    href: "/terms",
    description: "The terms that govern hosted services and website use.",
    keywords: ["terms", "legal", "usage"],
  },
  {
    title: "Search",
    href: "/search",
    description:
      "Search the OpenCoven site and jump to the right page or section.",
    keywords: ["site search", "search", "pages"],
  },
] as const;
