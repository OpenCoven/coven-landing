export interface QuickstartCommand {
  value: string;
  label: string;
}

export interface QuickstartLink {
  label: string;
  href: string;
  primary?: boolean;
}

export interface QuickstartStep {
  label: string;
  title: string;
  body: string;
  commands?: QuickstartCommand[];
  action?: QuickstartLink;
  expected?: string;
}

export interface QuickstartProduct {
  id: string;
  sigil: string;
  eyebrow: string;
  name: string;
  summary: string;
  bestFor: string;
  status: string;
  platforms: string;
  requires: string[];
  steps: QuickstartStep[];
  success: string;
  recovery: string[];
  links: QuickstartLink[];
}

const FIRST_RUN_DOCS =
  'https://docs.opencoven.ai/docs/guides/install-and-first-run';
const TROUBLESHOOTING_DOCS =
  'https://docs.opencoven.ai/docs/reference/troubleshooting';
const COVEN_CODE_DOCS = 'https://docs.opencoven.ai/docs/coven-code';
const COVEN_CODE_REPO = 'https://github.com/OpenCoven/coven-code';
const COVEN_CAVE_REPO = 'https://github.com/OpenCoven/coven-cave';
const COVEN_CAVE_RELEASES =
  'https://github.com/OpenCoven/coven-cave/releases/latest';
const COVEN_CAVE_TESTFLIGHT = 'https://testflight.apple.com/join/61Dqw8y4';
const CASTCODES_REPO = 'https://github.com/OpenCoven/cast-codes';
const CASTCODES_RELEASES =
  'https://github.com/OpenCoven/cast-codes/releases/latest';
const GITHUB_HOSTED = '/github';
const COVEN_GITHUB_REPO = 'https://github.com/OpenCoven/coven-github';
const COVEN_GITHUB_SELF_HOSTING =
  'https://github.com/OpenCoven/coven-github/blob/main/docs/self-hosting.md';

export const quickstartProducts: QuickstartProduct[] = [
  {
    id: 'coven-cli',
    sigil: '>',
    eyebrow: 'Terminal runtime',
    name: 'Coven CLI',
    summary:
      'Install the shared OpenCoven runtime, check your project, and start a provider-backed session.',
    bestFor:
      'Terminal-first control, scripts, and a shared runtime for the OpenCoven ecosystem.',
    status: 'Recommended foundation',
    platforms: 'macOS Apple Silicon · glibc Linux x64 · Windows x64',
    requires: [
      'Node 18 or newer and npm',
      'Git and a local project',
      'An OpenAI or Anthropic harness account',
    ],
    steps: [
      {
        label: 'Install',
        title: 'Install Coven globally',
        body: 'Install the recommended shared runtime from npm.',
        commands: [
          {
            value: 'npm install -g @opencoven/cli',
            label: 'Copy the global Coven install command',
          },
          {
            value: 'coven --help',
            label: 'Copy the Coven help command',
          },
        ],
        action: {
          label: 'Read the first-run guide',
          href: FIRST_RUN_DOCS,
          primary: true,
        },
        expected:
          'The Coven help screen opens and lists the available top-level commands.',
      },
      {
        label: 'Check',
        title: 'Check your project',
        body:
          'Open a terminal in the intended Git project so Coven can inspect that workspace.',
        commands: [
          {
            value: 'coven doctor',
            label: 'Copy the project check command',
          },
        ],
        expected:
          'Coven detects the project and reports actionable guidance for any missing setup.',
      },
      {
        label: 'Connect',
        title: 'Prepare a provider harness',
        body:
          'Choose either provider. Your credentials remain owned and managed by that provider.',
        commands: [
          {
            value: 'npm install -g @openai/codex',
            label: 'Copy the Codex install command',
          },
          {
            value: 'codex login',
            label: 'Copy the Codex authentication command',
          },
          {
            value: 'npm install -g @anthropic-ai/claude-code',
            label: 'Copy the Claude Code install command',
          },
          {
            value: 'claude',
            label: 'Copy the Claude Code launch and authentication command',
          },
        ],
        expected:
          'The selected provider completes authentication and its harness is ready for use.',
      },
      {
        label: 'Run',
        title: 'Start and inspect a session',
        body:
          'Run the command that matches your authenticated provider, then inspect the plain-text session history.',
        commands: [
          {
            value: 'coven run codex "explain this repo in 5 bullets"',
            label: 'Copy the Codex session command',
          },
          {
            value: 'coven run claude "explain this repo in 5 bullets"',
            label: 'Copy the Claude session command',
          },
          {
            value: 'coven sessions --plain',
            label: 'Copy the session history command',
          },
        ],
        expected:
          'The history row shows the session id, harness, title, and status.',
      },
    ],
    success:
      'Your provider-backed session completes and remains available in local Coven history.',
    recovery: [
      'If the executable is missing from PATH, open a new terminal and check the npm global binary directory.',
      'If the doctor reports a missing harness, complete the provider-specific setup it recommends.',
      'If Coven rejects the project root, move to the intended Git project and check it again.',
    ],
    links: [
      {
        label: 'Install and first-run guide',
        href: FIRST_RUN_DOCS,
        primary: true,
      },
      {
        label: 'Troubleshooting reference',
        href: TROUBLESHOOTING_DOCS,
      },
    ],
  },
  {
    id: 'coven-code',
    sigil: 'C',
    eyebrow: 'Interactive agent TUI',
    name: 'Coven Code',
    summary:
      'Use the unified Coven CLI to enter an interactive, provider-backed coding workspace.',
    bestFor: 'An interactive coding-agent TUI inside an existing project.',
    status: 'Beta',
    platforms: 'macOS · Linux · Windows',
    requires: [
      'Node and npm',
      'A local project',
      'Anthropic credentials or a Codex login',
    ],
    steps: [
      {
        label: 'Install',
        title: 'Install the unified CLI',
        body:
          'The unified CLI is the recommended path. The engine repository and direct package are advanced options.',
        commands: [
          {
            value: 'npm install -g @opencoven/cli',
            label: 'Copy the unified Coven install command',
          },
        ],
        action: {
          label: 'Read the Coven Code guide',
          href: COVEN_CODE_DOCS,
          primary: true,
        },
        expected:
          'The Coven executable is available from a new terminal session.',
      },
      {
        label: 'Launch',
        title: 'Open Coven Code in your project',
        body:
          'Launch from the project you want to work on. The first run automatically installs the compatible engine.',
        commands: [
          {
            value: 'coven',
            label: 'Copy the Coven Code launch command',
          },
        ],
        expected:
          'The TUI opens for the current project and offers first-run engine setup when needed.',
      },
      {
        label: 'Connect',
        title: 'Choose your provider',
        body:
          'In the first-run picker, choose 1 for Claude or 2 for Codex. Press Enter for the full picker, and use /connect later to switch or repair a connection.',
        expected:
          'The TUI confirms the selected provider and is ready to accept a task.',
      },
      {
        label: 'Work',
        title: 'Complete one bounded task',
        body: 'Start with a small request that is easy to verify.',
        commands: [
          {
            value: 'explain this repo in 5 bullets',
            label: 'Copy the first task prompt',
          },
        ],
        expected:
          'The provider returns a five-bullet repository explanation and the task completes.',
      },
    ],
    success:
      'You complete a provider-backed task and can resume it from Coven history.',
    recovery: [
      'If no provider is connected, open /connect and choose an available provider again.',
      'If a stale PATH copy launches, open a new terminal and verify the npm global binary directory comes first.',
      'If startup still fails, use Coven Doctor and resolve each reported prerequisite.',
    ],
    links: [
      {
        label: 'Coven Code guide',
        href: COVEN_CODE_DOCS,
        primary: true,
      },
      {
        label: 'Coven Code engine repository',
        href: COVEN_CODE_REPO,
      },
    ],
  },
  {
    id: 'coven-cave',
    sigil: '^',
    eyebrow: 'Visual desktop home',
    name: 'Coven Cave',
    summary:
      'Connect the desktop app to its local Coven runtime, with an optional iOS companion handoff.',
    bestFor:
      'A visual desktop home for familiars, projects, and sessions, with an optional iOS companion.',
    status: 'Native app',
    platforms: 'macOS · Windows · Linux · iOS',
    requires: [
      'Desktop first: macOS, Windows, or Linux',
      'Coven CLI and a running Coven daemon on the desktop host',
      'Optional iOS TestFlight client and Tailscale access to the desktop Cave host',
    ],
    steps: [
      {
        label: 'Prepare',
        title: 'Prepare the desktop host',
        body:
          'Start on macOS, Windows, or Linux. Install the shared runtime, check its prerequisites, and start the daemon on this desktop host. The local daemon and socket do not run on iOS.',
        commands: [
          {
            value: 'npm install -g @opencoven/cli',
            label: 'Copy the Coven runtime install command',
          },
          {
            value: 'coven doctor',
            label: 'Copy the runtime check command',
          },
          {
            value: 'coven daemon start',
            label: 'Copy the daemon start command',
          },
        ],
        expected:
          'The doctor completes without a blocking issue and the daemon starts on the desktop host.',
      },
      {
        label: 'Install',
        title: 'Install Coven Cave on desktop',
        body:
          'Use Homebrew on macOS, or open the release page for the current Windows, Linux, or macOS build.',
        commands: [
          {
            value: 'brew install --cask opencoven/tap/coven-cave',
            label: 'Copy the macOS Homebrew install command',
          },
        ],
        action: {
          label: 'Download a desktop release',
          href: COVEN_CAVE_RELEASES,
          primary: true,
        },
        expected:
          'Desktop Coven Cave is installed from the channel that matches the host platform.',
      },
      {
        label: 'Verify',
        title: 'Open desktop Cave and verify the runtime',
        body:
          'Desktop Cave uses the desktop host’s local Coven socket as the authority for runtime-backed features; it does not imply a cloud runtime.',
        commands: [
          {
            value: 'coven daemon status',
            label: 'Copy the daemon status command',
          },
        ],
        expected:
          'The desktop daemon reports a running state and desktop Cave shows daemon-connected activity.',
      },
      {
        label: 'Explore',
        title: 'Start on desktop, then optionally hand off',
        body:
          'On desktop, choose a familiar, select your first project, and run a small conversation you can inspect. For the companion path, install the TestFlight client and use Tailscale to pair or hand off through the desktop Cave host.',
        expected:
          'Desktop Cave shows inspectable familiar and session activity; when used, the iOS companion is paired or handed off from the desktop host through Tailscale.',
      },
    ],
    success:
      'Desktop Cave shows daemon-connected activity; optionally, the iOS companion is paired or handed off through that desktop host with Tailscale.',
    recovery: [
      'If Cave shows the daemon as disconnected, start the local runtime and verify its status before reopening Cave.',
      'If the package manager install is unavailable, use the matching asset from the latest release page.',
      'If the iOS companion cannot connect, confirm the desktop Cave host is running and reachable through Tailscale; TestFlight does not replace the desktop-first setup.',
    ],
    links: [
      {
        label: 'Latest desktop releases',
        href: COVEN_CAVE_RELEASES,
        primary: true,
      },
      {
        label: 'Join the iOS TestFlight',
        href: COVEN_CAVE_TESTFLIGHT,
      },
      {
        label: 'Coven Cave repository',
        href: COVEN_CAVE_REPO,
      },
    ],
  },
  {
    id: 'castcodes',
    sigil: '[]',
    eyebrow: 'Linux code workspace',
    name: 'CastCodes',
    summary:
      'Open a Linux-native code and terminal workspace backed by your local Coven runtime.',
    bestFor: 'A full code-and-terminal workspace on Linux.',
    status: 'Linux preview',
    platforms: 'Linux x86_64',
    requires: [
      'Linux x86_64',
      'Coven CLI with a ready harness and running daemon',
      'A release package that matches your system',
    ],
    steps: [
      {
        label: 'Prepare',
        title: 'Prepare Coven',
        body:
          'Install the shared runtime, resolve its checks, and start the local daemon.',
        commands: [
          {
            value: 'npm install -g @opencoven/cli',
            label: 'Copy the Coven runtime install command',
          },
          {
            value: 'coven doctor && coven daemon start',
            label: 'Copy the runtime check and daemon start command',
          },
        ],
        expected:
          'Coven reports a ready harness and a running local daemon.',
      },
      {
        label: 'Download',
        title: 'Download the matching release',
        body:
          'Open the release page and download both the Linux x86_64 package and its matching .sha256 file.',
        action: {
          label: 'Open CastCodes releases',
          href: CASTCODES_RELEASES,
          primary: true,
        },
        expected:
          'The release package and its same-version checksum file are available locally.',
      },
      {
        label: 'Launch',
        title: 'Run the portable AppImage',
        body:
          'Verify the downloaded AppImage against its matching checksum before marking it executable and launching it.',
        commands: [
          {
            value:
              'expected="$(awk \'{print $1}\' CastCodes-x86_64.AppImage.sha256)" && actual="$(sha256sum CastCodes-x86_64.AppImage | awk \'{print $1}\')" && test "$actual" = "$expected" && echo "CastCodes-x86_64.AppImage: OK"',
            label: 'Copy the AppImage checksum verification command',
          },
          {
            value: 'chmod +x CastCodes-x86_64.AppImage',
            label: 'Copy the AppImage permission command',
          },
          {
            value: './CastCodes-x86_64.AppImage',
            label: 'Copy the AppImage launch command',
          },
        ],
        expected:
          'Verification prints “CastCodes-x86_64.AppImage: OK”, then CastCodes opens its code-and-terminal workspace on Linux.',
      },
      {
        label: 'Work',
        title: 'Start a supported harness lane',
        body:
          'Open a Git project, choose a supported harness lane, and inspect its output and diffs. Cast Code grammar is not yet a stable interface.',
        expected:
          'The first Coven-backed session appears with output and diffs available for review.',
      },
    ],
    success:
      'Your first Coven-backed session is visible in CastCodes for review.',
    recovery: [
      'If verification fails, confirm the package and checksum file come from the same release and architecture.',
      'If the AppImage does not open, install the runtime dependencies required by your Linux distribution.',
      'If no harness lane starts, resolve Coven Doctor findings and confirm the local daemon is running.',
    ],
    links: [
      {
        label: 'Latest CastCodes release',
        href: CASTCODES_RELEASES,
        primary: true,
      },
      {
        label: 'CastCodes repository',
        href: CASTCODES_REPO,
      },
    ],
  },
  {
    id: 'github',
    sigil: 'GH',
    eyebrow: 'Issue-to-PR automation',
    name: 'OpenCoven for GitHub',
    summary:
      'Connect a familiar to one test repository, assign a bounded issue, and review its GitHub status.',
    bestFor: 'Issue-to-PR familiar workflows in a GitHub organization or repository.',
    status: 'Hosted beta · self-hostable',
    platforms: 'GitHub · server',
    requires: [
      'Admin access to a GitHub organization or repository',
      'Hosted beta access, or Rust and public HTTPS for self-hosting',
      'A configured Coven Code provider for self-hosting',
    ],
    steps: [
      {
        label: 'Choose',
        title: 'Choose hosted or self-hosted',
        body:
          'Joining the hosted beta completes only the waitlist path and does not grant immediate GitHub App installation. Steps 2–4 require active hosted access or a completed, running self-host setup through the advanced guide.',
        action: {
          label: 'Join the hosted beta',
          href: GITHUB_HOSTED,
          primary: true,
        },
        expected:
          'Hosted beta: waitlist submitted and onboarding pauses until access is granted. Self-hosted: self-host guide chosen; complete its setup before continuing.',
      },
      {
        label: 'Install',
        title: 'Connect one test repository',
        body:
          'Continue only with active hosted access or a completed self-host setup. Install the GitHub App on one test repository, configure a signed webhook, and validate it. Self-hosters run the diagnostic from the cloned and built coven-github checkout after creating or editing config/local.toml.',
        commands: [
          {
            value:
              './target/release/coven-github doctor --config config/local.toml',
            label: 'Copy the self-hosted adapter diagnostic command',
          },
        ],
        expected:
          'The test repository installation is active and a signed webhook is accepted.',
      },
      {
        label: 'Assign',
        title: 'Send one bounded issue',
        body:
          'Assign a small, well-scoped issue to the familiar or apply the configured trigger label.',
        expected:
          'The issue receives a visible status update showing that the familiar accepted the task.',
      },
      {
        label: 'Review',
        title: 'Review the familiar output',
        body:
          'Review the status, Check Run, and Cave link. Review a draft pull request only when the task produced commits.',
        expected:
          'GitHub shows a final status and Check Run, plus a draft pull request only when commits were produced.',
      },
    ],
    success:
      'With active hosted access or a running self-host, the issue shows a status and Check Run, with a draft pull request only when the familiar produced commits.',
    recovery: [
      'If hosted access is unavailable, remain on the waitlist or use the advanced self-hosting path.',
      'If the self-hosted adapter is unhealthy, run the copied diagnostic against the local configuration and resolve its findings.',
      'If an unsigned webhook returns 401, use the repository signed smoke script and confirm the signed request succeeds.',
    ],
    links: [
      {
        label: 'Hosted GitHub beta',
        href: GITHUB_HOSTED,
        primary: true,
      },
      {
        label: 'Self-hosting guide',
        href: COVEN_GITHUB_SELF_HOSTING,
      },
      {
        label: 'Coven GitHub repository',
        href: COVEN_GITHUB_REPO,
      },
    ],
  },
];
