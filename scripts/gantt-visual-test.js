#!/usr/bin/env node
/**
 * Gantt visual regression test — Room Rules Audit Gantt chart badges/layout.
 *
 * Builds a synthetic (non-PHI) OR schedule fixture in memory, drives a local
 * Chrome install headlessly against index.html, uploads the fixture into the
 * Room Rules tool, and asserts on the rendered Gantt: service emoji, robot
 * badges (case-level and room-level), the 3-light "x3" indicator, the Icon
 * Legend (position below the Gantt, ~7-column layout, alphabetical service
 * ordering with the three special entries after it, simplified label text),
 * the service-switching cue (icon-above-a-line seam design, including the
 * Gynecology/Obstetrics suppression pair and a stress test against 0-minute-
 * gap back-to-back cases modeled on OR6/OR10's real density), the
 * hidden-but-still-rendering violations table, bracketed-procedure-ID
 * stripping on case blocks, and the HARD-5 (Transplant Room) donor-
 * nephrectomy/transplant robotic-pairing suppression (read directly from
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
const DATE = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 14); // safely inside the prospective-only window
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
})();

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
  // OR2: DV5 room robot badge (case-level + room-level).
  ["9000002", DATE, "WBVC OR 02", "Robotic prostatectomy", "Robot DaVinci DV5", "55 yrs",
   "General", "Kardos, Alice, MD [108387]", "07:30:00", "09:30:00", "07:45:00", "09:15:00",
   "Outpatient", "Scheduled", "Elective"],
  // OR5: SP room robot badge (case-level + room-level). OR3 gets its DV5 room
  // badge checked with no case present at all, purely from the room list.
  ["9000003", DATE, "WBVC OR 05", "Robotic partial nephrectomy", "DaVinci Robot SP", "48 yrs",
   "Urology", "Lin, David, MD [107858]", "07:30:00", "10:00:00", "07:45:00", "09:45:00",
   "Outpatient", "Scheduled", "Elective"],
  // OR10: General -> General -> Vascular (one switch cue, between the last two
  // only). Back-to-back turnover (0-minute gap) between the last two, modeled
  // on OR10's real tight density — stress-tests the seam at its tightest.
  ["9000004", DATE, "WBVC OR 10", "Hernia repair", "", "50 yrs",
   "General", "Jossart, Karl, MD [105751]", "07:30:00", "09:00:00", "07:45:00", "08:45:00",
   "Outpatient", "Scheduled", "Elective"],
  ["9000005", DATE, "WBVC OR 10", "Gallbladder removal", "", "52 yrs",
   "General", "Jossart, Karl, MD [105751]", "09:15:00", "10:45:00", "09:30:00", "10:30:00",
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

  // Scenario 3: same DV5 pairing, but in OR4 -- NOT a valid room for DV5
  // (hard-1's allowedRooms are OR2/OR3 only) -> HARD-5 must still fire
  // normally on the transplant case (suppression must not apply here).
  ["9000025", DATE, "WBVC OR 04", "Right Robotic DV5 Assisted Laparoscopic Donor Nephrectomy", "Robot DaVinci DV5", "46 yrs",
   "Transplant", "Kennedy, Owen, MD [515122]", "07:30:00", "09:30:00", "07:45:00", "09:15:00",
   "Outpatient", "Scheduled", "Elective"],
  ["9000026", DATE, "WBVC OR 04", "Living Related Renal Transplant", "Cooler Donor", "49 yrs",
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

  const data = await page.evaluate(() => {
    const roomLabels = [...document.querySelectorAll(".gantt-room-label")].map((el) => ({
      line1: el.querySelector(".gantt-room-label-line1")?.textContent || "",
      line2Html: el.querySelector(".gantt-room-label-line2")?.innerHTML || null
    }));
    const blocks = [...document.querySelectorAll(".gantt-case-block")].map((b) => ({
      caseNum: b.dataset.caseNum,
      surgeonHTML: b.querySelector(".gantt-block-surgeon")?.innerHTML || "",
      proctxt: b.querySelector(".gantt-block-proctxt")?.textContent || ""
    }));
    const switchMarkers = [...document.querySelectorAll(".gantt-service-switch")];
    const switchCount = switchMarkers.length;
    const switchesHaveIconAndLine = switchMarkers.every((m) =>
      m.querySelector(".gantt-service-switch-icon") && m.querySelector(".gantt-service-switch-line"));
    const switchLineColor = switchMarkers.length
      ? getComputedStyle(switchMarkers[0].querySelector(".gantt-service-switch-line")).backgroundColor
      : null;

    // Label-only text (last child span), not the whole entry's textContent —
    // the icon/superscript children (e.g. "DV5/SP") would otherwise get
    // concatenated into the label text since textContent ignores structure.
    const legendEntryEls = [...document.querySelectorAll(".gantt-icon-legend-entry")];
    const legendEntries = legendEntryEls.map((el) => el.lastElementChild?.textContent.trim() || "");
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

    // HARD-5 donor-nephrectomy/transplant pairing suppression: read directly
    // from the module's own last-computed audit result (a bare top-level
    // `let` in this classic, non-module script — still resolvable by name
    // from an injected page.evaluate() function running in the same realm)
    // rather than parsing the hidden violations table's rendered text.
    const violationsByCase = {};
    (typeof _lastAuditResult !== "undefined" && _lastAuditResult
      ? _lastAuditResult.violations : []
    ).forEach((v) => {
      if (!violationsByCase[v.caseNumber]) violationsByCase[v.caseNumber] = [];
      violationsByCase[v.caseNumber].push(v.ruleId);
    });

    return {
      roomLabels, blocks, switchCount, switchesHaveIconAndLine, switchLineColor,
      legendEntries, legendGridColumns, legendIsAfterGantt,
      tableDisplay, tableRowCount, switchOverlapsText, serviceEmojiCount,
      violationsByCase
    };
  });

  await page.screenshot({ path: OUT_PATH, fullPage: true });

  // ── Assertions ─────────────────────────────────────────────────────────
  const or2 = data.roomLabels.find((r) => r.line1 === "OR 2");
  const or3 = data.roomLabels.find((r) => r.line1 === "OR 3");
  const or5 = data.roomLabels.find((r) => r.line1 === "OR 5");
  const or6 = data.roomLabels.find((r) => r.line1 === "OR 6");

  check("OR 2 room label shows DV5 robot badge", !!or2?.line2Html?.includes(">DV5<"));
  check("OR 3 room label shows DV5 robot badge (no case scheduled there)", !!or3?.line2Html?.includes(">DV5<"));
  check("OR 5 room label shows SP robot badge", !!or5?.line2Html?.includes(">SP<"));
  check("OR 6 (3-light, no designation) shows x3 not bare '3'", !!or6?.line2Html?.includes(">x3<"));
  check("Room labels use two-line structure (line1 present for OR 2)", !!or2?.line1);

  const dv5Block = data.blocks.find((b) => b.caseNum === "9000002");
  const spBlock = data.blocks.find((b) => b.caseNum === "9000003");
  check("DV5 case block shows service emoji + robot badge + surgeon, in order",
    /🪡.*🤖.*DV5.*Kardos/.test(dv5Block?.surgeonHTML || ""));
  check("SP case block shows service emoji + robot badge + surgeon, in order",
    /🫘.*🤖.*SP.*Lin/.test(spBlock?.surgeonHTML || ""));

  const cardiacBlock = data.blocks.find((b) => b.caseNum === "9000001");
  check("Bracketed procedure ID stripped from case block display",
    !!cardiacBlock && !cardiacBlock.proctxt.includes("[") && cardiacBlock.proctxt.trim() === "CABG");

  const unmappedBlock = data.blocks.find((b) => b.caseNum === "9000007");
  check("Unmapped service ('Trauma Surgery') renders with no emoji, no error",
    !!unmappedBlock && !/[\u{1F300}-\u{1FAFF}☀-➿]/u.test(unmappedBlock.surgeonHTML));

  // 6 total: OR10 (General->Vascular), OR6 (Transplant->General), OR8
  // (Obstetrics->General), plus 3 incidental switches introduced by the
  // HARD-5 pairing fixture rows (OR2, OR5, OR9 each pick up one switch
  // against their pre-existing earlier case there).
  check("Exactly 6 service-switch markers rendered (incl. the two 0-gap stress cases)",
    data.switchCount === 6);
  check("Every service-switch marker has both an icon and a line element",
    data.switchesHaveIconAndLine);
  check("Service-switch line uses the brand-blue accent color",
    data.switchLineColor === "rgb(0, 103, 166)");
  check("Service-switch marker does not overlap any case block's text (incl. OR6/OR10 tight gaps)",
    !data.switchOverlapsText);

  check(`Icon Legend has one entry per SERVICE_EMOJI key (${data.serviceEmojiCount}) plus robot/3-light/switch-cue`,
    data.legendEntries.length === data.serviceEmojiCount + 3);
  check("Icon Legend renders below the Gantt chart (not above)", data.legendIsAfterGantt);
  check("Icon Legend grid uses ~7 columns", data.legendGridColumns === 7);

  const serviceLabels = data.legendEntries.slice(0, data.serviceEmojiCount);
  const specialLabels = data.legendEntries.slice(data.serviceEmojiCount);
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

  check("Scenario 3 (DV5 pairing in OR4, not a valid DV5 room): transplant's HARD-5 still fires",
    hasRule("9000026", "hard-5"));

  check("Scenario 4 (transplant preceded by an unrelated DV5 case, not a nephrectomy): HARD-5 still fires",
    hasRule("9000027", "hard-5"));

  check("Scenario 5 (non-robotic pair in OR9, already a valid HARD-5 room): transplant has no HARD-5 violation (unaffected, not a suppression)",
    !hasRule("9000029", "hard-5"));
  check("Scenario 5: nephrectomy case has no HARD-5 violation of its own either",
    !hasRule("9000028", "hard-5"));

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
