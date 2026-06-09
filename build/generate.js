#!/usr/bin/env node
/*
 * Builds index.html from relocation_location_scoring_matrix.json.
 *
 * The dashboard markup is generated from the JSON, then the whole page is
 * AES-256-GCM encrypted (PBKDF2-SHA256) so the published index.html contains
 * only a password lock screen plus an encrypted blob.
 *
 * Usage:
 *   DASHBOARD_PASSWORD='your-password' node build/generate.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const DATA_FILE = path.join(ROOT, 'relocation_location_scoring_matrix.json');
const STYLES_FILE = path.join(__dirname, 'styles.css');
const OUT_FILE = path.join(ROOT, 'index.html');

const PBKDF2_ITERATIONS = 250000;

// --- helpers ----------------------------------------------------------------

function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function tierMeta(tierString) {
  const m = /Tier\s*(\d)/.exec(tierString || '');
  const n = m ? Number(m[1]) : 0;
  const map = {
    1: { cls: 'one', label: 'Serious finalist' },
    2: { cls: 'two', label: 'Strong trade-off' },
    3: { cls: 'three', label: 'Watch list' },
    4: { cls: 'four', label: 'Backup only' },
  };
  return map[n] || { cls: 'two', label: tierString || '' };
}

const CATEGORY_LABELS = {
  best_overall: 'Best overall',
  best_ai_product_career_ceiling: 'AI Product career ceiling',
  best_robotics_ai_hardware_ecosystem: 'Robotics / AI hardware',
  best_schools_affordability_balance: 'Schools + affordability',
  best_long_term_home_buying_fit: 'Long-term home-buying fit',
  best_no_income_tax_state_fit: 'No-income-tax state fit',
  best_future_professor_path: 'Future professor path',
  best_fitness_active_lifestyle_fit: 'Fitness / active lifestyle',
  best_family_safe_practical_choice: 'Family-safe practical choice',
};

function prettifyKey(key) {
  return key
    .replace(/^best_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function money(n) {
  if (n >= 1000) return '$' + Math.round(n / 1000) + 'K';
  return '$' + n;
}

// --- markup generation ------------------------------------------------------

function buildDashboard(data) {
  const p = data.project;
  const profile = p.user_profile_summary || {};
  const plan = p.planning_assumptions || {};
  const locations = [...data.locations].sort((a, b) => a.rank - b.rank);
  const byArea = new Map(locations.map((l) => [l.area, l]));
  const states = profile.family_location_scope || [];
  const stateCount = new Set(locations.map((l) => l.state)).size;
  const finalists = (data.decision_tiers && data.decision_tiers.tier_1_serious_finalists) || [];

  // Hero stats
  const stats = [
    [String(locations.length), `areas ranked across ${stateCount} states`],
    [money(plan.estimated_home_budget_2041 || 0), `estimated long-term ${plan.home_purchase_year || ''} buying-power target`],
    [String(plan.rental_phase_year || ''), 'rental-phase feasibility horizon'],
    [String(finalists.length), 'serious finalist locations'],
  ];
  const heroStats = stats
    .map(([n, label]) => `        <div class="stat"><strong>${esc(n)}</strong><span>${esc(label)}</span></div>`)
    .join('\n');

  // Weighting bars
  const weights = (data.criteria || [])
    .map(
      (c) =>
        `            <div class="weight"><span>${esc(c.label)}</span><div class="bar"><span style="width:${esc(
          c.weight_percent
        )}%"></span></div><strong>${esc(c.weight_percent)}%</strong></div>`
    )
    .join('\n');

  // Interest pills
  const pills = (profile.interests || [])
    .slice(0, 5)
    .map((i) => `            <span class="pill">${esc(i)}</span>`)
    .join('\n');

  // Core conclusion prose (data-driven)
  const finalistList = finalists.map((f) => `<strong>${esc(f)}</strong>`);
  const finalistSentence =
    finalistList.length > 1
      ? finalistList.slice(0, -1).join(', ') + ', and ' + finalistList[finalistList.length - 1]
      : finalistList.join('');

  // Top 5 cards
  const top5 = (data.recommended_top_five || [])
    .map((area, idx) => {
      const loc = byArea.get(area);
      if (!loc) return '';
      return `        <div class="card rank-card top">
          <div class="rank-num">${idx + 1}</div>
          <div class="state">${esc(loc.state)}</div>
          <h3>${esc(loc.area)}</h3>
          <p>${esc(loc.notes)}</p>
        </div>`;
    })
    .join('\n');

  // Full ranking table
  const rows = locations
    .map((loc) => {
      const t = tierMeta(loc.tier);
      return `            <tr><td>${esc(loc.rank)}</td><td><strong>${esc(loc.area)}</strong></td><td>${esc(
        loc.state_abbr
      )}</td><td><span class="tier ${t.cls}">${esc(t.label)}</span></td><td>${esc(loc.notes)}</td></tr>`;
    })
    .join('\n');

  // Category winners
  const categories = Object.entries(data.category_winners || {})
    .map(([key, val]) => {
      const label = CATEGORY_LABELS[key] || prettifyKey(key);
      return `        <div class="card category"><div class="label">${esc(label)}</div><strong>${esc(
        val.winner
      )}</strong><p>Runner-up: ${esc(val.runner_up)}</p></div>`;
    })
    .join('\n');

  // Top two by state
  const stateCards = Object.entries(data.state_top_two || {})
    .map(([state, picks]) => {
      const lead = byArea.get(picks[0]);
      const t = tierMeta(lead && lead.tier);
      const items = picks.map((a) => `<li>${esc(a)}</li>`).join('');
      return `        <div class="card state-card"><h3>${esc(state)} <span class="tier ${t.cls}">${esc(
        t.label
      )}</span></h3><ol>${items}</ol></div>`;
    })
    .join('\n');

  // Decision tiers
  const tierOrder = [
    ['tier_1_serious_finalists', 'Tier 1', 'one', 'Serious finalists', 'These should anchor the relocation conversation.'],
    ['tier_2_strong_tradeoffs', 'Tier 2', 'two', 'Strong trade-offs', 'Good choices, but each has a clear compromise.'],
    ['tier_3_watch_list', 'Tier 3', 'three', 'Watch list', 'Strong in some areas, weaker against the full model.'],
    ['tier_4_backup_only', 'Tier 4', 'four', 'Backup only', 'Keep only if career or family circumstances change.'],
  ];
  const tiers = tierOrder
    .map(([key, name, cls, label, blurb]) => {
      const items = ((data.decision_tiers || {})[key] || []).map((a) => `            <li>${esc(a)}</li>`).join('\n');
      return `        <div class="card tier-card">
          <h3>${esc(name)} <span class="tier ${cls}">${esc(label)}</span></h3>
          <p>${esc(blurb)}</p>
          <ul>
${items}
          </ul>
        </div>`;
    })
    .join('\n');

  // Recommendation cards
  const recs = (data.recommended_top_five || [])
    .map((area) => {
      const loc = byArea.get(area);
      if (!loc) return '';
      return `          <div class="rec"><span>${esc(loc.strategic_label)}</span><strong>${esc(
        loc.area
      )}</strong><p>${esc(loc.notes)}</p></div>`;
    })
    .join('\n');

  return `  <header class="wrap">
    <div class="hero">
      <div class="eyebrow">Relocation Strategy Dashboard</div>
      <h1>Family relocation shortlist for AI career growth, schools, robotics, fitness, and long-term affordability.</h1>
      <p class="subtitle">
        A practical decision dashboard for ${esc(profile.name || 'the')}&rsquo;s long-term family relocation project across ${esc(
    states.join(', ')
  )}. High school football is treated as a lifestyle bonus, not a hard filter.
      </p>
      <div class="hero-grid">
${heroStats}
      </div>
    </div>
  </header>

  <nav>
    <div class="wrap nav-inner">
      <a href="#summary">Summary</a>
      <a href="#top5">Top 5</a>
      <a href="#ranking">Full Ranking</a>
      <a href="#categories">Category Winners</a>
      <a href="#states">State Picks</a>
      <a href="#tiers">Decision Tiers</a>
      <a href="#recommendation">Recommendation</a>
    </div>
  </nav>

  <main class="wrap">
    <section id="summary">
      <div class="section-title">
        <h2>Executive summary</h2>
        <p>${esc(p.purpose || '')}</p>
      </div>
      <div class="card insight">
        <div>
          <h3>Core conclusion</h3>
          <p>The strongest overall shortlist is ${finalistSentence}. These locations balance AI/product career options, strong family infrastructure, long-term housing discipline, robotics or engineering adjacency, and proximity to universities that support ${esc(
    profile.name || 'the family'
  )}&rsquo;s future teaching ambitions.</p>
          <div class="pill-row">
${pills}
          </div>
        </div>
        <div>
          <h3>Criteria weighting</h3>
          <div class="weights">
${weights}
          </div>
        </div>
      </div>
    </section>

    <section id="top5">
      <div class="section-title">
        <h2>Top 5 finalist areas</h2>
        <p>These are the locations that should anchor the family conversation.</p>
      </div>
      <div class="ranking-grid">
${top5}
      </div>
    </section>

    <section id="ranking">
      <div class="section-title">
        <h2>Full ${locations.length}-area ranking</h2>
        <p>Ordered for the actual decision model, not generic &ldquo;best places to live&rdquo; rankings.</p>
      </div>
      <div class="card table-card">
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Area</th>
              <th>State</th>
              <th>Tier</th>
              <th>Primary rationale</th>
            </tr>
          </thead>
          <tbody>
${rows}
          </tbody>
        </table>
      </div>
    </section>

    <section id="categories">
      <div class="section-title">
        <h2>Best by category</h2>
        <p>Winners are selected according to user-specific fit, not just raw metro size.</p>
      </div>
      <div class="category-grid">
${categories}
      </div>
    </section>

    <section id="states">
      <div class="section-title">
        <h2>Top two locations by state</h2>
        <p>Each state keeps two candidates, even if the state is not among the overall top performers.</p>
      </div>
      <div class="state-grid">
${stateCards}
      </div>
    </section>

    <section id="tiers">
      <div class="section-title">
        <h2>Decision tiers</h2>
        <p>This is the simplest way to keep the family decision realistic.</p>
      </div>
      <div class="tiers-grid">
${tiers}
      </div>
    </section>

    <section id="recommendation">
      <div class="card recommendation">
        <div class="section-title">
          <h2>Recommendation</h2>
          <p>The top five can each be framed around a different family strategy.</p>
        </div>
        <div class="rec-grid">
${recs}
        </div>
      </div>
    </section>
  </main>

  <footer class="wrap">
    <p>
      Planning note: This dashboard uses the research assumptions from the relocation project, including a ${esc(
        plan.rental_phase_year || ''
      )} rental phase, a long-term ${esc(
    plan.home_purchase_year || ''
  )} home-buying lens, and high school football treated as a nice-to-have rather than a hard requirement.
      Before making a final decision, validate current school zones, rental inventory, home prices, tax policy, and job-market conditions.
    </p>
  </footer>`;
}

function buildFullPage(data, styles) {
  const title = (data.project && data.project.name) || 'Family Relocation Dashboard';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <style>
${styles}
  </style>
</head>
<body>
${buildDashboard(data)}
</body>
</html>
`;
}

// --- encryption + lock-screen wrapper --------------------------------------

function encrypt(plaintext, password) {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, 32, 'sha256');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    iterations: PBKDF2_ITERATIONS,
    data: Buffer.concat([ct, tag]).toString('base64'),
  };
}

function lockPage(enc, title) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex, nofollow" />
  <title>${esc(title)}</title>
  <style>
    :root {
      --bg: #f6f7fb; --panel: #ffffff; --ink: #172033; --muted: #647084;
      --line: #d9deea; --accent: #2d5be3; --accent-2: #0f766e; --danger: #9f1239;
      --shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0; min-height: 100vh; display: grid; place-items: center;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: radial-gradient(circle at top left, #e7edff 0, transparent 32rem), var(--bg);
      color: var(--ink); line-height: 1.55; padding: 24px;
    }
    .lock {
      width: min(420px, 100%); background: var(--panel); border: 1px solid var(--line);
      border-radius: 22px; box-shadow: var(--shadow); padding: 34px 30px;
    }
    .badge {
      display: inline-flex; gap: 8px; align-items: center; padding: 7px 12px; border-radius: 999px;
      background: linear-gradient(135deg, #172033, #243b72 55%, #0f766e); color: #fff;
      font-size: 12px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; margin-bottom: 18px;
    }
    h1 { margin: 0 0 6px; font-size: 24px; letter-spacing: -0.03em; }
    p.sub { margin: 0 0 22px; color: var(--muted); font-size: 14px; }
    form { display: grid; gap: 12px; }
    input[type="password"] {
      width: 100%; padding: 13px 14px; border: 1px solid var(--line); border-radius: 14px;
      font-size: 15px; font-family: inherit; color: var(--ink); background: #fbfcfe; outline: none;
    }
    input[type="password"]:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(45,91,227,0.15); }
    button {
      padding: 13px 16px; border: 0; border-radius: 14px; cursor: pointer;
      background: linear-gradient(90deg, var(--accent), var(--accent-2)); color: #fff;
      font-size: 15px; font-weight: 800; font-family: inherit;
    }
    button:disabled { opacity: .6; cursor: progress; }
    .error { color: var(--danger); font-size: 13px; font-weight: 700; min-height: 18px; margin: 2px 0 0; }
    .note { margin: 18px 0 0; color: var(--muted); font-size: 12px; }
  </style>
</head>
<body>
  <main class="lock">
    <div class="badge">Private Dashboard</div>
    <h1>Sign in</h1>
    <p class="sub">This dashboard is password protected. Enter the password to continue.</p>
    <form id="f">
      <input id="pw" type="password" placeholder="Password" autocomplete="current-password" autofocus />
      <button id="btn" type="submit">Unlock</button>
      <p class="error" id="err"></p>
    </form>
    <p class="note">Protected with client-side AES-256 encryption.</p>
  </main>

  <script id="enc" type="application/json">${JSON.stringify(enc)}</script>
  <script>
    const ENC = JSON.parse(document.getElementById('enc').textContent);
    const form = document.getElementById('f');
    const pwInput = document.getElementById('pw');
    const btn = document.getElementById('btn');
    const err = document.getElementById('err');

    function b64ToBytes(b64) {
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return bytes;
    }

    async function unlock(password) {
      const baseKey = await crypto.subtle.importKey(
        'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']
      );
      const key = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: b64ToBytes(ENC.salt), iterations: ENC.iterations, hash: 'SHA-256' },
        baseKey, { name: 'AES-GCM', length: 256 }, false, ['decrypt']
      );
      const plain = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: b64ToBytes(ENC.iv) }, key, b64ToBytes(ENC.data)
      );
      return new TextDecoder().decode(plain);
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      err.textContent = '';
      btn.disabled = true;
      btn.textContent = 'Unlocking…';
      try {
        const html = await unlock(pwInput.value);
        document.open();
        document.write(html);
        document.close();
      } catch (_) {
        err.textContent = 'Incorrect password. Please try again.';
        btn.disabled = false;
        btn.textContent = 'Unlock';
        pwInput.select();
      }
    });
  </script>
</body>
</html>
`;
}

// --- main -------------------------------------------------------------------

function main() {
  const password = process.env.DASHBOARD_PASSWORD;
  if (!password) {
    console.error('ERROR: DASHBOARD_PASSWORD environment variable is required.');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  const styles = fs.readFileSync(STYLES_FILE, 'utf8').trimEnd();

  const fullPage = buildFullPage(data, styles);
  const enc = encrypt(fullPage, password);
  const title = (data.project && data.project.name) || 'Family Relocation Dashboard';
  fs.writeFileSync(OUT_FILE, lockPage(enc, title));

  console.log(`Built ${path.relative(ROOT, OUT_FILE)} (${data.locations.length} locations, encrypted ${fullPage.length} bytes).`);
}

main();
