#!/usr/bin/env node
// Equipment Request Audit unit test harness.
//
// Run: NODE_PATH="$(pwd)/node_modules" node scripts/equipment-audit-test.js
//
// Loads the real rules-data.js + app.js into a vm context with a minimal
// DOM/canvas stub (no browser needed — this file has no DOM-rendering
// dependency in the function under test), then calls the real production
// auditEquipmentRows() directly against synthetic, non-PHI fixture rows.
// This is a committed, extend-in-place harness — future Equipment Audit
// sessions should add assertions here rather than writing new scratchpad
// scripts (see CLAUDE_CONTEXT.md for which version introduced it and why).
//
// Every fixture row includes the Procedure/Code(s) header, since that
// column is required as of v1.7.38.
const fs = require("fs");
const vm = require("vm");
const path = require("path");

const ROOT = path.join(__dirname, "..");

function makeStubElement() {
  const el = {
    style: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    addEventListener() {},
    removeEventListener() {},
    appendChild() { return el; },
    append() {},
    setAttribute() {},
    getAttribute() { return null; },
    querySelector() { return makeStubElement(); },
    querySelectorAll() { return []; },
    children: [],
    dataset: {},
    getContext() {
      return {
        measureText() { return { width: 0 }; },
        clearRect() {}, fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
        save() {}, restore() {}, translate() {}, scale() {}, fillText() {}, strokeText() {},
        arc() {}, fill() {}, closePath() {}, setLineDash() {}, rect() {}, clip() {},
      };
    },
  };
  Object.defineProperty(el, "textContent", { get() { return ""; }, set() {} });
  Object.defineProperty(el, "innerHTML", { get() { return ""; }, set() {} });
  Object.defineProperty(el, "hidden", { get() { return false; }, set() {} });
  return el;
}

const documentStub = {
  getElementById() { return makeStubElement(); },
  querySelector() { return makeStubElement(); },
  querySelectorAll() { return []; },
  createElement() { return makeStubElement(); },
  createTextNode() { return {}; },
  addEventListener() {},
  body: makeStubElement(),
};

const sandbox = {
  document: documentStub,
  window: { location: { hostname: "localhost" } },
  location: { hostname: "localhost" },
  console,
  navigator: { clipboard: { writeText() { return Promise.resolve(); } } },
  Date,
  Math,
  JSON,
  Array,
  Object,
  String,
  Number,
  RegExp,
  Map,
  Set,
  Promise,
  setTimeout,
  clearTimeout,
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
};
sandbox.globalThis = sandbox;

const context = vm.createContext(sandbox);

const rulesSrc = fs.readFileSync(path.join(ROOT, "rules-data.js"), "utf8");
const appSrc = fs.readFileSync(path.join(ROOT, "app.js"), "utf8");

vm.runInContext(rulesSrc, context, { filename: "rules-data.js" });

// app.js's top-level script executes directly (classic script, no module
// wrapper); we only need auditEquipmentRows out of it, so expose a
// reference to it on globalThis right after the file's own definitions run.
const exposeSrc = appSrc + "\n;globalThis.__test_auditEquipmentRows = auditEquipmentRows;";
vm.runInContext(exposeSrc, context, { filename: "app.js" });

const auditEquipmentRows = context.__test_auditEquipmentRows;
if (typeof auditEquipmentRows !== "function") {
  console.error("FAIL: could not extract auditEquipmentRows from app.js");
  process.exit(1);
}

// Synthetic worksheet columns: Date, Case #, Special Needs, Equipment,
// Lead Surgeon, Room, Procedure/Code(s), Creation User.
const HEADER = ["Date", "Case #", "Special Needs", "Equipment", "Lead Surgeon", "Room", "Procedure/Code(s)", "Creation User"];
const COL = { date: 0, caseNumber: 1, specialNeeds: 2, equipment: 3, surgeon: 4, room: 5, procedures: 6, creationUser: 7 };

function futureDate() {
  const d = new Date();
  d.setDate(d.getDate() + 5);
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

function makeRow({ caseNumber, specialNeeds = "", equipment = "", procedures = "", room = "WBVC OR 5" }) {
  const row = new Array(HEADER.length).fill("");
  row[COL.date] = futureDate();
  row[COL.caseNumber] = caseNumber;
  row[COL.specialNeeds] = specialNeeds;
  row[COL.equipment] = equipment;
  row[COL.surgeon] = "Smith";
  row[COL.room] = room;
  row[COL.procedures] = procedures;
  row[COL.creationUser] = "jdoe";
  return row;
}

let passed = 0;
let failed = 0;
function check(label, condFn) {
  let ok;
  try { ok = condFn(); } catch (e) { ok = false; console.error("  threw:", e.message); }
  if (ok) { passed++; console.log(`PASS: ${label}`); }
  else { failed++; console.error(`FAIL: ${label}`); }
}

function runCase(rowDef, { omitProceduresColumn = false } = {}) {
  const header = omitProceduresColumn ? HEADER.filter((_, i) => i !== COL.procedures) : HEADER;
  const row = makeRow(rowDef);
  const rowOut = omitProceduresColumn ? row.filter((_, i) => i !== COL.procedures) : row;
  const rows = [header, rowOut];
  const result = auditEquipmentRows(rows);
  return result.includedRows.find((r) => r.caseNumber === rowDef.caseNumber);
}

function runCaseExpectError(rowDef, opts) {
  try {
    runCase(rowDef, opts);
    return null;
  } catch (e) {
    return e;
  }
}

// ── v1.7.38: Da Vinci Xi procedure flag at WBVC ─────────────────────────

// (a) WBVC, "Using Da Vinci Xi" naming family, empty Special Needs -> flags with Xi explanation
{
  const result = runCase({
    caseNumber: "XI-A",
    specialNeeds: "",
    equipment: "",
    procedures: "Cholecystectomy, Robot-Assisted, Laparoscopic, Using Da Vinci Xi",
    room: "WBVC OR 5",
  });
  check("(a) WBVC + Da Vinci Xi procedure, empty Special Needs -> flags with Xi explanation",
    () => result && result.flagged && /Xi/.test(result.explanation) && /WBVC/.test(result.explanation));
}

// (b) WBVC, "Robotic (Xi) Laparoscopic ..." naming family -> flags
{
  const result = runCase({
    caseNumber: "XI-B",
    specialNeeds: "",
    equipment: "",
    procedures: "Robotic (Xi) Laparoscopic Hysterectomy Total",
    room: "WBVC OR 5",
  });
  check("(b) WBVC + Robotic (Xi) procedure -> flags with Xi explanation",
    () => result && result.flagged && /Xi/.test(result.explanation));
}

// (c) same procedure at WBMB -> not flagged by the Xi rule (WBMB has a Xi robot)
{
  const result = runCase({
    caseNumber: "XI-C",
    specialNeeds: "",
    equipment: "",
    procedures: "Cholecystectomy, Robot-Assisted, Laparoscopic, Using Da Vinci Xi",
    room: "WBMB OR 1",
  });
  check("(c) WBMB + Da Vinci Xi procedure -> no Xi flag", () => !result);
}

// (d) same procedure at WBDE -> not flagged by the Xi rule (out of scope by design)
{
  const result = runCase({
    caseNumber: "XI-D",
    specialNeeds: "",
    equipment: "",
    procedures: "Cholecystectomy, Robot-Assisted, Laparoscopic, Using Da Vinci Xi",
    room: "WBDE OR 1",
  });
  check("(d) WBDE + Da Vinci Xi procedure -> no Xi flag (out of scope)", () => !result);
}

// (e) WBVC, "Using Da Vinci 5" (not Xi) -> no Xi flag
{
  const result = runCase({
    caseNumber: "XI-E",
    specialNeeds: "",
    equipment: "",
    procedures: "Colectomy, Sigmoid, Robot-Assisted, Laparoscopic, Using Da Vinci 5",
    room: "WBVC OR 5",
  });
  check("(e) WBVC + Da Vinci 5 (not Xi) procedure -> no Xi flag", () => !result);
}

// (f) WBVC Xi procedure + Special Needs "Ultrasound" missing from Equipment -> one row, both sentences
{
  const result = runCase({
    caseNumber: "XI-F",
    specialNeeds: "Ultrasound",
    equipment: "W Bed Standard",
    procedures: "Cholecystectomy, Robot-Assisted, Laparoscopic, Using Da Vinci Xi",
    room: "WBVC OR 5",
  });
  check("(f) WBVC Xi procedure + missing Ultrasound -> single row, both sentences present",
    () => result
      && result.flagged
      && result.keyword === "Ultrasound"
      && /Ultrasound/.test(result.explanation)
      && /Xi/.test(result.explanation)
      && result.campusFlagged === true);
}

// (g) a procedure containing a word with "xi" inside it but no Xi term -> no Xi flag
{
  const result = runCase({
    caseNumber: "XI-G",
    specialNeeds: "",
    equipment: "",
    procedures: "Excision, Maxillary Sinus, Lesion",
    room: "WBVC OR 5",
  });
  check("(g) 'Excision'/'Maxillary' (bare 'xi' substring) -> no Xi flag", () => !result);
}

// (h) file missing the Procedure/Code(s) column -> error naming it
{
  const err = runCaseExpectError({
    caseNumber: "XI-H",
    specialNeeds: "Robot",
    equipment: "W Bed Standard",
  }, { omitProceduresColumn: true });
  check("(h) missing Procedure/Code(s) column -> error naming it",
    () => err && /Procedure\/Code\(s\)/.test(err.message));
}

// ── Regression: v1.7.32 -> v1.7.37/38 Robot-keyword behavior ───────────

// Both Da Vinci naming families still satisfy the procedure gate and flag.
{
  const result = runCase({
    caseNumber: "REG-A",
    specialNeeds: "Robot",
    equipment: "W Bed Standard",
    procedures: "Colectomy, Sigmoid, Robot-Assisted, Laparoscopic, Using Da Vinci 5",
    room: "WBVC OR 5",
  });
  check("(reg) Da Vinci 5 naming family + plain Robot -> flags", () => result && result.flagged && result.keyword === "Robot");
}
{
  const result = runCase({
    caseNumber: "REG-B",
    specialNeeds: "Robot",
    equipment: "W Bed Standard",
    procedures: "Robotic (Dv5) Laparoscopic Hysterectomy Total",
    room: "WBVC OR 5",
  });
  check("(reg) Robotic (Dv5) naming family + plain Robot -> flags", () => result && result.flagged && result.keyword === "Robot");
}

// Excelsius, Stealth, ION do not flag Robot.
{
  const result = runCase({
    caseNumber: "REG-C",
    specialNeeds: "Excelsius 3D GPS Plus Robot",
    equipment: "W Bed Standard",
    procedures: "Fusion, Spine, Lumbar",
    room: "WBVC OR 5",
  });
  check("(reg) Excelsius special needs + non-robot procedure -> no flag", () => !result);
}
{
  const result = runCase({
    caseNumber: "REG-D",
    specialNeeds: "Stealth autopilot robot",
    equipment: "W System Navigation Stealth Medtronic",
    procedures: "Craniotomy, For Brain Neoplasm Excision",
    room: "WBVC OR 5",
  });
  check("(reg) Stealth special needs -> no Robot flag", () => !result);
}
{
  const result = runCase({
    caseNumber: "REG-E",
    specialNeeds: "ION Robotic Bronch",
    equipment: "W Bed Standard",
    procedures: "Robotic Bronchoscopy W/ Navigation",
    room: "WBVC OR 5",
  });
  check("(reg) ION special needs + ION procedure -> no flag", () => !result);
}

// Branch (b): Special Needs names DV5 directly, generic procedure -> still flags.
{
  const result = runCase({
    caseNumber: "REG-F",
    specialNeeds: "DV5 Robot",
    equipment: "W Bed Standard",
    procedures: "Cholecystectomy",
    room: "WBVC OR 5",
  });
  check("(reg) DV5 in special needs + generic procedure -> still flags (gate branch b)", () => result && result.flagged);
}

// Multi-line procedure cell: only the second line names a Da Vinci platform.
{
  const result = runCase({
    caseNumber: "REG-G",
    specialNeeds: "Robot",
    equipment: "W Bed Standard",
    procedures: "Cholecystectomy, Laparoscopic\nColectomy, Sigmoid, Robot-Assisted, Laparoscopic, Using Da Vinci Sp",
    room: "WBVC OR 5",
  });
  check("(reg) multi-line procedure cell, 2nd line names Da Vinci -> flags", () => result && result.flagged);
}

// Multi-term explanation: two missing keywords in one case.
{
  const result = runCase({
    caseNumber: "REG-H",
    specialNeeds: "Ultrasound, CUSA",
    equipment: "W Bed Standard",
    procedures: "Cholecystectomy",
    room: "WBVC OR 5",
  });
  check("(reg) two missing terms -> joined 'and' explanation",
    () => result && result.flagged && /Ultrasound and CUSA were listed/.test(result.explanation));
}

// WBDE Robot suppression still fully applies.
{
  const result = runCase({
    caseNumber: "REG-I",
    specialNeeds: "Robot",
    equipment: "W Bed Standard",
    procedures: "Robotic (Xi) Laparoscopic Cholecystectomy",
    room: "WBDE OR 1",
  });
  check("(reg) WBDE still fully suppresses Robot keyword", () => !result);
}

// WBMB Xi equipment acceptance still satisfies the Robot keyword.
{
  const result = runCase({
    caseNumber: "REG-J",
    specialNeeds: "Robot",
    equipment: "W Davinci Robot Xi",
    procedures: "Robotic (Xi) Laparoscopic Cholecystectomy",
    room: "WBMB OR 1",
  });
  check("(reg) WBMB Xi equipment still satisfies Robot (no flag)", () => !result);
}

// An unrelated keyword (Ultrasound) is unaffected by the Robot gate or the Xi campus flag.
{
  const result = runCase({
    caseNumber: "REG-K",
    specialNeeds: "Ultrasound",
    equipment: "W Bed Standard",
    procedures: "Fusion, Spine, Lumbar",
    room: "WBVC OR 5",
  });
  check("(reg) Ultrasound keyword unaffected by Robot gate/Xi flag -> still flags",
    () => result && result.flagged && result.keyword === "Ultrasound" && !result.campusFlagged);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
