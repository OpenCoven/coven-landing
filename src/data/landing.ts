export interface LedgerNote {
  text: string;
  meta: string;
}

export interface LedgerSnapshot {
  id: string;
  sigil: string;
  name: string;
  role: string;
  state: string;
  session: string;
  memoryLabel: string;
  notes: LedgerNote[];
}

export interface FamiliarProfile {
  id: string;
  label: string;
  snapshot: LedgerSnapshot;
}

export interface StoryStage {
  id: 'summoned' | 'learned' | 'moved' | 'returned';
  eyebrow: string;
  title: string;
  body: string;
  snapshot: LedgerSnapshot;
}

export interface TrustStatement {
  label: string;
  value: string;
}

export interface RuntimeLayer {
  id: 'surface' | 'coven' | 'project';
  index: string;
  label: string;
  title: string;
  summary: string;
  detail: string;
}

const hexiBase = {
  sigil: 'H',
  name: 'Hexi',
  role: 'code steward · tools · git',
};

export const heroFamiliars: FamiliarProfile[] = [
  {
    id: 'hexi',
    label: 'Hexi',
    snapshot: {
      id: 'hero-hexi',
      ...hexiBase,
      state: 'ready',
      session: 'feat/runtime-attach',
      memoryLabel: 'project memory restored',
      notes: [
        { text: '4 files staged · tests pending', meta: 'session' },
        { text: 'prefers terse PR summaries', meta: 'remembered' },
      ],
    },
  },
  {
    id: 'charm',
    label: 'Charm',
    snapshot: {
      id: 'hero-charm',
      sigil: 'C',
      name: 'Charm',
      role: 'voice · social · presence',
      state: 'ready',
      session: 'design-sync',
      memoryLabel: 'thread context restored',
      notes: [
        { text: 'reply draft awaiting review', meta: 'session' },
        { text: 'warm, concise, no filler', meta: 'remembered' },
      ],
    },
  },
  {
    id: 'sage',
    label: 'Sage',
    snapshot: {
      id: 'hero-sage',
      sigil: 'S',
      name: 'Sage',
      role: 'research · docs · long context',
      state: 'ready',
      session: 'runtime-notes',
      memoryLabel: 'research context restored',
      notes: [
        { text: '4 source documents attached', meta: 'session' },
        { text: 'summarize evidence before advice', meta: 'remembered' },
      ],
    },
  },
];

export const storyStages: StoryStage[] = [
  {
    id: 'summoned',
    eyebrow: 'Day 1 · Summoned',
    title: 'Start inside one explicit project.',
    body:
      'Coven creates a project-scoped session and records the harness, work state, and local context needed to inspect what happened.',
    snapshot: {
      id: 'story-summoned',
      ...hexiBase,
      state: 'session created',
      session: 'opencoven · main',
      memoryLabel: 'new project record',
      notes: [
        { text: 'project boundary: ./opencoven', meta: 'local' },
        { text: 'harness: codex', meta: 'attached' },
      ],
    },
  },
  {
    id: 'learned',
    eyebrow: 'Day 9 · Learned',
    title: 'Keep the conventions worth carrying.',
    body:
      'Explicit review preferences, repository conventions, and durable decisions stay with the familiar instead of disappearing with the terminal session.',
    snapshot: {
      id: 'story-learned',
      ...hexiBase,
      state: 'memory updated',
      session: 'review-followup',
      memoryLabel: 'working conventions',
      notes: [
        { text: 'smallest correct patch', meta: 'remembered' },
        { text: 'verify before commit', meta: 'remembered' },
      ],
    },
  },
  {
    id: 'moved',
    eyebrow: 'Day 23 · Moved',
    title: 'Change surfaces without starting over.',
    body:
      'Move between a supported harness or OpenCoven surface while the Coven runtime keeps the shared project record and provider credentials remain provider-owned.',
    snapshot: {
      id: 'story-moved',
      ...hexiBase,
      state: 'surface changed',
      session: 'cave · runtime-attach',
      memoryLabel: 'shared runtime record',
      notes: [
        { text: 'surface: Coven Cave', meta: 'current' },
        { text: 'prior Codex session retained', meta: 'available' },
      ],
    },
  },
  {
    id: 'returned',
    eyebrow: 'Day 47 · Returned',
    title: 'Resume with the relevant state intact.',
    body:
      'A later session restores the project context, the conventions that matter, and the work state required to continue deliberately.',
    snapshot: {
      id: 'story-returned',
      ...hexiBase,
      state: 'resumed',
      session: 'feat/runtime-attach',
      memoryLabel: 'relevant context restored',
      notes: [
        { text: '4 files staged · tests pending', meta: 'restored' },
        { text: 'next: verify the adapter boundary', meta: 'ready' },
      ],
    },
  },
];

export const trustStatements: TrustStatement[] = [
  { label: 'Harnesses', value: 'Codex · Claude Code' },
  { label: 'Source', value: 'Open source' },
  { label: 'Runtime', value: 'Local-first' },
  { label: 'Authentication', value: 'Provider-owned' },
];

export const runtimeLayers: RuntimeLayer[] = [
  {
    id: 'surface',
    index: '01',
    label: 'Surface',
    title: 'Harness or product surface',
    summary: 'Work where the task makes sense.',
    detail:
      'Use Codex, Claude Code, Coven Code, Cave, CastCodes, or GitHub without making that interface the durable system of record.',
  },
  {
    id: 'coven',
    index: '02',
    label: 'Runtime',
    title: 'Coven',
    summary: 'Keep continuity in one inspectable runtime.',
    detail:
      'Sessions, familiar memory, adapters, and controlled tool access stay in the shared local-first layer between the surface and project.',
  },
  {
    id: 'project',
    index: '03',
    label: 'Boundary',
    title: 'Your project',
    summary: 'Keep authority inside the boundary you chose.',
    detail:
      'The filesystem, Git repository, terminals, and docs remain inside the explicit project and machine context you control.',
  },
];
