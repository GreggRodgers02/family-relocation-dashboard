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

function fmtPrice(n) {
  if (!n) return '';
  if (n >= 1000000) return '$' + (n / 1000000).toFixed(2).replace(/\.?0+$/, '') + 'M';
  return '$' + Math.round(n / 1000) + 'K';
}

// Full-dollar formatting with thousands separators (for monthly rents).
function dollars(n) {
  return '$' + Number(n).toLocaleString('en-US');
}

// Rental feasibility against the 2028 budget ceiling/stretch cap.
function rentFit(loc) {
  const s = loc.scores ? loc.scores.rental_feasibility_2028 : 0;
  let cls, label;
  if (s >= 7) { cls = 'green'; label = 'Feasible'; }
  else if (s >= 4) { cls = 'amber'; label = 'Stretch'; }
  else { cls = 'red'; label = 'Not feasible'; }
  const dollar = loc.est_2028_rent ? ' ' + dollars(loc.est_2028_rent) : '';
  return { cls, label, dollar };
}

// In-radius private-school options for a location's expandable detail row.
function psOptionsHtml(loc) {
  const pso = loc.private_school_option || {};
  const opts = pso.in_radius_options || [];
  if (!opts.length) {
    return '<p class="ps-none">No in-radius private-school options catalogued yet.</p>';
  }
  const items = opts
    .map((o) => {
      const tags = [];
      if (o.niche_grade) tags.push(`<span class="ps-grade">Niche ${esc(o.niche_grade)}</span>`);
      if (o.annual_tuition_usd) tags.push(`<span class="ps-fee">${esc(dollars(o.annual_tuition_usd))}/yr</span>`);
      if (o.approx_distance_mi) tags.push(`<span class="ps-mi">${esc(o.approx_distance_mi)} mi</span>`);
      if (o.football_program) tags.push('<span class="ps-fb">Football</span>');
      if (o.robotics_program) tags.push('<span class="ps-rb">Robotics</span>');
      tags.push(`<span class="${o.verified ? 'ps-ok' : 'ps-todo'}">${o.verified ? 'Verified' : 'Unverified'}</span>`);
      const loc2 = o.location ? ` <span class="ps-loc">${esc(o.location)}</span>` : '';
      return `<li><strong>${esc(o.name)}</strong>${loc2}<div class="ps-tags">${tags.join('')}</div></li>`;
    })
    .join('');
  return `<ul class="ps-list">${items}</ul>`;
}

// A scenario is selectable only if its weights are fully defined
// (sum to 100 and carry no placeholder __note).
function scenarioUsable(s) {
  const w = (s && s.weights) || {};
  if ('__note' in w) return false;
  const sum = Object.values(w).reduce((t, v) => t + (typeof v === 'number' ? v : 0), 0);
  return Math.abs(sum - 100) < 0.001;
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
  const rbc = data.rental_budget_config || {};

  // Hero stats
  const stats = [
    [String(locations.length), `areas ranked across ${stateCount} states`],
    plan.home_budget_2041_range
      ? [plan.home_budget_2041_range, `${plan.home_purchase_year || ''} home budget on the planned career path (varies with property tax)`]
      : [money(plan.estimated_home_budget_2041 || 0), `estimated long-term ${plan.home_purchase_year || ''} buying-power target`],
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

  // 2028 rent target banner (with income-basis tooltip)
  const rentTip = [
    rbc.basis,
    rbc.projected_2028_household_income
      ? `Projected 2028 household income ~${money(rbc.projected_2028_household_income)}.`
      : '',
    rbc.income_growth_assumption ? `Growth: ${rbc.income_growth_assumption}.` : '',
    rbc.note,
  ]
    .filter(Boolean)
    .join(' ');
  const rentBanner =
    rbc.primary_ceiling_monthly
      ? `      <div class="rent-banner" title="${esc(rentTip)}">
        <span class="rent-pill">2028 rent target</span>
        <span class="rent-fig"><strong>${esc(dollars(rbc.primary_ceiling_monthly))}/mo</strong> primary ceiling</span>
        <span class="rent-sep">&middot;</span>
        <span class="rent-fig"><strong>${esc(dollars(rbc.stretch_cap_monthly))}/mo</strong> hard stretch cap</span>
        <span class="rent-legend">
          <span class="rentfit green">Feasible</span>
          <span class="rentfit amber">Stretch</span>
          <span class="rentfit red">Not feasible</span>
        </span>
      </div>`
      : '';

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

  // Full ranking table (rows are re-sortable client-side by scenario)
  const rows = locations
    .map((loc) => {
      const t = tierMeta(loc.tier);
      const rf = rentFit(loc);
      const flag = loc.budget_flag ? `<div class="flag">${esc(loc.budget_flag)}</div>` : '';
      const total =
        typeof loc.weighted_total_out_of_100 === 'number' ? loc.weighted_total_out_of_100.toFixed(2) : '';
      const radius = (loc.private_school_option || {}).search_radius_miles || 20;
      const main =
        `            <tr class="js-row" data-area="${esc(loc.area)}"><td class="rank-cell"><button class="row-toggle" type="button" aria-expanded="false" aria-label="Show private-school options">&#9656;</button><span class="rank-val">${esc(
          loc.rank
        )}</span></td><td><strong>${esc(loc.area)}</strong></td><td>${esc(
          loc.state_abbr
        )}</td><td><span class="tier ${t.cls}">${esc(t.label)}</span></td><td class="score-cell">${esc(
          total
        )}</td><td><span class="rentfit ${rf.cls}">${esc(rf.label + rf.dollar)}</span>${flag}</td><td>${esc(
          loc.notes
        )}</td></tr>`;
      const detail =
        `            <tr class="detail-row" data-area="${esc(loc.area)}" hidden><td></td><td colspan="6"><div class="detail-box"><h4>Private-school options within ${esc(
          radius
        )} mi</h4>${psOptionsHtml(loc)}</div></td></tr>`;
      return main + '\n' + detail;
    })
    .join('\n');

  // Scoring scenarios (baseline + alternates) for the interactive toggle.
  const scen = data.scoring_scenarios || {};
  const scenarioList = [];
  if (scen.default) scenarioList.push(scen.default);
  (scen.alternates || []).forEach((a) => scenarioList.push(a));

  const scenarioButtons = scenarioList
    .map((s, i) => {
      const usable = scenarioUsable(s);
      const attrs = usable ? '' : ' disabled title="Scenario weights not yet defined"';
      const cls = `scenario-btn${i === 0 ? ' active' : ''}${usable ? '' : ' is-disabled'}`;
      return `        <button type="button" class="${cls}" data-scenario="${esc(s.id)}"${attrs}>${esc(
        s.label
      )}${usable ? '' : ' &middot; pending'}</button>`;
    })
    .join('\n');
  const scenarioBar = scenarioList.length
    ? `      <div class="scenario-toggle" role="group" aria-label="Scoring scenario">
        <span class="scenario-label">Scoring scenario</span>
${scenarioButtons}
        <p class="scenario-note" id="scenario-note"></p>
      </div>`
    : '';

  // Data payload the client script uses to recompute totals per scenario.
  const matrixPayload = {
    scenarios: scenarioList.map((s) => ({
      id: s.id,
      label: s.label,
      basis: s.basis || '',
      weights: s.weights || {},
      usable: scenarioUsable(s),
    })),
    cities: locations.map((l) => ({
      area: l.area,
      state: l.state,
      tier: l.tier,
      scores: l.scores || {},
      baseTotal: l.weighted_total_out_of_100,
    })),
  };

  // Client script: recompute weighted totals per scenario, re-sort + renumber
  // the ranking table, and toggle each row's private-school detail. Written as
  // a plain string so the outer template literal does not interpolate it.
  const clientScript =
    '<script id="matrix-data" type="application/json">' +
    JSON.stringify(matrixPayload) +
    '</' + 'script>\n' +
    '<script>\n' +
    '(function(){\n' +
    '  var M = JSON.parse(document.getElementById("matrix-data").textContent);\n' +
    '  var table = document.querySelector("#ranking table");\n' +
    '  if (!table || !table.tBodies.length) return;\n' +
    '  var tbody = table.tBodies[0];\n' +
    '  var noteEl = document.getElementById("scenario-note");\n' +
    '  function median(arr){ if(!arr.length) return null; var a=arr.slice().sort(function(x,y){return x-y;}); var m=Math.floor(a.length/2); return a.length%2 ? a[m] : (a[m-1]+a[m])/2; }\n' +
    '  // State medians for null private_school_access (never score a null as zero).\n' +
    '  var byState={}, allPa=[];\n' +
    '  M.cities.forEach(function(c){ var v=c.scores.private_school_access; if(typeof v==="number"){ (byState[c.state]=byState[c.state]||[]).push(v); allPa.push(v);} });\n' +
    '  var stateMed={}; Object.keys(byState).forEach(function(s){ stateMed[s]=median(byState[s]); });\n' +
    '  var overallMed = median(allPa);\n' +
    '  function paFor(c){ var v=c.scores.private_school_access; if(typeof v==="number") return v; if(stateMed[c.state]!=null) return stateMed[c.state]; return overallMed!=null?overallMed:0; }\n' +
    '  function computeTotal(c, weights){ var sum=0; for(var k in weights){ if(k==="__note") continue; var w=weights[k]; if(typeof w!=="number"||w===0) continue; var s=(k==="private_school_access")?paFor(c):c.scores[k]; if(typeof s!=="number") s=0; sum+=s*w; } return sum/10; }\n' +
    '  function sel(area){ return tbody.querySelector(\'tr.detail-row[data-area="\'+area.replace(/"/g,\'\\\\"\')+\'"]\'); }\n' +
    '  function pairs(){ var res=[]; Array.prototype.forEach.call(tbody.querySelectorAll("tr.js-row"), function(r){ res.push([r, sel(r.getAttribute("data-area"))]); }); return res; }\n' +
    '  var baseId = M.scenarios.length ? M.scenarios[0].id : null;\n' +
    '  function apply(id){\n' +
    '    var scen=null; M.scenarios.forEach(function(s){ if(s.id===id) scen=s; });\n' +
    '    if(!scen || !scen.usable) return;\n' +
    '    var isBase = (id===baseId);\n' +
    '    var tot={}; M.cities.forEach(function(c){ tot[c.area] = isBase ? c.baseTotal : computeTotal(c, scen.weights); });\n' +
    '    var ordered = M.cities.map(function(c){ return c.area; }).sort(function(a,b){ return tot[b]-tot[a]; });\n' +
    '    var rank={}; ordered.forEach(function(a,i){ rank[a]=i+1; });\n' +
    '    var ps=pairs();\n' +
    '    ps.forEach(function(p){ var area=p[0].getAttribute("data-area"); var sc=p[0].querySelector(".score-cell"); if(sc) sc.textContent=(tot[area]!=null?tot[area].toFixed(2):""); var rv=p[0].querySelector(".rank-val"); if(rv) rv.textContent=rank[area]; });\n' +
    '    ps.sort(function(a,b){ return rank[a[0].getAttribute("data-area")] - rank[b[0].getAttribute("data-area")]; });\n' +
    '    ps.forEach(function(p){ tbody.appendChild(p[0]); if(p[1]) tbody.appendChild(p[1]); });\n' +
    '    if(noteEl){ var usesPriv = scen.weights && typeof scen.weights.private_school_access==="number" && scen.weights.private_school_access>0; var hasNull = M.cities.some(function(c){ return c.scores.private_school_access==null; }); var extra = (usesPriv && hasNull) ? " Unbackfilled cities use their state median for private-school access (overall median where no state has data yet)." : ""; noteEl.textContent = isBase ? "" : ((scen.basis||"") + extra); }\n' +
    '  }\n' +
    '  var btns=document.querySelectorAll(".scenario-btn");\n' +
    '  Array.prototype.forEach.call(btns, function(b){ b.addEventListener("click", function(){ if(b.disabled) return; Array.prototype.forEach.call(btns,function(x){x.classList.remove("active");}); b.classList.add("active"); apply(b.getAttribute("data-scenario")); }); });\n' +
    '  tbody.addEventListener("click", function(e){ var t=e.target.closest(".row-toggle"); if(!t) return; var r=t.closest("tr.js-row"); var d=sel(r.getAttribute("data-area")); if(!d) return; if(d.hasAttribute("hidden")){ d.removeAttribute("hidden"); t.innerHTML="&#9662;"; t.setAttribute("aria-expanded","true"); } else { d.setAttribute("hidden",""); t.innerHTML="&#9656;"; t.setAttribute("aria-expanded","false"); } });\n' +
    '})();\n' +
    '</' + 'script>';

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

  // Nashville metro cluster (budget-fit order)
  const nash = (data.metro_clusters && data.metro_clusters.Nashville) || null;
  let nashville = '';
  if (nash && Array.isArray(nash.budget_fit_order)) {
    const cards = nash.budget_fit_order
      .map((area, i) => {
        const loc = byArea.get(area);
        if (!loc) return '';
        const rf = rentFit(loc);
        const flag = loc.budget_flag ? `<div class="flag">${esc(loc.budget_flag)}</div>` : '';
        return `        <div class="card nash-card">
          <div class="nash-top"><span class="nash-num">${i + 1}</span><span class="rentfit ${rf.cls}">${esc(
          rf.label + rf.dollar
        )}</span></div>
          <h3>${esc(loc.area)} <span class="nash-st">${esc(loc.state_abbr)}</span></h3>
          <p class="nash-buy">Est. 2041 buy: <strong>${esc(fmtPrice(loc.est_2041_buy_price))}</strong></p>
          <p class="nash-sub">${esc(loc.best_rental_submarket || '')}</p>
          ${flag}
        </div>`;
      })
      .join('\n');
    nashville = `
    <section id="nashville">
      <div class="section-title">
        <h2>${esc(nash.label || 'Nashville Metro')}</h2>
        <p>${esc(nash.note || '')}</p>
      </div>
      <div class="nash-grid">
${cards}
      </div>
    </section>
`;
  }

  // Extended-scope candidates (outside the seven-state brief; deliberately kept
  // out of the numbered ranking, state picks, and category winners).
  const extendedCandidates = data.extended_scope_candidates || [];
  let extended = '';
  if (extendedCandidates.length) {
    const inScopeCount = locations.length;
    const extCards = extendedCandidates
      .map((c) => {
        const t = tierMeta(c.tier);
        const total =
          typeof c.weighted_total_out_of_100 === 'number' ? c.weighted_total_out_of_100.toFixed(2) : '';
        const s = c.scores || {};
        const stat = (label, v) =>
          v == null ? '' : `<div class="ext-stat"><span>${esc(label)}</span><strong>${esc(v)}</strong></div>`;
        const stats = [
          stat('Schools', s.school_quality),
          stat('Housing fit 2041', s.housing_affordability_2041),
          stat('Rent fit 2028', s.rental_feasibility_2028),
          stat('AI / PM market', s.ai_tech_pm_market),
          stat('Robotics / fitness', s.robotics_fitness_startup_fit),
          stat('Private access', s.private_school_access),
        ].join('');
        const risks = (c.risks || []).map((r) => `<li>${esc(r)}</li>`).join('');
        const radius = (c.private_school_option || {}).search_radius_miles || 20;
        const ps = c.private_school_option
          ? `<div class="detail-box"><h4>Private-school options within ${esc(radius)} mi</h4>${psOptionsHtml(c)}</div>`
          : '';
        return `        <div class="card ext-card">
          <div class="ext-top"><span class="ext-tag">Extended scope &middot; ${esc(
            c.state_abbr
          )}</span><span class="tier ${t.cls}">${esc(t.label)}</span></div>
          <h3>${esc(c.area)}</h3>
          <p class="ext-label">${esc(c.strategic_label)}</p>
          <div class="ext-scoreline">Model score (baseline weights): <strong>${esc(
            total
          )}</strong> <span>&mdash; reference only; not ranked against the ${esc(
          inScopeCount
        )} in-scope areas</span></div>
          <div class="ext-stats">${stats}</div>
          <p>${esc(c.notes)}</p>
          ${c.scope_note ? `<p class="ext-scope">${esc(c.scope_note)}</p>` : ''}
          ${risks ? `<div class="ext-risks"><h4>Risks &amp; unknowns</h4><ul>${risks}</ul></div>` : ''}
          ${ps}
        </div>`;
      })
      .join('\n');
    extended = `
    <section id="extended">
      <div class="section-title">
        <h2>Extended-scope wildcard</h2>
        <p>Outside the seven-state brief (NC, SC, GA, TN, FL, AL, TX). Tracked separately &mdash; not part of the numbered ranking, state picks, or category winners.</p>
      </div>
      <div class="ext-grid">
${extCards}
      </div>
    </section>
`;
  }
  const extendedNav = extendedCandidates.length
    ? '      <a href="#extended">Extended Scope</a>\n'
    : '';

  // Phase plan: rental-A / rental-B / purchase sequencing
  const pp = data.phase_plan || null;
  let phasePlan = '';
  if (pp && Array.isArray(pp.phases) && pp.phases.length) {
    const zoneCls = (t) => {
      const s = String(t || '').toLowerCase();
      if (s.startsWith('maximum')) return 'max';
      if (s.startsWith('none')) return 'none';
      return 'low';
    };
    const firstSentence = (t) => String(t || '').split('.')[0];
    const phaseCards = pp.phases
      .map((ph, i) => {
        const crit = (ph.governing_criteria || []).map((c) => `<li>${esc(c)}</li>`).join('');
        return `        <div class="card phase-card">
          <div class="phase-top"><span class="phase-num">${i + 1}</span><span class="phase-years">${esc(
          ph.years
        )}</span></div>
          <h3>${esc(ph.label)}</h3>
          <p class="phase-ages">Planned child: ${esc(ph.child_ages)}</p>
          <div class="phase-zone ${zoneCls(ph.school_zone_relevance)}">School zone: ${esc(
          firstSentence(ph.school_zone_relevance)
        )}</div>
          <p class="phase-guidance">${esc(ph.guidance)}</p>
          ${crit ? `<div class="phase-crit"><h4>What binds here</h4><ul>${crit}</ul></div>` : ''}
        </div>`;
      })
      .join('\n');

    const ROLE_META = {
      rental_a_only: ['warn', 'Rental A only'],
      single_location_viable: ['good', 'No split needed'],
      purchase_target: ['info', 'Buy into, not rent long'],
    };
    const roleCards = Object.entries(pp.candidate_roles || {})
      .map(([key, v]) => {
        const [cls, title] = ROLE_META[key] || ['info', prettifyKey(key)];
        const chips = (v.locations || [])
          .map(
            (l) =>
              `<li><span class="role-rank">#${esc(l.rank)}</span><span class="role-area">${esc(
                l.area
              )}</span><span class="role-nums">rent ${esc(l.rental_feasibility_2028)} &middot; sch ${esc(
                l.school_quality
              )}</span></li>`
          )
          .join('');
        return `        <div class="card role-card ${cls}">
          <h3>${esc(title)}</h3>
          <p class="role-rule"><code>${esc(v.rule)}</code></p>
          <p class="role-meaning">${esc(v.meaning)}</p>
          <ul class="role-list">${chips}</ul>
        </div>`;
      })
      .join('\n');

    const tl = pp.timeline || {};
    const familyStatus = [tl.status, tl.child_age_note].filter(Boolean).join('. ');
    const tlChips = [
      ['Rental starts', tl.rental_phase_start],
      ['Purchase', tl.home_purchase_year],
      ['Rental window', tl.rental_window_years ? `${tl.rental_window_years} yrs` : null],
      ["Planned child's age at rental start", tl.child_age_at_rental_start],
      ["Planned child's age at purchase", tl.child_age_at_purchase],
    ]
      .filter((x) => x[1] != null && x[1] !== '')
      .map(([k, v]) => `<div class="tl-chip"><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`)
      .join('');

    phasePlan = `
    <section id="phases">
      <div class="section-title">
        <h2>Phase plan</h2>
        <p>${esc(pp.basis || '')}</p>
      </div>
      <div class="card insight-card">
        <h3>The rental window is 13 years, not 3</h3>
        <p>${esc(pp.core_insight || '')}</p>
        ${tlChips ? `<div class="tl-grid">${tlChips}</div>` : ''}
        ${familyStatus ? `<p class="opp-gap">${esc(familyStatus)}</p>` : ''}
      </div>
      <div class="phase-grid">
${phaseCards}
      </div>
      <div class="role-grid">
${roleCards}
      </div>
      ${pp.caveat ? `<p class="phase-caveat">${esc(pp.caveat)}</p>` : ''}
    </section>
`;
  }
  const phaseNav = phasePlan ? '      <a href="#phases">Phase Plan</a>\n' : '';

  // Paths to yes: what would have to be true for a stretch location to work.
  // Conditional by design - it never re-ranks the matrix.
  const py = data.paths_to_yes || null;
  let pathsToYes = '';
  let pathsScript = '';
  if (py && Array.isArray(py.locations) && py.locations.length && Array.isArray(py.career_tiers)) {
    const money = (n) => (typeof n === 'number' ? '$' + Math.round(n).toLocaleString('en-US') : '');
    const moneyK = (n) =>
      typeof n !== 'number' ? '' : n >= 1e6 ? '$' + (n / 1e6).toFixed(2).replace(/0$/, '') + 'M' : '$' + Math.round(n / 1e3) + 'K';
    const byArea = new Map(locations.map((l) => [l.area, l]));
    const tierIds = py.career_tiers.map((t) => t.id);
    const defaultTier = (py.career_tiers.find((t) => t.default) || py.career_tiers[0]).id;
    const tierBudget = (t) => t.budget_range || moneyK(t.budget_2041);

    const tierButtons = py.career_tiers
      .map(
        (t) =>
          `<button type="button" class="ptier-btn${t.id === defaultTier ? ' active' : ''}" data-ptier="${esc(
            t.id
          )}" aria-pressed="${t.id === defaultTier ? 'true' : 'false'}"><span>${esc(t.label)}</span><strong>${esc(
            tierBudget(t)
          )}</strong></button>`
      )
      .join('');

    const tierCards = py.career_tiers
      .map(
        (t) => `        <div class="card ptier-card" data-ptier-card="${esc(t.id)}">
          <h3>${esc(t.label)}</h3>
          <p class="ptier-trigger">${esc(t.trigger)}</p>
          <div class="ptier-nums">
            <div><span>2041 budget by state</span><strong>${esc(tierBudget(t))}</strong></div>
            ${t.household_2041 ? `<div><span>Household income in 2041</span><strong>${esc(money(t.household_2041))}</strong></div>` : ''}
            <div><span>Rent ceiling from 2031</span><strong>${esc(money(t.rent_ceiling_2031))}/mo</strong></div>
          </div>
          <p class="ptier-evidence">${esc(t.evidence || '')}</p>
        </div>`
      )
      .join('\n');

    const locCards = py.locations
      .map((loc) => {
        const links = (loc.matrix_areas || [])
          .map((a) => {
            const m = byArea.get(a);
            const sc = typeof m?.weighted_total_out_of_100 === 'number' ? m.weighted_total_out_of_100.toFixed(2) : '';
            return m ? `<span class="path-link">#${esc(m.rank)} ${esc(a)} &middot; ${esc(sc)}</span>` : '';
          })
          .join('');
        const fit = (loc.fit || []).map((f) => `<li>${esc(f)}</li>`).join('');
        const opts = (loc.options || [])
          .map((o) => {
            const works = (o.works_under || []).filter((w) => tierIds.includes(w));
            const price =
              o.price_2026 != null
                ? `<span class="po-price">${esc(money(o.price_2026))} today &rarr; ${esc(money(o.proj_2041))} in 2041</span>`
                : '';
            return `<li class="path-opt" data-works="${esc(works.join(' '))}">
                <div class="po-main"><strong>${esc(o.option)}</strong>${price}<span class="po-note">${esc(o.price_note || '')}</span></div>
                <div class="po-side"><span class="po-status"></span><span class="po-why">${esc(o.note || '')}</span></div>
              </li>`;
          })
          .join('');
        const verify = (loc.verify || []).map((v) => `<li>${esc(v)}</li>`).join('');
        return `        <div class="card path-card">
          <div class="path-top"><h3>${esc(loc.title)}</h3><span class="path-verdict ${esc(loc.verdict || '')}">${esc(
          loc.verdict_label || ''
        )}</span></div>
          ${links ? `<div class="path-links">${links}</div>` : ''}
          <p class="path-headline">${esc(loc.headline || '')}</p>
          ${fit ? `<h4>Why it fits you</h4><ul class="path-fit">${fit}</ul>` : ''}
          <h4>Ways in</h4>
          <ul class="path-opts">${opts}</ul>
          <div class="path-plan"><h4>Best plan</h4><p>${esc(loc.best_plan || '')}</p>
          ${loc.trigger ? `<p class="path-trig"><span>Trigger</span>${esc(loc.trigger)}</p>` : ''}</div>
          ${verify ? `<details class="path-verify"><summary>Check before committing</summary><ul>${verify}</ul></details>` : ''}
        </div>`;
      })
      .join('\n');

    const levers = (py.levers || [])
      .map((l) => `<li><strong>${esc(l.lever)}</strong><span>${esc(l.detail)}</span></li>`)
      .join('');

    pathsToYes = `
    <section id="paths">
      <div class="section-title">
        <h2>Paths to yes</h2>
        <p>${esc(py.purpose || '')}</p>
      </div>
      <div class="card insight-card">
        <h3>What would have to be true</h3>
        <p>${esc(py.guardrail || '')}</p>
      </div>
      <div class="ptier-pick" role="group" aria-label="Career tier">${tierButtons}</div>
      <p class="ptier-help">Pick a career tier to see which ways in fit its budget. Each option is checked against its own location's budget.</p>
      <div class="ptier-grid">
${tierCards}
      </div>
      <div class="path-grid">
${locCards}
      </div>
      ${levers ? `<div class="card levers-card"><h3>The levers, in order of impact</h3><ol class="levers">${levers}</ol></div>` : ''}
      <p class="phase-caveat">${esc(py.budget_method || '')}</p>
    </section>
`;

    // Plain string so the outer template literal does not interpolate it.
    pathsScript =
      '<script>\n' +
      '(function(){\n' +
      '  var sec = document.getElementById("paths"); if(!sec) return;\n' +
      '  var btns = sec.querySelectorAll(".ptier-btn");\n' +
      '  function apply(t){\n' +
      '    Array.prototype.forEach.call(btns, function(b){ var on=b.getAttribute("data-ptier")===t; b.classList.toggle("active",on); b.setAttribute("aria-pressed", on?"true":"false"); });\n' +
      '    Array.prototype.forEach.call(sec.querySelectorAll("[data-ptier-card]"), function(c){ c.classList.toggle("active", c.getAttribute("data-ptier-card")===t); });\n' +
      '    Array.prototype.forEach.call(sec.querySelectorAll(".path-opt"), function(li){\n' +
      '      var ok = (" "+li.getAttribute("data-works")+" ").indexOf(" "+t+" ")>=0;\n' +
      '      li.classList.toggle("fits", ok); li.classList.toggle("miss", !ok);\n' +
      '      li.querySelector(".po-status").textContent = ok ? "Fits" : "Not yet";\n' +
      '    });\n' +
      '  }\n' +
      '  Array.prototype.forEach.call(btns, function(b){ b.addEventListener("click", function(){ apply(b.getAttribute("data-ptier")); }); });\n' +
      '  var def = sec.querySelector(".ptier-btn.active") || btns[0];\n' +
      '  if (def) apply(def.getAttribute("data-ptier"));\n' +
      '})();\n' +
      '</' + 'script>';
  }
  const pathsNav = pathsToYes ? '      <a href="#paths">Paths to Yes</a>\n' : '';

  // Opportunities: home-base strategy, offer evaluator, metro employer research,
  // Sherwin-Williams internal track and the application tracker.
  const os = data.opportunity_strategy || null;
  const metros = Array.isArray(data.metros) ? data.metros : [];
  let opportunities = '';
  let oppScript = '';
  if (os && metros.length && data.tax_model) {
    const TAGS = {
      ai_product: 'AI product',
      fintech: 'Fintech',
      sports_tech: 'Sports-tech',
      consumer_retail: 'Consumer & retail',
      spouse_retail: 'Wife: retail',
      spouse_content: 'Wife: content',
    };
    const money0 = (n) => (typeof n === 'number' ? '$' + Math.round(n).toLocaleString('en-US') : '');
    const li = (arr) => (arr || []).map((x) => `<li>${esc(x)}</li>`).join('');
    const link = (url, label) =>
      url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label || 'source')}</a>` : '';

    const coItem = (c) => {
      const tags = (c.goal_tags || []).map((t) => `<span class="opp-tag t-${esc(t)}">${esc(TAGS[t] || t)}</span>`).join('');
      const roles = (c.role_families || []).length ? `<div class="opp-roles">Roles: ${esc(c.role_families.join(' · '))}</div>` : '';
      const note = c.note ? `<div class="opp-conote">${esc(c.note)}</div>` : '';
      return `<li class="opp-co" data-tags="${esc((c.goal_tags || []).join(' '))}">
              <div class="opp-cotop"><strong>${esc(c.name)}</strong><span class="opp-sector">${esc(c.sector || '')}</span></div>
              <div class="opp-tags">${tags}${c.verified ? '' : '<span class="opp-unv">listing source</span>'}</div>
              <p>${esc(c.why || '')}</p>${roles}${note}
              <div class="opp-src">${esc(c.office || '')} · ${link(c.source)}</div>
            </li>`;
    };

    const metroCards = metros
      .map((m) => {
        const locs = (m.locations || [])
          .map((l) => `<span class="path-link">#${esc(l.rank)} ${esc(l.area)}</span>`)
          .join('');
        const ks = (m.kendra_scott || []).map((k) => esc(k.store)).join(' · ');
        const cos = (m.companies || []).concat(m.spouse_content || []);
        const body = m.researched
          ? `${m.rent_3br ? `<div class="opp-meta"><span>Typical 3BR rent</span><strong>${esc(money0(m.rent_3br))}/mo</strong></div>` : ''}
          ${ks ? `<div class="opp-meta"><span>Kendra Scott</span><strong>${ks}</strong></div>` : ''}
          <ul class="opp-cos">${cos.map(coItem).join('')}</ul>
          ${m.gaps ? `<p class="opp-gap">${esc(m.gaps)}</p>` : ''}`
          : `<p class="opp-gap">${esc(m.gaps || 'Research pending.')}</p>`;
        return `        <details class="card opp-metro${m.home_base ? ' home' : ''}" data-metro="${esc(m.id)}"${m.home_base ? ' open' : ''}>
          <summary><span class="opp-mname">${esc(m.label)}${m.home_base ? ' <em>home base</em>' : ''}</span><span class="opp-mcount">${
          m.researched ? `${cos.length} employers` : 'wave 2'
        }</span></summary>
          <div class="path-links">${locs}</div>
          ${body}
        </details>`;
      })
      .join('\n');

    const filterChips =
      `<button type="button" class="opp-chip active" data-tag="all">All</button>` +
      Object.entries(TAGS)
        .map(([k, v]) => `<button type="button" class="opp-chip" data-tag="${esc(k)}">${esc(v)}</button>`)
        .join('');

    const swt = data.sherwin_williams_track || null;
    const swCard = swt
      ? `<div class="card opp-sw"><h3>Sherwin-Williams internal track</h3>
          <p>${esc(swt.headquarters || '')} ${esc(swt.rd_center || '')}</p>
          <h4>AI and digital roles posted in 2026</h4><ul>${li(swt.ai_roles_seen_2026)}</ul>
          <p class="opp-gap">${esc(swt.implication || '')}</p></div>`
      : '';

    const remote = Array.isArray(data.remote_first) ? data.remote_first : [];
    const remoteCard = `<div class="card opp-remote"><h3>Remote-first employers</h3>${
      remote.length
        ? `<p class="opp-gap">A level-up without moving: these hire product roles remotely, so the family stays in Spring Hill.</p><ul class="opp-cos">${remote.map(coItem).join('')}</ul>`
        : '<p class="opp-gap">Remote employers that would let you level up without moving - research is in the next wave.</p>'
    }</div>`;

    const apps = Array.isArray(data.applications) ? data.applications : [];
    const appRows = apps
      .map(
        (a) =>
          `<tr><td>${esc(a.company || '')}</td><td>${esc(a.role || '')}</td><td>${esc(a.metro || '')}</td><td><span class="opp-status s-${esc(
            (a.status || '').toLowerCase()
          )}">${esc(a.status || '')}</span></td><td>${esc(a.date || '')}</td><td>${esc(a.notes || '')}</td></tr>`
      )
      .join('');
    const tracker = `<div class="card opp-tracker"><h3>Application tracker</h3>${
      apps.length
        ? `<div class="table-wrap"><table><thead><tr><th>Company</th><th>Role</th><th>Metro</th><th>Status</th><th>Date</th><th>Notes</th></tr></thead><tbody>${appRows}</tbody></table></div>`
        : '<p class="opp-gap">No applications yet. Tell Claude something like "add: Lowe\'s, Senior Digital Product Manager, Charlotte, applied" and it will appear here.</p>'
    }</div>`;

    const evalMetros = metros.filter((m) => m.researched && m.rent_3br);
    const metroOpts = evalMetros
      .map((m) => `<option value="${esc(m.id)}"${m.id === 'dfw' ? ' selected' : ''}>${esc(m.label)}${m.home_base ? ' (stay / local job)' : ''}</option>`)
      .join('');

    opportunities = `
    <section id="opportunities">
      <div class="section-title">
        <h2>Opportunities</h2>
        <p>${esc(os.rule || '')}</p>
      </div>
      <div class="card insight-card opp-strategy">
        <h3>Home base: ${esc(os.home_base || '')}</h3>
        <p>${esc(os.buy_by || '')}</p>
        <div class="opp-two">
          <div><h4>Move windows</h4><ul>${li(os.move_windows)}</ul></div>
          <div><h4>Safeguards</h4><ul>${li(os.safeguards)}</ul></div>
        </div>
        <p class="opp-gap">${esc(os.spouse_note || '')}</p>
      </div>

      <div class="card opp-eval" id="opp-eval">
        <h3>Offer evaluator</h3>
        <p class="ptier-help">Does an offer leave the family better off than staying in Spring Hill? Compares monthly money left after income taxes and a typical 3BR rent.</p>
        <div class="opp-form">
          <label>Offer metro<select id="oe-metro">${metroOpts}</select></label>
          <label>Offer base salary<input id="oe-base" type="number" min="0" step="1000" value="150000"></label>
          <label>Bonus %<input id="oe-bonus" type="number" min="0" max="100" step="1" value="10"></label>
          <label>Wife's income in that metro<input id="oe-sp-new" type="number" min="0" step="1000" value="32000"></label>
          <label>Your pay if you stay (Sherwin-Williams)<input id="oe-stay" type="number" min="0" step="1000" value="${esc(
            (data.rental_budget_config || {}).current_individual_income || 73000
          )}"></label>
          <label>Wife's income if you stay<input id="oe-sp-stay" type="number" min="0" step="1000" value="${esc(
            ((data.rental_budget_config || {}).current_household_income || 105000) -
              ((data.rental_budget_config || {}).current_individual_income || 73000)
          )}"></label>
          <label>Level-up threshold %<input id="oe-thr" type="number" min="0" max="200" step="1" value="${esc(
            (os.level_up_test || {}).default_threshold_pct || 15
          )}"></label>
        </div>
        <p class="ptier-help">Tip: set "your pay if you stay" to what a Sherwin-Williams promotion would pay (~$120K on the planned path) for a fair comparison.</p>
        <div id="oe-out" class="opp-out" aria-live="polite"></div>
      </div>

      <div class="opp-two">
        ${swCard}
        ${remoteCard}
      </div>

      <div class="section-title opp-sub"><h3>Employers by metro</h3><p>Every company has a source. "Listing source" means it came from a directory or ranking article rather than the company itself.</p></div>
      <div class="opp-chips" role="group" aria-label="Filter employers">${filterChips}</div>
      <div class="opp-grid">
${metroCards}
      </div>
      ${tracker}
      <p class="phase-caveat">${esc((data.tax_model || {}).note || '')} Home budget uses the same rule as the model (28% of gross, 20% down, 6.5%, 30-year, local property tax and insurance) at the offer's income today.</p>
    </section>
`;

    // Evaluator payload: only what the client needs.
    const payload = {
      tax: data.tax_model,
      stay: 'nashville',
      metros: evalMetros.map((m) => {
        const rep = byArea.get(m.representative) || {};
        const bc = rep.budget_check || {};
        return {
          id: m.id,
          label: m.label,
          rent: m.rent_3br,
          ks: (m.kendra_scott || []).length,
          tax: (bc.property_tax_effective_pct || 0) / 100,
          ins: ((bc.insurance_state_avg_annual || 0) / 400000) * 0.75,
          locs: (m.locations || []).map((l) => {
            const b = (byArea.get(l.area) || {}).budget_check || {};
            return { area: l.area, price: b.price_2026 || null };
          }),
        };
      }),
    };
    const payloadJson = JSON.stringify(payload).replace(/</g, '\\u003c');
    // Plain string so the outer template literal does not interpolate it.
    oppScript =
      '<script id="opp-data" type="application/json">' + payloadJson + '</' + 'script>\n' +
      '<script>\n' +
      '(function(){\n' +
      '  var el=document.getElementById("opp-data"); if(!el) return; var D=JSON.parse(el.textContent);\n' +
      '  var M={}; D.metros.forEach(function(m){ M[m.id]=m; });\n' +
      '  function br(x,b){ var t=0,lo=0; for(var i=0;i<b.length;i++){ var top=b[i][0], r=b[i][1]; var hi=(top===null)?x:Math.min(x,top); if(hi>lo) t+=(hi-lo)*r; if(top===null||x<=top) break; lo=top; } return t; }\n' +
      '  function taxes(g,s,mid){ var T=D.tax, gross=g+s, f=T.federal_mfj; var fed=br(Math.max(0,gross-f.standard_deduction),f.brackets);\n' +
      '    var fi=T.fica, fica=0; [g,s].forEach(function(x){ fica+=Math.min(x,fi.ss_wage_base)*fi.social_security + x*fi.medicare; }); fica+=Math.max(0,gross-fi.addl_medicare_over_mfj[0])*fi.addl_medicare_over_mfj[1];\n' +
      '    var st=T.state[T.metro_state[mid]], state=0; if(st.type==="flat") state=st.rate*Math.max(0,gross-st.deduction); else if(st.type==="brackets") state=br(Math.max(0,gross-st.deduction),st.brackets);\n' +
      '    var loc=T.local_by_metro[mid], local=loc?loc.rate*gross:0; return {gross:gross,fed:fed,fica:fica,state:state+local,net:gross-fed-fica-state-local}; }\n' +
      '  function Mf(r){ var i=r/12,n=360; return i*Math.pow(1+i,n)/(Math.pow(1+i,n)-1); }\n' +
      '  function scen(g,s,mid){ var m=M[mid], t=taxes(g,s,mid); t.rent=m.rent; t.left=(t.net-m.rent*12)/12; t.budget=0.28*t.gross/12/(0.8*Mf(0.065)+(m.tax+m.ins)/12);\n' +
      '    t.fits=m.locs.filter(function(l){ return l.price!==null && l.price<=t.budget; }).map(function(l){ return l.area; }); t.nlocs=m.locs.length; t.ks=m.ks; t.label=m.label; return t; }\n' +
      '  function $(id){ return document.getElementById(id); } function num(id){ var v=parseFloat($(id).value); return isFinite(v)&&v>=0?v:0; }\n' +
      '  function f0(n){ return "$"+Math.round(n).toLocaleString("en-US"); }\n' +
      '  function esc(s){ return String(s).replace(/[&<>"]/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"}[c]; }); }\n' +
      '  function run(){ var mid=$("oe-metro").value; var g=num("oe-base")*(1+num("oe-bonus")/100);\n' +
      '    var o=scen(g,num("oe-sp-new"),mid), s=scen(num("oe-stay"),num("oe-sp-stay"),D.stay);\n' +
      '    var ch=s.left!==0?(o.left-s.left)/Math.abs(s.left)*100:0, thr=num("oe-thr"), up=ch>=thr;\n' +
      '    var row=function(k,a,b){ return "<tr><th>"+k+"</th><td>"+a+"</td><td>"+b+"</td></tr>"; };\n' +
      '    var h="<div class=\\"opp-verdict "+(up?"up":"no")+"\\" data-change=\\""+ch.toFixed(1)+"\\">"+(up?"Levels the family up":"Does not clear the bar")+": <strong>"+(ch>=0?"+":"")+ch.toFixed(1)+"%</strong> monthly money left vs staying (threshold "+thr+"%)</div>";\n' +
      '    h+="<div class=\\"table-wrap\\"><table class=\\"opp-table\\"><thead><tr><th></th><th>Offer: "+esc(o.label)+"</th><th>Stay: Spring Hill</th></tr></thead><tbody>";\n' +
      '    h+=row("Household income",f0(o.gross),f0(s.gross))+row("Federal + FICA",f0(o.fed+o.fica),f0(s.fed+s.fica))+row("State + local income tax",f0(o.state),f0(s.state));\n' +
      '    h+=row("Take-home per month",f0(o.net/12),f0(s.net/12))+row("Typical 3BR rent",f0(o.rent)+"/mo",f0(s.rent)+"/mo");\n' +
      '    h+=row("<strong>Left per month</strong>","<strong data-oe=\\"left\\">"+f0(o.left)+"</strong>","<strong data-oe=\\"stay-left\\">"+f0(s.left)+"</strong>");\n' +
      '    h+=row("Home this income supports today",f0(o.budget),f0(s.budget))+row("Matrix locations in reach today",o.fits.length+" of "+o.nlocs,s.fits.length+" of "+s.nlocs);\n' +
      '    h+=row("Kendra Scott stores in metro",o.ks?o.ks:"none found",s.ks)+"</tbody></table></div>";\n' +
      '    if(o.fits.length) h+="<p class=\\"ptier-help\\">In reach: "+o.fits.map(esc).join(", ")+"</p>";\n' +
      '    $("oe-out").innerHTML=h; }\n' +
      '  ["oe-metro","oe-base","oe-bonus","oe-sp-new","oe-stay","oe-sp-stay","oe-thr"].forEach(function(id){ var e=$(id); if(e){ e.addEventListener("input",run); e.addEventListener("change",run); } });\n' +
      '  run();\n' +
      '  var sec=document.getElementById("opportunities");\n' +
      '  if(sec){ var chips=sec.querySelectorAll(".opp-chip"); Array.prototype.forEach.call(chips,function(c){ c.addEventListener("click",function(){ var t=c.getAttribute("data-tag");\n' +
      '    Array.prototype.forEach.call(chips,function(x){ x.classList.toggle("active",x===c); });\n' +
      '    Array.prototype.forEach.call(sec.querySelectorAll(".opp-co"),function(li){ var ok=t==="all"||(" "+li.getAttribute("data-tags")+" ").indexOf(" "+t+" ")>=0; li.style.display=ok?"":"none"; });\n' +
      '    Array.prototype.forEach.call(sec.querySelectorAll(".opp-metro"),function(m){ if(t!=="all"){ var any=m.querySelector(".opp-co:not([style*=\\"none\\"])"); if(any) m.open=true; } });\n' +
      '  }); }); }\n' +
      '})();\n' +
      '</' + 'script>';
  }
  const oppNav = opportunities ? '      <a href="#opportunities">Opportunities</a>\n' : '';

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
      <a href="#nashville">Nashville Metro</a>
${extendedNav}${phaseNav}${pathsNav}${oppNav}      <a href="#tiers">Decision Tiers</a>
      <a href="#recommendation">Recommendation</a>
    </div>
  </nav>

  <main class="wrap">
    <section id="summary">
      <div class="section-title">
        <h2>Executive summary</h2>
        <p>${esc(p.purpose || '')}</p>
      </div>
${rentBanner}
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
        <p>Ordered for the actual decision model, not generic &ldquo;best places to live&rdquo; rankings. Switch scenarios to re-rank live; click a row to see private-school options.</p>
      </div>
${scenarioBar}
      <div class="card table-card">
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Area</th>
              <th>State</th>
              <th>Tier</th>
              <th>Score</th>
              <th>Rent fit</th>
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

${nashville}
${extended}
${phasePlan}
${pathsToYes}
${opportunities}
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
  </footer>
${clientScript}
${pathsScript}
${oppScript}`;
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
