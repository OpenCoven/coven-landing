# OpenCoven analytics kit (PostHog)

The landing site is **analytics-off by default**. A PostHog project key alone
never activates tracking. The only approved launch profile is an explicit,
allowlisted event mode with autocapture, heatmaps, exception capture, page-leave
capture, and session replay disabled.

The source of truth for the emitted client configuration is
`src/components/redesign/PosthogSnippet.astro`. The provisioning script creates
matching actions, dashboards, and project settings without turning broad
capture features back on.

## Operating modes

| Mode | Behavior |
|---|---|
| `off` | Default. No PostHog script is emitted, even when a key is present. |
| `events` | Emits the snippet and accepts only the named events and bounded properties in `PosthogSnippet.astro`. |

Any other mode fails the Astro build. `events` also fails the build when no
project key is configured.

## Approved event contract

The initial allowlist is:

- `page_viewed` — `path` only; query strings and fragments are excluded
- `hero_primary_clicked`
- `hero_secondary_clicked`
- `principle_opened` — bounded `principle` identifier
- `guided_demo_started`
- `guided_demo_completed` — bounded `resolution` identifier
- `product_selected` — bounded `product_id`
- `quickstart_command_copied` — bounded `command_id`, never command text
- `download_menu_opened`
- `download_platform_selected` — `mac`, `windows`, `linux`, or `ios`
- `download_started` — approved platform only
- `download_fallback_used` — approved platform and delivery tier only
- `docs_clicked`
- `github_clicked`
- `discord_clicked`

Unknown events are rejected by the client wrapper. Unknown properties are
dropped. The contract must never include command or prompt contents, clipboard
values, filenames, repository names, local file paths, arbitrary URLs, user
input, embedded product/demo contents, or raw errors.

## One-time setup

1. Create a PostHog project in the intended US or EU region.
2. Copy `posthog.config.example.json` to the gitignored
   `posthog.config.json`.
3. Fill only the required values:
   - `mode` — keep `off` while configuring; use `events` only after approval
   - `region` — `us` or `eu`
   - `projectApiKey` — public `phc_…` project key used by the page
   - `personalApiKey` — secret `phx_…` key used only by the provisioner
   - `projectId` — numeric PostHog project id
   - `siteUrl` — deployed origin retained in the project URL allowlist
4. Run the local mock test before touching a real workspace:

   ```bash
   python3 analytics/test-provision.py
   ```

5. Preview the intended API changes:

   ```bash
   python3 analytics/provision.py --dry-run
   ```

6. Apply them deliberately:

   ```bash
   python3 analytics/provision.py
   ```

The provisioner is idempotent by object name. It disables replay, heatmaps, and
autocaptured web vitals at project level and provisions only explicit-event
actions and dashboards.

## Enabling event mode in a deployment

For a Vercel/git deployment, set all three variables:

- `PUBLIC_POSTHOG_MODE=events`
- `PUBLIC_POSTHOG_KEY=phc_…`
- `PUBLIC_POSTHOG_REGION=us` or `eu`

The gitignored local config is never required by a normal production build.
Environment variables take precedence over it.

A key without `PUBLIC_POSTHOG_MODE=events` remains inert. An unsupported mode,
or `events` without a key, fails the build rather than silently choosing a
tracking profile.

## What gets provisioned

- **Project settings:** session recording off, heatmaps off, autocaptured web
  vitals off, and the configured site URL preserved alongside existing URLs.
- **Actions:** durable names mapped to the explicit allowlisted events.
- **Traffic dashboard:** explicit page events and route breakdown only.
- **Conversion dashboard:** product selection, command-copy, download, and
  visit-to-download signals based on explicit events.

No selector-based `$autocapture` action, replay workspace, or heatmap toolbar is
part of the approved launch profile.

## Verification after deployment

1. View built page source and confirm PostHog is absent in `off` mode.
2. In `events` mode, inspect the network payloads and confirm only allowlisted
   event names and properties appear.
3. Confirm query strings, fragments, local context, command text, clipboard
   values, and user content are absent.
4. Confirm no recorder, heatmap, or broad autocapture script is requested.
5. Confirm analytics failure does not affect reading, navigation, onboarding,
   or downloads.
6. Re-run `pnpm check`, which includes the analytics source/deployment contract
   and the mock provisioner test.

## Removal and rollback

Set `PUBLIC_POSTHOG_MODE=off` or remove the mode/key and redeploy. No code
rollback is needed to stop client analytics. Project-side objects may remain
for historical reporting; replay and heatmaps remain disabled by the
provisioner.

## Notes

- The personal API key is secret and must never enter source, build output,
  client JavaScript, logs, or issue text.
- A failed provisioner item is reported without aborting unrelated items; fix
  the named schema drift and rerun.
- Renaming a managed PostHog object in the UI causes the next run to recreate
  the canonical name.
- Changes to the allowlist, property schema, retention, region, or provider
  require a corresponding public-policy and deployment-contract review.
