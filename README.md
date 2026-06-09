# Family Relocation Dashboard

Static GitHub Pages site for the Family Relocation Intelligence Dashboard.

The dashboard is available from `index.html`.

## Source data

The dashboard is backed by two source artifacts:

- `relocation_location_scoring_matrix.json` — the structured scoring matrix: criteria,
  weights, per-location scores, weighted totals, tiers, and category winners.
- `relocation_agent_deep_context.md` — the deep context package describing the project
  goals, decision philosophy, criteria weighting, and per-location notes for use by an
  AI research/planning agent.

## How the dashboard is built

`index.html` is **generated** from `relocation_location_scoring_matrix.json` — do not
edit `index.html` by hand. The build script renders the dashboard markup from the JSON,
then AES-256-GCM encrypts the whole page so the published file contains only a password
lock screen plus an encrypted blob.

To update the dashboard, edit the JSON (locations, scores, tiers, weights, etc.) and the
site rebuilds automatically.

### Automatic rebuild (GitHub Actions)

`.github/workflows/build-dashboard.yml` regenerates and re-encrypts `index.html` on every
push to `main` that changes the JSON, the build script, or the styles, then commits the
result. It reads the password from a repository secret:

- **Required secret:** `DASHBOARD_PASSWORD` — set it under
  *Settings → Secrets and variables → Actions → New repository secret*.

### Manual / local build

```bash
DASHBOARD_PASSWORD='your-password' node build/generate.js
```

The build sources live in `build/` (`generate.js` and `styles.css`).
