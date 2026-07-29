export type RuntimeHarness = {
  id: string;
  name: string;
  command: string;
  asset: string;
};

export type BoundaryLayer = {
  id: 'surface' | 'runtime' | 'boundary';
  index: string;
  label: string;
  title: string;
  summary: string;
  detail: string;
  assetLabel: string;
  holds: Array<{ what: string; where: string }>;
};

export type Surface = {
  id: 'cave' | 'cli' | 'code';
  sigil: string;
  eyebrow: string;
  name: string;
  summary: string;
  bestFor: string;
  status: string;
  platforms: string;
  href: string;
};

export type InvocationStep = {
  id: 'install' | 'check' | 'run';
  index: string;
  label: string;
  title: string;
  command: string;
  output: Array<{ text: string; tone?: 'muted' | 'success' | 'accent' }>;
};

export const runtimeHarnesses: RuntimeHarness[] = [
  {
    id: 'codex',
    name: 'OpenAI Codex',
    command: 'coven run codex "explain this repo"',
    asset: '/reforged/codex-3d.png',
  },
  {
    id: 'claude',
    name: 'Claude Code',
    command: 'coven run claude "explain this repo"',
    asset: '/reforged/claude-code-mascot.png',
  },
  {
    id: 'copilot',
    name: 'GitHub Copilot',
    command: 'coven run copilot "explain this repo"',
    asset: '/reforged/github-copilot.png',
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    command: 'coven run opencode "explain this repo"',
    asset: '/reforged/opencode-3d.png',
  },
  {
    id: 'grok',
    name: 'Grok Build',
    command: 'coven run grok "explain this repo"',
    asset: '/reforged/grok-3d.png',
  },
  {
    id: 'hermes',
    name: 'Hermes Agent',
    command: 'coven run hermes "explain this repo"',
    asset: '/reforged/hermes-agent.png',
  },
  {
    id: 'openclaw',
    name: 'OpenClaw',
    command: 'coven run openclaw "explain this repo"',
    asset: '/reforged/openclaw-mascot.png',
  },
];

export const boundaryLayers: BoundaryLayer[] = [
  {
    id: 'surface',
    index: '01',
    label: 'Surface',
    title: 'Desktop and Mobile Applications',
    summary: 'Swappable by design.',
    detail:
      'Codex, Claude Code, Coven Code or Cave — pick the interface that fits the task and change it whenever you like.',
    assetLabel: 'cave desktop · cave ios',
    holds: [
      { what: 'chosen interface', where: 'swappable' },
      { what: 'keyboard, panes, prompt', where: 'per surface' },
      { what: 'nothing durable', where: 'by design' },
    ],
  },
  {
    id: 'runtime',
    index: '02',
    label: 'Runtime',
    title: 'Portable Memory for Agents',
    summary: 'Continuity lives here.',
    detail:
      'Sessions, familiar memory, adapters and tool permissions live here — between the surface you use and the project you own.',
    assetLabel: 'coven-memory · the project record',
    holds: [
      { what: 'sessions + history', where: 'local' },
      { what: 'familiar memory', where: 'local' },
      { what: 'tool permissions', where: 'explicit' },
    ],
  },
  {
    id: 'boundary',
    index: '03',
    label: 'Boundary',
    title: 'Isolated Working Directories',
    summary: 'Authority stops here.',
    detail:
      'Filesystem, Git, terminals and docs stay inside the project you named. Provider keys stay with the provider.',
    assetLabel: 'inside the boundary you named',
    holds: [
      { what: 'filesystem + Git', where: 'yours' },
      { what: 'terminals', where: 'yours' },
      { what: 'provider keys', where: 'provider' },
    ],
  },
];

export const surfaces: Surface[] = [
  {
    id: 'cave',
    sigil: '^',
    eyebrow: 'Visual desktop home',
    name: 'Coven Cave',
    summary:
      'Connect the desktop app to its local Coven runtime, with an optional iOS companion handoff.',
    bestFor:
      'A visual home for familiars, projects, and sessions, with an optional iOS companion.',
    status: 'Native app',
    platforms: 'macOS · Windows · Linux · iOS',
    href: '/quickstart#coven-cave',
  },
  {
    id: 'cli',
    sigil: '>',
    eyebrow: 'Terminal runtime',
    name: 'Coven CLI',
    summary:
      'Install the shared OpenCoven runtime, check your project, and start a provider-backed session.',
    bestFor:
      'Terminal-first control, scripts, and a shared runtime for the OpenCoven ecosystem.',
    status: 'Recommended foundation',
    platforms: 'macOS · Linux x64 · Windows x64',
    href: '/quickstart#coven-cli',
  },
  {
    id: 'code',
    sigil: 'C',
    eyebrow: 'Interactive agent TUI',
    name: 'Coven Code',
    summary:
      'Use the unified Coven CLI to enter an interactive, provider-backed coding workspace.',
    bestFor: 'An interactive coding-agent TUI inside an existing project.',
    status: 'Beta',
    platforms: 'macOS · Linux · Windows',
    href: '/quickstart#coven-code',
  },
];

export const invocationSteps: InvocationStep[] = [
  {
    id: 'install',
    index: '01',
    label: 'Install',
    title: 'One binary, globally',
    command: 'npm install -g @opencoven/cli',
    output: [
      { text: '+ @opencoven/cli@1.4.2', tone: 'muted' },
      { text: 'coven — the local-first familiar runtime' },
      {
        text: 'Expect: the help screen lists every top-level command.',
        tone: 'success',
      },
    ],
  },
  {
    id: 'check',
    index: '02',
    label: 'Check',
    title: 'Ask what your project needs',
    command: 'coven doctor',
    output: [
      { text: '✔ project detected   ./opencoven', tone: 'muted' },
      { text: '✔ harness            codex (ready)', tone: 'muted' },
      { text: '✔ daemon             running', tone: 'muted' },
      {
        text: 'Expect: actionable guidance for any missing setup.',
        tone: 'success',
      },
    ],
  },
  {
    id: 'run',
    index: '03',
    label: 'Run',
    title: 'Start and inspect a session',
    command: 'coven run codex "explain this repo in 5 bullets"',
    output: [
      { text: 'session  01JC7F · feat/runtime-attach', tone: 'muted' },
      { text: 'harness  codex          status  complete', tone: 'muted' },
      { text: 'memory project record updated', tone: 'accent' },
      {
        text: 'Expect: the history row shows id, harness, title, status.',
        tone: 'success',
      },
    ],
  },
];
