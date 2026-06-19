# CLAUDE_CONTEXT.md — PHI-Safe Work Tools
## Last updated: 2026-06-19 (v1.5.5)

---

## CRITICAL RULES — READ FIRST

- This is a **single HTML file** (`index.html`) deployed via **Cloudflare Pages**
- **NEVER touch the existing CPT audit or equipment audit code** — those tools are live and working
- All processing is **local browser only** — no server, no uploads, no external data storage
- PHI-safe by design — the only unique identifier in schedule data is Case #
- Always commit and push to GitHub after every change
- Always bump the version number with every change

---

## Project Overview

A PHI-safe OR scheduling audit web tool, deployed as two environments via Cloudflare Pages:
- **tomboonern.com** is **production**, tracking the `main` branch
- **tomboone.io** is **dev/staging**, tracking the `dev` branch, and is gated behind a dev overlay (see Dev Gate below)

Home-screen tools (all **live and complete**):
1. **CPT Audit Tool** ✅ complete, do not touch
2. **Equipment Request Audit** ✅ complete (expand/collapse detail rows, amber keyword highlight, 19 keywords including NIM, Sonopet, CUSA, Aquamantys, Stealth, Ultrasound, Spy ICG, PTeye), do not touch
3. **OR Schedule and Room Assignment Audit** ✅ complete (Gantt, calendar, sidebar, alert/flag tier system; includes **Rule Management** sub-view with read-only rule cards, mailto flag-for-review, and mailto request-new-rule flows)
4. **OR Staffing Budget Calculator** ✅ complete (v1.5.3 tool; v1.5.4 corrected the FTE math; v1.5.5 scoped it to upcoming WBVC OR days, removed the summary tiles + separate comparison panel, and moved the scheduled-staffing inputs inline into each per-day table row with live FTE/Hours variance; see Key Decisions)

Sub-views (not home-screen tiles):
- **Equipment Terms view** ✅ complete (accessible via "View terms being checked" link in Equipment Request Audit; shows keyword pills; "Suggest equipment to check" button opens mailto pre-filled with suggestion template)


---

## Current Version & Deployment

- Current version: **v1.5.5**
- Repo: github.com/tombooone/tomboone-website
- File structure: `index.html` (HTML only), `styles.css` (all CSS), `rules-data.js` (pure data constants), `app.js` (all JS — main app first, worm IIFE second, dev gate IIFE third). **`rules-data.js` is loaded BEFORE `app.js`** in index.html; both are inline-script fragments (top-level code indented 4 spaces, no IIFE wrapper), so their top-level `const`/`let` declarations are shared across the two classic scripts via the global lexical environment — `app.js` references the data constants by name with no import/redeclaration.
- **Cache busting:** `styles.css`, `rules-data.js`, and `app.js` are loaded with `?v=X.X.XX` query strings in index.html. These version numbers **must be bumped in sync with the footer version badge** on every deploy.
- Deploy: `git add index.html styles.css rules-data.js app.js && git commit -m "message" && git push`
- Cloudflare Web Analytics: snippet added to `<head>` in index.html, wrapped in `location.hostname === 'tomboonern.com'` guard — fires only on tomboonern.com (production); tomboone.io (dev) and localhost are intentionally excluded
- Cloudflare Pages: push to `main` auto-deploys tomboonern.com; push to `dev` auto-deploys tomboone.io

---

## Dev / Prod Branch Workflow

- All development work happens on the `dev` branch; pushing `dev` deploys tomboone.io only
- Only merge `dev` into `main` (which deploys tomboonern.com) when Tom explicitly says **"release"**
- Releases happen via merging `dev` into `main` — no force pushes or rebases to `main`
- Version bumps happen on every push, on both branches, as always
- Most recent release: `dev` merged into `main` at v1.4.29 (2026-06-17), fast-forwarded — tomboonern.com is current through v1.4.29. v1.5.0 through v1.5.5 are on `dev` (tomboone.io) only, not yet released to `main`.

### Dev Gate (tomboone.io only)

- A full-screen overlay gates the app on tomboone.io only (`window.location.hostname === 'tomboone.io'`); no-op on any other hostname, including tomboonern.com and localhost
- Overlay markup lives in `index.html` (`#devGateOverlay`), styled in `styles.css` (`.dev-gate-overlay`, `.dev-gate-prod-link`); logic is in a standalone IIFE at the end of `app.js`, after the worm easter egg
- Overlay is a fully opaque white full-viewport panel with one centered link, "Go to tomboonern.com", linking to `https://tomboonern.com` — no heading, subtext, or other content; nothing behind it is visible
- Dismissal: a keystroke buffer listener (independent of the worm easter egg's listener and buffer) watches for the typed sequence "fefe" anywhere outside an input/textarea. On match, the overlay is hidden and `sessionStorage.setItem('devUnlocked', 'true')` is set
- On page load: if `sessionStorage.getItem('devUnlocked') === 'true'`, the overlay is skipped entirely (persists until the tab closes)
- DEV badge: `#devBadge`, an amber pill in the topbar next to the privacy pills (`.dev-pill` class on `.privacy-pill`), shown once the gate has been passed on tomboone.io; hostname-keyed the same way, so it never renders on tomboonern.com or localhost

---

## Epic Report IDs

| Tool | Report Name | Report ID |
|------|-------------|-----------|
| CPT Audit | CPMC CPT Audit | 51177697 |
| Equipment Request Audit | CPMC Equipment Request Audit | 59040819 |
| OR Schedule Audit | WBVC OR Schedule and Room Assignment Audit | 51512750 |

---

## Equipment Request Audit — Keywords

The tool flags cases where any of these terms appear in Special Needs but are NOT in the Equipment field:

`C-arm`, `Airo`, `Myosure fluid management`, `Fluid management system`, `Fluent`, `Myosure`, `NIM`, `Microscope`, `Gamma`, `Neoprobe`, `Geiger`, `Trunode`, `Sonopet`, `CUSA`, `Aquamantys`, `Stealth`, `Ultrasound`, `Spy ICG`, `PTeye`

**Matching logic (in order):**
1. Exact substring (case-insensitive)
2. Prefix-token match — source word starts with keyword token (e.g., "NIMS" matches "NIM")
3. Token-bag match — all keyword tokens ≥3 chars appear somewhere in source (e.g., "Monitor NIM Facial Nerve" matches "NIM")
4. Fuzzy/Levenshtein window match

**"No [keyword]" suppression:** In `findEquipmentTermsInText()`, a candidate match (exact, prefix, or fuzzy) is discarded if the word immediately preceding it (skipping whitespace) is the standalone word "no" — e.g. "no Ultrasound" does not flag. Implemented via `isPrecededByStandaloneNo()`. Not applied inside `containsEquipmentTerm()`.

**Expand/collapse rows:** Clicking a result row reveals Special Needs (with matched term highlighted amber) and Equipment List (with "([keyword] not found)" label in red).

**Disclaimer:** Equipment results panel shows a `<p>` note below the `<h2>` heading: "This tool searches for equipment keywords and may occasionally flag cases incorrectly or miss cases where equipment is referenced using non-standard or abbreviated terminology. Results should be reviewed in context."

---

## Data Schema

Both historical and prospective Epic reports share the same columns:

| Column | Use | Notes |
|--------|-----|-------|
| Date | Case date | Excel serial or date string |
| Proc Start | Scheduled wheels-in | Time string HH:MM:SS or decimal fraction |
| Proc End | Scheduled wheels-out | Time string HH:MM:SS or decimal fraction |
| Case # | Unique identifier | Only PHI-safe ID |
| Lead Surgeon | Primary surgeon | Format: "Last, First, MD [providerID]" — use bracketed ID for rules |
| Service | Service line | Reliable for service rules; ignore "Robotics" service |
| Case Procedures | Free text + bracketed Epic IDs e.g. [87810129] | First ID = primary procedure; free text has laterality |
| Admission Procedure | Procedure entry names, no IDs | Display only, ~77% populated, ignore for rule matching |
| Patient Class | Ignore for rules | |
| Room | Format "WBVC OR 05" | Strip "WBVC " prefix, normalize to "OR5" |
| Preference Cards Missing | Ignore | Unreliable due to EUA/blank card workflow |
| Status | Filter: keep Completed + Scheduled | Exclude Canceled, Voided |
| Clinician Reviewed? | "YES" or blank | Small weight multiplier for rule discovery |
| Notes for Service Lead | Ignore | Free text, not structured |
| Special Needs | Ignore for room rules | Handled by Equipment Request Audit tool |
| Equipment | Newline-separated list, "W " prefix | Strip prefix for matching; controlled vocabulary |
| OR Ready to Schedule | Ignore | |
| Patient Age | e.g. "62 yrs" | Parse leading integer; under 18 = peds rule |
| Base Patient Class | Ignore for rules | IP/OP/ED |
| Proj Start Time | Setup start = Gantt block left edge | Actual in historical, scheduled in prospective |
| Proj End Time | Cleanup end = Gantt block right edge | Actual in historical, scheduled in prospective |
| Case Classification | Elective = full weight | All others = low/zero weight for rule discovery |
| Add-on | Two values, treat same | Low weight for rule discovery |
| Add-on Date | Reference only | |

---

## Room Rules Architecture

### Tier System

| Tier | Name | Color | Term to use | Active rules |
|------|------|-------|-------------|--------------|
| 1 | Physical Absolute | Red | Alert | 6 |
| 2 | Strong Operational | Orange | Alert | 2 |
| 3 | Service Preference | Amber | Flag | 9 |
| 4 | Surgeon Preference | Blue | Flag | 39 |
| 5 | Suggestion | Grey | Flag | 2 |

**Language rules:**
- Tier 1-2 issues = "alerts"
- Tier 3-5 issues = "flags"
- Metric label: "Tier 1-2 alerts" and "Tier 3-5 flags"
- Table header: "Room rule alerts and flags"
- Never use the word "violation" in user-facing text
- "Audit" is fine to keep
- Explanation language should be brief, suggestive, not punitive

**Conflict resolution:** Lower tier number wins. If Tier 1 fires, it overrides all others.
**Special case:** Ophthalmology equipment (Tier 2) takes priority over peds age rule (Tier 2).
**SP robot rule:** If SP robot fires AND room is compliant (OR5), suppress DV5 rule evaluation for that case (`suppressesWhenCompliant` field).
**Maxillofacial/Dental exception:** Service = Maxillofacial or Dental suppresses HARD-3 Neuro/Spine rule even if equipment triggers it.

### Rule Match Types

- `equipmentContainsAny` — array of strings, fires if ANY matches (case-insensitive substring, after stripping prefix)
- `service` — exact match against Service column
- `surgeonId` — matches bracketed ID in Lead Surgeon column
- `procedureTextContains` + `laterality` — text match in Case Procedures + parsed laterality
- `patientAgeUnder` — numeric comparison
- `anyOf` — OR condition combining multiple match types

### Robot Case Detection

- DV5: equipment contains "Robot DaVinci DV5" OR "Davinci Robot Xi"
- SP: equipment contains "DaVinci Robot SP"
- Do NOT use "Tower Robot", "daVinci Surgeon Chair", "Table Trumpf 7000dV" as triggers — false positives
- Do NOT use Service = "Robotics"

---

## Active Rule Set

### Tier 1 — Physical Absolute (Alert) — 6 rules

| ID | Label | Trigger | Rooms |
|----|-------|---------|-------|
| HARD-1 | DaVinci DV5 Robot | equipmentContainsAny: ["Robot DaVinci DV5", "Davinci Robot Xi"] | OR2, OR3 |
| HARD-2 | DaVinci SP Robot | equipmentContainsAny: ["DaVinci Robot SP"] — suppressesWhenCompliant: ["hard-1"] | OR5 |
| HARD-3 | Neuro/Spine Room | equipmentContainsAny: ["Robot Neuro Excelsius GPS Globus", "Table Intraop CT Spine AIRO", "Table Intraop CT Cranial AIRO", "Scanner Airo Mobile Intraoperative CT", "System Navigation Brainlab", "Unit Doppler Micro Neuro", "Table Jackson", "Frame Wilson", "Mayfield Basic Unit", "Table Double Decker", "Trios Jackson Spinal", "Cart Electrophysiology Neuro"] — EXCEPTION: suppress if Service = Maxillofacial or Dental | OR11, OR12 |
| HARD-4 | Cardiac Surgery Room | equipmentContainsAny: ["Machine Heart Lung Perfusion", "Mount Table Large Estech", "Stool Hydraulic Ima", "Unit Hemopro 5500", "Cable Pacing Tester"] | OR7 |
| HARD-5 | Transplant Room | equipmentContainsAny: ["Table Back w/o shelf (Transplant)", "Table Small w/o shelf (Transplant)", "Cooler Donor", "Cart Renal Transplant", "ORGANOX"] | OR6, OR9 |
| HARD-6 | Hybrid/Cath Lab | equipmentContainsAny: ["CV ACCESSION EQ"] | OR14 |
| HARD-7 | Free Flap Procedure | procedureTextContains: "free flap" | OR6, OR7, OR8, OR9 |

### Tier 2 — Strong Operational (Alert) — 2 rules

| ID | Label | Trigger | Rooms |
|----|-------|---------|-------|
| OPS-1 | Ophthalmology Equipment | equipmentContainsAny: ["Unit Phaco Centurion", "Microscope Zeiss Eye", "Microscope Leica Eye", "Suction Irrigation System ROSI", "Cart Eye", "Gurney Eye", "Unit MIRA Diathermy", "Unit MIRA Transilluminator", "Wristrest Chan", "Tower Video Eye", "Ophthalmoscope Indirect Omega", "Unit Vitrectomy Constellation", "Machine Optiwave Refractive Analysis (ORA)", "Cart Vitrectomy"] | OR5, OR10 |
| OPS-2 | Pediatric Room | equipmentContainsAny: ["Cart Pediatric", "Warmer Overhead (French Fry)"] OR patientAgeUnder: 18 — overridden by OPS-1 | OR4 |

Peds explanation: "OR4 is the designated pediatric room. Please move this case to OR4 if available."

### Tier 3 — Service Preference (Flag) — 9 rules

| ID | Service / Trigger | Rooms |
|----|-------------------|-------|
| SVC-1 | Cardiac | OR7, OR8, OR14 |
| SVC-2 | Neurosurgery | OR11, OR12 |
| SVC-3 | Ophthalmology | OR5, OR10 |
| SVC-4 | Spine | OR11, OR12 |
| SVC-5 | Orthopedics | OR11, OR12 |
| SVC-6 | Cardiology | OR14 |
| SVC-7 | Pain Management | OR11, OR12, OR4 |
| SVC-8 | Bronchoscopy (procedureTextContains: "bronch") | OR8 |
| SVC-9 | Gynecology/Obstetrics (anyOf: Service = Gynecology or Obstetrics) | OR1 — suppressed if no feasible OR1 slot for case duration |

### Tier 4 — Surgeon Preference (Flag) — 39 rules

| Surgeon | ID | Rooms |
|---------|----|-------|
| Jossart | 105751 | OR10 |
| Zakaria | 20144424 | OR11, OR12 |
| Egrie | 30059201 | OR7 |
| Chan | 309844 | OR1 |
| Lin | 107858 | OR5 |
| Kardos | 108387 | OR2 |
| Macdougall | 20120390 | OR11, OR12 |
| Valone | 20041597 | OR11, OR12 |
| Kennedy | 515122 | OR4 |
| Shah | 20159245 | OR5 |
| So | 30069070 | OR5 |
| Weber | 105621 | OR11, OR12 |
| Sheth | 20137324 | OR4 |
| Kim | 30113240 | OR11, OR12 |
| Oshtory | 30079667 | OR11, OR12 |
| Leng | 20048503 | OR11, OR12 |
| Char | 500276 | OR10 |
| Seiff | 501360 | OR10 |
| Reiter | 20063777 | OR5 |
| Goyal | 96086 | OR14 |
| Hongo | 30068728 | OR14 |
| Nathanson | 30045153 | OR12, OR14 |
| Kutzscher | 20002631 | OR5 |
| Zhang | 20158330 | OR11, OR12 |
| Liu | 20028386 | OR5 |
| Denny | 20063171 | OR5 |
| Kan | 20126149 | OR4 |
| Agarwal | 20111453 | OR10, OR5 |
| Thomas | 20113222 | OR5 |
| Longar | 30068849 | OR10, OR5 |
| Korver | 30025215 | OR7, OR8 |
| Moscato | 30068912 | OR10, OR5 |
| Good | 500568 | OR4 |
| Yeh | 20150680 | OR5 |
| Ali | 10028590 | OR4, OR5 |
| Fuchs | 10003434 | OR4, OR5 |
| Charlson | 20131783 | OR10, OR5 |
| Lu | 10101593 | OR5 |
| Chen | 30233068 | OR12, OR5 |

### Tier 5 — Laterality Suggestion (Flag) — 2 rules

| ID | Label | Trigger | Rooms |
|----|-------|---------|-------|
| LAT-001 | PCNL Right | procedureTextContains: "PCNL" + laterality: "right" | OR2, OR8, OR12 |
| LAT-002 | PCNL Left | procedureTextContains: "PCNL" + laterality: "left" | OR4, OR5, OR11 |

---

## Gantt Chart

- Integrated into OR Schedule Audit view — above violations table
- X axis: 06:30 to 19:00
- Y axis: OR1 through OR14, all 14 always shown
- Case blocks: Proj Start Time (left edge) to Proj End Time (right edge)
- Darker beige for setup/cleanup (Proj Start→Proc Start and Proc End→Proj End)
- Lighter beige for procedure time (Proc Start to Proc End)
- Case tile text: surgeon last name bold, procedure name, case number bold — left-aligned to full tile edge
- Case tile color: entire tile takes color of highest severity alert/flag (red=T1, orange=T2, amber=T3, blue=T4, grey=T5). Clean cases = beige.
- Reference line: dashed vertical at 07:30. Every other Friday starting 5/29/2026, line moves to 09:00 (biweekly: 5/29, 6/12, 6/26, 7/10...)
- Hover tooltip: shows surgeon, time range, lists each alert/flag with rule label and explanation
- Click tile: opens right sidebar with full case details and per-violation tier badges. Clicking outside sidebar closes it (except clicking another tile opens that tile's sidebar instead)
- Calendar: single month view with prev/next month arrows AND prev/next day arrows. Fixed height regardless of week count. Positioned to LEFT of metric stack. Days color-coded: red=Tier 1-2 alert, amber=Tier 3-5 flag, green=clean, no style=no cases.
- Metrics (Cases reviewed, Tier 1-2 alerts, Tier 3-5 flags): stacked vertically to RIGHT of calendar
- Legend panel: to the right of the metrics stack (`.panel.gantt-legend`, fixed 140px wide); 6 swatch+label entries: Tier 1–5 colors + "No violations" beige; uses `.gantt-legend-swatch` (18×12px rounded rect)
- Clicking a row in violations table scrolls to and highlights that case tile in Gantt, opens sidebar

---

## Rule Management View

Accessed via "View active rules" link on OR Schedule Audit instructions panel.

- Shows all rules organized by tier (Tier 1–5)
- Each rule card: Tier badge | Label, Trigger, Rooms, Confidence | Actions (no "Cases matched" field)
- **Flag for review:** Button on each card → textarea + Send → opens `mailto:Thomas.Boone@SutterHealth.org` with subject "Rule Review Request: [label]" and body "COMMENT: [user text]\n\nRule: [label] (Tier N)"
- **Request new rule:** Button right-aligned in heading row (white, alongside "How this works" button) → opens `mailto:Thomas.Boone@SutterHealth.org` with subject "New Rule Request" and blank COMMENT field
- **How this works:** Button in heading row → opens `ruleInfoView` sub-page
- No localStorage — email is the record

### How This Works view (ruleInfoView)

Accessed via "How this works" button in Rule Management heading. Back button returns to Rule Management.

- Sections: How these rules were developed, What Confidence means, Tier 1 through Tier 5 descriptions, How flags are suppressed
- Prose format with bold `<h3>` section headers, max-width 680px

---

## Facility Facts

- Campus: WBVC (West Bay Van Ness Campus)
- Rooms: OR1–OR14 (no OR13)
- OR14: Primary hybrid/cath lab
- OR7: Also hybrid capable, primarily standard cardiac
- OR start: 0730 standard; 0900 every other Friday (biweekly starting 5/29/2026)
- Robots: DV5 in OR2/OR3 (immovable), SP in OR5 (immovable)
- Ophthalmology: WBVC no longer primary ophtho campus — emergency cases only

---

## Phases Remaining

### Deferred
- Case duration audit / PTA comparison
- Block scheduling constraints
- Multi-campus support
- Add-on holds display

---

## Key Decisions

- Equipment matching: exact substring first, then prefix-token (source word starts with keyword token), then token-bag (all keyword tokens present anywhere), then fuzzy Levenshtein — "NIM" matches "NIMS tube", "Monitor NIM Facial Nerve", etc.
- Procedure matching keys off free text in Case Procedures, not bracketed Epic IDs
- Laterality parsed from Case Procedures free text
- Service = "Robotics" ignored — use equipment field for robot cases
- Add-on and urgent/emergent cases weighted near zero for rule discovery
- Peds rule is Tier 2 — OR4 preferred but not always possible
- Laterality rules not statistically significant at WBVC — only PCNL confirmed
- All alert/flag language should be suggestive not punitive — brief, explain the reason
- Tier 3 post-processing: group contiguous same-service-or-surgeon cases in same room (gap ≤ 30 min) into a block; suppress the flag for all cases in the block if no allowed room has a prime-time gap (07:30–15:30, or 09:00–15:30 on biweekly inservice Fridays) large enough to hold the entire block
- ops-2 (Pediatric Room) post-processing: same block-feasibility approach applied to Tier 2 ops-2 violations; "pediatric" defined as age < 18 OR equipment contains "Cart Pediatric" or "Warmer Overhead (French Fry)"; checks OR 4 first, then OR 3 and OR 5 as fallbacks — flag suppressed only if none of the three has a feasible prime-time gap; explanation: "OR 4 is the designated pediatric room. If OR 4 is unavailable, consider OR 3 or OR 5. Please move this case if any of these rooms are available."
- Show all alerts and flags regardless of tier (no suppression in output except Tier 3 and ops-2 feasibility checks)
- "Violation" replaced with "alert" (Tier 1-2) and "flag" (Tier 3-5) in all user-facing text
- Equipment accessories must NOT be used as robot triggers (Tower Robot, daVinci Surgeon Chair, Table Trumpf 7000dV)
- Explanation text in equipment audit: "[keyword] was listed in Special Needs but not added to Equipment"
- `describeMatch` for equipment rules: always lists all items in full ("Equipment (any of N): item1, item2, ...") with no truncation
- Snake easter egg: typing "worm" anywhere (not in an input) opens a Snake game modal; Escape or click-outside closes it; direction queue (max 2) buffers rapid consecutive turns so inputs are not lost; WASD keys supported alongside arrow keys (W=up, A=left, S=down, D=right); same direction validation and queue logic applies
- Gantt tile click: opens sidebar only (no clipboard copy; clicking the sidebar h3 copies)
- Gantt sidebar h3: click-to-copy case number via toast; uses `makeCopyable(h3, caseNumber)` helper
- Toast system: `showToast(message)` is the generic function; `showCopyToast(caseNumber)` wraps it with "Case #N copied"; custom messages used for keyword mark ("Copied: [term]") and explanation cell ("Copied")
- Equipment audit detail pane: amber `<mark>` keyword element is click-to-copy → `showToast("Copied: [term]")`
- Equipment audit explanation cell: click-to-copy → `showToast("Copied")`; `cursor: pointer` inline
- Equipment audit detail pane: "Report an issue" button (`.rule-flag-btn`) is in a flex `detailHeaderRow` div (grid-column:1/-1) alongside the "Special Needs" and "Equipment List" labels, right-aligned; opens mailto pre-filled with case number and blank ISSUE field. Below the label row: snValue and eqValue as standalone grid items (2-col), then surgPrefSection spanning both cols.
- C-arm false positive fix: `KEYWORD_OPTIONS` map adds `requiresPrefix: "c"` to "C-arm"; `matchSatisfiesPrefix` helper validates non-exact matches require the matched text or immediately preceding chars to start with "c"; `tokenBagMatch` is skipped for keywords with `requiresPrefix`
- Equipment audit Date cell: date text with "▶ Details" affordance below it (arrow rotates 90° when expanded via `.expanded` class on the row); Case # cell: bold case number, copyable via `makeCopyable` (clicking copies, stopPropagation prevents row toggle)
- Violations table: grouped by case number — one row per case, colored by highest severity (min tier); Priority column shows highest-tier badge; Rule column stacks `[T# badge] rule_label` per violation; Explanation column stacks explanation text; groups sorted by date → minTier → caseNumber; violations within each group sorted by tier ascending
- Violations table Case # column: bold; no click-to-copy. Uses event delegation: ONE `click` listener on `roomRulesViolationsTable` (`<tbody>`). Each `<tr>` has `data-sort-date` and `data-case-num` attributes. Delegated handler uses `e.target.closest("tr[data-sort-date]")`, looks up group in `_violGroupDataMap`, always calls `showGanttSidebar` with fallback case object. `_violGroupDataMap` rebuilt each audit run. Document `pointerdown` excludes `#roomRulesViolationsTable`. Table has `<thead>` with Case #, Date, Surgeon, Room, Procedure(s), Priority, Rule, Explanation columns; the `<h2>` section title above the table was removed.
- CPT audit results: rendered as 2 collapsible accordion sections (all collapsed by default) in `#cptAccordion` div; accordion built entirely by `renderResults()` via `makeAccordionSection()` helper; each header shows title + count badge + caret that rotates when open. Table 1: **Inpatient-Only CPT Codes on Outpatient Cases (Medicare)** (4 cols: Date, Location, Case #, Explanation) — codes in explanation shown bold (plain text, no links); Medicare filter: `indexes.payer == null` (column absent) → row is eligible (backward compat); column present + empty cell → NOT flagged; column present + value contains "medicare" (case-insensitive) → flagged; optional `payer` column accepted as ["payer", "primary payer", "financial class"]. Table 2: **CPT Code Discrepancies** — consolidated bidirectional table (replaced the old Tables 2 and 3 in v1.4.19; the old Table 3 render path, `errorMessages` return field, `unrecognizedCodes`, and `codeListTd` were removed). Audit logic in `auditRows()`: `missingCodes` = on order, valid, not on case panels; `notOnOrderCodes` = on case panels, valid, not on the order (same extraction/normalization reversed); `invalidCodes` = any code from either side not in `validCptCodes`, as `{ code, origin: "order" | "case" }` objects — validity check runs first so invalid codes never appear in the directional arrays; short-code errors (`extractCodes().errors`, order side) fold into `invalidCodes` with origin "order"; `KNOWN_PROBLEM_CPTS` exclusion applies to all three buckets; a row is pushed to `discrepancyRows` if any bucket is non-empty; each row carries `{ date, sortDate, location, caseNumber, orderCodes, caseCodes, missingCodes, notOnOrderCodes, invalidCodes }`. Result object is `{ totalRows, discrepancyRows, inpatientRows }` (no `missingRows`/`errorMessages`). Table 2 accordion badge is a breakdown string: "N cases: X missing, Y not on order, Z invalid" (case counts, not code counts). Table 2 cols: Date, Location, Case #, On Order Not on Case, On Case Not on Order, Invalid CPT Codes (column headers renamed v1.4.26; underlying field names `missingCodes`/`notOnOrderCodes`/`invalidCodes` and filter chip labels unchanged); Date cell reuses the equipment audit pattern (date text + `.equip-toggle-affordance` "▶ Details", arrow rotates via `.expanded` on the `.equip-row-main` row); Case # cell: bold copyable span via `makeCopyable`. Missing cell: amber marks (click-to-copy toast) + "CPT Lookup" link + "Click to report CPT not in Epic" mailto button per code. Not on Order cell: blue marks (`background:#dbeafe;color:#1e40af`) + CPT Lookup link, no report button. Invalid cell: red marks (click-to-copy, NOT AAPC-on-click) + muted origin tag "(on order)"/"(on case)" + CPT Lookup link per code, plus one label line below: "Invalid CPT - check for typo or contact ordering provider". Empty code cells render a muted "—" via `emptyCodeTd()`. Shared helpers: `AMBER_MARK_CSS`/`BLUE_MARK_CSS`/`RED_MARK_CSS`/`SMALL_ACTION_CSS` constants, `copyCodeMark(code, css, markVisited)`, `cptLookupLink(code)`. Clicking the row toggles a detail row (`buildCptDetailRow`, `.equip-detail-row`, td colSpan=6, `.equip-detail` grid) with side-by-side "CPT Codes on Order" / "CPT Codes on Case" lists (`buildCodeListValue`): missing codes render as amber marks in the order list, not-on-order codes as blue marks in the case list, invalid codes as red marks in their origin list, all other codes plain text, comma-separated; empty list renders "None"; all detail marks click-to-copy (no row-visited); header row includes right-aligned "Report an issue" `.rule-flag-btn` → mailto subject "CPT Audit Issue", body "CASE: [n]\n\nISSUE: ". Summary metric label for `missingCount` is "CPT discrepancy cases" (= `discrepancyRows.length`). Row-visited highlighting: clicking a case number adds `row-visited` inside `makeCopyable()`; marks/links/buttons in the three code cells add it in their own handlers (detail-pane marks excepted); `addRowVisitedDelegation` function is defined but no longer called from `renderResults`.
- Equipment audit results table: columns are Date, Location, Case #, Surgeon (optional), Special Needs, Explanation (6 cols); class `equipment-missing-table` on the static `<table>` in index.html; CSS widths ~8% Date, ~12% Location, ~9% Case #, ~11% Surgeon, ~28% Special Needs, ~32% Explanation. Detail pane colSpan=6. Surgeon column uses `parseSurgeonLastName()`; surgeonId uses `extractSurgeonId()`. Date uses `parseDateCell()`. KEYWORD_ALIASES maps keyword → alias strings checked first in `containsEquipmentTerm()` (e.g. PTeye→parathyroid). KEYWORD_DISPLAY_NAMES maps keyword → display name used in explanation string (e.g. Neoprobe→TruNode). Date cell holds the date text plus the "▶ Details" toggle affordance below it (`.equip-toggle-affordance` with inline `display:block;margin-top:4px`, overriding its normal flex display so the icon/label spans render inline within the block). Case # cell is a plain `<td>` containing only a bold, copyable `<span>` (via `makeCopyable`) — no wrapper div, no flex styling. SURGEON_EQUIPMENT_PREFS keyed by surgeon ID string with optional `ultrasound`/`microscope` fields; "Surgeon Preference" section in the detail pane is rendered ONLY when `row.keyword.toLowerCase()` is "ultrasound" or "microscope" AND `row.location` matches `/wbvc/i` (skipped entirely otherwise); when shown, the value text has `cursor: pointer` and is click-to-copy via `navigator.clipboard.writeText()` + `showToast("Copied: " + prefText)`. "No preference on file" text is keyword-specific: "No ultrasound preference on file" / "No microscope preference on file" — used both when the surgeon has no SURGEON_EQUIPMENT_PREFS entry and when the relevant field is absent from their entry. Equipment List in detail pane renders items exactly as they appear in the Epic export (no W-prefix stripping — `.replace(/^W\s+/, "")` was removed in v1.4.8). Epic export column headers confirmed: Date, Proc Start, Proc End, Case #, Lead Surgeon, Service, Case Procedures, Room, Status, Special Needs, Equipment, Patient Age, Base Patient Class, Proj Start Time, Proj End Time, Case Classification, CPT Codes - All Panels, Insurance Info, Payer.
- `.copy-case` CSS: `cursor: pointer` only (no `user-select: none`)
- All three tools accept the consolidated **CPMC Scheduling Automation** export; instructions updated to reference this name
- `sharedAuditData = { rows, filename }` caches parsed rows; `sharedAuditResults = { cpt, equipment, roomRules, cptError, equipmentError, roomRulesError }` caches computed results; Run on any tool calls `_runAllAudits(file)` which stores results in `sharedAuditResults` (no rendering inside `_runAllAudits`); run button handler then calls `_showCachedResult(toolKey)` for the clicked tool; `showFromShared()` in `showView` calls `_showCachedResult(toolKey)` for navigated-to tools; `_showCachedResult` renders from cache, unhides panel, sets status, enables buttons; Clear nulls both `sharedAuditData` and `sharedAuditResults`; each `wireAuditTool` call includes `toolKey: "cpt" | "equipment" | "roomRules"`
- Column `accepted` arrays expanded throughout to match consolidated report column names (e.g. "case/appt date", "lead surgeon (as scheduled)", "sh ip surgical equipment", "surgical service (as scheduled)", etc.)
- `findHeaderInfoForColumns`: columns with `optional: true` are excluded from the missing-column check; optional `room` and `department` columns added to CPT and equipment audits; location = department value if present, else room value
- Known Problem CPTs: `KNOWN_PROBLEM_CPTS` is a hardcoded array near the top of app.js — entries have `{ code, description, dateAdded, ticket }` fields. As of v1.4.28 the array contains 8 entries (all dateAdded: "2026-06-17", ticket: "Pending"): J7296 (Kyleena IUD), J7297 (Liletta IUD), J7298 (Mirena IUD), J7301 (Skyla IUD), Q0091 (Pap smear), Q9967 (contrast material), 45386 (colonoscopy with transendoscopic balloon dilation), 44394 (colonoscopy through stoma with snare). All codes excluded from `missingCodes`, `notOnOrderCodes`, `invalidCodes`, and `inpatientMatches` until removed from this array. Codes in this array, if any are added in the future, are silently excluded from all three discrepancy buckets (`missingCodes`, `notOnOrderCodes`, `invalidCodes`) and from `inpatientMatches` in `auditRows()`. A "View known problem CPTs" ghost button in the CPT audit instructions panel navigates to `knownProblemCptsView`, which renders a 4-column table (Code, Description, Date Added, Ticket) or "No known problem CPTs on file." (currently shown, since the array is empty). Table 2 Missing cells show each code as `<mark>` + "Click to report CPT not in Epic" button; clicking opens a mailto to Thomas.Boone@SutterHealth.org with subject "CPT Not in Epic" and body "CPT CODE: XXXXX".
- CPT code links: `makeCptLink(code, child)` helper wraps any element in `<a href="https://www.aapc.com/codes/cpt-codes/${code}" target="_blank" rel="noopener noreferrer">` with underline + pointer cursor. Function is defined but not called anywhere; the "CPT Lookup" links in Table 2's code cells use the separate `cptLookupLink(code)` helper instead.
- Table 2 column widths: class `cpt-discrepancy-table` on the dynamically-built Table 2 `<table>`; `table-layout: fixed` is set on the class (the base `table` rule is auto layout, so the percentage widths are not enforced without it); CSS `th:nth-child` rules in styles.css set widths to ~8% Date, ~10% Location, ~9% Case #, ~25% Missing, ~25% Not on Order, ~23% Invalid. Each code entry in the Missing/Not on Order/Invalid cells is a block-level `display:flex;flex-wrap:wrap` span (one code per line, buttons wrap within the column) — NOT `inline-flex` + `white-space:nowrap`, which blew out the column widths and overflowed the table (fixed in v1.4.20). The old `cpt-missing-table` and `cpt-invalid-table` CSS rules were removed in v1.4.19.
- CPT validation: `validCptCodes` is a large hardcoded `const Set` in app.js (manually added). In `auditRows()`, validity is checked first on both the order and case code lists: codes not in `validCptCodes` (and not in `knownProblemSet`) go to `invalidCodes` with their origin and are excluded from `missingCodes`/`notOnOrderCodes`. See the CPT audit results bullet above for the full bucket definitions.
- CMS IPO codes: `inpatientOnlyCodes` is a hardcoded `const Set` in app.js with all CY 2026 Addendum E codes (source: OPPS_Addendum_E_2026 REV.pdf, ~1050 codes including T-codes, C-codes, G-codes). No external file fetch — `AddendumE2004.txt` has been deleted from the repo. The `loadInpatientOnlyCodes` function and its call site were removed entirely.
- App renamed from "CPMC Scheduling Tools" to "CPMC Surgical and Perioperative Services Tools" (v1.4.21), then shortened to "CPMC Surgical and Periop Services Tools" (v1.4.23) so the home header fits on one line. Updated in `<title>`, `.brand` div `aria-label`, and `<h1 id="homeTitle">` in index.html. No other references to the old name remain.
- Room display normalization (v1.4.24, CPT + Equipment audits only — NOT the Room Rules/Gantt tool, which is WBVC-only and keeps its normalized `OR 5` display tied to the internal Gantt key): two helpers near `auditRows` in app.js. `deriveCampus(locationStr)` returns "WBVC"/"WBMB"/"WBDE" (matched via `/\b(WBVC|WBMB|WBDE)\b/i`) or "". `formatRoomDisplay(rawRoom, rawLocation)`: if rawRoom already starts with a campus code, return it unchanged; else if rawRoom non-blank, prepend the campus derived from Location (e.g. Room "GI 01" + Location "WBVC GI" -> "WBVC GI 01"); if rawRoom blank, return just the campus (or rawLocation if no campus). This is display-only; `normalizeRoomName` and all rule matching are untouched. In `auditRows`/`auditEquipmentRows`, `location` now holds the `formatRoomDisplay` value (shown in the "Location" column) and each row also carries a `campus` field. The surgeon-pref WBVC gate in the equipment detail pane now checks `row.campus === "WBVC"` (with the old `/wbvc/i.test(location)` retained as a fallback). Both `requiredColumns` (CPT) and `equipmentRequiredColumns` now include a dedicated optional `location` column (`key: "location"`, `accepted: ["location", "department location", "or location"]`) so that a report column literally named "Location" is captured independently of the `department` column. In `auditRows` and `auditEquipmentRows`, `rawLocation` is resolved as: `indexes.location` value (if present and non-empty) → `indexes.department` value → `rawRoom`. This was a v1.4.25 bugfix — without the dedicated `location` key, rooms lacking an embedded campus prefix (e.g. "GI 01", "IES 07") received no campus prepend because the `department` column definition did not accept a header named "Location".
- Data/logic split (v1.5.0): the pure data constants were moved out of `app.js` into a new `rules-data.js` (loaded before `app.js` via `<script src="rules-data.js?v=...">`). Moved, preserving each declaration exactly: `SURGEON_PREFS`, `ROOM_RULES` (declared after `SURGEON_PREFS` because it spreads `...SURGEON_PREFS.map(...)` for its Tier 4 rules), `SURGEON_EQUIPMENT_PREFS`, `KNOWN_PROBLEM_CPTS`, `equipmentKeywords`, `KEYWORD_OPTIONS`, `KEYWORD_ALIASES`, `KEYWORD_DISPLAY_NAMES`. **NOT** moved in this pass (deferred to a later split): `inpatientOnlyCodes` and `validCptCodes`, the two large generated `const Set`s — they remain in `app.js`. The split relies on classic-script global lexical binding sharing: both files are bare top-level code (4-space indent, no IIFE), so `app.js` sees `rules-data.js`'s top-level `const`s by name with no redeclaration. Verified in headless Chrome that all eight constants resolve from `app.js` scope and all three audit tools load and produce results. Adding a new surgeon/room/keyword/known-problem-CPT rule now means editing `rules-data.js`, not `app.js`.
- Campus config centralization (v1.5.1): `CAMPUS_CONFIG` object added to `rules-data.js` (declared before `SURGEON_PREFS`), keyed by campus (`CAMPUS_CONFIG.WBVC`), holding `roomPrefix` ("WBVC OR"), `campusCode` ("WBVC"), `rooms` (OR 1–14 array), `ganttStartMin`/`ganttEndMin` (390/1140, the Gantt x-axis bounds), `primeStartMin`/`primeEndMin` (450/930, standard 07:30–15:30 prime-time window), `inservicePrimeStartMin` (540, the 09:00 start on biweekly inservice Fridays), `biweeklyFriAnchorMs` (the 2026-05-29 anchor date for the 14-day inservice-Friday cycle), and `campusCodes` (["WBVC","WBMB","WBDE"], the full multi-campus list used for display normalization and audit filters). In `app.js`, the standalone `CAMPUS_CODES`, `GANTT_START_MIN`, `GANTT_END_MIN`, `GANTT_ROOMS`, `T3_PRIME_END`, and `BIWEEKLY_FRI_ANCHOR_MS` declarations were removed entirely and every reference updated to read from `CAMPUS_CONFIG.WBVC.*` directly (Gantt rendering, Tier 3 + ops-2 block-feasibility suppression logic, CPT/equipment campus filters, `deriveCampus`/`formatRoomDisplay`, the equipment-audit surgeon-pref WBVC gate, and the `auditRoomRules` room-prefix filter, which now builds its regex from `CAMPUS_CONFIG.WBVC.roomPrefix` instead of a hardcoded `/wbvc\s+or\b/i`). Purely cosmetic Gantt layout constants (`GANTT_PX_MIN`, `GANTT_ROW_H`, `GANTT_AXIS_H`, `GANTT_LABEL_W`, `GANTT_MIN_W`, `GANTT_TOTAL_W`) are NOT part of `CAMPUS_CONFIG` — they stayed as standalone `app.js` consts since they're display tuning, not campus facts. Multi-campus support (a Deferred item) would mean adding more keys to `CAMPUS_CONFIG` (e.g. `CAMPUS_CONFIG.WBMB`) rather than duplicating logic.
- Audit filters (v1.4.24): shared `buildFilterGroup(label, options, getCurrent, onSelect)` helper renders a labeled row of `.filter-chip` buttons (active chip = `.active`); container divs `#cptFilters` and `#equipmentFilters` (class `.audit-filters`) sit above the CPT accordion and above the equipment table. CSS in styles.css (`.audit-filters`, `.filter-group`, `.filter-label`, `.filter-chip`, `.filter-chip.active` using `--brand`). **CPT audit** has two filters: a Campus filter (All + each campus present in the data; only shown when >1 campus present) that filters BOTH Table 1 and Table 2 by `row.campus`, and a Flag-type filter (All / Missing / Not on Order / Invalid) that filters Table 2 by which bucket is non-empty — when a case is surfaced by the flag filter, its FULL flag set still renders (all three code columns). `renderResults` was split into `renderResults` (stores `lastCptResult`, resets filters to "all", renders controls + tables), `renderCptFilterControls`, `renderCptTables`, and `getCptFilteredRows`; state vars `cptCampusFilter`/`cptFlagFilter`. Top summary metrics always reflect the FULL (unfiltered) audit; accordion badge counts reflect the filtered rows shown. **Equipment audit** has a single Campus filter (same dynamic options). `renderEquipmentResults` was split into `renderEquipmentResults` (stores `lastEquipResult`, resets filter), `renderEquipmentFilterControls`, and `renderEquipmentTable`; state var `equipCampusFilter`. Filters reset to "all" on every fresh render (new audit or cached-result navigation).
- Bugfix: expand/collapse arrow not rotating (v1.5.2): in `renderEquipmentTable()` and the CPT Table 2 row builder in `renderCptTables()`, the `.equip-toggle-affordance` div had `toggleAffordance.style.cssText = "display:block;margin-top:4px;"` set inline in `app.js`. That inline `display:block` overrode the CSS class's `display:flex`, and a `transform` on a block-level child of a non-flex/grid container doesn't visually rotate the way a flex item does in this layout — so `.equip-row-main.expanded .equip-toggle-icon { transform: rotate(90deg); }` (styles.css) had no visible effect. Fix: both inline `style.cssText` assignments now read just `"margin-top:4px;"`, leaving `display` to the `.equip-toggle-affordance` class (already `display:flex; align-items:center;` in styles.css — no CSS change was needed, only the JS). Verified via headless Chrome that the icon's computed `transform` becomes `matrix(0, 1, -1, 0, 0, 0)` (90°) when the `.expanded` class is present on `.equip-row-main`.
- OR Staffing Budget Calculator (v1.5.3): a **fourth home-screen tool** (tile `#openStaffingTool`, view `#staffingView`, back button `#staffingBackHome`). Pulls from the same consolidated **CPMC Scheduling Automation** Epic export as the other three. **Math:** OR minutes for a day = Σ(Proj End Time − Proj Start Time) across all cases that day (uses **Proj Start/Proj End** = setup-start→cleanup-end, NOT Proc Start/Proc End; reuses the existing `parseTimeToMinutes` helper). Staff hours allowed = OR minutes × `STAFFING_CONFIG.whpuos` (0.103). FTEs = staff hours ÷ FTE weekly hours (**corrected in v1.5.4** — see below; the v1.5.3 `fteHoursPerDay: 5.714` divisor was wrong). **`STAFFING_CONFIG`** lives in `rules-data.js` near `CAMPUS_CONFIG`. **Scope:** this tool sums **ALL** cases in the export regardless of campus or room (department-wide budget) — it does NOT apply the `auditRoomRules` "WBVC OR" room-prefix filter; its only required columns are Date, Proj Start Time, Proj End Time (defined in `staffingColumns`, validated via the shared `findHeaderInfoForColumns`). Cases missing either projected time (or with a non-positive span) are silently excluded from the sum (no note). **Wiring:** shares the data store like the others — `auditStaffing(rows)` runs inside `_runAllAudits` (so the single Run click on any tool computes staffing too), result cached on `sharedAuditResults.staffing`; `_showCachedResult("staffing")` renders it; `wireAuditTool({ toolKey: "staffing", ... })` provides the file input/run/clear; `showView("staffing")` toggles `#staffingView` and calls `_staffingTool.showFromShared()`; Clear resets it alongside the other three. **Result object:** `{ totalRows, days: [{ display, sortDate, minutes, staffHours, ftes, caseCount }], totalMinutes, totalStaffHours }`. **Render (`renderStaffingResults`):** summary metrics (Days shown, Total OR minutes [whole #], Total staff hours [1 dp]) + a per-day table (Date, OR Minutes [whole #], Staff Hours Allowed [1 dp], FTEs [1 dp]) sorted by date; empty state = "No cases with projected start and end times were found." **Future hook (not built):** a per-case double-staffing multiplier (two RNs + two scrubs counts a case as 2× its OR minutes) — `auditStaffing` has a clearly-commented `caseMinutes` line where the multiplier would be applied before adding to the day total; the comment marks the exact spot. Verified end-to-end in headless Chrome that a single Run executed all four audits with no errors (NOTE: the v1.5.3 FTE figures 3.2/4.9 used the wrong divisor and were corrected in v1.5.4).
- Staffing FTE math correction + scheduled-staffing comparison (v1.5.4): **`STAFFING_CONFIG`** is now `{ whpuos: 0.103, fteWeeklyHours: 40, shiftFte: { eight: 0.2, ten: 0.25, twelve: 0.3 } }` (the old `fteHoursPerDay: 5.714` was removed). **Budgeted FTEs for a day = staff hours ÷ `fteWeeklyHours` (40)**, i.e. 1 FTE = 40 hrs/week (so the example days are now 0.5 and 0.7 FTEs, not 3.2/4.9). `auditStaffing` divides by `STAFFING_CONFIG.fteWeeklyHours`; the per-day table still shows Date / OR Minutes / Staff Hours Allowed / FTEs (FTEs now ~0.x for a normal day). **New scheduled-staffing comparison panel** (`#staffingSchedulePanel`, a nested `.panel` below the per-day table inside `#staffingResultsPanel`): a day dropdown (`#staffingDaySelect`, populated from the per-day rows) plus three number inputs — 8-hour staff (`#staffingEight`), 10-hour staff (`#staffingTen`), 12-hour staff (`#staffingTwelve`), all default 0. **Scheduled FTEs = eight×0.2 + ten×0.25 + twelve×0.3** (shift FTE = shift hours ÷ 40, from `STAFFING_CONFIG.shiftFte`). Three live metrics: Budgeted FTEs (selected day), Scheduled FTEs, and **Budget variance = Budgeted − Scheduled** (signed; **+ = under budget shown green**, **− = over budget shown red**; |variance|<0.05 shows a neutral green "0.0", never "-0.0"). It is NOT per-day from Epic — one set of three inputs compares whichever day is selected. **Day selection is two-way:** changing the dropdown OR clicking a row in the per-day table selects that day (`selectStaffingDay(idx)` syncs both the dropdown `value` and the `.selected` row highlight, then calls `updateStaffingComparison`); rows carry `data-day-index`. Render state held in module-level `_staffingResult` + `_staffingSelectedIndex`; `renderStaffingResults` resets selection to day 0, populates the dropdown, and hides the schedule panel when there are no days. Input `input` listeners + the dropdown `change` listener are registered once at init (right after the `_staffingTool` wireAuditTool call). CSS in styles.css: `.staffing-table tbody tr` (cursor pointer) + `.selected` (soft bg + brand left bar), `.staffing-schedule-panel`, `.staffing-schedule-grid`/`.staffing-field` (label+input/select styling), and `.staffing-compare-grid .metric-value.variance-under`/`.variance-over` (green #1a7f4b / red #b42318). Language is suggestive ("planning aid, not a directive"; labeled "Budget variance", not "Overage"). Verified in headless Chrome: corrected per-day FTEs (0.5, 0.7); default day 0 selected with dropdown synced; 1×8hr+1×10hr → scheduled 0.5, variance 0.0 (green); 5×12hr → scheduled 1.5, variance −1.0 (red); dropdown→day1 updates budgeted to 0.7 and moves the row highlight; clicking row 0 re-selects it; CPT/Equipment/Room Rules unaffected. **NOTE (superseded by v1.5.5):** the `#staffingSchedulePanel`, day dropdown, `selectStaffingDay`/`updateStaffingComparison`, and summary tiles described here were all removed in v1.5.5 — the scheduled-staffing inputs now live inline in each table row (see next bullet).
- Staffing scope + inline per-row inputs (v1.5.5): the OR Staffing Budget Calculator was reworked (CPT/Equipment/Room Rules untouched). **(1) Future-days filter:** `auditStaffing` now only counts cases whose `parseDateCell(...).sort` is **strictly greater than today's local midnight** (`const todayMidnight = new Date(); todayMidnight.setHours(0,0,0,0); … dateValue.sort > todayMidnight.getTime()`), so a partial current day / past dates no longer leak in (this fixed an anomalous low-minute first row). This date filter is **staffing-only** — CPT/Equipment/Room Rules do not filter by date. **(2) WBVC OR scope:** `staffingColumns` gained an **optional** `room` column (`accepted: ["room","room (as scheduled)","or room"]`); `auditStaffing` builds the same `roomPrefixRegex` as `auditRoomRules` from `CAMPUS_CONFIG.WBVC.roomPrefix` and includes only rows whose Room matches "WBVC OR" — applied only when a Room column is present (`hasRoom = indexes.room !== -1`; if absent it falls back to all rooms). A "Currently configured for CPMC Van Ness (WBVC OR) only" note was added under the page heading (same style as the OR Schedule Audit note). **(3) Summary tiles removed:** the three `.summary-grid` metric tiles (Days shown / Total OR minutes / Total staff hours) and their IDs (`staffingDayCount`/`staffingTotalMinutes`/`staffingTotalHours`) are gone; `auditStaffing` no longer returns `totalMinutes`/`totalStaffHours` (just `{ totalRows, days }`). **(4) Comparison panel removed:** `#staffingSchedulePanel`, the day dropdown, `selectStaffingDay`, `updateStaffingComparison`, module state `_staffingResult`/`_staffingSelectedIndex`, and the init-time dropdown/input listeners were all deleted. **(5) Redesigned per-day table** (`.staffing-table`, 8 columns): **Date | OR Minutes** (whole) **| OR Hours** (min÷60, 1 dp) **| Staff Hours Budgeted** (min×0.103, 1 dp) **| FTEs Budgeted** (staffHours÷40, 1 dp) **| FTEs Scheduled | FTE Variance | Hours Variance**. The **FTEs Scheduled** cell is a self-contained widget (`buildStaffingRow(d)`): three small number inputs labeled 8/10/12 (`.staffing-sched-inputs`, default 0) above a live total line (`.staffing-sched-total`) reading `"X.X FTEs / XX.X hrs"` — **Scheduled FTEs** = 8hr×0.2 + 10hr×0.25 + 12hr×0.3 (`STAFFING_CONFIG.shiftFte`), **Scheduled Hours** = 8hr×8 + 10hr×10 + 12hr×12 (so "Hours Scheduled" is shown inside this cell, NOT a separate column). **FTE Variance** = FTEs Budgeted − Scheduled FTEs; **Hours Variance** = Staff Hours Budgeted − Scheduled Hours; both signed to 1 dp via `setStaffingVariance(td, value)` (positive/under = green `.staffing-var-under` #1a7f4b, negative/over = red `.staffing-var-over` #b42318, |v|<0.05 = neutral green "0.0", never "-0.0"). Each row recomputes only its own total + two variance cells on every `input` event (independent closures); inputs `stopPropagation` on click so they never bubble to a row-level handler. Empty state colSpan is 8 ("No upcoming WBVC OR cases…"). Item 6 of the task (verify both `toggleAffordance.style.cssText` read `"margin-top:4px;"` with no `display:block`) was confirmed already-correct from v1.5.2 — no change. Verified in headless Chrome (today 2026-06-19, sample with future 6/22 + 6/23 WBVC rows plus a WBMB row, a today row, a past row, and a no-proj-time row all correctly excluded): two day rows render (6/22 = 180 min/3.0 hrs/18.5 staff hrs/0.5 FTE; 6/23 = 270 min/4.5 hrs/27.8/0.7); inputs live-update (1×8+1×10 → "0.5 FTEs / 18.0 hrs", FTE var 0.0 green, Hours var +0.5 green; 5×12 → "1.5 FTEs / 60.0 hrs", FTE var −0.8 red, Hours var −32.2 red); rows independent; summary tiles + schedule panel absent; all four tools run without error.
