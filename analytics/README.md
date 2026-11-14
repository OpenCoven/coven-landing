# OpenCoven analytics kit (PostHog)

Everything needed to stand up analytics for the site — snippet, actions,
funnels, dashboards, heatmaps, session replay — parameterized by API keys.
Swap in your keys, run two commands, deploy.

## One-time setup

1. Create a PostHog account/project (US or EU cloud — note which).
2. Fill `posthog.config.json` (this folder never deploys; see `.vercelignore`):
   - `region` — `us` or `eu`
   - `projectApiKey` — Settings → Project → "Project API key" (`phc_…`, public,
     ends up in the page)
   - `personalApiKey` — Settings → Personal API keys → create with scopes
     `action:write`, `insight:write`, `dashboard:write`, `project:write`
     (`phx_…`, secret, never leaves this machine)
   - `projectId` — the number in the PostHog URL: `app.posthog.com/project/<id>`
   - `siteUrl` — the deployed origin (used to authorize the heatmap toolbar)

## Enabling the snippet in production

The tracking snippet is emitted at build time. Vercel git deploys never see
the gitignored config, so for production set two project env vars instead:

- `PUBLIC_POSTHOG_KEY` — the project API key (`phc_…`, public by design)
- `PUBLIC_POSTHOG_REGION` — `us` or `eu`

Env vars win over the config file when both exist. The config file remains
the local path (and the only home of the secret personal key, which is used
by the provisioner below and never by the site build).

## Run

```bash
# 1. create/refresh actions, funnels, dashboards, project settings (idempotent)
python3 analytics/provision.py            # add --dry-run to preview

# 2. inject the tracking snippet into index.html + how-it-works.html (idempotent)
python3 analytics/inject-snippet.py

# 3. ship
vercel --prod
```

`migrate.py` re-runs the snippet injection automatically after every design
migration, so a new export never silently drops analytics.

## What gets provisioned

- **Project settings**: session replay on (inputs masked), heatmaps on,
  web vitals autocapture on, site URL authorized for the toolbar.
- **Actions**: Download clicked, per-platform artifact downloads (msi / dmg
  arm+intel / AppImage), install-command copies, "See it hold a claim",
  how-it-works views, outbound GitHub/Discord.
- **Dashboards**: `OpenCoven · Traffic` (pageviews + uniques, referrers,
  devices, countries, browsers) and `OpenCoven · Conversion` (downloads over
  time, visit→download funnel, visit→how-it-works→download funnel, copies).

## Verify after shipping

1. Visit the live site, click around, then check PostHog → Activity: events
   should appear within seconds ($pageview, $autocapture, web vitals).
2. Heatmaps: PostHog → Heatmaps → enter the site URL (or launch the toolbar
   from PostHog on the live site). Click/scroll maps accrue with traffic.
3. Session replay: Recordings tab fills as visitors arrive.
4. Dashboards populate as events accumulate — funnels need at least a few
   conversions before they render anything meaningful.

## Testing without credentials

```bash
python3 analytics/test-provision.py
```

Runs the provisioner three times against a local mock of the PostHog API and
asserts: every object is created with schema-valid bodies (run 1), re-running
updates in place with zero duplicates, exercising pagination (run 2), and a
forced server error on one object reports FAIL + exit 1 while everything else
still provisions (run 3). Payload shapes are matched against PostHog's API
docs (actions steps, InsightVizNode/TrendsQuery/FunnelsQuery, project fields).

## Notes

- The provisioner is idempotent by object *name* — rename an object in the
  PostHog UI and the next run will recreate it under the original name.
- A FAILED line means PostHog's API schema drifted for that one object type;
  everything else still provisions. Create the straggler by hand or update
  `provision.py`.
- Removing analytics: `python3 analytics/inject-snippet.py --remove`, redeploy.
