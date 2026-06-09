# Relocation Agent Deep Context Package

**Prepared for:** Greggory “Gregg” Rodgers  
**Project:** Long-term family relocation research  
**Created:** 2026-06-09  
**Primary use:** Deep context file for an AI research agent, planning agent, or relocation decision-support agent.

---

## 1. Purpose of This Context File

This file gives an AI agent the full operating context needed to continue Gregg’s long-term family relocation project without losing the reasoning, constraints, ranking logic, personal context, and decision priorities already established.

The agent’s job is not simply to recommend “nice places to live.” The agent must evaluate locations as long-term strategic bases for:

- Gregg’s AI Product / AI Marketing / Product Owner career trajectory.
- Long-term AI Product Leadership ambitions.
- Future applied AI business teaching career after DBA + MSAI.
- Family life with strong public schools and manageable housing.
- AI + robotics exploration, indie building, startup communities, and future hardware/software projects.
- Fitness lifestyle including running festivals, HYROX-style events, and active suburban environments.
- Practical budget discipline across a rental phase around 2028 and a home-purchase horizon around 2041.

The agent should treat this as a **multi-criteria family relocation optimization problem**, not a generic city ranking.

---

## 2. Original User Request / Project Brief

Gregg asked for the top 2 locations for each state based on his criteria, hobbies, interests, and known personal context, including robotics + AI, fitness, and other lifestyle factors.

The states under consideration are:

1. North Carolina
2. South Carolina
3. Georgia
4. Tennessee
5. Florida
6. Alabama
7. Texas
8. Virginia, with Virginia as the least favorite option

The original non-negotiable criteria were:

1. AI/tech job market strength for AI Product Management roles.
2. State income tax rates, with lower being better.
3. High school football culture.
4. Elite public school districts, targeting 7/10+ GreatSchools where feasible.
5. Professionally managed 3-bedroom townhome rentals under roughly $2,200/month during the rental phase around 2028.
6. Home purchase affordability targeting Gregg’s estimated long-term 2041 budget of roughly $820,000, assuming 2–3% annual appreciation.
7. Proximity to AACSB-accredited universities for a future teaching career in applied AI business.

Important later clarification:

> High school football should be weighted as more of a nice-to-have than a hard requirement to stay realistic with family budgets.

The agent must therefore **not eliminate otherwise excellent locations because of football culture alone**. Football should be scored, but only as a low-weight lifestyle/culture bonus.

---

## 3. Gregg-Specific Personal Context

Gregg is an AI Marketing Specialist at Sherwin-Williams Protective & Marine with Product Owner-type responsibilities. He has a long-term goal of becoming an AI Product Leader.

His education path:

- Currently pursuing a DBA with a strategic marketing / applied business focus.
- Plans to pursue an MSAI at UT Austin after the DBA.
- Wants to eventually teach at a university after retiring, likely in applied AI, AI business, marketing technology, or AI product leadership.

His professional and intellectual interests include:

- AI Product Management
- Applied AI in business
- Robotics + AI
- Mechatronics
- AI hardware projects
- Physical AI devices, such as the “Auntie Bot” concept: a physical device that behaves like an old auntie using an AI brain
- Indie builder culture and niche side projects
- Startup ecosystems
- AI-assisted product development
- Fitness events, especially running festivals, 5Ks, marathons, and HYROX-style events

The agent should assume Gregg needs an area that supports **both family life and long-term professional optionality**.

---

## 4. Decision Philosophy

The relocation model should balance ambition and realism.

A location should not win simply because it has the biggest tech market. It must also be livable, affordable, school-friendly, and viable for a family.

A location should not win simply because it is cheap. It must still give Gregg enough access to AI/tech, universities, fitness, robotics, and future career pathways.

A location should not win simply because it has elite football. Football is a bonus, not the core decision driver.

A location should not win simply because it is currently trendy. Long-term durability matters more than hype.

The ideal location provides:

- A meaningful AI/tech job market or access to one.
- Good-to-excellent public schools.
- Reasonable chance of finding a professionally managed 3-bedroom townhome rental near or under the budget target.
- Long-term home affordability within Gregg’s estimated 2041 purchase range.
- Nearby AACSB-accredited universities for future adjunct, professor of practice, lecturer, or applied AI teaching opportunities.
- Enough robotics, maker, research, defense, manufacturing, startup, or university ecosystem depth to support Gregg’s AI + robotics direction.
- Strong family lifestyle, safety, amenities, and fitness event access.

---

## 5. Revised Criteria Weights

The current model should use the following default weighting unless Gregg changes it:

| Criterion | Weight |
|---|---:|
| AI / tech Product career market | 25% |
| School quality | 20% |
| Housing affordability / 2041 budget fit | 20% |
| Rental feasibility around 2028 | 12% |
| State tax burden | 10% |
| AACSB university proximity / future teaching | 8% |
| Robotics, fitness, startup, maker lifestyle | 3% |
| High school football culture | 2% |

Notes:

- High school football is intentionally only 2%.
- Robotics, fitness, and startup lifestyle are grouped at 3% because they are important identity-fit factors, but they should not overpower schools, career, and affordability.
- If the project later becomes more robotics-centered, increase robotics/maker/startup fit from 3% to 8–10% and reduce football or tax weight accordingly.
- If the project becomes more school-first, increase school quality from 20% to 25–30%.
- If Gregg’s future job becomes fully remote and stable, reduce AI market weight and increase affordability/schools.

---

## 6. Scoring Instructions for the Agent

Use a 1–10 scale for each criterion.

Recommended interpretation:

- **10** = elite / nearly ideal for Gregg’s model
- **8–9** = strong
- **6–7** = acceptable with trade-offs
- **4–5** = weak / meaningful concern
- **1–3** = poor fit or likely disqualifying unless offset by another major factor

The agent should compute a weighted score:

`Weighted Score = SUM(criteria score × criterion weight)`

Because scores are on a 1–10 scale and weights total 100%, the weighted score should also be on a 1–10 scale.

The agent should provide:

1. Raw criterion scores.
2. Weighted score.
3. Rank.
4. Tier.
5. Key reason.
6. Major risk.
7. Best-fit family strategy.

---

## 7. Current Top 16 Ranked Areas

The current ranking is:

1. Round Rock / Cedar Park, Texas
2. Cary, North Carolina
3. Madison / Huntsville, Alabama
4. Suwanee / Peachtree Corners, Georgia
5. Oviedo, Florida
6. Plano / Frisco, Texas
7. Fort Mill, South Carolina
8. Waxhaw, North Carolina
9. Greenville, South Carolina
10. Auburn / Opelika, Alabama
11. St. Johns County, Florida
12. Franklin, Tennessee
13. Alpharetta / Johns Creek, Georgia
14. Farragut, Tennessee
15. Glen Allen / Midlothian, Virginia
16. Leesburg / Ashburn, Virginia

---

## 8. Top Two Locations by State

| State | #1 Location | #2 Location | Current State-Level Interpretation |
|---|---|---|---|
| Texas | Round Rock / Cedar Park | Plano / Frisco | Best overall state for career + taxes + schools, but specific suburb cost matters. |
| North Carolina | Cary | Waxhaw | Strong research/teaching state; Cary is premium, Waxhaw is Charlotte-side value. |
| Georgia | Suwanee / Peachtree Corners | Alpharetta / Johns Creek | Strong family-access and Atlanta tech state; affordability separates the two. |
| Alabama | Madison / Huntsville | Auburn / Opelika | Best value robotics/engineering state; Huntsville is the standout. |
| South Carolina | Fort Mill | Greenville | Good school/value state; Greenville is robotics/mobility sleeper. |
| Florida | Oviedo | St. Johns County | No-income-tax state; Oviedo is better for tech, St. Johns is school-first. |
| Tennessee | Franklin | Farragut | No-income-tax lifestyle state; affordability concerns reduce ranking. |
| Virginia | Glen Allen / Midlothian | Leesburg / Ashburn | Least preferred state; use only as backup or career-specific option. |

---

## 9. Decision Tiers

### Tier 1 — Serious Finalists

These should anchor the family conversation:

1. Round Rock / Cedar Park, TX
2. Cary, NC
3. Madison / Huntsville, AL
4. Suwanee / Peachtree Corners, GA
5. Oviedo, FL

### Tier 2 — Strong but with Trade-Offs

Good locations, but each has a clearer weakness:

6. Plano / Frisco, TX
7. Fort Mill, SC
8. Waxhaw, NC
9. Greenville, SC
10. Auburn / Opelika, AL

### Tier 3 — Watch List

Not bad, but weaker against the full model:

11. St. Johns County, FL
12. Franklin, TN
13. Alpharetta / Johns Creek, GA
14. Farragut, TN

### Tier 4 — Backup Only

Use only if specific circumstances change:

15. Glen Allen / Midlothian, VA
16. Leesburg / Ashburn, VA

---

## 10. Best-by-Category Winners

| Category | Winner | Runner-Up |
|---|---|---|
| Best overall | Round Rock / Cedar Park | Cary |
| Best AI Product career ceiling | Round Rock / Cedar Park | Cary |
| Best robotics / AI hardware ecosystem | Madison / Huntsville | Suwanee / Peachtree Corners |
| Best schools + affordability balance | Fort Mill | Madison / Huntsville |
| Best long-term home-buying fit | Madison / Huntsville | Round Rock / Cedar Park |
| Best no-income-tax state fit | Round Rock / Cedar Park | Oviedo |
| Best future professor path | Cary | Round Rock / Cedar Park |
| Best fitness / active lifestyle fit | Cary | Round Rock / Cedar Park |
| Best family-safe practical choice | Madison / Huntsville | Fort Mill |
| Best “dream but risky” option | Alpharetta / Johns Creek | Franklin |

---

## 11. Location-Specific Notes

### 1. Round Rock / Cedar Park, TX

Best overall strategic fit. This area provides access to Austin’s AI/product ecosystem, UT Austin, startup density, no state income tax, and strong suburban family infrastructure. It is the cleanest answer if Gregg wants to maximize AI Product leadership upside while staying in a family-friendly suburb.

Major risk: Austin-area housing and rental costs may continue rising.

Best strategy label: Career-max option.

### 2. Cary, NC

Best research and future-teaching ecosystem. Cary benefits from Research Triangle access, proximity to NC State, Duke, UNC, and a deep research/AI environment. It is excellent for long-term academic credibility and family life.

Major risk: Premium pricing and North Carolina income tax reduce affordability advantage.

Best strategy label: Research/teaching option.

### 3. Madison / Huntsville, AL

Best value robotics and engineering play. Huntsville is a standout for aerospace, defense, engineering, robotics, and affordability. Madison offers strong family and school appeal.

Major risk: AI Product Management roles may be more defense/engineering-adjacent than consumer/SaaS product roles.

Best strategy label: Budget-smart robotics option.

### 4. Suwanee / Peachtree Corners, GA

Best Georgia fit. This area gives Gregg access to Atlanta tech, Gwinnett schools, family proximity to Georgia, and robotics/innovation angles such as Peachtree Corners’ Curiosity Lab.

Major risk: Atlanta premium suburbs can become expensive; school zoning must be checked carefully.

Best strategy label: Georgia-family-access option.

### 5. Oviedo, FL

Best Florida fit. Oviedo provides UCF and Orlando tech access, simulation/defense-adjacent AI opportunities, no state income tax, and solid school/family balance.

Major risk: Florida property insurance, climate/weather risk, and some weaker direct AI Product depth compared with Austin/Triangle/Atlanta.

Best strategy label: No-income-tax Florida option.

### 6. Plano / Frisco, TX

Premium DFW career and school option. Excellent schools, strong family environment, strong DFW tech/corporate market, and high school football culture.

Major risk: High cost pressure, especially in Frisco; may be less budget-disciplined than Round Rock/Cedar Park.

### 7. Fort Mill, SC

Excellent school-first value. Strong family suburb with Charlotte access.

Major risk: Direct AI/product market is weaker than larger tech hubs; South Carolina tax profile is less favorable than no-income-tax states.

### 8. Waxhaw, NC

Charlotte-side family/value option. Good schools and better affordability than Cary.

Major risk: Less AI/research density than Triangle.

### 9. Greenville, SC

Robotics/mobility sleeper. Clemson/ICAR, manufacturing, automotive/mobility, and lifestyle make it interesting.

Major risk: Must validate school zones carefully; direct AI PM market is less robust.

### 10. Auburn / Opelika, AL

College-town affordability and Auburn University proximity.

Major risk: Weakest AI Product Management market among the stronger family options.

### 11. St. Johns County, FL

School-first Florida option with no state income tax.

Major risk: Weaker AI/product career market and potential Florida insurance/climate risks.

### 12. Franklin, TN

Strong lifestyle, schools, Nashville access, and no state income tax.

Major risk: Housing affordability is the biggest issue.

### 13. Alpharetta / Johns Creek, GA

Excellent schools and Atlanta tech access.

Major risk: Too expensive to be the practical Georgia recommendation compared with Suwanee/Peachtree Corners.

### 14. Farragut, TN

Strong schools and UT Knoxville adjacency.

Major risk: Weaker AI/product market and comparatively expensive for Knoxville metro.

### 15. Glen Allen / Midlothian, VA

Most realistic Virginia option because Richmond-area costs are more practical than Northern Virginia.

Major risk: Virginia is lowest-preference, has higher tax burden, and weaker fit than top Southeast/Texas options.

### 16. Leesburg / Ashburn, VA

Strong tech and data-center market.

Major risk: Expensive, higher tax burden, and least aligned with family preference.

---

## 12. Agent Research Requirements

When updating this project, the agent should verify current data. At minimum, update:

1. Current state income tax rates.
2. Current median home prices and suburb-level price trends.
3. Current 3-bedroom townhome rental inventory, especially professionally managed communities.
4. Current school ratings, preferably using multiple sources:
   - GreatSchools
   - Niche
   - state school report cards
   - district boundary maps
5. AI/product job-market strength:
   - LinkedIn job counts
   - Indeed job counts
   - Built In / local tech boards
   - major employer presence
   - remote role compatibility
6. Robotics and AI ecosystem:
   - universities
   - labs
   - accelerators
   - maker spaces
   - robotics/manufacturing/defense clusters
7. AACSB-accredited universities:
   - distance to business schools
   - realistic teaching pathways
   - adjunct / lecturer / professor of practice possibilities
8. Fitness lifestyle:
   - running clubs
   - marathon/5K/festival access
   - HYROX or functional fitness gym access
   - trail systems and parks
9. High school football:
   - culture, local attendance, history, and coaching ecosystem
   - treat as a nice-to-have only

---

## 13. Recommended Output Format for Future Agent Runs

The agent should produce:

1. Executive summary.
2. Updated ranked list.
3. Top two per state.
4. Weighted scoring matrix.
5. Tier map.
6. Best-by-category winners.
7. One-page family recommendation.
8. Key risks and “verify before deciding” list.
9. What changed since prior version.
10. Specific unanswered questions.

---

## 14. Questions to Ask Gregg Before Finalizing a New Version

Ask these questions when a more precise version is needed:

1. What is the real 2028 rental budget ceiling: $2,200 hard cap, or can it flex to $2,400–$2,600 in premium school zones?
2. Is the 2041 home budget of roughly $820,000 a hard cap, soft cap, or planning estimate?
3. How important is staying within driving distance of family in Georgia?
4. Would Gregg prefer a major AI hub with higher cost, or a robotics/engineering value hub with fewer AI Product roles?
5. Should future teaching opportunities prioritize R1/R2 universities, AACSB business schools generally, or practical adjunct opportunities?
6. Is the family open to Texas long-term, or is the Southeast still emotionally preferred?
7. Should Florida’s climate/property-insurance risk be scored separately?
8. Should political/cultural fit be included as a formal criterion?
9. Should commute assumptions be included, even if Gregg remains remote?
10. Should the model prioritize public school districts broadly, or specific high school attendance zones?

---

## 15. Current Recommendation

The current strategic recommendation is:

- **Best overall:** Round Rock / Cedar Park, TX
- **Best research/teaching fit:** Cary, NC
- **Best robotics/value fit:** Madison / Huntsville, AL
- **Best Georgia family-access fit:** Suwanee / Peachtree Corners, GA
- **Best Florida no-income-tax fit:** Oviedo, FL

The most realistic family shortlist is:

1. Round Rock / Cedar Park, TX
2. Cary, NC
3. Madison / Huntsville, AL
4. Suwanee / Peachtree Corners, GA
5. Oviedo, FL

The best budget-protective dark horse is:

- Madison / Huntsville, AL

The best emotionally practical Georgia option is:

- Suwanee / Peachtree Corners, GA

The strongest career-max option is:

- Round Rock / Cedar Park, TX

---

## 16. Important Caveats

This file preserves the current decision model and prior conclusions. It is not a substitute for updated research.

Any agent using this file should verify all time-sensitive information before presenting a final recommendation, especially:

- Home prices
- Rent prices
- School ratings
- Tax rates
- Job-market strength
- University accreditation
- District zoning
- Property insurance risk
- State/local policy changes

The agent should be transparent when data is estimated, stale, or unverified.

