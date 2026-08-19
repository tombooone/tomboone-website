# CLAUDE_CONTEXT.md — PHI-Safe Work Tools
## Last updated: 2026-08-19 (v1.7.6 — live on both dev and main)

---

## CRITICAL RULES — READ FIRST

- The audit tools live in a **single HTML file** (`index.html`) deployed via **Cloudflare Pages**; the new item search tool is a separate standalone `items.html` in the same repo
- **NEVER touch the existing CPT audit or equipment audit code** — those tools are live and working
- All processing is **local browser only** — no server, no uploads, no external data storage
- PHI-safe by design — the only unique identifier in schedule data is Case #
- Always commit and push to GitHub after every change
- Always bump the version number with every change
- At the end of every response, write/overwrite `handoff.txt` at the repo root (gitignored, never committed) — see **Session Handoff File** below for the convention and the no-PHI rule

---

## Project Overview

A PHI-safe OR scheduling audit web tool, deployed as two environments via Cloudflare Pages:
- **tomboonern.com** is **production**, tracking the `main` branch
- **tomboone.io** is **dev/staging**, tracking the `dev` branch, and is gated behind a dev overlay (see Dev Gate below)

Home-screen tools (all **live and complete**):
1. **CPT Audit Tool** ✅ complete (v1.6.2 reverted the missing/not-on-order comparison to presence-based — see Data Schema section note below; **v1.6.14** added a Creation User column to Table 1, sourced from the required "Creation User" export column and stripped of its trailing bracketed Epic user ID (e.g. "HARRIS, JESHURUN [S271161]" → "HARRIS, JESHURUN") via `formatCreationUser()` in `app.js`; **v1.6.15** reordered Table 1 to Date, Location, Case #, Explanation, Creation User (rightmost) and gave the table a `cpt-inpatient-table` class so Location (`td:nth-child(2)`) gets `white-space: nowrap` in `styles.css`, matching the existing `.equip-row-main td:nth-child(2)` pattern — Explanation still wraps normally; **confirmed unaffected by v1.7.2** — Creation User was already rightmost in Table 1, no change needed; otherwise do not touch)
2. **Equipment Request Audit** ✅ complete (expand/collapse detail rows, amber keyword highlight, 19 keywords including NIM, Sonopet, CUSA, Aquamantys, Stealth, Ultrasound, Spy ICG, PTeye; **v1.7.2** added a required, rightmost Creation User column — see the Equipment results-table bullet in Key Decisions for the column/CSS/colSpan detail), do not touch beyond that
3. **OR Schedule and Room Assignment Audit** ✅ complete (Gantt, calendar, sidebar, alert/flag tier system; includes **Rule Management** sub-view with read-only rule cards, mailto flag-for-review, and mailto request-new-rule flows)
4. **Gender Reassignment Surgery CME Approval Audit** ✅ complete, **added v1.7.0 (2026-08-18), released to production through v1.7.5 (2026-08-19)** — home-grid tile sits between OR Schedule/Room Assignment Audit and VNC Stocked Supply Item Search. See its own section below for architecture, matching logic, and privacy notes.
5. ~~**OR Staffing Budget Calculator**~~ 🗄️ **ARCHIVED (v1.6.12, 2026-07-27)** — removed from active use at Tom's request, no timeline for restoration. No longer a home-screen tile. See **Archived Tools** section below for the recovery branch and a summary of what it did.
6. **VNC Stocked Supply Item Search** ✅ complete, **live on both dev and main as of the v1.6.13 release (2026-07-29)** (added v1.6.0; standalone `items.html` — see below; linked from home grid as `<a class="tool-tile" href="items.html">`; **v1.6.1** improved match quality — whole-word matching for short/numeric tokens, a synonym map, and a tailored empty state for known-absent products)

Sub-views (not home-screen tiles):
- **Equipment Terms view** ✅ complete (accessible via "View terms being checked" link in Equipment Request Audit; shows keyword pills; "Suggest equipment to check" button opens mailto pre-filled with suggestion template)
- **CME Accepted Approvers view** ✅ complete, **added v1.7.5** (accessible via "View accepted approvers" link in the CME Approval Audit; shows one pill per `CME_APPROVAL_AUTHORITIES` entry, live-sourced — no duplicate list; same pattern as Equipment Terms view)

---

## Archived Tools

- **OR Staffing Budget Calculator** — archived (not deleted) on **2026-07-27**, removed from active use on `dev` at Tom's explicit request. **No timeline for restoration.**
  - **Recovery point:** branch `archive/staffing-tool`, cut from `dev` immediately before removal (pushed to origin, so it survives independent of anyone's local clone). It holds the complete pre-removal state of `index.html`/`app.js`/`styles.css`/`rules-data.js` — check that branch out (or diff it against `dev`) to restore the tool or consult the full implementation history, rather than relying on this file for line-level detail.
  - **What it did:** a fourth home-screen tool (two-file upload: the OR Schedule XLSX + a Productivity Report PDF, joined by date) that compared budgeted OR staff hours/FTE (derived from scheduled OR minutes × a worked-hours-per-unit-of-service constant) against the productivity report's actual/scheduled hours, for upcoming WBVC OR days only. Rendered as a 9-column per-day table with weekend shading, a past/today/future timeline bar, and signed variance coloring. It was decoupled from the shared `_runAllAudits` pipeline (needed its own two-file Run) and used **PDF.js** (loaded from cdnjs) to parse the productivity report client-side — both removed along with the tool.
  - **Removal (v1.6.12):** deleted the home-screen tile, the `#staffingView` section, all staffing JS (`parseProductivityPdf`, `wireStaffingTool`, `auditStaffing`, `renderStaffingResults`, `buildStaffingRow`, `setStaffingVariance`), `STAFFING_CONFIG` from `rules-data.js`, all `.staffing-*` CSS, and the PDF.js `<script>` tag. Shared helpers it depended on (`readXlsxRows`, `findHeaderInfoForColumns`, `parseDateCell`, `parseTimeToMinutes`, `cell`, `hasData`, `CAMPUS_CONFIG.WBVC.roomPrefix`) were left untouched — still load-bearing for CPT/Equipment/Room Rules. Verified via headless Chrome that the other three tools open with zero console errors post-removal.
  - Its full build/iteration history (v1.5.3 through v1.5.10 — FTE math corrections, the PDF join evolution, the sticky-header CSS saga) lived in this file's Key Decisions section prior to archival; it's preserved in the `archive/staffing-tool` branch's own commit history rather than duplicated here.

---

## Current Version & Deployment

- Current version: **v1.7.6** (live on both dev and main)
- Repo: github.com/tombooone/tomboone-website
- File structure: `index.html` (HTML only), `styles.css` (all CSS), `rules-data.js` (pure data constants), `app.js` (all JS — main app first, worm IIFE second, dev gate IIFE third), `items.html` (standalone item search page), `items-data.js` (generated catalog data), `scripts/build-items.mjs` (catalog build script). **`rules-data.js` is loaded BEFORE `app.js`** in index.html; both are inline-script fragments (top-level code indented 4 spaces, no IIFE wrapper), so their top-level `const`/`let` declarations are shared across the two classic scripts via the global lexical environment — `app.js` references the data constants by name with no import/redeclaration. `items-data.js` follows the same pattern, loaded only by `items.html`.
- **Cache busting:** `styles.css`, `rules-data.js`, `app.js`, and `items-data.js` are loaded with `?v=X.X.XX` query strings in their respective HTML files. These version numbers **must be bumped in sync with the footer version badge** on every deploy. `items.html` has its own `styles.css?v=` and `items-data.js?v=` query strings — bump both when deploying either file.
- Deploy: `git add index.html styles.css rules-data.js app.js items.html items-data.js && git commit -m "message" && git push`
- Cloudflare Web Analytics: snippet added to `<head>` in **both** `index.html` and `items.html`, wrapped in `location.hostname === 'tomboonern.com'` guard — fires only on tomboonern.com (production); tomboone.io (dev) and localhost are intentionally excluded
- Cloudflare Pages: push to `main` auto-deploys tomboonern.com; push to `dev` auto-deploys tomboone.io

---

## Session Handoff File (2026-08-19)

`handoff.txt` at the repo root is a standing convention so Tom can share a session's work with Claude Chat by uploading one file instead of copy-pasting. Mechanics:
- **Gitignored, never committed.** Added to `.gitignore` alongside `node_modules/`/`package-lock.json`/`package.json`. It may reference internal implementation details not meant for public repo history, so it must never be staged or pushed.
- **Overwritten at the end of every response**, this session and every future session — not appended, not versioned. Plain text, short paragraphs/bullets, not a raw tool-call transcript. Content: what was done, key findings, any open questions/decisions needed, verification/test results, and `git log --oneline -3` output if a commit was made that response.
- **No PHI/PII, ever — not even from a test fixture pasted into the session.** No real patient data, no real Special Needs free text. Describe data structurally instead (e.g. "case with F64.9 diagnosis and a needs-review Special Needs match" rather than quoting the actual field content). When in doubt, leave it out and describe generically — this rule is absolute, not a judgment call to relax under time pressure.

---

## Dev / Prod Branch Workflow

- All development work happens on the `dev` branch; pushing `dev` deploys tomboone.io only
- Only merge `dev` into `main` (which deploys tomboonern.com) when Tom explicitly says **"release"**
- Releases happen via merging `dev` into `main` — no force pushes or rebases to `main`
- Version bumps happen on every push, on both branches, as always
- **Most recent release to main: v1.7.5 (2026-08-19), fast-forwarded** (clean fast-forward, no merge commit, no conflicts each time — `git merge --ff-only dev`). `main` and `dev` are kept in sync at the same commit after every release this session. This brings the entire Gender Reassignment Surgery CME Approval Audit tool to production — added at v1.7.0, patched at v1.7.1 for a header-matching bug, refined at v1.7.2 (accordion structure, age filters, column reorder), simplified at v1.7.3 (Explanation column reduced to bare ICD-10 code), expanded at v1.7.4 (accepted-approver list widened beyond CME), and refined again at v1.7.5 (accepted-approvers reference view, Date/ICD-10 column layout fix, multi-code ICD-10 stacking — see its own section below) — plus the v1.7.2 Equipment Request Audit Creation User column and the v1.7.4 session-handoff-file convention. Spot-checked post-deploy each time (most recently: tomboonern.com serving `app.js?v=1.7.5` with HTTP 200). **Sequencing note:** earlier this session a bare "merge" request (no "release") was treated as ambiguous per this convention and explicitly declined; releases only proceed once Tom sends the literal word "release."
- **No external script dependencies as of v1.6.12.** `index.html` previously loaded **PDF.js** from cdnjs (added v1.5.6) solely for the OR Staffing Budget Calculator's PDF parsing; it was removed along with that tool's archival — see Archived Tools.

#### v1.6.13 Release Summary (2026-07-29)

What shipped to production in this release, for anyone auditing "what changed since v1.4.29":
- **VNC Stocked Supply Item Search** (`items.html`) — a brand-new standalone tool, its first appearance on `main`. Verified functional pre-release: catalog loads (2,929 items), live search and the known-absent-term tailored messaging both work correctly.
- **Equipment Request Audit — three-state negation detection (v1.6.9)**: "not needed"/"declined"-style phrasing near a keyword now suppresses or downgrades a flag instead of always firing one. See the Equipment Request Audit — Keywords section above.
- **Room Rules — pediatric OR 3/OR 5 fallback compliance (v1.6.10)**: a pediatric case placed in the rule's own stated fallback rooms no longer false-positives. See Active Rule Set → Tier 2.
- **Room Rules — sidebar satisfied/suppressed sections (v1.6.4)**: the per-case sidebar (reachable via a Gantt tile, including cases with zero violations) shows which rules were satisfied and which lower-tier rules were suppressed by hierarchy, not just which ones fired.
- **CPT Audit — Table 2 filter-state persistence (v1.6.5)**: applying/clearing a Table 2 filter chip no longer collapses already-expanded detail rows or resets visited state.
- **DATA_VERSIONS staleness infrastructure (v1.6.13)** — see the new section below. Ships dormant (today's real dates are within all thresholds); the passive "as of" lines are live on both dev and main, the amber staleness banners will only ever activate on `tomboone.io`, never `main`.
- **OR Staffing Budget Calculator — added, then archived, entirely within `dev`.** Built in v1.5.3, iterated through v1.5.10, then removed from active use in v1.6.12 at Tom's request (see Archived Tools). Because it never appeared in a prior release, **it never existed on `main` and this release does not introduce it** — confirmed by checking the merge added no staffing tile/view/code (the `dev`→`main` diff is additive-only per the file list above; nothing staffing-related is present in current `dev`, so nothing staffing-related landed on `main`).
- Pre-release regression pass (headless Chrome/Playwright) confirmed no regressions in CPT, Equipment, or Room Rules from any of the above — including a direct check of the satisfied/suppressed data layer and a forced-stale test proving the DATA_VERSIONS banners are genuinely hostname-gated, not just quiet due to today's dates.

### Dev Gate (tomboone.io only)

- A full-screen overlay gates the app on tomboone.io only (`window.location.hostname === 'tomboone.io'`); no-op on any other hostname, including tomboonern.com and localhost
- Overlay markup lives in `index.html` (`#devGateOverlay`), styled in `styles.css` (`.dev-gate-overlay`, `.dev-gate-prod-link`); logic is in a standalone IIFE at the end of `app.js`, after the worm easter egg
- Overlay is a fully opaque white full-viewport panel with one centered link, "Go to tomboonern.com", linking to `https://tomboonern.com` — no heading, subtext, or other content; nothing behind it is visible
- Dismissal: a keystroke buffer listener (independent of the worm easter egg's listener and buffer) watches for the typed sequence "fefe" anywhere outside an input/textarea. On match, the overlay is hidden and `sessionStorage.setItem('devUnlocked', 'true')` is set
- On page load: if `sessionStorage.getItem('devUnlocked') === 'true'`, the overlay is skipped entirely (persists until the tab closes)
- DEV badge: `#devBadge`, an amber pill in the topbar next to the privacy pills (`.dev-pill` class on `.privacy-pill`), shown once the gate has been passed on tomboone.io; hostname-keyed the same way, so it never renders on tomboonern.com or localhost

### Data Vintage & Staleness Warnings (v1.6.13)

Tracks how current three dated data sources are, and warns **only on dev** when they're old enough to need a refresh before promoting to `main`. `KNOWN_PROBLEM_CPTS` is deliberately **not** part of this — it's a live-maintained exclusion list, not a dated code set (see its own entry in Key Decisions).

- **`DATA_VERSIONS`** (`rules-data.js`, declared right after `CAMPUS_CONFIG`):
  ```js
  const DATA_VERSIONS = {
    cptValiditySet:        { sourcedDate: "2026-04-26", coveredYear: 2026 },
    inpatientOnlyList:     { coveredYear: 2026 },
    roomRulesSurgeonPrefs: { derivedDate: "2026-06-27" }
  };
  ```
  `cptValiditySet` tracks `validCptCodes` (the CPT/HCPCS validity Set, `app.js`); `inpatientOnlyList` tracks `inpatientOnlyCodes` (the CMS IPO Set, `app.js`); `roomRulesSurgeonPrefs` tracks `ROOM_RULES`/`SURGEON_PREFS` (`rules-data.js`). Updating any of these hardcoded data sets should update the matching `DATA_VERSIONS` entry in the same commit — that's the whole point of tracking it separately from the data itself.
- **Passive "as of" lines** — render identically on dev and main, always, regardless of staleness. Populated by `initDataVintage()` (a standalone IIFE in `app.js`, placed right after the equipment-keyword count line near the top of the file, so it runs on every page load alongside the rest of init):
  - CPT Audit page (`#cptDataVintageLine`, `.data-vintage-line`): `"CPT/HCPCS code set: current as of 4/26/2026 (CY2026) · CMS Inpatient-Only list: CY2026"`.
  - Room Rules Audit page (`#roomRulesDataVintageLine`, `.data-vintage-line`): `"Room rules and surgeon preferences derived from Epic case history: 6/27/2026"`.
  - Styling matches the VNC catalog's `.items-catalog-line` pattern (muted, small, factual — not a banner).
- **Staleness thresholds and rationale:**
  - CPT/HCPCS set and CMS Inpatient-Only list are each checked **independently** against the current calendar year (`new Date().getFullYear() > coveredYear`) — CMS publishes both on an annual cycle, and they don't necessarily get refreshed in the same commit, so either one can go stale on its own.
  - Room Rules/Surgeon Prefs uses a **12-month** elapsed threshold from `derivedDate` (calendar-month arithmetic, not just year rollover) — these are derived from Epic case-history review, an irregular/manual process rather than an annual publication, so a fixed "months since last derived" window is the more meaningful staleness signal than a calendar-year check.
- **Dev-only gating:** reuses the codebase's existing hostname convention (`window.location.hostname === "tomboone.io"`, the same check the Dev Gate IIFE above uses) rather than inventing a new one. The warning-banner elements (`#cptStaleBanner`, `#roomRulesStaleBanner`, both `.dev-stale-banner` `<div>`s, `hidden` by default in `index.html`) exist in the markup on every hostname — same pattern as `#devBadge`/`.dev-pill` — but `initDataVintage()` only ever populates their text and clears `hidden` inside an `if (isDevHostname)` branch; on any non-`tomboone.io` hostname (including `tomboonern.com` and localhost) that whole branch never executes, so the banner is never populated or unhidden, not just CSS-suppressed. Verified in headless Chrome (Playwright) with deliberately forced-stale `DATA_VERSIONS` values that the banners render with correct text on `tomboone.io` and stay completely inert on `tomboonern.com`; with the real 2026-07-27 values, both banners are correctly dormant on both hosts (current year still CY2026 for both code sets; ~1 month since the 6/27/2026 room-rules derivation).
- **Banner text**, when triggered: `"⚠ Dev only: CPT/HCPCS code set is for CY[year] and may be out of date — verify before promoting to production."` and/or `"⚠ Dev only: CMS Inpatient-Only list is for CY[year] and may be out of date — verify before promoting to production."` (both can render together as separate lines in `#cptStaleBanner` if both are stale); `"⚠ Dev only: Room rules and surgeon preferences are over 12 months old — consider re-deriving from current Epic history before promoting to production."` in `#roomRulesStaleBanner`.

---

## VNC Stocked Supply Item Search (items.html)

A standalone page (not embedded in `index.html`'s SPA shell) that lets OR nurses search the Infor supply catalog stocked at CPMC Van Ness by keyword.

### Architecture

- **Data file:** `items-data.js` — classic script (no IIFE, top-level consts, 4-space indent matching `rules-data.js`) defining:
  - `CATALOG_META = { campus, asOf, count }` — metadata shown in the persistent catalog line under the search box
  - `ITEM_CATALOG = [ { item, desc, desc3, unspsc, mfr, mfrItem }, ... ]` — array of item objects (2929 items as of 2026-07-07); fields: `item` (item number), `desc` (short description), `desc3` (verbose description), `unspsc` (category), `mfr` (manufacturer division), `mfrItem` (manufacturer item number)
- **Build script:** `scripts/build-items.mjs` — Node ESM script; run manually on catalog refresh (see Catalog Refresh below). Uses the `xlsx` npm package (dev-only, not committed; run `npm install xlsx` first). Requires Node 18+.
- **Search logic:** inline `<script>` in `items.html` — no `app.js` dependency, no shared state. On each `input` event (debounced 150ms): splits query on whitespace into tokens; keeps items where every token matches the concatenated 6-field searchable string (see Token Matching below); ranks by short-desc match count + word-boundary bonus, tiebreaks alphabetical. Renders top 50 with a count line ("Showing 50 of N matches — add detail to narrow" when capped); shows refinement nudge when total matches > 25; empty-query → blank; zero-results → guidance text (or a tailored known-absent message, see below).
- **Token matching (v1.6.1):** `matchesTerm()` in `items.html` — tokens that are purely numeric OR ≤3 characters match only on a word boundary (regex lookarounds `(?<![a-z0-9])`/`(?![a-z0-9])` against the lowercased haystack; hyphens/slashes are treated as non-boundary so sizes like "4-0" stay intact and match). Tokens 4+ characters containing a letter keep the plain case-insensitive substring match. This fixes short tokens like "ted" coincidentally matching "fenestraTED"/"coaTED".
- **Synonym map (v1.6.1):** `SYNONYMS` const in `items.html` maps colloquial/brand search terms to the catalog's actual (often clinical/brand-specific) vocabulary, one-directional, `{ key: [terms] }`. A query token satisfies the match if it equals a synonym key AND the haystack contains any of the mapped terms (evaluated with the same word-boundary/substring rules). Extensible — add campus-specific entries as verified. Current verified entries: `nylon→[ethilon, nurolon]`, `betadine→[providone, povidone]`, `esmarch→[esmark]`, `raytec→[xry, xray]`, `bovie→[electrosurgical, cautery]`, `kling→[conforming]`, `silk→[perma-hand]`, `cottonoid→[neuro]`, `patty→[neuro]`, `neuropatty→[neuro]`. Brands already present verbatim in the catalog (vicryl, prolene, pds, monocryl, ethibond, ioban, yankauer) intentionally have NO mapping.
- **Known-absent list (v1.6.1):** `KNOWN_ABSENT_TERMS` const in `items.html` — products genuinely not stocked at VNC under any name: gelfoam, surgicel, floseal, surgiflo, tegaderm, hemovac, jp drain, jackson pratt. When a search returns zero results and the query contains one of these terms, `renderEmpty()` shows a tailored message ("This item may be carried under a different name, or an equivalent may be stocked...") instead of the generic zero-results text. Extensible — add more terms as confirmed absent.
- **Result rows:** item number as a copyable button (click-to-copy toast identical to audit suite pattern via `navigator.clipboard.writeText`), short desc as primary line, verbose desc3 truncated to 2 lines with expand-on-click ("Show more"/"Show less"), mfr + mfrItem as meta line, UNSPSC as a muted chip.
- **Page chrome:** same `styles.css` + Google Fonts as `index.html`. Topbar has a "← All tools" back-link (`.brand-back-link`) instead of the SPA brand div. No dev gate (it's a separate page; `items.html` doesn't have the overlay markup or app.js). Same Cloudflare Analytics guard in `<head>`.
- **No PHI:** catalog contains only supply item numbers and descriptions — no patient data, no Epic case numbers.

### Catalog Refresh Procedure

When a new Infor item master export is available:
1. Install the build dependency (one-time per machine): `cd tomboone-website && npm install xlsx`
2. Run the build script: `node scripts/build-items.mjs "<path-to-new-xlsx>"`
   - The filename should contain a date pattern like `26_07_07` or `26.07.07` (YY[sep]MM[sep]DD) which the script parses for `CATALOG_META.asOf`. If absent, it falls back to today's date with a warning.
   - The script reads the xlsx, deduplicates on Item number (keeps first occurrence), and writes `items-data.js` in the repo root.
3. Bump the version in `items.html` (footer badge, `styles.css?v=`, `items-data.js?v=`) and in `index.html` (footer badge, all cache-busting strings).
4. Commit: `git add items-data.js items.html index.html styles.css && git commit -m "vX.Y.Z: refresh VNC catalog to YYYY-MM-DD (N items)"` and push.

### Expected XLSX columns (case-insensitive)
`Item`, `Item Description`, `Item Description3`, `UNSPSC Description`, `Mfr Division Name`, `Mfr Item`. Stray null cells emit empty string. Fully duplicate rows (same Item#) are silently deduplicated.

### Phase 2 placeholder
A `.items-empty-phase2-slot` div is left inside the zero-results state for a future "copilot handoff" CTA (phase 2 not yet built).

---

## Gender Reassignment Surgery CME Approval Audit (v1.7.0, patched/refined v1.7.1–v1.7.5)

New policy: gender reassignment surgeries require executive approval, documented in the Special Needs field as "approved by " followed by an accepted authority. **As of v1.7.4, approval is no longer CME-exclusive** — see the v1.7.4 section below for the full accepted-authority list. This tool flags F64.x-diagnosed cases missing that language so gaps can be caught before the case happens. Highly sensitive (gender-identity-linked diagnosis data) — see Privacy note below.

### Architecture

- Fourth tile joined to the **same shared upload/prospective-date pipeline** as CPT/Equipment/Room Rules (`_runAllAudits`, `sharedAuditData`/`sharedAuditResults`, `wireAuditTool({ toolKey: "cme" })`) — one file upload runs all four audits. `renderCmeResults`/`buildCmeRow`/etc. live in a dedicated "CME Approval Audit" section in `app.js`, placed immediately before the "─── Room Rules ───" section comment; `cmeRequiredColumns` is declared alongside `requiredColumns`/`equipmentRequiredColumns` near the top of the file.
- Home-grid tile (`#openCmeTool`) sits between "OR Schedule and Room Assignment Audit" and "VNC Stocked Supply Item Search" in `index.html`'s `.tool-grid` — a deliberate reorder, not an append.
- **Required columns** (`cmeRequiredColumns`, `app.js`): Date, Case #, Diagnosis Codes (new — free text, ICD-10 codes bracketed inline e.g. "Gender identity disorder, unspecified [F64.9]"), Special Needs, Case Procedures (sourced as "Procedures Scheduled" in the UI — **not** a separate "Flightboard Procedures" column; the original v1.7.0 build guessed that name and shipped a header-matching bug as a result, see the v1.7.1 fix note below), Patient Age, Creation User (reuses the existing `formatCreationUser()` helper — same trailing-bracket-strip logic as the CPT tool's Table 1 column); Room/Department/Location optional, same three-way fallback (`formatRoomDisplay`) as CPT/Equipment. No campus filter — all campuses are in scope (unlike Room Rules' WBVC-only restriction).
- **v1.7.1 bugfix (2026-08-18):** `proceduresScheduled`'s `accepted` list originally only matched a nonexistent "Flightboard Procedures" header. Because `findHeaderInfoForColumns()` requires every non-optional column to resolve on the same scanned row before returning anything (app.js, all-or-nothing per row), that one bad alias made the whole header match fail — and the tool's static error message (which, like every other tool's, lists all required column labels rather than diagnosing which one actually failed) made it look like all five required columns were missing when four matched fine. Fixed by pointing `proceduresScheduled`'s label/accepted list at `"Case Procedures"`, copied verbatim from `roomRulesColumns`' existing `procedures` entry: `["case procedures", "case/appt procedures (as scheduled)", "procedure name", "procedures"]` — the only other place in the app that reads this field. Verified via the same CDP-driven headless-Chrome fixture test as the v1.7.0 build, plus a spot-check that Room Rules and CPT (which also read/pass through the same uploaded rows) still audit cleanly against a fixture using the corrected header shape.
- Same prospective-only date filter as CPT/Equipment/Room Rules: drop rows dated before tomorrow's local midnight, computed at runtime (`tomorrowMidnight.setHours(24,0,0,0)`).

### Matching logic (three-state)

1. **Diagnosis match** (`auditCmeRows`, `app.js`): a case is in scope only if `Diagnosis Codes` contains the substring `F64` anywhere, case-insensitive (`/F64/i`) — catches all F64.x subtypes without an exhaustive code list. Non-matching cases are excluded from this tool entirely, regardless of Special Needs content. **v1.7.5**: every matching bracketed code is extracted via `extractF64Codes()` (plural — every `[...]` bracket group containing "F64", deduplicated, in order of appearance; falls back to a single bare `F64(?:\.\d+)?` match if no bracket is present), not just the first — a case's Diagnosis Codes field can legitimately list more than one F64.x subtype. `row.codes` (array) drives the ICD-10 column; `row.explanation` (the comma-joined string) is still set on `baseRow` for click-to-copy.
2. **Approval match** (`findCmeApprovalMatch()`): evaluated against Special Needs against `CME_APPROVAL_AUTHORITIES` (see v1.7.4 section below for the full list and matching detail as of that version — this bullet describes the general three-state shape, unchanged since v1.7.0).
   - **CLEARLY APPROVED**: exact phrase `approved\s+by\s+<authority>` for some accepted authority (case-insensitive, whitespace-tolerant only — deliberately not fuzzy, so "approved by the CME committee" does NOT match) → case goes in the bottom **CME Approved** table, matched phrase highlighted amber, no distinguishing marker beyond the highlight itself.
   - **NEEDS REVIEW**: no exact-phrase match, but authority-adjacent text exists elsewhere in Special Needs (e.g. "CME notified but pending", or "approved by" with no recognized authority following) → case goes in the top **Missing CME Approval** table. The surrounding delimited clause (split on `.`/`;`/`,`/newline, trimmed) is highlighted amber as the review span. Gets the SAME amber ⚠ "questionable" treatment the Equipment Request Audit already uses for uncertain negation matches — `buildQuestionableIcon()` (the reused SVG triangle helper) prefixed to the ICD-10 cell, plus that cell's text colored `var(--warn)`. *(Note: the original spec for this tool described reusing an "amber synonym-match highlight" from the VNC Stocked Supply Item Search tool — no such mechanism actually exists in `items.html`; VNC has no highlight-on-match feature at all. The Equipment Request Audit's QUESTIONABLE-state amber icon/mark pattern was substituted as the closest real, already-shipped analog, since it already highlights matched text within a Special Needs field.)*
   - **CLEARLY UNAPPROVED**: no authority-related mention at all → top table, standard row, no icon/highlight.
3. Both tables sorted ascending by procedure date (soonest first) via the existing `sortAuditRows()`.

### Output columns
Date, Location, Case #, Age, Procedures Scheduled, Special Needs (full text, amber `<mark>` inline via `appendCmeHighlightedText()` reusing the shared `AMBER_MARK_CSS` constant), ICD-10, Creation User (**v1.7.2**: moved to rightmost, matching CPT Table 1 and the v1.7.2 Equipment Request Audit column — was previously between Procedures Scheduled and Special Needs). `.cme-approval-table` (`styles.css`) sets `table-layout: fixed` with 8 column-width rules (rebalanced in v1.7.5 — see below), plus `white-space: nowrap` on Date (`td:nth-child(1)`, added v1.7.5) and Location (`td:nth-child(2)`, v1.7.2, copied verbatim from `.cpt-inpatient-table`'s identical rule).
- **v1.7.3 (2026-08-18):** the 7th column — header text and underlying `row.explanation` field, built by `buildCmeExplanationCell()` in `buildCmeRow()` — was simplified from a full sentence (`"Diagnosis code {code} present; case is CME approved."` and its two unapproved/review variants) down to just the bare ICD-10 code (e.g. `"F64.9"`), since the code and which accordion section (Missing CME Approval vs. CME Approved) a row appears in already conveyed that information; the column header was renamed from "Explanation" to **"ICD-10"** to match. `row.explanation` is now set directly to `code` in all three branches of `auditCmeRows()` (approved/review/unapproved) rather than a template string — `buildCmeExplanationCell()` itself was **not** changed; it still prefixes needs-review rows with `buildQuestionableIcon()` (the amber ⚠ triangle) and colors the cell text `var(--warn)`, so the needs-review-vs-clearly-unapproved visual distinction is unaffected by the text simplification — confirmed via a CDP screenshot that the icon+amber-color treatment on the now-terse code text reads at least as clearly as it did on the full sentence (arguably more so, since the icon isn't buried at the start of a long clause anymore). Click-to-copy on that cell now copies just the code.

### v1.7.2 refinements (2026-08-18)
- **Accordion structure**: the two tables are now wrapped in `makeAccordionSection()` — the exact same helper CPT's Table 1/Table 2 use — inside a `#cmeAccordion` div (replacing the old static `<table>` markup + separate `#cmeUnapprovedTable`/`#cmeApprovedTable` tbody elements in `index.html`). `renderCmeResults()` was split into `renderCmeResults` (stores `lastCmeResult`, resets `cmeAgeFilter` to "all", calls the two functions below) / `renderCmeFilterControls()` / `renderCmeTables()` — mirroring the CPT `renderResults`/`renderCptFilterControls`/`renderCptTables` trio exactly. Both sections default closed on every render (no sticky open/closed state across re-renders — consistent with the "no session persistence" design below).
- **Summary tile #1** relabeled from "Rows reviewed" to **"F64 diagnosis cases"** and its value changed from `result.totalRows` (all prospective spreadsheet rows) to `result.unapprovedRows.length + result.approvedRows.length` (the actual F64-diagnosed population this tool evaluates). This and the other two summary tiles always reflect the FULL unfiltered audit; only the accordion header badges reflect the currently age-filtered rows — same convention as CPT's summary metrics vs. its accordion badges. The audit function's own `totalRows` field (all prospective rows scanned, pre-F64-filter) is unchanged and still drives the `#cmeStatus` "Audit complete. Reviewed N data rows." line.
- **Age filter** (`cmeAgeFilter`, `#cmeFilters`): a `buildFilterGroup()` chip row — "All ages" (default) / "<18" / "18-19" / ">19" — filters both accordion tables simultaneously via `getCmeFilteredRows()`. Bucketing (`ageBucket()`) runs on `row.age`, which `auditCmeRows()` now stores as `parsePatientAge(cell(row, indexes.patientAge))` (a parsed integer or `null`) rather than the raw "35 yrs" string — `parsePatientAge()`'s own parsing logic (leading-integer regex) is untouched, only how its result is stored/displayed changed. A `null`/unparseable age never matches any of the three specific buckets, so those cases are only ever visible under "All ages" — verified with a blank-age test case.
- **Age column display**: `buildCmeRow()` renders the bare parsed number (e.g. `"35"`) instead of the raw cell text (`"35 yrs"`) — display-only; sorting/filtering already ran on the parsed integer per the point above.
- **Description text**: the Missing CME Approval accordion body now opens with a `<p>` note (moved from static HTML into `renderCmeTables()`, since there's no more per-table `<h2>` once the tables are inside accordion headers) — "NOT" capitalized for emphasis per Tom's request. Original v1.7.2 wording quoted the exact phrase "approved by CME"; **superseded by v1.7.4** once approval stopped being CME-exclusive — see current wording below.

### v1.7.4 — expanded accepted-approver list (2026-08-19)
Approval is no longer CME-exclusive. `CME_APPROVAL_AUTHORITIES` (`app.js`, declared just above `findCmeApprovalMatch()`) now lists seven accepted authorities, each with a `{ name, pattern }` pair — `pattern` is a lowercase regex fragment with `\s+` between words:
- `CME`, `CMO`, `CNO`, `CEO` — bare role abbreviations.
- `Anup Singh`, `Hollie Seeley` — full names, plain whitespace-tolerant matching.
- `Lauren O'Neill` — pattern `lauren\s+o['’]?\s*neill` tolerates the three specific punctuation variants requested: "O'Neill" (straight or curly apostrophe), "ONeill" (no apostrophe), "O Neill" (space instead of apostrophe). No broader spelling fuzziness — an unrecognized variant falls through to NEEDS REVIEW rather than being guessed at, per the existing not-fuzzy design.

**Matching logic**, `findCmeApprovalMatch()`:
1. Try `approved\s+by\s+<authority>` for every authority in the list (case-insensitive); the leftmost match in the text wins if more than one authority somehow matches → **CLEARLY APPROVED**, highlighting the full matched phrase.
2. If none match cleanly, look for two review-worthy signals anywhere in the text: a bare `approved\s+by\b` phrase (an attempted approval that didn't resolve to a recognized authority — typo, unlisted name, or no name at all), or a standalone mention of any authority token with no "approved by" nearby (the original CME-only "bare mention" behavior, now generalized to all seven authorities). Whichever signal occurs first in the text seeds the highlight span, expanded to the surrounding delimited clause via `extractClauseSpan()` (the same `.`/`;`/`,`/newline clause-boundary logic used since v1.7.0, factored out into its own function this pass since it's now called from two places) → **NEEDS REVIEW**.
3. Otherwise → **CLEARLY UNAPPROVED**.

**Word-boundary safety (the "CRITICAL" requirement for this change):** `boundarySafe()` wraps any authority pattern in `(?<![a-z0-9])...(?![a-z0-9])` — the exact same lookaround shape VNC Item Search's `matchesTerm()` (`items.html`) uses for short-token matching — applied to every authority, not just the three-letter ones, so e.g. "approved by CMOnitoring device" cannot clean-approve (blocked by the trailing lookahead; falls through to NEEDS REVIEW since "approved by" is still present) and "CNOted status" cannot even reach NEEDS REVIEW (blocked entirely — no boundary-safe match anywhere, and no bare "approved by" phrase present either → CLEARLY UNAPPROVED). Same boundary treatment protects the name authorities from prefix-matching a longer surname, e.g. "approved by Anup Singhal" does not clean-approve. This also fixed a latent gap in the original v1.7.0–v1.7.3 CME-only check, which had no trailing boundary at all (`/approved\s+by\s+cme/i` would have clean-approved on a hypothetical "approved by CMExpedited") — now covered by the same fix for free.

**Description text**: the Missing CME Approval accordion note (`renderCmeTables()`) now reads: `Cases with a gender identity disorder diagnosis (ICD-10 F64.x) whose Special Needs field does NOT contain an accepted approval phrase ("approved by CME/CMO/CNO/CEO", or by name — Anup Singh, Hollie Seeley, or Lauren O'Neill). Rows with approval-related text that doesn't cleanly match one of these are marked for manual review.` The needs-review icon tooltip (`buildCmeExplanationCell()`) was also reworded from "CME-related text found..." to "Approval-related text found...". Tool name, home-grid card copy, section headers ("Missing CME Approval"/"CME Approved"), and summary tile labels were deliberately left as-is — treated as the tool's established name/category labels rather than literal CME-exclusivity claims; not in scope for this pass.

**Verified** via a standalone Node unit-test harness (23 cases covering all 7 authorities' clean-approval, the exact "CMOnitoring"/"CNOted" boundary traps from the spec, "Anup Singhal"/"Seeleyville" surname-collision traps, all three O'Neill punctuation variants, case-insensitivity, multi-space tolerance, and the pre-existing bare-mention/reworded-phrase review cases) plus a full CDP-driven headless-Chrome pass against an 11-row fixture exercising the same scenarios in the actual rendered table — confirmed correct classification, amber highlighting, and needs-review icon/color treatment for every case. Zero console errors.

### v1.7.5 — accepted-approvers reference view + column layout fix (2026-08-19)

**"View accepted approvers" link** (item mirroring CPT's "View known problem CPTs", Equipment's "View terms being checked", Room Rules' "View active rules"):
- Button in the CME instructions panel (`#viewCmeApproversBtn`), identical markup/position/style to the other three (`<div style="margin-top: 12px;"><button class="ghost-button" ...>`), right after the "email if you don't have access" paragraph.
- Opens a dedicated sub-view `#cmeApproversView` (`index.html`) — same architecture as `#equipmentTermsView`/`#knownProblemCptsView`/`#ruleManagementView`: a full `<section class="view">` toggled via `showView("cmeApprovers")`, not a modal. Matches Equipment's "Terms Being Checked" pattern specifically (the closest of the three, since it's also just a flat reference list rather than a table or card grid): back button (`#cmeApproversBack`, returns to `showView("cme")`), page heading, and a content div (`#cmeApproversContent`) populated by `buildCmeApproversView()`.
- `buildCmeApproversView()` renders one `.keyword-pill` per entry — reusing the exact `.keyword-list`/`.keyword-pill` CSS Equipment's terms view uses, no new styling — reading **directly from `CME_APPROVAL_AUTHORITIES`** (the live array `findCmeApprovalMatch()` matches against), specifically `authority.name` for each pill. No duplicate hardcoded list anywhere; if `CME_APPROVAL_AUTHORITIES` is ever edited, this view updates automatically with no further code change.

**Column layout fix** — a narrow Date column was wrapping to two lines and visually colliding with the row below it (confirmed via screenshot before the fix); ICD-10 was oversized for its ~5-character content:
- `.cme-approval-table` column widths (`styles.css`) rebalanced from `[7,9,7,5,16,22,22,12]%` to `[12,9,7,5,15,25,7,20]%` for `[Date, Location, Case#, Age, Procedures Scheduled, Special Needs, ICD-10, Creation User]` — Date widened (7%→12%), ICD-10 narrowed (22%→7%), the reclaimed space mostly going to Special Needs (22%→25%) and Creation User (12%→20%) with Date taking the rest.
- Added `white-space: nowrap` on `td:nth-child(1)` (Date) as a defensive belt-and-suspenders measure alongside the width increase, matching the treatment Location already had.
- **Multiple ICD-10 codes per case now stack vertically, one per line, instead of only ever showing the first code found.** This required a real logic change, not just CSS: `extractF64Code()` (singular) → `extractF64Codes()` (plural, see Matching logic section above) so a case with e.g. both `F64.1` and `F64.9` documented shows both. `buildCmeExplanationCell()` (`app.js`) now renders `row.codes` as a `.cme-icd10-stack` flex-column div, one `.cme-icd10-code` block-level line per code, each with `white-space: nowrap` so an individual code can never wrap mid-string regardless of column width. The needs-review ⚠ icon now sits beside the stack (in a flex row wrapper) rather than inline-prefixing a single line of text, since the cell content is no longer one sentence.
- **Verified** via a CDP-driven headless-Chrome pass against a 4-case fixture including one 2-code case and one 3-code case: `getClientRects().length` checked as `1` for the Date cell (single line, no wrap) and for every individual `.cme-icd10-code` line (no mid-string wrap) across all rows; multi-code cases confirmed rendering as separate stacked lines in DOM order. Screenshot confirmed visually: no Date/row collision, narrow non-wrapping ICD-10 column, stacked codes for the two multi-code test cases.

### Privacy — no session persistence
This tool touches gender-identity-linked diagnosis data. Same local-only browser processing as every other tool (no upload, nothing leaves the browser). Deliberately does **not** implement CPT Table 2's sticky filter/expand-state pattern (`cptVisitedCaseIds`-style Sets that survive re-renders within a session) — `lastCmeResult` is just a plain render-cache variable overwritten on every fresh `renderCmeResults()` call, same as `lastEquipResult`, and the age-filter accordions default closed on every render rather than remembering open/closed state. No localStorage/sessionStorage use anywhere in this tool. Nothing survives a real page reload for any tool in this app (all state is in-memory JS, not persisted to disk) — this tool adds no exception to that.

### Verified (headless Chrome, CDP, synthetic fixtures)
v1.7.0/v1.7.1: F64.9 + "approved by CME" → bottom table, amber-highlighted phrase, no review marker. F64.1 + no CME mention → top table, clearly unapproved, no highlight. F64.9 + "CME notified but pending" → top table, needs review, ⚠ icon + amber explanation + amber-highlighted clause. Non-F64 diagnosis → excluded from both tables regardless of Special Needs. Past-dated F64+approved case → excluded by the prospective filter. Whitespace-variant phrase ("Approved   BY   cme") → still matches as approved.
v1.7.2: a 5-case F64 fixture with ages 17/18/19/20/blank confirmed correct age-bucket filtering (`<18`→age 17 only, `18-19`→ages 18 & 19, `>19`→age 20 only, "All ages"→all 5 including the blank-age case) with accordion badge counts updating per filter; accordion expand/collapse and count badges verified; Age column confirmed showing bare numbers; Location column confirmed `white-space: nowrap` via computed style; Creation User confirmed rightmost in the header row. Also caught and fixed a same-session bug during this pass: an `Edit` call intended for `equipmentRequiredColumns` matched the wrong array (both `equipmentRequiredColumns` and `cmeRequiredColumns` shared identical trailing Room/Department/Location text, and only `cmeRequiredColumns` was immediately followed by the unique anchor `// DOM refs for navigation`) and instead added a harmless duplicate `creationUser` entry to `cmeRequiredColumns` while leaving Equipment's Creation User column silently blank (no error, just an empty cell, since the key was absent from `indexes` entirely). Caught by the CDP regression pass before commit, not after — fixed by removing the duplicate and re-adding the entry to `equipmentRequiredColumns` with a uniquely-anchored edit. Zero console errors across all test runs.

---

## Shared Table Column-Width System (v1.7.6)

Every audit results table used to define its own `nth-child` percentage widths independently (`.cpt-inpatient-table`, `.cpt-discrepancy-table`, `.equipment-missing-table`, `.cme-approval-table`, and the unclassed Room Rules table). This meant the same wrapping/collision bug (narrow Date column, oversized code column, etc.) got fixed piecemeal per tool instead of once — it happened first for CPT's Date/Location (v1.6.15), then separately for CME's Date/ICD-10 (v1.7.5). v1.7.6 replaced all of it with a shared, reusable system.

**Column membership** — which columns are genuinely "the same kind of data" across tables (audited before changing anything; re-check this table before adding a new column type to a new tool):

| Column | Tables it appears in | Shared class |
|---|---|---|
| Date | CPT Table 1 & 2, Equipment, Room Rules, CME (all 5) | `.col-date` |
| Case # | CPT Table 1 & 2, Equipment, Room Rules, CME (all 5) | `.col-caseno` |
| Location | CPT Table 1 & 2, Equipment, CME (4 — **not** Room Rules) | `.col-location` |
| Creation User | CPT Table 1, Equipment, CME (3 — not CPT Table 2, not Room Rules) | `.col-creation-user` |
| Room (Room Rules only) | Room Rules only | `.room-rules-table .col-room` (NOT shared with `.col-location` — see below) |
| Age (CME only) | CME only | `.cme-approval-table .col-age` (not shared — doesn't recur elsewhere) |
| ICD-10 (CME only) | CME only | `.cme-approval-table .col-icd10` (not shared) |

**Room ≠ Location, deliberately not unified:** Room Rules' "Room" column uses `normalizeRoomName()` (compact "OR 5") while the other four tables' Location column uses `formatRoomDisplay()` (full "WBVC OR 05"+campus) — genuinely different data/formatting despite both answering "where is this case," not just a naming coincidence. Forcing them into one shared class would have meant sizing for the wrong content pattern in one direction or the other.

**Implementation** (`styles.css`, shared rules declared once near the top of the table-styling section; `app.js`/`index.html` apply the classes):
- Sized in **`ch`** (content-relative), not `%` — tables have different total column counts, so percentages don't translate between them. `ch` widths were tuned empirically against realistic content (see Verified below), not just estimated from character counts — the estimates were off in both directions (Case # too narrow, Location too narrow) until measured in an actual rendered browser.
- Applied directly to `<th>`/`<td>` elements — **not** `nth-child`, since column order differs between tables (Room Rules puts Case # before Date; the others put Date first). `makeTableHead()` (`app.js`) was extended to accept `{ label, className }` entries alongside plain label strings so its callers can tag specific header columns.
- `.col-date` and `.col-caseno` are `white-space: nowrap` (must never wrap — a wrapped 2-line date or case number visually collides with the row below, which was the original v1.6.15/v1.7.5 bug). `.col-location` and `.col-creation-user` are deliberately **not** nowrap — Location is expected to wrap for the minority of genuinely long free-text room names (e.g. "WBMB MINOR PROCEDURE ROOM 2") rather than forcing the column wide enough to fit every edge case on one line, and Creation User is expected to wrap a long "LASTNAME, FIRSTNAME" onto 2 (or occasionally 3) lines, matching the pre-refactor CME treatment.
- Every table using these classes needs `table-layout: fixed` (added to `.cpt-inpatient-table`, `.equipment-missing-table`, and the newly-classed `.room-rules-table`, which previously had none at all — `.cpt-discrepancy-table` and `.cme-approval-table` already had it). Under fixed layout, columns without an explicit width (Explanation, Special Needs, Procedures Scheduled, Equipment, the three CPT Table 2 code-list columns, Room Rules' Surgeon/Procedure(s)/Priority/Rule/Explanation) automatically absorb the remaining space — this is the "flex" behavior free-text columns need, achieved by simply not giving them a `.col-*` class rather than any special flex CSS.
- **Known CSS quirk to remember when tuning these widths further:** under `table-layout: fixed`, if a table's specified column widths don't sum to the table's own rendered width (`width: 100%` here), browsers redistribute the leftover space — and empirically (Chrome) this redistribution is NOT confined to only the unwidthed/flex columns; explicitly-`ch`-widthed columns can also get stretched wider than their spec, by different amounts in different tables depending on how many other columns and how much other content compete for space. This is why the same `.col-location` class renders at different actual pixel widths in CME (~136px) vs. Equipment (~162px) despite an identical `width: 18ch` rule — expected and harmless (Location is allowed to be roomy), but it means these `ch` values can't be treated as an exact guaranteed pixel size, only a lower-bound content budget. Don't assume a `ch` value that looks right in one table's screenshot is safe in another without checking — see Verified below for the actual method.

**Verified** (v1.7.6) via a CDP-driven headless-Chrome pass, with a specific methodology correction worth remembering: **`element.getClientRects().length` does NOT detect text wrapping inside a `<td>`** — a table cell is a block-level box, so it always reports exactly one rect regardless of how many lines its text content wraps to internally. The first verification pass used this method and produced false negatives (reported no wrapping where wrapping was actually occurring). The corrected method walks each cell's text nodes, builds a `Range` over each one, and counts the **Range's** `getClientRects()` (which does return one rect per visual line for wrapped inline content) — plus a separate `overflowsRight` check (does any line's rect extend past the cell's own right edge) to catch horizontal overflow/collision distinct from wrapping. This caught two real bugs the first (flawed) pass missed entirely: Case # overflowing its cell in every table at the original `10ch`, and the CME needs-review ICD-10 cell's ⚠ icon+code overflowing at the original `8ch` (the first check measured only the inner `.cme-icd10-stack` div, missing that the icon sits beside it in the same flex row — fixed by measuring the full flex wrapper). Final tuned values (`.col-date: 15ch`, `.col-location: 18ch`, `.col-caseno: 12ch`, `.col-creation-user: 14ch`, `.cme-approval-table .col-icd10: 13ch`) confirmed via this corrected method across all four tools with a realistic multi-row fixture including a genuinely long location name edge case ("WBMB MINOR PROCEDURE ROOM 2", which correctly wrapped without overflow) and realistic 7-digit numeric case numbers (an earlier pass had used letter-prefixed test IDs like "CASE104", which are wider than real Epic case numbers and produced a misleading overflow finding on `.col-caseno` — corrected before tuning). Zero console errors, zero remaining overflow, screenshots confirmed no table looked visually broken or disproportionate.

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

**Negation detection — three-state (v1.6.9, replaces the old binary "no [keyword]" suppression):** `findEquipmentTermsInText()` is now negation-agnostic (the old `isPrecededByStandaloneNo()` early-exclusion, which silently dropped "no Ultrasound"-style matches before they ever reached `foundTerms`, was removed — it gave no audit trail, which the new design requires). Negation is instead evaluated downstream in `auditEquipmentRows()`, per keyword-candidate that matched in Special Needs and is absent from Equipment, via `evaluateNegation(specialNeedsText, termMatch)`, on the **original** (non-separator-normalized) text so word distance and sentence/list scope stay meaningful:
- **SUPPRESS** — a negation cue is tightly bound to the keyword: within 4 word-tokens (either before or after — cues like "not needed"/"not required"/"declined" read naturally as suffixes, e.g. "Microscope not needed") with no scope-breaker in the gap. Not flagged as missing; instead recorded as a trace, format: `"{Keyword} mentioned with '{cue}' — not flagged"`. If a case's *only* found-and-missing candidate(s) all suppress, the case still surfaces as a row (so the trace is auditable in Details) but with `flagged: false` — excluded from the `equipmentMissingCountEl` metric (which now filters `result.includedRows` on `.flagged`), no red "(keyword not found)" tag, no amber Special Needs highlight (nothing is actually missing).
- **QUESTIONABLE** — a cue is present but not tightly bound (farther than 4 tokens, OR a scope-breaker sits between cue and keyword). Still flagged as missing (`flagged: true`) — the explanation cell gets an amber ⚠ triangle icon (`buildQuestionableIcon()`, inline SVG, `var(--warn)`) plus an appended amber note: `"{Keyword} flagged, but negation wording ('{cue}') appears nearby — review in context."` (`row.questionableNote`, styled via `var(--warn)`, click-to-copy includes the note).
- **NORMAL** — no cue found on either side. Unchanged from pre-v1.6.9 behavior.
- **Cue list** (`NEGATION_CUES`, whole-phrase/word boundary match, case-insensitive): `no, not, does not need, doesn't need, do not need, don't need, no need for, without, w/o, declined, decline, cancel, cancelled, canceled, d/c, discontinue, not needed, not required`.
- **Scope-breakers** (`SCOPE_BREAKER_PHRASES` + punctuation check in `hasScopeBreaker()`): the phrases `but, however, except, although, though, still, will need, needs, will require`, PLUS any sentence boundary (`.` `;`) or list separator/newline (`,` `\n`) in the gap between cue and keyword.
- The nearest cue on each side (rightmost before the keyword, leftmost after it) is the one considered; whichever side yields the more confident result wins (suppress > questionable > normal) — deliberately **conservative**: any cue found anywhere nearby, even across a scope-breaker, downgrades to at least QUESTIONABLE rather than clearing to NORMAL (a false negative — hiding a real miss — is worse than an extra questionable flag).
- Verified brand/modifier words between a tightly-bound cue and the keyword count as normal tokens toward the 4-word window (e.g. "does not need **Leica** Microscope" still suppresses, case 4079837).
- Details pane gained a "Suppressed mentions" section (`row.suppressedTraces`, muted `var(--muted)` text), shown only when non-empty, listing every suppressed keyword's trace for that case — independent of whether the row itself ended up flagged for a *different* keyword.

**Separator-insensitive matching (v1.6.8):** A new tier, `findSeparatorInsensitiveMatch()`, runs between the exact-substring tier and the prefix-token tier in both `findEquipmentTermsInText()` and `containsEquipmentTerm()`. It lowercases and strips spaces/hyphens from the keyword (`collapseSeparators()`) and compares that to the concatenation of one or more whole adjacent source tokens (window sizes = keyword's own token count ±1, same convention as the existing fuzzy matcher) — so "C-arm", "C arm", and "CARM" all reduce to `carm` and match each other in either direction, and a hypothetical multi-word keyword like "Cell Saver" would match a fully collapsed "cellsaver" in the text and vice versa. It only ever concatenates **whole tokens**, never a substring carved out of one longer token, so short keywords (NIM → `nim`, CUSA → `cusa` — the two flagged as collision-risky in the v1.6.8 investigation) can't fire inside an unrelated word like "minimum" or "Cusack". Note: the original, untouched exact-substring tier (`lowered.indexOf(search)`) has **no such boundary guard** and already had this exact collision risk before v1.6.8 — that's a pre-existing characteristic of the oldest matching tier, not something introduced or fixed by this change. Respects the existing `KEYWORD_OPTIONS.requiresPrefix` gate and "no [keyword]" suppression exactly like the prefix/fuzzy tiers. Fixed a real miss: case 4124561 (Zhang, WBMB) had Special Needs "CARM" (no separator), which none of the four original tiers matched against keyword "C-arm".

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
| OPS-2 | Pediatric Room | equipmentContainsAny: ["Cart Pediatric", "Warmer Overhead (French Fry)"] OR patientAgeUnder: 18 — overridden by OPS-1 | OR4, OR3, OR5 |

Peds explanation (`buildExplanation()`, `app.js`): "Pediatric cases belong in OR 4. If unavailable, consider OR 3 or OR 5."

**v1.6.10 — sanctioned-fallback compliance (not availability logic):** OPS-2's `allowedRooms` in `rules-data.js` was `["OR 4"]` only, which meant a pediatric case correctly placed in OR 3 or OR 5 — rooms the rule's own alert text already names as acceptable fallbacks — still fired the Tier 1-2 alert (false positive; case 4077877, Wu adenotonsillectomy, OR 3). Fixed by widening `allowedRooms` to `["OR 4", "OR 3", "OR 5"]`, so all three are now statically compliant (silent, no alert/flag) via the same array-membership check every other room rule already uses (`rule.allowedRooms.includes(normalizedRoom)`) — no new mechanism. OR 4 remains the stated preferred room in the explanation text; OR 3/OR 5 are fallbacks, unchanged in meaning. This is distinct from the **pre-existing** availability-aware suppression block further down in `app.js` (`ops2Suppressed`, added earlier) that suppresses the alert for cases in *other* rooms when OR4/OR3/OR5 all lack a feasible prime-time slot that day — that block is untouched and still applies only to non-OR4/3/5 placements. Room-availability/occupancy-aware compliance (checking whether OR 4 was actually open) remains a separate, not-yet-built future item.

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
- Y axis: driven directly by `CAMPUS_CONFIG.WBVC.rooms` (`rules-data.js`) — OR1 through OR14, skipping OR13 (13 rooms total), all always shown
- Case blocks: Proj Start Time (left edge) to Proj End Time (right edge)
- Darker beige for setup/cleanup (Proj Start→Proc Start and Proc End→Proj End)
- Lighter beige for procedure time (Proc Start to Proc End)
- Case tile text: surgeon last name bold, procedure name, case number bold — left-aligned to full tile edge
- Case tile color: entire tile takes color of highest severity alert/flag (red=T1, orange=T2, amber=T3, blue=T4, grey=T5). Clean cases = beige.
- Reference line: dashed vertical at 07:30. Every other Friday starting 5/29/2026, line moves to 09:00 (biweekly: 5/29, 6/12, 6/26, 7/10...)
- Hover tooltip: shows surgeon, time range, lists each alert/flag with rule label and explanation
- Click tile: opens right sidebar with full case details and per-violation tier badges. Clicking outside sidebar closes it (except clicking another tile opens that tile's sidebar instead)
- **Sidebar "Rules satisfied" / "Rules suppressed by hierarchy" (v1.6.4):** below the existing alerts/flags block, the sidebar shows two more sections, each rendered only when non-empty. Data is computed per case in `auditRoomRules()`'s evaluation loop (not derived at render time) and attached directly to each `cases[]` entry as `appliedSatisfied[]`/`appliedSuppressed[]` — `{ ruleId, ruleLabel, ruleTier, reason }` for satisfied (reason = `describeMatch(rule)`, the same trigger-description helper used in Rule Management), `{ ruleId, ruleLabel, ruleTier, governedBy }` for suppressed. A rule is **applied** if `ruleTriggersForCase()` matched (regardless of outcome); of applied rules, **satisfied** = compliant with its own `allowedRooms` for the case's actual room; **suppressed** = not compliant on its own but silenced by a compliant Tier 1-2 rule — either the explicit `suppressesWhenCompliant` link (governor = the specific rule that names it, e.g. hard-2 SP Robot naming hard-1 DV5) or the blanket "any compliant Tier 1-2 rule silences all Tier 3+ rules" rule (governor = the compliant Tier 1-2 rule(s), joined with "and" if more than one) — explicit governor takes precedence when both could apply. **Suppression behavior itself is unchanged**: suppressed rules still never appear as alerts/flags or in `violations`, exactly as before — this only makes the existing silencing visible in its own section rather than the rule disappearing with no trace. The separate T3/ops-2 "no feasible prime-time slot" post-processing suppression (a different, infeasibility-based mechanism) is intentionally NOT surfaced in "Rules suppressed by hierarchy" — those still just don't appear, unrelabeled, since attributing them to a governing rule would misstate why they didn't fire. Sidebar DOM: `.sb-rule-status`/`.sb-rule-satisfied`/`.sb-rule-suppressed` sections, `.sb-rule-item`/`.sb-rule-icon`/`.sb-rule-name`/`.sb-rule-reason`; satisfied rows show a green check (`--ok-soft`/`--brand-dark`), suppressed rows show a neutral dash (`--muted`) with reason text "Superseded by [governor] room compliance".
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
- Rooms: OR1–OR14 (**no OR13** — skipped per WBVC room-numbering convention, room does not exist; do not reintroduce it into `CAMPUS_CONFIG.WBVC.rooms` in `rules-data.js` or any room-list/mapping. Confirmed v1.6.3: "OR 13" had been erroneously present in the `rooms` array since some earlier version, was removed, and a repo-wide grep confirmed it was the only reference — no room rule, suppressor, or Gantt column referenced it separately, since the Gantt reads `CAMPUS_CONFIG.WBVC.rooms` directly)
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
- CPT audit results: rendered as 2 collapsible accordion sections (all collapsed by default) in `#cptAccordion` div; accordion built entirely by `renderResults()` via `makeAccordionSection()` helper; each header shows title + count badge + caret that rotates when open. Table 1: **Inpatient-Only CPT Codes on Outpatient Cases (Medicare)** (4 cols: Date, Location, Case #, Explanation) — codes in explanation shown bold (plain text, no links); Medicare filter: `indexes.payer == null` (column absent) → row is eligible (backward compat); column present + empty cell → NOT flagged; column present + value contains "medicare" (case-insensitive) → flagged; optional `payer` column accepted as ["payer", "primary payer", "financial class"]. Table 2: **CPT Code Discrepancies** — consolidated bidirectional table (replaced the old Tables 2 and 3 in v1.4.19; the old Table 3 render path, `errorMessages` return field, `unrecognizedCodes`, and `codeListTd` were removed). Audit logic in `auditRows()`: `missingCodes` = on order, valid, not on case panels (presence-based/set-membership, **not** quantity-aware as of v1.6.2 — see note below); `notOnOrderCodes` = on case panels, valid, not on the order (same extraction/normalization reversed, also presence-based); `invalidCodes` = any code from either side not in `validCptCodes`, as `{ code, origin: "order" | "case" }` objects — validity check runs first so invalid codes never appear in the directional arrays; short-code errors (`extractCodes().errors`, order side) fold into `invalidCodes` with origin "order"; `KNOWN_PROBLEM_CPTS` exclusion applies to all three buckets; a row is pushed to `discrepancyRows` if any bucket is non-empty; each row carries `{ date, sortDate, location, caseNumber, orderCodes, caseCodes, missingCodes, notOnOrderCodes, invalidCodes }`. Result object is `{ totalRows, discrepancyRows, inpatientRows }` (no `missingRows`/`errorMessages`). Table 2 accordion badge is a breakdown string: "N cases: X missing, Y not on order, Z invalid" (case counts, not code counts). Table 2 cols: Date, Location, Case #, On Order Not on Case, On Case Not on Order, Invalid CPT Codes (column headers renamed v1.4.26; underlying field names `missingCodes`/`notOnOrderCodes`/`invalidCodes` and filter chip labels unchanged); Date cell reuses the equipment audit pattern (date text + `.equip-toggle-affordance` "▶ Details", arrow rotates via `.expanded` on the `.equip-row-main` row); Case # cell: bold copyable span via `makeCopyable`. Missing cell: amber marks (click-to-copy toast) + "CPT Lookup" link + "Click to report CPT not in Epic" mailto button per code. Not on Order cell: blue marks (`background:#dbeafe;color:#1e40af`) + CPT Lookup link, no report button. Invalid cell: red marks (click-to-copy, NOT AAPC-on-click) + muted origin tag "(on order)"/"(on case)" + CPT Lookup link per code, plus one label line below: "Invalid CPT - check for typo or contact ordering provider". Empty code cells render a muted "—" via `emptyCodeTd()`. Shared helpers: `AMBER_MARK_CSS`/`BLUE_MARK_CSS`/`RED_MARK_CSS`/`SMALL_ACTION_CSS` constants, `copyCodeMark(code, css, markVisited)`, `cptLookupLink(code)`. Clicking the row toggles a detail row (`buildCptDetailRow`, `.equip-detail-row`, td colSpan=6, `.equip-detail` grid) with side-by-side "CPT Codes on Order" / "CPT Codes on Case" lists (`buildCodeListValue`): missing codes render as amber marks in the order list, not-on-order codes as blue marks in the case list, invalid codes as red marks in their origin list, all other codes plain text, comma-separated; empty list renders "None"; all detail marks click-to-copy (no row-visited); header row includes right-aligned "Report an issue" `.rule-flag-btn` → mailto subject "CPT Audit Issue", body "CASE: [n]\n\nISSUE: ". Summary metric label for `missingCount` is "CPT discrepancy cases" (= `discrepancyRows.length`). Row-visited highlighting: clicking a case number adds `row-visited` inside `makeCopyable()`; marks/links/buttons in the three code cells add it in their own handlers (detail-pane marks excepted); `addRowVisitedDelegation` function is defined but no longer called from `renderResults`.

**Table 2 filtering is a pure visibility operation (v1.6.5):** applying/changing/clearing a Table 2 filter (campus or flag-type chip) must never reset the Level 1 "Table 2: CPT Code Discrepancies" accordion, a row's Details-expander state, or its sage `row-visited` coloring — filtering only decides which rows are shown. Three session-level state holders (module scope, alongside `lastCptResult`): `cptTable2AccordionOpen` (boolean), `cptVisitedCaseIds` (Set of case numbers), `cptOpenDetailCaseIds` (Set of case numbers) — all keyed to case number, held independent of current filter visibility, so a row that gets filtered out and later filtered back in reappears with its prior state intact (not tied to DOM element continuity). They're only reset in `renderResults()` (a genuinely new audit run — fresh file upload or rerun), never in `renderCptTables()` (which runs on every filter chip click and rebuilds the table body from scratch, same as before). `makeAccordionSection(title, count, buildBody, opts)` gained an optional 4th param `{ initiallyOpen, onToggle }` (only Table 2's call site uses it; Table 1 still always starts collapsed, unaffected/out of scope) so the Level 1 open/closed state can be seeded and tracked externally instead of being reset to closed on every rebuild. Each Table 2 `tr` gets `dataset.caseNum`; on build, `row-visited`/`expanded`+`detailTr.hidden=false` are reapplied if the case number is in the respective Set. The Details-toggle click listener (unchanged trigger) now also adds/deletes the case number from `cptOpenDetailCaseIds`. Row-visited capture uses a **capture-phase** click listener on `tr` (fires before any descendant's `e.stopPropagation()`, e.g. from `copyCodeMark`/`cptLookupLink`/`makeCopyable`) that defers its check via `setTimeout(fn, 0)` so it reads `tr.classList` after the synchronous handler that actually adds `row-visited` has run — this avoids modifying any of those shared helpers (also used by Equipment audit and the Gantt sidebar), keeping the change scoped to CPT Table 2 rendering only. Verified in headless Chrome with a 2-row discrepancy fixture: opened Table 2, expanded Details + sage-colored one row, applied Missing filter (row hidden, its lone counterpart shown), applied Invalid filter (original row reappeared with Details still open and sage coloring intact — the round-trip case), cleared filters (both rows shown, state intact) — Level 1 accordion stayed open throughout.

**Presence-based comparison (v1.6.2, reverting v1.5.11's count-aware logic):** The source Epic report collapses duplicate CPTs to a single instance on the case side (`panelCodes`/"CPT Codes - All Panels" column) — a case with twelve entries of 55715 in Epic exports as just "55715", no repetition, while the order side (`insuranceInfo`/"Insurance Info") still carries multiplier notation like "55715x12". v1.5.11 added a frequency-map/count-difference comparison assuming both sides carried true quantities, which caused false "N missing" discrepancies whenever an order had a multiplier — a code present on both sides at "unequal counts" was actually just the normal case-side collapse, not a real gap. v1.6.2 reverted `missingCodes`/`notOnOrderCodes` to simple set-membership: a code is missing/not-on-order only if it's absent from the other side entirely, regardless of quantity. `extractCodes()` still parses and preserves multiplier suffixes (e.g. "15774x3") for **display only** — `display[]` renders the raw as-typed text in the Details accordion — but `codes[]` (used for comparison) carries only deduped base codes; the `counts` field extractCodes used to return for the frequency-map math was removed as dead code. Invalid-code detection is unaffected: a multiplier on an invalid base (e.g. "99999x2") still surfaces in `invalidCodes`.
- Equipment audit results table: columns are Date, Location, Case #, Surgeon (optional), Special Needs, Explanation, Creation User (7 cols; **v1.7.2** added Creation User as a new required — not optional, since Epic always populates it — rightmost column, `formatCreationUser(cell(row, indexes.creationUser))` added to `baseRow` in `auditEquipmentRows`, required entry added to `equipmentRequiredColumns`; `findHeaderInfoForColumns` failure message updated to name it); class `equipment-missing-table` on the static `<table>` in index.html; CSS widths ~7% Date, ~10% Location, ~8% Case #, ~10% Surgeon, ~25% Special Needs, ~28% Explanation, ~12% Creation User. Detail pane colSpan=7 (bumped from 6 in v1.7.2, along with the empty-state `emptyRow()` colSpan). Surgeon column uses `parseSurgeonLastName()`; surgeonId uses `extractSurgeonId()`. Date uses `parseDateCell()`. KEYWORD_ALIASES maps keyword → alias strings checked first in `containsEquipmentTerm()` (e.g. PTeye→parathyroid). KEYWORD_DISPLAY_NAMES maps keyword → display name used in explanation string (e.g. Neoprobe→TruNode). Date cell holds the date text plus the "▶ Details" toggle affordance below it (`.equip-toggle-affordance` with inline `display:block;margin-top:4px`, overriding its normal flex display so the icon/label spans render inline within the block). Case # cell is a plain `<td>` containing only a bold, copyable `<span>` (via `makeCopyable`) — no wrapper div, no flex styling. SURGEON_EQUIPMENT_PREFS keyed by surgeon ID string with optional `ultrasound`/`microscope` fields; "Surgeon Preference" section in the detail pane is rendered ONLY when `row.keyword.toLowerCase()` is "ultrasound" or "microscope" AND `row.location` matches `/wbvc/i` (skipped entirely otherwise); when shown, the value text has `cursor: pointer` and is click-to-copy via `navigator.clipboard.writeText()` + `showToast("Copied: " + prefText)`. "No preference on file" text is keyword-specific: "No ultrasound preference on file" / "No microscope preference on file" — used both when the surgeon has no SURGEON_EQUIPMENT_PREFS entry and when the relevant field is absent from their entry. Equipment List in detail pane renders items exactly as they appear in the Epic export (no W-prefix stripping — `.replace(/^W\s+/, "")` was removed in v1.4.8). Epic export column headers confirmed: Date, Proc Start, Proc End, Case #, Lead Surgeon, Service, Case Procedures, Room, Status, Special Needs, Equipment, Patient Age, Base Patient Class, Proj Start Time, Proj End Time, Case Classification, CPT Codes - All Panels, Insurance Info, Payer.
- `.copy-case` CSS: `cursor: pointer` only (no `user-select: none`)
- All three tools accept the consolidated **CPMC Scheduling Automation** export; instructions updated to reference this name
- `sharedAuditData = { rows, filename }` caches parsed rows; `sharedAuditResults = { cpt, equipment, roomRules, cptError, equipmentError, roomRulesError }` caches computed results; Run on any tool calls `_runAllAudits(file)` which stores results in `sharedAuditResults` (no rendering inside `_runAllAudits`); run button handler then calls `_showCachedResult(toolKey)` for the clicked tool; `showFromShared()` in `showView` calls `_showCachedResult(toolKey)` for navigated-to tools; `_showCachedResult` renders from cache, unhides panel, sets status, enables buttons; Clear nulls both `sharedAuditData` and `sharedAuditResults`; each `wireAuditTool` call includes `toolKey: "cpt" | "equipment" | "roomRules"`
- Column `accepted` arrays expanded throughout to match consolidated report column names (e.g. "case/appt date", "lead surgeon (as scheduled)", "sh ip surgical equipment", "surgical service (as scheduled)", etc.)
- `findHeaderInfoForColumns`: columns with `optional: true` are excluded from the missing-column check; optional `room` and `department` columns added to CPT and equipment audits; location = department value if present, else room value
- Known Problem CPTs: `KNOWN_PROBLEM_CPTS` is a hardcoded array in `rules-data.js` (not app.js) — entries have `{ code, description, dateAdded, ticket }` fields. As of **v1.6.11** the array contains 9 entries: J7296 (Kyleena IUD), J7301 (Skyla IUD), Q0091 (Pap smear), Q9967 (contrast material), 44394 (colonoscopy through stoma with snare) — all dateAdded "2026-06-17" — plus **J7297** (Liletta IUD), **J7298** (Mirena IUD), **J7300** (Paragard IUD), **J7307** (Nexplanon implant), all dateAdded "2026-07-27", ticket "Pending". **45386** (colonoscopy with transendoscopic balloon dilation) was removed in v1.6.6. All codes remaining in the array are excluded from `missingCodes`, `notOnOrderCodes`, `invalidCodes`, and `inpatientMatches` until removed from this array. A "View known problem CPTs" ghost button in the CPT audit instructions panel navigates to `knownProblemCptsView`, which renders a 4-column table (Code, Description, Date Added, Ticket) or "No known problem CPTs on file." only when the array is empty. Table 2 Missing cells show each code as `<mark>` + "Click to report CPT not in Epic" button; clicking opens a mailto to Thomas.Boone@SutterHealth.org with subject "CPT Not in Epic" and body "CPT CODE: XXXXX".

  **v1.6.7 → v1.6.11 history for J7297/J7298 (Liletta/Mirena IUD):** removed in v1.6.7 as apparently-fixed, **re-added in v1.6.11** because the underlying defect had not actually been fixed. Root cause for all four codes now on the list (J7297, J7298, J7300, J7307): each is a linked code on the "INSERTION OR REMOVAL, IUD" order-record procedure (ORP), but **none of the four exist as an active record in the Database Codes master file**. When a scheduler builds a case off this ORP, Epic looks up each linked code against the master file and silently drops any code that isn't found there — so these codes can never appear in "CPT Codes - All Panels" on the case, regardless of what device was actually placed. Meanwhile a scheduler can and does type the code into the free-text Insurance Info field when the paper order form specifies one, so it does appear "on order." The result is a permanent, one-directional false positive ("on order, not on case") that is **not fixable by scheduler behavior** — it requires IT to build the missing master-file records. The prior J7297/J7298 ticket appears to have only updated the ORP-level code-link association (visible in Case Entry's procedure code table) rather than building the master-file record itself, which is why the defect persisted after that ticket was marked resolved. Any future ticket for these codes should explicitly confirm the code is searchable/selectable in **Database Codes** (not just linked to the procedure) before being marked fixed. All four codes should stay on this list until Tom confirms all four are selectable in Database Codes.
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
- OR Staffing Budget Calculator (v1.5.3–v1.5.10): the tool's full build/iteration history (FTE math corrections, the two-file PDF-join evolution, sticky-header CSS fixes, etc.) previously lived here as a long series of dated bullets. The tool was **archived in v1.6.12 (2026-07-27)** — see the **Archived Tools** section near the top of this file for a summary and the `archive/staffing-tool` recovery branch, which preserves the full pre-removal code and commit history.
