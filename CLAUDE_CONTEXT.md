# CLAUDE_CONTEXT.md — PHI-Safe Work Tools
## Last updated: 2026-05-28

---

## CRITICAL RULES — READ FIRST

- This is a **single HTML file** (`index.html`) deployed on **GitHub Pages**
- **NEVER touch the existing CPT audit or equipment audit code** — those tools are live and working
- All processing is **local browser only** — no server, no uploads, no external data storage
- PHI-safe by design — the only unique identifier in schedule data is Case #

---

## Project Overview

A PHI-safe OR scheduling audit web tool at **tombooone.github.io/tomboone-website**.

Three tools on the home screen:
1. **CPT Audit Tool** — compares Epic report CPTs against panel CPTs and CMS inpatient-only codes ✅ complete, do not touch
2. **Equipment Request Audit** — finds cases where Special Needs terms are missing from Equipment ✅ complete, do not touch
3. **Room Rules Audit** — checks upcoming OR schedule against a validated rule set 🔧 in progress

---

## Deployment

- **Repo:** github.com/tombooone/tomboone-website
- **Deploy:** `git add index.html` → `git commit -m "message"` → `git push`
- **Live site updates automatically** after push
- **Version badge** in topbar must be bumped with every change (currently v1.2.7)

---

## Data Schema

Both historical and prospective Epic reports share the same 24 columns:

| Column | Use | Notes |
|--------|-----|-------|
| Date | Case date | Excel serial or date string |
| Proc Start | Scheduled wheels-in | Decimal time |
| Proc End | Scheduled wheels-out | Decimal time |
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
| Special Needs | Ignore for room rules | Handled by existing equipment audit tool |
| Equipment | Newline-separated list, "W " prefix | Strip prefix for matching; exact substring; controlled vocabulary |
| OR Ready to Schedule | Ignore | |
| Patient Age | e.g. "62 yrs" | Parse leading integer; under 18 = peds rule |
| Base Patient Class | Ignore for rules | IP/OP/ED |
| Proj Start Time | Setup start = Gantt left edge | Actual in historical, scheduled in prospective |
| Proj End Time | Cleanup end = Gantt right edge | Actual in historical, scheduled in prospective |
| Case Classification | Elective = full weight | All others = low/zero weight for rule discovery |
| Add-on | Two values, treat same | Low weight for rule discovery |
| Add-on Date | Reference only | |

---

## Room Rules Architecture

### Tier System (numeric, 1 = highest priority)

| Tier | Name | Color | Description |
|------|------|-------|-------------|
| 1 | Physical Absolute | Red | Immovable equipment — cannot be overridden |
| 2 | Strong Operational | Orange | Designated room assignments, override requires coordination |
| 3 | Service Preference | Amber | Service line clustering, strong but flexible |
| 4 | Surgeon Preference | Blue | Behavioral patterns, no hard clinical reason |
| 5 | Suggestion | Grey | Low-confidence patterns, convenience preferences |

**Conflict resolution:** Lower tier number wins. If Tier 1 fires, it overrides all others.
**Special case:** Ophthalmology equipment (Tier 2) takes priority over peds age rule (Tier 2) — ophtho wins.
**SP robot rule:** If SP robot fires AND room is compliant (OR5), do not evaluate DV5 rule for that case.

### Rule Match Types

- `equipmentContainsAny` — array of strings, fires if ANY matches equipment field (case-insensitive substring, after stripping "W " prefix)
- `service` — exact match against Service column
- `surgeonId` — matches bracketed ID in Lead Surgeon column
- `procedureTextContains` + `laterality` — text match in Case Procedures + parsed laterality (left/right)
- `patientAgeUnder` — numeric comparison against parsed Patient Age
- `anyOf` — OR condition combining multiple match types

### Robot Case Detection

- DV5 cases: equipment contains "Robot DaVinci DV5" OR "Davinci Robot Xi"
- SP cases: equipment contains "DaVinci Robot SP"
- Do NOT use Service = "Robotics" as a trigger — too inconsistent
- Accessories like "Tower Robot", "daVinci Surgeon Chair", "Table Trumpf 7000dV" appear on non-robot cases — do NOT use as triggers

---

## Active Rule Set (v1.2.7)

### Tier 1 — Physical Absolute

| ID | Label | Trigger | Rooms |
|----|-------|---------|-------|
| HARD-1 | DaVinci DV5 Robot | equipmentContainsAny: ["Robot DaVinci DV5", "Davinci Robot Xi"] | OR2, OR3 |
| HARD-2 | DaVinci SP Robot | equipmentContainsAny: ["DaVinci Robot SP"] | OR5 |
| HARD-3 | Neuro/Spine Room | equipmentContainsAny: ["Robot Neuro Excelsius GPS Globus", "Table Intraop CT Spine AIRO", "Table Intraop CT Cranial AIRO", "Scanner Airo Mobile Intraoperative CT", "System Navigation Brainlab", "Unit Doppler Micro Neuro", "Table Jackson", "Frame Wilson", "Mayfield Basic Unit", "Table Double Decker", "Trios Jackson Spinal", "Cart Electrophysiology Neuro"] | OR11, OR12 |
| HARD-4 | Cardiac Surgery Room | equipmentContainsAny: ["Machine Heart Lung Perfusion", "Mount Table Large Estech", "Stool Hydraulic Ima", "Unit Hemopro 5500", "Cable Pacing Tester"] | OR7 |
| HARD-5 | Transplant Room | equipmentContainsAny: ["Table Back w/o shelf (Transplant)", "Table Small w/o shelf (Transplant)", "Cooler Donor", "Cart Renal Transplant", "ORGANOX"] | OR6, OR9 |
| HARD-6 | Hybrid/Cath Lab | equipmentContainsAny: ["CV ACCESSION EQ"] | OR14 |

### Tier 2 — Strong Operational

| ID | Label | Trigger | Rooms |
|----|-------|---------|-------|
| OPS-1 | Ophthalmology Equipment | equipmentContainsAny: ["Unit Phaco Centurion", "Microscope Zeiss Eye", "Microscope Leica Eye", "Suction Irrigation System ROSI", "Cart Eye", "Gurney Eye", "Unit MIRA Diathermy", "Unit MIRA Transilluminator", "Wristrest Chan", "Tower Video Eye", "Ophthalmoscope Indirect Omega", "Unit Vitrectomy Constellation", "Machine Optiwave Refractive Analysis (ORA)", "Cart Vitrectomy"] | OR5, OR10 |
| OPS-2 | Pediatric Room | equipmentContainsAny: ["Cart Pediatric", "Warmer Overhead (French Fry)"] OR patientAgeUnder: 18 | OR4 |

Peds explanation: "OR4 is the designated pediatric room. Please move this case to OR4 if available."

### Tier 3 — Service Preference

| ID | Service | Rooms |
|----|---------|-------|
| SVC-1 | Cardiac | OR7, OR8, OR14 |
| SVC-2 | Neurosurgery | OR11, OR12 |
| SVC-3 | Ophthalmology | OR5, OR10 |
| SVC-4 | Spine | OR11, OR12 |
| SVC-5 | Orthopedics | OR11, OR12 |
| SVC-6 | Cardiology | OR14 |
| SVC-7 | Pain Management | OR11, OR12, OR4 |

### Tier 4 — Surgeon Preference

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

### Tier 5 — Laterality Suggestion

| ID | Label | Trigger | Rooms |
|----|-------|---------|-------|
| LAT-001 | PCNL Right | procedureTextContains: "PCNL" + laterality: "right" | OR2, OR8, OR12 |
| LAT-002 | PCNL Left | procedureTextContains: "PCNL" + laterality: "left" | OR4, OR5, OR11 |

---

## Facility Facts

- **Campus:** WBVC (West Bay Van Ness Campus)
- **Rooms:** OR1–OR14 (no OR13)
- **OR14:** Primary hybrid/cath lab room
- **OR7:** Also hybrid capable but primarily used for standard cardiac cases
- **OR start time:** 0730 standard; 0900 every other Friday (biweekly staff inservice)
- **Robots:** DV5 in OR2/OR3 (immovable), SP in OR5 (immovable)
- **Ophthalmology:** WBVC is no longer primary ophtho campus — emergency cases only now

---

## Phases Remaining

### Phase 3 — Gantt Visualization
- Room rows on Y axis, time on X axis
- Beige case blocks from Proj Start Time to Proj End Time
- Violations highlighted in place by tier color
- Click case block for violation detail sidebar
- OR start time: 0730 (0900 every other Friday)

### Phase 4 — Rule Management UI
- View all active rules organized by tier
- Add, edit, delete rules without touching code
- Rules stored as JSON in the page
- Each rule has: ID, tier, label, description, match conditions, allowed/preferred rooms

### Phase 5 (future) — Case Duration Audit
- Compare scheduled duration against PTA (Epic procedure time averaging)
- Surgeon classification: self-scheduling vs PTA-required
- Data already available in historical export

### Deferred
- Block scheduling constraints (architecturally complex)
- Multi-campus support (WBVC only for now)
- Add-on holds display (waiting on analyst help)
- Additional laterality rules (waiting on service lead input)

---

## Key Decisions Made

- No fuzzy matching for equipment — controlled vocabulary, exact substring only
- Procedure matching keys off bracketed Epic ID e.g. [87810129], not procedure name
- Laterality parsed from Case Procedures free text, not a separate column
- Service = "Robotics" ignored — use equipment field to identify robot cases
- Add-on and urgent/emergent cases weighted near zero for rule discovery
- Peds rule is Tier 2 soft — OR4 preferred but not always possible (single room)
- Laterality rules not statistically significant at WBVC — only PCNL confirmed by service leads
- All violation language should be suggestive not punitive — explain the reason briefly
- Show all violations regardless of tier (no suppression)
- Equipment accessories (Tower Robot, daVinci Surgeon Chair, Table Trumpf 7000dV) must NOT be used as robot rule triggers — they appear on non-robot cases
