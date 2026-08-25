#!/usr/bin/env node
/**
 * Gantt visual regression test — Room Rules Audit Gantt chart badges/layout.
 *
 * Builds a synthetic (non-PHI) OR schedule fixture in memory, drives a local
 * Chrome install headlessly against index.html, uploads the fixture into the
 * Room Rules tool, and asserts on the rendered Gantt: service emoji, robot
 * badges (case-level and room-level), the 3-light "x3" indicator, the Icon
 * Legend, the service-switching cue (including the Gynecology/Obstetrics
 * suppression pair), the hidden-but-still-rendering violations table, and
 * bracketed-procedure-ID stripping on case blocks.
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
  // OR10: General -> General -> Vascular (one switch cue, between the last two only).
  ["9000004", DATE, "WBVC OR 10", "Hernia repair", "", "50 yrs",
   "General", "Jossart, Karl, MD [105751]", "07:30:00", "09:00:00", "07:45:00", "08:45:00",
   "Outpatient", "Scheduled", "Elective"],
  ["9000005", DATE, "WBVC OR 10", "Gallbladder removal", "", "52 yrs",
   "General", "Jossart, Karl, MD [105751]", "09:15:00", "10:45:00", "09:30:00", "10:30:00",
   "Outpatient", "Scheduled", "Elective"],
  ["9000006", DATE, "WBVC OR 10", "Varicose vein stripping", "", "58 yrs",
   "Vascular", "Jossart, Karl, MD [105751]", "11:00:00", "12:30:00", "11:15:00", "12:15:00",
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
    const switchCount = document.querySelectorAll(".gantt-service-switch").length;
    const legendEntries = [...document.querySelectorAll(".gantt-icon-legend-entry")].map(
      (el) => el.textContent.trim()
    );
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

    return { roomLabels, blocks, switchCount, legendEntries, tableDisplay, tableRowCount, switchOverlapsText, serviceEmojiCount };
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

  // 3 real switches expected: General->Vascular (OR10), Obstetrics->General (OR8).
  // Gynecology->Obstetrics (OR8) must NOT produce one.
  check("Exactly 2 service-switch markers rendered (General->Vascular, Obstetrics->General)",
    data.switchCount === 2);

  check(`Icon Legend has one entry per SERVICE_EMOJI key (${data.serviceEmojiCount}) plus robot/3-light/switch-cue`,
    data.legendEntries.length === data.serviceEmojiCount + 3);
  check("Icon Legend includes a Cardiac entry", data.legendEntries.some((t) => t.includes("Cardiac")));
  check("Icon Legend includes the robot platform entry",
    data.legendEntries.some((t) => t.toLowerCase().includes("robot platform")));
  check("Icon Legend includes the 3-light room entry",
    data.legendEntries.some((t) => t.toLowerCase().includes("3-light")));
  check("Icon Legend includes the service-switch entry",
    data.legendEntries.some((t) => t.toLowerCase().includes("service change")));

  check("Bottom violations table is visually hidden (display: none)", data.tableDisplay === "none");
  check("Bottom violations table still has rendered rows (data logic still ran)", data.tableRowCount > 0);

  check("Service-switch marker does not overlap any case block's text", !data.switchOverlapsText);

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
