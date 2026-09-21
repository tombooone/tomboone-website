#!/usr/bin/env node
/**
 * Gantt visual regression test — Room Rules Audit Gantt chart badges/layout.
 *
 * Builds a synthetic (non-PHI) OR schedule fixture in memory, drives a local
 * Chrome install headlessly against index.html, uploads the fixture into the
 * Room Rules tool, and asserts on the rendered Gantt: service emoji, robot
 * badges (case-level and room-level, both using the shared ROBOT_BADGE_EMOJI
 * constant 🦾 as of this session — including a regression check for the
 * "double robot icon" bug where a case with Service="Robotics" AND detected
 * DV5/SP equipment previously showed both the generic service emoji and the
 * platform badge, both robot-themed), the 3-light "x3" indicator, the Icon
 * Legend (position below the Gantt, ~7-column layout, alphabetical service
 * ordering with the three special entries after it, simplified label text),
 * the service-switching cue (icon-only, no line as of this session — only
 * rendered between two directly ABUTTING cases with no visible time gap;
 * a genuine scheduling gap suppresses it entirely, including the
 * Gynecology/Obstetrics exception pair which applies regardless of gap
 * status), the
 * hidden-but-still-rendering violations table, bracketed-procedure-ID
 * stripping on case blocks, and the HARD-5 (Transplant Room) donor-
 * nephrectomy/transplant robotic-pairing suppression -- as of v1.7.20,
 * symmetric in both directions (the nephrectomy case can be the one flagged
 * and suppressed, not just the transplant case; the partner case can be
 * either immediately before or immediately after) -- read directly from
 * the audit's in-memory violations list via `_lastAuditResult`, not the
 * rendered table).
 *
 * This is the first committed browser-testing script in this repo (prior
 * sessions used throwaway scratchpad scripts) — reuse/extend this one for
 * future Gantt or other visual-regression checks rather than writing a new
 * one from scratch.
 *
 * One-time setup per machine (same convention as scripts/build-items.mjs and
 * the xlsx dependency — package.json is gitignored in this repo, so
 * dependencies are installed manually, not tracked):
 *   cd tomboone-website && npm install xlsx puppeteer-core
 *
 * Usage:
 *   node scripts/gantt-visual-test.js [--out <screenshot-path>] [--chrome <path-to-chrome>]
 *
 * Exit code is non-zero if any assertion fails.
 */

const path = require("path");
const os = require("os");
const fs = require("fs");

function requireOrExit(name) {
  try {
    return require(name);
  } catch {
    console.error(`The '${name}' package is required. Run: npm install ${name}`);
    process.exit(1);
  }
}

const XLSX = requireOrExit("xlsx");
const puppeteer = requireOrExit("puppeteer-core");

const args = process.argv.slice(2);
function argValue(flag, fallback) {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
}

const REPO = path.resolve(__dirname, "..");
const OUT_PATH = path.resolve(argValue("--out", path.join(os.tmpdir(), "gantt-visual-test.png")));
const CHROME_CANDIDATES = [
  argValue("--chrome", null),
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser"
].filter(Boolean);
const CHROME = CHROME_CANDIDATES.find((p) => fs.existsSync(p));

if (!CHROME) {
  console.error("No Chrome/Chromium executable found. Pass one with --chrome <path>.");
  process.exit(1);
}

// ── Synthetic, non-PHI fixture ──────────────────────────────────────────────
const fmtDate = (d) => `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
const BASE_DATE_OBJ = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 14); // safely inside the prospective-only window
  return d;
})();
const DATE = fmtDate(BASE_DATE_OBJ);
// Same-month offsets from DATE, used for the v1.7.21 re-tiering calendar-color
// scenarios below — these need their OWN dates (isolated from the mixed-tier
// violations already on DATE) so a day's color can be attributed to exactly
// one tier. Falls back to subtracting instead of adding if that would cross
// a month boundary (calendar month-nav isn't exercised by this script).
function sameMonthOffset(days) {
  let d = new Date(BASE_DATE_OBJ);
  d.setDate(d.getDate() + days);
  if (d.getMonth() !== BASE_DATE_OBJ.getMonth()) {
    d = new Date(BASE_DATE_OBJ);
    d.setDate(d.getDate() - days);
  }
  return d;
}
const DATE_RED    = fmtDate(sameMonthOffset(1));
const DATE_ORANGE = fmtDate(sameMonthOffset(2));
const DATE_MIXED  = fmtDate(sameMonthOffset(3));

const headers = [
  "Case #", "Date", "Room", "Case Procedures", "Equipment", "Patient Age",
  "Service", "Lead Surgeon", "Proj Start Time", "Proj End Time",
  "Proc Start", "Proc End", "Patient Class", "Status", "Case Classification"
];

const rows = [
  headers,
  // OR7: designated Cardiac + 3-light room; also exercises bracketed-ID stripping.
  ["9000001", DATE, "WBVC OR 07", "CABG (single) [87500876]", "Machine Heart Lung Perfusion", "60 yrs",
   "Cardiac", "Egrie, Jonathan, MD [30059201]", "07:30:00", "10:00:00", "07:45:00", "09:45:00",
   "Inpatient", "Scheduled", "Elective"],
  // OR2: DV5 room robot badge (case-level + room-level). Service is
  // literally "Robotics" here on purpose -- this exact combination (a real
  // SERVICE_EMOJI key that ALSO happens to be a robotic case) was the real
  // cause of the reported "double robot icon" bug: the generic Robotics
  // service emoji plus the case-level platform badge, both robot-themed.
  ["9000002", DATE, "WBVC OR 02", "Robotic prostatectomy", "Robot DaVinci DV5", "55 yrs",
   "Robotics", "Kardos, Alice, MD [108387]", "07:30:00", "09:30:00", "07:45:00", "09:15:00",
   "Outpatient", "Scheduled", "Elective"],
  // OR5: SP room robot badge (case-level + room-level). OR3 gets its DV5 room
  // badge checked with no case present at all, purely from the room list.
  ["9000003", DATE, "WBVC OR 05", "Robotic partial nephrectomy", "DaVinci Robot SP", "48 yrs",
   "Urology", "Lin, David, MD [107858]", "07:30:00", "10:00:00", "07:45:00", "09:45:00",
   "Outpatient", "Scheduled", "Elective"],
  // OR10: General -> General -> Vascular. Fully back-to-back (0-minute gaps
  // throughout, modeled on OR10's real tight density): confirms an abutting
  // SAME-service pair still shows no icon, and the abutting DIFFERENT-service
  // pair right after it does.
  ["9000004", DATE, "WBVC OR 10", "Hernia repair", "", "50 yrs",
   "General", "Jossart, Karl, MD [105751]", "07:30:00", "09:00:00", "07:45:00", "08:45:00",
   "Outpatient", "Scheduled", "Elective"],
  ["9000005", DATE, "WBVC OR 10", "Gallbladder removal", "", "52 yrs",
   "General", "Jossart, Karl, MD [105751]", "09:00:00", "10:45:00", "09:30:00", "10:30:00",
   "Outpatient", "Scheduled", "Elective"],
  ["9000006", DATE, "WBVC OR 10", "Varicose vein stripping", "", "58 yrs",
   "Vascular", "Jossart, Karl, MD [105751]", "10:45:00", "12:15:00", "11:00:00", "12:00:00",
   "Outpatient", "Scheduled", "Elective"],
  // OR6: back-to-back (0-minute gap) service change, modeled on OR6's real
  // tight density — the other explicit stress-test room requested.
  ["9000011", DATE, "WBVC OR 06", "Kidney transplant", "Cooler Donor", "42 yrs",
   "Transplant", "Weber, Susan, MD [105621]", "07:30:00", "09:00:00", "07:45:00", "08:45:00",
   "Outpatient", "Scheduled", "Elective"],
  ["9000012", DATE, "WBVC OR 06", "Hernia repair", "", "47 yrs",
   "General", "Weber, Susan, MD [105621]", "09:00:00", "10:30:00", "09:15:00", "10:15:00",
   "Outpatient", "Scheduled", "Elective"],
  // OR9: service absent from SERVICE_EMOJI — graceful no-emoji fallback.
  ["9000007", DATE, "WBVC OR 09", "Trauma exploratory laparotomy", "", "40 yrs",
   "Trauma Surgery", "Char, Wendy, MD [500276]", "07:30:00", "09:30:00", "07:45:00", "09:15:00",
   "Emergent", "Scheduled", "Non-Elective"],
  // OR8: Gynecology -> Obstetrics (suppressed pair, no cue) -> General (cue reappears).
  ["9000008", DATE, "WBVC OR 08", "Hysterectomy", "", "45 yrs",
   "Gynecology", "Zhang, Irene, MD [20158330]", "07:30:00", "09:00:00", "07:45:00", "08:45:00",
   "Outpatient", "Scheduled", "Elective"],
  ["9000009", DATE, "WBVC OR 08", "Cesarean section", "", "30 yrs",
   "Obstetrics", "Zhang, Irene, MD [20158330]", "09:15:00", "10:45:00", "09:30:00", "10:30:00",
   "Outpatient", "Scheduled", "Elective"],
  ["9000010", DATE, "WBVC OR 08", "Hernia repair", "", "50 yrs",
   "General", "Zhang, Irene, MD [20158330]", "11:00:00", "12:30:00", "11:15:00", "12:15:00",
   "Outpatient", "Scheduled", "Elective"],

  // ── HARD-5 donor-nephrectomy/transplant pairing suppression scenarios ──
  // Scenario 1: DV5 donor nephrectomy immediately followed by a (non-robotic)
  // transplant, both in OR3 (a valid DV5 room) -> transplant's HARD-5 must
  // be suppressed.
  ["9000021", DATE, "WBVC OR 03", "Left Robotic DV5 Assisted Laparoscopic Donor Nephrectomy", "Robot DaVinci DV5", "45 yrs",
   "Transplant", "Valone, Peter, MD [20041597]", "07:30:00", "09:30:00", "07:45:00", "09:15:00",
   "Outpatient", "Scheduled", "Elective"],
  ["9000022", DATE, "WBVC OR 03", "Living Related Renal Transplant", "Cooler Donor", "50 yrs",
   "Transplant", "Valone, Peter, MD [20041597]", "09:45:00", "12:15:00", "10:00:00", "12:00:00",
   "Outpatient", "Scheduled", "Elective"],

  // Scenario 2: SP donor nephrectomy immediately followed by a (non-robotic)
  // transplant, both in OR5 (a valid SP room, already hosting an unrelated
  // earlier SP case 9000003 that ends well before these start) -> suppressed.
  ["9000023", DATE, "WBVC OR 05", "Left Laparoscopic Donor Nephrectomy", "DaVinci Robot SP", "44 yrs",
   "Transplant", "Reiter, Anna, MD [20063777]", "10:15:00", "11:45:00", "10:30:00", "11:30:00",
   "Outpatient", "Scheduled", "Elective"],
  ["9000024", DATE, "WBVC OR 05", "Living Unrelated Renal Transplant Possible Insertion Of Central Line", "Cooler Donor", "52 yrs",
   "Transplant", "Reiter, Anna, MD [20063777]", "12:00:00", "14:30:00", "12:15:00", "14:15:00",
   "Outpatient", "Scheduled", "Elective"],

  // Scenario 3: same DV5 pairing, but in OR1 -- NOT a valid room for DV5
  // (hard-1's allowedRooms are OR2/OR3/OR4/OR8 as of v1.7.26) -> HARD-5 must
  // still fire normally on the transplant case (suppression must not apply
  // here). Moved from OR4 to OR1 this session, since OR4 became a valid DV5
  // room in v1.7.26 (the Mission Bernal DV5 relocation) -- OR4 no longer
  // works as a "not a valid DV5 room" negative control.
  ["9000025", DATE, "WBVC OR 01", "Right Robotic DV5 Assisted Laparoscopic Donor Nephrectomy", "Robot DaVinci DV5", "46 yrs",
   "Transplant", "Kennedy, Owen, MD [515122]", "07:30:00", "09:30:00", "07:45:00", "09:15:00",
   "Outpatient", "Scheduled", "Elective"],
  ["9000026", DATE, "WBVC OR 01", "Living Related Renal Transplant", "Cooler Donor", "49 yrs",
   "Transplant", "Kennedy, Owen, MD [515122]", "09:45:00", "12:15:00", "10:00:00", "12:00:00",
   "Outpatient", "Scheduled", "Elective"],

  // Scenario 4: a transplant case in OR2 immediately preceded by an
  // UNRELATED DV5 case (the existing 9000002 robotic prostatectomy, ends
  // 09:30) that is NOT a donor-nephrectomy case -> the pairing requirement
  // must not be satisfied by "any" preceding case; HARD-5 must still fire.
  ["9000027", DATE, "WBVC OR 02", "Living Related Renal Transplant", "Cooler Donor", "53 yrs",
   "Transplant", "Kardos, Alice, MD [108387]", "09:45:00", "12:15:00", "10:00:00", "12:00:00",
   "Outpatient", "Scheduled", "Elective"],

  // Scenario 5: non-robotic donor nephrectomy immediately followed by a
  // non-robotic transplant, both in OR9 (a valid HARD-5 room already, so no
  // violation exists to suppress in the first place) -> normal compliant
  // behavior, confirming no regression from the new post-processing pass.
  ["9000028", DATE, "WBVC OR 09", "Left Laparoscopic Donor Nephrectomy", "", "47 yrs",
   "Transplant", "Char, Wendy, MD [500276]", "09:45:00", "11:15:00", "10:00:00", "11:00:00",
   "Outpatient", "Scheduled", "Elective"],
  ["9000029", DATE, "WBVC OR 09", "Living Related Renal Transplant", "Cooler Donor", "55 yrs",
   "Transplant", "Char, Wendy, MD [500276]", "11:30:00", "14:00:00", "11:45:00", "13:45:00",
   "Outpatient", "Scheduled", "Elective"],

  // Scenario 6 (v1.7.20 generalization, modeled on the real "Bellingham"
  // case): the NEPHRECTOMY case itself carries HARD-5-listed equipment
  // ("Cooler Donor") and is flagged on its own -- its procedure text has no
  // "transplant" substring at all, only "nephrectomy"+"donor". It is
  // immediately FOLLOWED (not preceded) by a DV5 robotic transplant case, in
  // OR3 (a valid DV5 room). A neutral buffer case (9000040) is inserted
  // right before it so its immediate PRECEDING neighbor is unrelated --
  // isolating this as a pure forward-direction check, since OR3 already has
  // Scenario 1's own transplant case ending right beforehand. Under the
  // pre-v1.7.20 backward-only, transplant-only logic this case was never
  // suppressed. It must be now.
  ["9000040", DATE, "WBVC OR 03", "Appendectomy", "", "40 yrs",
   "General", "Bellingham, Test, MD [999001]", "12:00:00", "12:15:00", "12:00:00", "12:15:00",
   "Outpatient", "Scheduled", "Elective"],
  ["9000041", DATE, "WBVC OR 03", "Left Laparoscopic Donor Nephrectomy", "Cooler Donor", "51 yrs",
   "Transplant", "Bellingham, Test, MD [999001]", "12:30:00", "14:00:00", "12:45:00", "13:45:00",
   "Outpatient", "Scheduled", "Elective"],
  ["9000042", DATE, "WBVC OR 03", "Left Robotic DV5 Assisted Living Donor Renal Transplant", "Robot DaVinci DV5", "51 yrs",
   "Transplant", "Bellingham, Test, MD [999001]", "14:15:00", "16:45:00", "14:30:00", "16:30:00",
   "Outpatient", "Scheduled", "Elective"],

  // Scenario 7: negative control for the forward direction -- a nephrectomy
  // case with its own HARD-5-listed equipment ("Cooler Donor"), in OR1 (not
  // a valid room for any robot platform or for HARD-5 itself), immediately
  // followed by an UNRELATED case with no "transplant" text. No partner
  // match exists, so the nephrectomy's own HARD-5 violation must still fire.
  // Moved from OR4 to OR1 this session for the same reason as Scenario 3
  // above (OR4 is now a valid DV5 room as of v1.7.26).
  ["9000043", DATE, "WBVC OR 01", "Left Laparoscopic Donor Nephrectomy", "Cooler Donor", "49 yrs",
   "Transplant", "Kennedy, Owen, MD [515122]", "12:30:00", "14:00:00", "12:45:00", "13:45:00",
   "Outpatient", "Scheduled", "Elective"],
  ["9000044", DATE, "WBVC OR 01", "Hernia repair", "", "50 yrs",
   "General", "Kennedy, Owen, MD [515122]", "14:15:00", "15:45:00", "14:30:00", "15:30:00",
   "Outpatient", "Scheduled", "Elective"],

  // OR12: Gynecology -> Obstetrics, directly abutting (0-minute gap). Isolates
  // that the Gyn/Obstetrics suppression pair still applies even when cases
  // ARE back-to-back (where gap-based suppression alone would NOT apply, so
  // this specifically proves the pair-exception logic is still functioning,
  // not just piggybacking on the new gap rule).
  ["9000031", DATE, "WBVC OR 12", "Hysterectomy", "", "45 yrs",
   "Gynecology", "Zakaria, Fatima, MD [20144424]", "07:30:00", "09:00:00", "07:45:00", "08:45:00",
   "Outpatient", "Scheduled", "Elective"],
  ["9000032", DATE, "WBVC OR 12", "Cesarean section", "", "30 yrs",
   "Obstetrics", "Zakaria, Fatima, MD [20144424]", "09:00:00", "10:30:00", "09:15:00", "10:15:00",
   "Outpatient", "Scheduled", "Elective"],

  // ── v1.7.21 re-tiering: calendar-color isolation scenarios ─────────────
  // DATE_RED: the ONLY violation this day is HARD-6 (Hybrid/Cath Lab,
  // still Tier 1 post-retier) -- "CV ACCESSION EQ" equipment in OR8 instead
  // of OR14. The day-level calendar swatch must be red.
  ["9000060", DATE_RED, "WBVC OR 08", "Cardiac catheterization", "CV ACCESSION EQ", "60 yrs",
   "General", "Testcase, Runner, MD [999099]", "07:30:00", "09:00:00", "07:45:00", "08:45:00",
   "Outpatient", "Scheduled", "Elective"],

  // DATE_ORANGE: the ONLY violation this day is HARD-3 (Neuro/Spine Room,
  // demoted to Tier 2 this session) -- "Table Jackson" equipment in OR1
  // instead of OR11/OR12. No HARD-1/2/6 violation exists this day, so the
  // calendar swatch must be the Tier 2 color, NOT red.
  ["9000061", DATE_ORANGE, "WBVC OR 01", "Spinal fusion", "Table Jackson", "60 yrs",
   "General", "Testcase, Runner, MD [999099]", "07:30:00", "09:00:00", "07:45:00", "08:45:00",
   "Outpatient", "Scheduled", "Elective"],

  // DATE_MIXED: negative control -- BOTH a HARD-1 (Tier 1) and a HARD-3
  // (Tier 2, demoted) violation land on the same day. Proves the red/orange
  // split is real precedence logic, not a hardcoded/vacuous result: if the
  // Tier-1 check were broken (e.g. always false, or the orange branch always
  // won), this day would wrongly show orange instead of red. Room moved
  // from OR4 to OR10 this session -- OR4 is now a valid DV5 room (v1.7.26),
  // so it no longer works as the "wrong room" half of this negative control.
  ["9000062", DATE_MIXED, "WBVC OR 10", "Robotic case in wrong room", "Robot DaVinci DV5", "60 yrs",
   "General", "Testcase, Runner, MD [999099]", "07:30:00", "09:00:00", "07:45:00", "08:45:00",
   "Outpatient", "Scheduled", "Elective"],
  ["9000063", DATE_MIXED, "WBVC OR 01", "Spinal fusion", "Table Jackson", "60 yrs",
   "General", "Testcase, Runner, MD [999099]", "10:00:00", "11:30:00", "10:15:00", "11:15:00",
   "Outpatient", "Scheduled", "Elective"],

  // ── v1.7.26 HARD-1 expansion: Mission Bernal DV5 relocation (mobile
  // between OR4/OR8, alongside the existing fixed DV5 in OR2/OR3) ─────────
  // OR4: DV5 equipment, now a valid room -> compliant, no HARD-1 violation.
  // Also proves a room can carry both its existing Pediatric General
  // designation badge (🧸) and the new robot badge together with no
  // clipping (checked via line2Overflow below).
  ["9000071", DATE, "WBVC OR 04", "Robotic case, Mission Bernal DV5 relocated here", "Robot DaVinci DV5", "50 yrs",
   "Urology", "Testcase, Runner, MD [999099]", "07:30:00", "09:00:00", "07:45:00", "08:45:00",
   "Outpatient", "Scheduled", "Elective"],
  // OR8: DV5 equipment, now a valid room -> compliant, no HARD-1 violation.
  // OR8 is the first room in the app to combine all three badge slots at
  // once (Thoracic designation 🫁 + robot badge 🦾 + 3-light 💡) -- scheduled
  // with a 15-min gap after the existing 9000010 (ends 12:30) so it doesn't
  // introduce a new abutting service-switch pair.
  ["9000072", DATE, "WBVC OR 08", "Robotic case, Mission Bernal DV5 relocated here", "Robot DaVinci DV5", "50 yrs",
   "Urology", "Testcase, Runner, MD [999099]", "12:45:00", "14:15:00", "13:00:00", "14:00:00",
   "Outpatient", "Scheduled", "Elective"],
  // OR11: DV5 equipment in a room that is still NOT valid for either DV5
  // room-set post-expansion -> regression check, must still flag HARD-1
  // normally (a dedicated case for this, isolated from the HARD-5 pairing
  // scenarios above which also prove the same point incidentally).
  ["9000073", DATE, "WBVC OR 11", "Robotic case in a non-DV5 room", "Robot DaVinci DV5", "50 yrs",
   "Urology", "Testcase, Runner, MD [999099]", "07:30:00", "09:00:00", "07:45:00", "08:45:00",
   "Outpatient", "Scheduled", "Elective"]
];

const ws = XLSX.utils.aoa_to_sheet(rows);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Schedule");
const fixturePath = path.join(os.tmpdir(), "gantt-visual-test-fixture.xlsx");
XLSX.writeFile(wb, fixturePath);

// ── Run ──────────────────────────────────────────────────────────────────
(async () => {
  const failures = [];
  const check = (label, ok) => {
    console.log((ok ? "PASS" : "FAIL") + " — " + label);
    if (!ok) failures.push(label);
  };

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox"]
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 1100 });

  const consoleErrors = [];
  page.on("pageerror", (err) => consoleErrors.push("pageerror: " + err.message));
  page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push("console.error: " + msg.text()); });

  await page.goto("file://" + path.join(REPO, "index.html"), { waitUntil: "networkidle0" });
  await page.click("#openRoomRulesTool");
  await page.waitForSelector("#roomRulesFileInput", { visible: true });

  const input = await page.$("#roomRulesFileInput");
  await input.uploadFile(fixturePath);

  await page.waitForFunction(() => !document.getElementById("runRoomRulesAudit")?.disabled);
  await page.click("#runRoomRulesAudit");

  await page.waitForSelector("#ganttSection:not([hidden])", { timeout: 15000 });
  await page.waitForFunction(() => {
    const sc = document.getElementById("ganttScrollable");
    return sc && sc.querySelectorAll(".gantt-case-block").length > 0;
  }, { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 300));

  const data = await page.evaluate((testDayRed, testDayOrange, testDayMixed) => {
    const roomLabels = [...document.querySelectorAll(".gantt-room-label")].map((el) => {
      const line2El = el.querySelector(".gantt-room-label-line2");
      return {
        line1: el.querySelector(".gantt-room-label-line1")?.textContent || "",
        line2Html: line2El?.innerHTML || null,
        // True if the nowrap badge line is wider than its box — i.e. the
        // .gantt-container's overflow:hidden would actually clip it. Added
        // for the v1.7.26 HARD-1 OR4/OR8 expansion, since OR8 is the first
        // room to ever combine all three badge slots (designation + robot
        // + 3-light) on one line at once.
        line2Overflow: line2El ? line2El.scrollWidth > line2El.clientWidth + 1 : false
      };
    });
    const blocks = [...document.querySelectorAll(".gantt-case-block")].map((b) => ({
      caseNum: b.dataset.caseNum,
      className: b.className,
      surgeonHTML: b.querySelector(".gantt-block-surgeon")?.innerHTML || "",
      proctxt: b.querySelector(".gantt-block-proctxt")?.textContent || ""
    }));
    const switchMarkers = [...document.querySelectorAll(".gantt-service-switch")];
    const switchCount = switchMarkers.length;
    const switchesHaveIcon = switchMarkers.every((m) => m.querySelector(".gantt-service-switch-icon"));
    const switchesHaveNoLine = switchMarkers.every((m) => !m.querySelector(".gantt-service-switch-line"));
    const switchPairs = switchMarkers.map((m) => `${m.dataset.beforeCase}->${m.dataset.afterCase}`);

    // Label-only text (last child span), not the whole entry's textContent —
    // the icon/superscript children (e.g. "DV5/SP") would otherwise get
    // concatenated into the label text since textContent ignores structure.
    const legendEntryEls = [...document.querySelectorAll(".gantt-icon-legend-entry")];
    const legendEntries = legendEntryEls.map((el) => el.lastElementChild?.textContent.trim() || "");
    const legendEntryIcons = legendEntryEls.map((el) => ({
      label: el.lastElementChild?.textContent.trim() || "",
      iconHtml: el.querySelector(".gantt-icon-legend-icon")?.innerHTML || ""
    }));
    const legendGridColumns = document.getElementById("ganttIconLegendGrid")
      ? getComputedStyle(document.getElementById("ganttIconLegendGrid")).gridTemplateColumns.split(" ").length
      : 0;
    const legendIsAfterGantt = (() => {
      const legend = document.getElementById("ganttIconLegend");
      const gantt = document.getElementById("ganttSection");
      if (!legend || !gantt) return false;
      return !!(gantt.compareDocumentPosition(legend) & Node.DOCUMENT_POSITION_FOLLOWING);
    })();

    const tableSection = document.getElementById("roomRulesTableSection");
    const tableDisplay = tableSection ? getComputedStyle(tableSection).display : null;
    const tableRowCount = document.querySelectorAll("#roomRulesViolationsTable tr").length;

    // Overlap check: does any .gantt-service-switch rect intersect the
    // ACTUAL rendered text extent (not the full-width block-level container,
    // which always spans the whole tile regardless of content length — a
    // Range over the text content hugs the real glyphs, same fix needed for
    // the CME table's wrap-detection in an earlier session).
    let switchOverlapsText = false;
    const textLineEls = document.querySelectorAll(
      ".gantt-block-surgeon, .gantt-block-proctxt, .gantt-block-casenum"
    );
    document.querySelectorAll(".gantt-service-switch").forEach((marker) => {
      const mRect = marker.getBoundingClientRect();
      textLineEls.forEach((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        [...range.getClientRects()].forEach((tRect) => {
          const intersects = !(mRect.right < tRect.left || mRect.left > tRect.right ||
            mRect.bottom < tRect.top || mRect.top > tRect.bottom);
          if (intersects) switchOverlapsText = true;
        });
      });
    });

    const serviceEmojiCount = Object.keys(SERVICE_EMOJI).length;
    // Mirrors buildGanttIconLegend()'s own filter/dedupe (v1.7.23): "Robotics"
    // excluded (shown only via the combined DV5/SP badge entry), then
    // deduped by emoji value so alias keys sharing an emoji (e.g.
    // "Pediatrics"/"Pediatric General") count as one legend row.
    const uniqueServiceEmojiCount = new Set(
      Object.keys(SERVICE_EMOJI).filter((s) => s !== "Robotics").map((s) => SERVICE_EMOJI[s])
    ).size;

    // HARD-5 donor-nephrectomy/transplant pairing suppression: read directly
    // from the module's own last-computed audit result (a bare top-level
    // `let` in this classic, non-module script — still resolvable by name
    // from an injected page.evaluate() function running in the same realm)
    // rather than parsing the hidden violations table's rendered text.
    const violationsByCase = {};
    const violationTiersByCase = {};
    (typeof _lastAuditResult !== "undefined" && _lastAuditResult
      ? _lastAuditResult.violations : []
    ).forEach((v) => {
      if (!violationsByCase[v.caseNumber]) violationsByCase[v.caseNumber] = [];
      violationsByCase[v.caseNumber].push(v.ruleId);
      if (!violationTiersByCase[v.caseNumber]) violationTiersByCase[v.caseNumber] = [];
      violationTiersByCase[v.caseNumber].push(v.ruleTier);
    });

    // v1.7.21 re-tiering: calendar day-swatch color, read directly off the
    // rendered .gantt-cal-cell for a given day-of-month (only one month is
    // ever in the DOM at a time, so matching on the visible day number alone
    // is unambiguous).
    const calendarCellColor = (day) => {
      const el = [...document.querySelectorAll(".gantt-cal-cell")]
        .find((c) => c.dataset.sd !== undefined && c.textContent === String(day));
      if (!el) return null;
      const m = el.className.match(/gantt-cal-cell-(red|orange|amber|green)/);
      return m ? m[1] : null;
    };

    return {
      roomLabels, blocks, switchCount, switchesHaveIcon, switchesHaveNoLine, switchPairs,
      legendEntries, legendEntryIcons, legendGridColumns, legendIsAfterGantt,
      tableDisplay, tableRowCount, switchOverlapsText, serviceEmojiCount, uniqueServiceEmojiCount,
      violationsByCase, violationTiersByCase,
      calRedDay:    calendarCellColor(testDayRed),
      calOrangeDay: calendarCellColor(testDayOrange),
      calMixedDay:  calendarCellColor(testDayMixed)
    };
  }, sameMonthOffset(1).getDate(), sameMonthOffset(2).getDate(), sameMonthOffset(3).getDate());

  await page.screenshot({ path: OUT_PATH, fullPage: true });

  // Sidebar check (v1.7.21 re-tiering): click the demoted HARD-5-only case
  // (9000026, still on the initially-selected earliest day) and confirm its
  // alert badge reads "Tier 2" with the Tier-2 (orange) badge class, not
  // Tier 1.
  await page.click('.gantt-case-block[data-case-num="9000026"]');
  await page.waitForSelector("#ganttSidebar:not([hidden])", { timeout: 5000 });
  const sidebarData = await page.evaluate(() => {
    const badges = [...document.querySelectorAll("#ganttSidebarContent .sb-viol-item .badge")];
    return badges.map((b) => ({ className: b.className, text: b.textContent }));
  });

  // ── Assertions ─────────────────────────────────────────────────────────
  const or2 = data.roomLabels.find((r) => r.line1 === "OR 2");
  const or3 = data.roomLabels.find((r) => r.line1 === "OR 3");
  const or4 = data.roomLabels.find((r) => r.line1 === "OR 4");
  const or5 = data.roomLabels.find((r) => r.line1 === "OR 5");
  const or6 = data.roomLabels.find((r) => r.line1 === "OR 6");
  const or8 = data.roomLabels.find((r) => r.line1 === "OR 8");

  check("OR 2 room label shows DV5 robot badge", !!or2?.line2Html?.includes(">DV5<"));
  check("OR 3 room label shows DV5 robot badge (no case scheduled there)", !!or3?.line2Html?.includes(">DV5<"));
  check("OR 5 room label shows SP robot badge", !!or5?.line2Html?.includes(">SP<"));
  check("OR 6 (3-light, no designation) shows x3 not bare '3'", !!or6?.line2Html?.includes(">x3<"));
  check("Room labels use two-line structure (line1 present for OR 2)", !!or2?.line1);
  check("OR 2/OR 3/OR 5 room-label robot badges use the new 🦾 emoji, not the old 🤖",
    [or2, or3, or5].every((r) => r?.line2Html?.includes("🦾")) &&
    [or2, or3, or5].every((r) => !r?.line2Html?.includes("🤖")));

  // ── v1.7.26 HARD-1 expansion: Mission Bernal DV5 (mobile OR4/OR8) ───────
  check("OR 4 room label shows the new DV5 robot badge (Mission Bernal relocation)",
    !!or4?.line2Html?.includes(">DV5<"));
  check("OR 4 room label STILL shows its pre-existing Pediatric General designation emoji (🧸) alongside the robot badge",
    !!or4?.line2Html?.includes("🧸"));
  check("OR 4's badge line is not clipped by the fixed-width column (designation + robot, 2 slots)",
    or4 && or4.line2Overflow === false);
  check("OR 8 room label shows the new DV5 robot badge (Mission Bernal relocation)",
    !!or8?.line2Html?.includes(">DV5<"));
  check("OR 8 room label STILL shows its pre-existing Thoracic designation emoji (🫁)",
    !!or8?.line2Html?.includes("🫁"));
  check("OR 8 room label STILL shows its pre-existing 3-light indicator (x3)",
    !!or8?.line2Html?.includes(">x3<"));
  check("OR 8's badge line is not clipped by the fixed-width column -- the first room in the app to combine all three badge slots at once (designation + robot + 3-light)",
    or8 && or8.line2Overflow === false);

  // 9000002: OR2 (a robot-designated room), Service = "Robotics" (a real
  // SERVICE_EMOJI key), DV5 equipment -- the exact combination that
  // previously rendered a double robot icon ("🤖🤖DV5 Kardos"). Fixed
  // behavior: exactly one 🦾 badge, no leading service emoji at all (the
  // generic "Robotics" service emoji is suppressed since the more specific
  // platform badge is already shown).
  const dv5Block = data.blocks.find((b) => b.caseNum === "9000002");
  check("Robotic case in a robot-designated room (OR2) shows exactly ONE robot badge, not two",
    (dv5Block?.surgeonHTML.match(/🦾/g) || []).length === 1 && !dv5Block?.surgeonHTML.includes("🤖"));
  check("That case block reads exactly '🦾DV5 Kardos' (no duplicate/leftover service emoji)",
    /^🦾DV5 Kardos$/.test((dv5Block?.surgeonHTML || "").replace(/<[^>]+>/g, "")));

  // 9000025: OR1 (NOT a robot-designated room), Service = "Transplant" (not
  // "Robotics"), DV5 equipment. Confirms the fix didn't overreach: the
  // case-level badge still renders on its own merits regardless of room,
  // and an unrelated service emoji is untouched (no suppression, since the
  // service isn't literally "Robotics").
  const nonRobotRoomBlock = data.blocks.find((b) => b.caseNum === "9000025");
  check("Robotic case in a NON-robot-designated room (OR1) still shows its own case-level badge",
    (nonRobotRoomBlock?.surgeonHTML.match(/🦾/g) || []).length === 1);
  check("...and its unrelated service emoji (Transplant, not Robotics) is untouched by the suppression",
    nonRobotRoomBlock?.surgeonHTML.includes("💞"));

  const spBlock = data.blocks.find((b) => b.caseNum === "9000003");
  check("SP case block (unrelated Urology service) shows service emoji + 🦾 robot badge + surgeon, in order",
    /🫘.*🦾.*SP.*Lin/.test(spBlock?.surgeonHTML || "") && !spBlock?.surgeonHTML.includes("🤖"));

  const cardiacBlock = data.blocks.find((b) => b.caseNum === "9000001");
  check("Bracketed procedure ID stripped from case block display",
    !!cardiacBlock && !cardiacBlock.proctxt.includes("[") && cardiacBlock.proctxt.trim() === "CABG");

  const unmappedBlock = data.blocks.find((b) => b.caseNum === "9000007");
  check("Unmapped service ('Trauma Surgery') renders with no emoji, no error",
    !!unmappedBlock && !/[\u{1F300}-\u{1FAFF}☀-➿]/u.test(unmappedBlock.surgeonHTML));

  // Exactly 2 real icons expected now that gapped pairs are suppressed:
  // OR6 (Transplant->General, 0-gap) and OR10 (General->Vascular, 0-gap).
  // Every other candidate pair in the fixture is either same-service,
  // Gyn/Obstetrics-excepted, or separated by a genuine 15-minute gap
  // (OR2, OR5, OR8's second pair, OR9) and must NOT show an icon anymore.
  check("Exactly 2 service-switch icons rendered (only the abutting pairs)",
    data.switchCount === 2);
  check("Both rendered switches are the expected abutting pairs (OR6 9000011->9000012, OR10 9000005->9000006)",
    JSON.stringify([...data.switchPairs].sort()) ===
    JSON.stringify(["9000005->9000006", "9000011->9000012"]));
  check("Every service-switch marker has an icon", data.switchesHaveIcon);
  check("No service-switch marker has a line element (removed this session)", data.switchesHaveNoLine);
  check("Service-switch marker does not overlap any case block's text (incl. OR6/OR10 abutting pairs)",
    !data.switchOverlapsText);
  check("Gapped different-service pair (OR2 9000002->9000027, 15-min gap) shows NO icon",
    !data.switchPairs.includes("9000002->9000027"));
  check("Gapped different-service pair (OR5 9000003->9000023, 15-min gap) shows NO icon",
    !data.switchPairs.includes("9000003->9000023"));
  check("Gapped different-service pair (OR9 9000007->9000028, 15-min gap) shows NO icon",
    !data.switchPairs.includes("9000007->9000028"));
  check("Gapped Obstetrics->General pair (OR8 9000009->9000010, 15-min gap) shows NO icon",
    !data.switchPairs.includes("9000009->9000010"));
  check("Abutting Gynecology->Obstetrics pair (OR12 9000031->9000032) still shows NO icon (pair exception applies even when abutting)",
    !data.switchPairs.includes("9000031->9000032"));
  check("Abutting SAME-service pair (OR10 9000004->9000005) shows no icon (unchanged behavior)",
    !data.switchPairs.includes("9000004->9000005"));

  check(`Icon Legend has one entry per unique SERVICE_EMOJI value excluding "Robotics" (${data.uniqueServiceEmojiCount}) plus robot/3-light/switch-cue`,
    data.legendEntries.length === data.uniqueServiceEmojiCount + 3);
  check("Icon Legend renders below the Gantt chart (not above)", data.legendIsAfterGantt);
  check("Icon Legend grid uses ~7 columns", data.legendGridColumns === 7);

  // v1.7.23: the bare plain-🤖 "Robotics" service row was removed — only the
  // combined DV5/SP platform-badge entry (🦾) should remain under that label.
  const roboticsEntries = data.legendEntryIcons.filter((e) => e.label === "Robotics");
  check("Icon Legend has exactly one 'Robotics'-labeled entry (the platform badge, no more bare service row)",
    roboticsEntries.length === 1);
  check("Icon Legend's remaining Robotics entry is the platform-badge one (🦾, not 🤖)",
    roboticsEntries[0]?.iconHtml.includes("🦾") && !roboticsEntries[0]?.iconHtml.includes("🤖"));

  // v1.7.23: "Pediatrics"/"Pediatric General" (both 🧸) must collapse to a
  // single row under the alphabetically-first (canonical) label.
  const pediatricEntries = data.legendEntries.filter((l) => l === "Pediatrics" || l === "Pediatric General");
  check('Pediatric alias rows collapsed to a single "Pediatric General" entry',
    JSON.stringify(pediatricEntries) === JSON.stringify(["Pediatric General"]));

  const serviceLabels = data.legendEntries.slice(0, data.uniqueServiceEmojiCount);
  const specialLabels = data.legendEntries.slice(data.uniqueServiceEmojiCount);
  const sortedServiceLabels = [...serviceLabels].sort((a, b) => a.localeCompare(b));
  check("Service entries are sorted alphabetically",
    JSON.stringify(serviceLabels) === JSON.stringify(sortedServiceLabels));
  check("The three special entries (Robotics, 3-light room, Service change) come after the alphabetical list, in that order",
    JSON.stringify(specialLabels) === JSON.stringify(["Robotics", "3-light room", "Service change"]));
  check('Robot badge legend label reads exactly "Robotics" (not "Robot platform (DaVinci DV5 or SP)")',
    specialLabels[0] === "Robotics");
  check('Service-switch legend label reads exactly "Service change" (not the longer sentence)',
    specialLabels[2] === "Service change");

  check("Bottom violations table is visually hidden (display: none)", data.tableDisplay === "none");
  check("Bottom violations table still has rendered rows (data logic still ran)", data.tableRowCount > 0);

  // ── HARD-5 donor-nephrectomy/transplant pairing suppression ────────────
  const hasRule = (caseNum, ruleId) => (data.violationsByCase[caseNum] || []).includes(ruleId);

  check("Scenario 1 (DV5 nephrectomy -> transplant, both OR3): transplant's HARD-5 is suppressed",
    !hasRule("9000022", "hard-5"));
  check("Scenario 1: nephrectomy case itself has no HARD-5 (or HARD-1) violation of its own",
    !hasRule("9000021", "hard-5") && !hasRule("9000021", "hard-1"));

  check("Scenario 2 (SP nephrectomy -> transplant, both OR5): transplant's HARD-5 is suppressed",
    !hasRule("9000024", "hard-5"));
  check("Scenario 2: nephrectomy case itself has no HARD-5 (or HARD-2) violation of its own",
    !hasRule("9000023", "hard-5") && !hasRule("9000023", "hard-2"));

  check("Scenario 3 (DV5 pairing in OR1, not a valid DV5 room): transplant's HARD-5 still fires",
    hasRule("9000026", "hard-5"));

  check("Scenario 4 (transplant preceded by an unrelated DV5 case, not a nephrectomy): HARD-5 still fires",
    hasRule("9000027", "hard-5"));

  check("Scenario 5 (non-robotic pair in OR9, already a valid HARD-5 room): transplant has no HARD-5 violation (unaffected, not a suppression)",
    !hasRule("9000029", "hard-5"));
  check("Scenario 5: nephrectomy case has no HARD-5 violation of its own either",
    !hasRule("9000028", "hard-5"));

  check("Scenario 6 (Bellingham-style: nephrectomy's own HARD-5 flag, DV5 transplant AFTER it, both OR3): nephrectomy's HARD-5 is suppressed",
    !hasRule("9000041", "hard-5"));
  check("Scenario 6: transplant partner case has no HARD-5 (or HARD-1) violation of its own",
    !hasRule("9000042", "hard-5") && !hasRule("9000042", "hard-1"));

  check("Scenario 7 (nephrectomy's own HARD-5 flag in OR1, followed by an unrelated non-transplant case): HARD-5 still fires",
    hasRule("9000043", "hard-5"));

  // ── v1.7.21 re-tiering: HARD-3/4/5/7 moved to Tier 2; HARD-1/2/6 stay Tier 1 ──
  check("Demoted rule: case 9000026's HARD-5 violation now carries ruleTier 2 (not 1)",
    (data.violationTiersByCase["9000026"] || [])[
      (data.violationsByCase["9000026"] || []).indexOf("hard-5")
    ] === 2);
  check("Unchanged rule: case 9000025's HARD-1 violation still carries ruleTier 1",
    (data.violationTiersByCase["9000025"] || [])[
      (data.violationsByCase["9000025"] || []).indexOf("hard-1")
    ] === 1);

  // ── v1.7.26 HARD-1 expansion: OR4/OR8 (Mission Bernal DV5 relocation) ───
  check("9000071 (DV5 equipment, OR4): compliant, no HARD-1 violation",
    !hasRule("9000071", "hard-1"));
  check("9000072 (DV5 equipment, OR8): compliant, no HARD-1 violation",
    !hasRule("9000072", "hard-1"));
  check("9000073 (DV5 equipment, OR11 -- still not a valid DV5 room): HARD-1 still fires (regression check)",
    hasRule("9000073", "hard-1"));

  const tier1AloneBlock = data.blocks.find((b) => b.caseNum === "9000025");
  const tier2AloneBlock = data.blocks.find((b) => b.caseNum === "9000026");
  check("Gantt: case violating HARD-1 alone (9000025) still renders red (.gantt-viol-1)",
    /\bgantt-viol-1\b/.test(tier1AloneBlock?.className || ""));
  check("Gantt: case violating demoted HARD-5 alone (9000026) renders Tier 2 styling (.gantt-viol-2), identical class to Ophtho/Peds Tier 2 cases",
    /\bgantt-viol-2\b/.test(tier2AloneBlock?.className || ""));

  check("Calendar: a day with only a HARD-6 (Hybrid/Cath Lab) violation shows red",
    data.calRedDay === "red");
  check("Calendar: a day with only a demoted HARD-3 (Neuro/Spine) violation shows the Tier 2 color (orange), NOT red",
    data.calOrangeDay === "orange");
  check("Negative control: a day with BOTH a HARD-1 and a demoted HARD-3 violation still shows red (red takes precedence over orange, proving the split isn't vacuous)",
    data.calMixedDay === "red");

  check("Sidebar: demoted HARD-5 case (9000026) shows a Tier 2 alert badge, not Tier 1",
    sidebarData.some((b) => b.className.includes("badge-tier-2") && b.text.trim() === "Tier 2") &&
    !sidebarData.some((b) => b.className.includes("badge-tier-1")));

  check("No console/page errors", consoleErrors.length === 0);
  if (consoleErrors.length) consoleErrors.forEach((e) => console.error("  " + e));

  await browser.close();
  fs.rmSync(fixturePath, { force: true });

  console.log("\nScreenshot: " + OUT_PATH);
  console.log(failures.length ? `\n${failures.length} FAILURE(S)` : "\nAll checks passed.");
  process.exit(failures.length ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
