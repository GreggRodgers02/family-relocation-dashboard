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

### Data model notes

- `rental_budget_config` holds the income-based 2028 rental ceiling ($2,600 primary /
  $2,900 stretch cap). The dashboard renders this as a banner and color-codes each
  location's "Rent fit" badge (green = feasible, amber = stretch, red = not feasible).
- `metro_clusters.Nashville` defines the budget-fit order for the Nashville-metro group
  (Gallatin, Hendersonville, Mount Juliet, Franklin), rendered as its own section.
- Ranks and tiers are derived strictly from each location's weighted score; edit the
  `scores` and the ranking re-sorts on the next build.
- The `Tampa` entry is a **flagged estimate** (`estimated: true`) — replace its scores
  with researched values before relying on it.
- **Deferred:** the `spouse_pref` criterion and the second "remote-adjusted" scoring
  scenario are not yet wired into the rankings. The new Nashville suburbs carry a
  `spouse_pref` score, but it is weighted 0% until per-location scores and a weight
  redistribution are defined for all locations.
