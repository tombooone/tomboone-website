# CLAUDE_CONTEXT.md — PHI-Safe Work Tools
## Last updated: 2026-06-10 (v1.4.10)

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

A PHI-safe OR scheduling audit web tool at **tomboone.io** (primary, live) and **tomboonern.com** (configured via Cloudflare Pages, but blocked on the work network).

All four tools on the home screen are **live and complete**:
1. **CPT Audit Tool** ✅ complete, do not touch
2. **Equipment Request Audit** ✅ complete (expand/collapse detail rows, amber keyword highlight, 19 keywords including NIM, Sonopet, CUSA, Aquamantys, Stealth, Ultrasound, Spy ICG, PTeye), do not touch
3. **OR Schedule and Room Assignment Audit** ✅ complete (Gantt, calendar, sidebar, alert/flag tier system; includes **Rule Management** sub-view with read-only rule cards, mailto flag-for-review, and mailto request-new-rule flows)
4. **Equipment Terms view** ✅ complete (accessible via "View terms being checked" link in Equipment Request Audit; shows keyword pills; "Suggest equipment to check" button opens mailto pre-filled with suggestion template)


---

## Current Version & Deployment

- Current version: **v1.4.10**
- Repo: github.com/tombooone/tomboone-website
- File structure: `index.html` (HTML only), `styles.css` (all CSS), `app.js` (all JS — main app first, worm IIFE second)
- **Cache busting:** `styles.css` and `app.js` are loaded with `?v=X.X.XX` query strings in index.html. These version numbers **must be bumped in sync with the footer version badge** on every deploy.
- Deploy: `git add index.html styles.css app.js && git commit -m "message" && git push`
- Cloudflare Web Analytics: snippet added to `<head>` in index.html, wrapped in `location.hostname === 'tomboonern.com'` guard — fires only on tomboonern.com, not tomboone.io or localhost
- Cloudflare Pages auto-deploys on push to main

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

**Expand/collapse rows:** Clicking a result row reveals Special Needs (with matched term highlighted amber) and Equipment List (with "([keyword] not found)" label in red).

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
- Equipment audit case cell: bold case number at top (copyable via `makeCopyable`); "▶ Details" affordance below (flex row, arrow rotates 90° when expanded via `.expanded` class on the row); clicking case number copies (stopPropagation prevents row toggle)
- Violations table: grouped by case number — one row per case, colored by highest severity (min tier); Priority column shows highest-tier badge; Rule column stacks `[T# badge] rule_label` per violation; Explanation column stacks explanation text; groups sorted by date → minTier → caseNumber; violations within each group sorted by tier ascending
- Violations table Case # column: bold; no click-to-copy. Uses event delegation: ONE `click` listener on `roomRulesViolationsTable` (`<tbody>`). Each `<tr>` has `data-sort-date` and `data-case-num` attributes. Delegated handler uses `e.target.closest("tr[data-sort-date]")`, looks up group in `_violGroupDataMap`, always calls `showGanttSidebar` with fallback case object. `_violGroupDataMap` rebuilt each audit run. Document `pointerdown` excludes `#roomRulesViolationsTable`. Table has `<thead>` with Case #, Date, Surgeon, Room, Procedure(s), Priority, Rule, Explanation columns; the `<h2>` section title above the table was removed.
- CPT audit results: rendered as 3 collapsible accordion sections (all collapsed by default) in `#cptAccordion` div; accordion built entirely by `renderResults()` via `makeAccordionSection()` helper; each header shows title + count badge + caret that rotates when open. Table 1: **Inpatient-Only CPT Codes on Outpatient Cases (Medicare)** (4 cols: Date, Location, Case #, Explanation) — codes in explanation shown bold (plain text, no links); Medicare filter: `indexes.payer == null` (column absent) → row is eligible (backward compat); column present + empty cell → NOT flagged; column present + value contains "medicare" (case-insensitive) → flagged; optional `payer` column accepted as ["payer", "primary payer", "financial class"]. Table 2: CPT Codes Missing from Procedure Panels — valid codes only (rows where `missingCodes.length > 0`); 6 cols: Date, Location, Case #, CPT Codes on Order (plain bold text), CPT Codes on Case (plain bold text), Missing Codes; Missing Codes cell: amber mark (click-to-copy via `showToast("Copied: [code]")`, adds `row-visited`) + "CPT Lookup" `<a>` (appears first, before report button; opens AAPC link in new tab, adds `row-visited`) + "Click to report CPT not in Epic" `<button>` (uses `window.location.href` mailto, adds `row-visited`); wrap `<span>` also has a click listener adding `row-visited`. Table 3: **Invalid CPT Codes** — both unrecognized codes (from `unrecognizedCodes`) and short-code errors (from `errorMessages`) merged into a single array, sorted by date ascending then case number as tiebreaker, rendered in one unified pass; 4 cols (Date, Location, Case #, Issue) with red mark (`cursor:pointer`, click opens `https://www.aapc.com/codes/cpt-codes/${encodeURIComponent(code)}` in new tab via `window.open`) + "Invalid CPT — check for typo or contact ordering provider" label. `errorMessages` stores structured objects `{ code, date, sortDate, location, caseNumber }`. Row-visited highlighting: clicking a case number adds `row-visited` directly inside `makeCopyable()`'s click handler (covers all three tables at once); clicking a mark or button/link in Table 2's Missing Codes cell adds it directly in those handlers; `addRowVisitedDelegation` function is defined but no longer called from `renderResults`.
- Equipment audit results table: columns are Date, Location, Case #, Surgeon (optional), Special Needs, Explanation (6 cols); class `equipment-missing-table` on the static `<table>` in index.html; CSS widths ~7% Date, ~9% Location, ~8% Case #, ~11% Surgeon, ~30% Special Needs, ~35% Explanation. Detail pane colSpan=6. Surgeon column uses `parseSurgeonLastName()`; surgeonId uses `extractSurgeonId()`. Date uses `parseDateCell()`. KEYWORD_ALIASES maps keyword → alias strings checked first in `containsEquipmentTerm()` (e.g. PTeye→parathyroid). KEYWORD_DISPLAY_NAMES maps keyword → display name used in explanation string (e.g. Neoprobe→TruNode). Case # cell is `display:flex;flex-direction:column;justify-content:space-between` so the bold case number sits at top and the "▶ Details" toggle affordance is pinned to the bottom-left of the cell. SURGEON_EQUIPMENT_PREFS keyed by surgeon ID string with optional `ultrasound`/`microscope` fields; "Surgeon Preference" section in the detail pane is rendered ONLY when `row.keyword.toLowerCase()` is "ultrasound" or "microscope" (skipped entirely for all other keywords); when shown, the value text has `cursor: pointer` and is click-to-copy via `navigator.clipboard.writeText()` + `showToast("Copied: " + prefText)`. Table 3 (Invalid CPT) uses class `cpt-invalid-table` with ~8% Date, ~12% Location, ~10% Case #, ~70% Issue column widths. Equipment List in detail pane renders items exactly as they appear in the Epic export (no W-prefix stripping — `.replace(/^W\s+/, "")` was removed in v1.4.8). Epic export column headers confirmed: Date, Proc Start, Proc End, Case #, Lead Surgeon, Service, Case Procedures, Room, Status, Special Needs, Equipment, Patient Age, Base Patient Class, Proj Start Time, Proj End Time, Case Classification, CPT Codes - All Panels, Insurance Info, Payer.
- `.copy-case` CSS: `cursor: pointer` only (no `user-select: none`)
- All three tools accept the consolidated **CPMC Scheduling Automation** export; instructions updated to reference this name
- `sharedAuditData = { rows, filename }` caches parsed rows; `sharedAuditResults = { cpt, equipment, roomRules, cptError, equipmentError, roomRulesError }` caches computed results; Run on any tool calls `_runAllAudits(file)` which stores results in `sharedAuditResults` (no rendering inside `_runAllAudits`); run button handler then calls `_showCachedResult(toolKey)` for the clicked tool; `showFromShared()` in `showView` calls `_showCachedResult(toolKey)` for navigated-to tools; `_showCachedResult` renders from cache, unhides panel, sets status, enables buttons; Clear nulls both `sharedAuditData` and `sharedAuditResults`; each `wireAuditTool` call includes `toolKey: "cpt" | "equipment" | "roomRules"`
- Column `accepted` arrays expanded throughout to match consolidated report column names (e.g. "case/appt date", "lead surgeon (as scheduled)", "sh ip surgical equipment", "surgical service (as scheduled)", etc.)
- `findHeaderInfoForColumns`: columns with `optional: true` are excluded from the missing-column check; optional `room` and `department` columns added to CPT and equipment audits; location = department value if present, else room value
- Known Problem CPTs: `KNOWN_PROBLEM_CPTS` is a hardcoded array (currently contains J7296, J7298, J7297, J7301 — IUD/IUS codes; Q0091 — Pap smear; Q9967 — contrast material; 45386, 44394 — colonoscopy codes; all added 2026-06-08 or 2026-06-09) near the top of app.js — entries have `{ code, description, dateAdded, ticket }` fields. Tickets: J7296→RITM1383957, J7298→RITM1383958, Q0091→RITM1383960, Q9967→RITM1383962, J7297→RITM1383963, J7301→RITM1383965, 45386→RITM1383952, 44394→RITM1383989. Codes in this array are silently excluded from both `missingCodes` (Table 1) and `inpatientMatches` (Table 2) in `auditRows()`. A "View known problem CPTs" ghost button in the CPT audit instructions panel navigates to `knownProblemCptsView`, which renders a 4-column table (Code, Description, Date Added, Ticket) or "No known problem CPTs on file." Table 1 Missing Codes cells now show each code as `<mark>` + "Not in Epic" button; clicking opens a mailto to Thomas.Boone@SutterHealth.org with subject "CPT Not in Epic" and body "CPT CODE: XXXXX".
- CPT code links: `makeCptLink(code, child)` helper wraps any element in `<a href="https://www.aapc.com/codes/cpt-codes/${code}" target="_blank" rel="noopener noreferrer">` with underline + pointer cursor. Function is defined but not called anywhere; the "CPT Lookup" button in `missingCodesTd` is built inline without using this helper.
- Table 2 column widths: class `cpt-missing-table` on the dynamically-built Table 2 `<table>`; CSS `th:nth-child` rules in styles.css set widths to ~8% Date, ~10% Location, ~8% Case #, ~18% CPT Codes on Order, ~18% CPT Codes on Case, ~38% Missing Codes.
- CPT validation: `validCptCodes` is a large hardcoded `const Set` in app.js (manually added). In `auditRows()`, after filtering by `knownProblemSet`, `allMissingCodes` is split into `missingCodes` (in `validCptCodes`) and `unrecognizedCodes` (not in `validCptCodes`). A row is pushed to `missingRows` if either is non-empty. `missingCodes` → Table 2 (accordion); `unrecognizedCodes` → Table 3 (accordion).
- CMS IPO codes: `inpatientOnlyCodes` is a hardcoded `const Set` in app.js with all CY 2026 Addendum E codes (source: OPPS_Addendum_E_2026 REV.pdf, ~1050 codes including T-codes, C-codes, G-codes). No external file fetch — `AddendumE2004.txt` has been deleted from the repo. The `loadInpatientOnlyCodes` function and its call site were removed entirely.
