// rules-data.js — pure data constants for the CPMC audit tools (v1.5.5).
// Loaded BEFORE app.js in index.html; these top-level const bindings are
// shared with app.js via the global lexical environment of classic scripts.
// SURGEON_PREFS must be declared before ROOM_RULES (ROOM_RULES spreads it).

    const CAMPUS_CONFIG = {
      WBVC: {
        roomPrefix:        "WBVC OR",
        campusCode:        "WBVC",
        rooms:             ["OR 1","OR 2","OR 3","OR 4","OR 5","OR 6","OR 7",
                            "OR 8","OR 9","OR 10","OR 11","OR 12","OR 13","OR 14"],
        ganttStartMin:     390,   // 06:30
        ganttEndMin:       1140,  // 19:00
        primeStartMin:     450,   // 07:30
        primeEndMin:       930,   // 15:30
        inservicePrimeStartMin: 540, // 09:00 on biweekly inservice Fridays
        biweeklyFriAnchorMs: new Date(2026, 4, 29).getTime(),
        campusCodes:       ["WBVC", "WBMB", "WBDE"],
      }
    };

    // OR Staffing Budget Calculator constants.
    const STAFFING_CONFIG = {
      whpuos: 0.103,       // worked hours per unit of service (OR minute)
      fteWeeklyHours: 40,  // 1 FTE = 40 hours/week; daily FTEs = staff hours ÷ 40
      shiftFte: {
        eight:  0.2,        // 8hr shift ÷ 40
        ten:    0.25,       // 10hr shift ÷ 40
        twelve: 0.3,        // 12hr shift ÷ 40
      }
    };

    const SURGEON_PREFS = [
      { name: "Jossart",    id: "105751",   rooms: ["OR 10"] },
      { name: "Zakaria",    id: "20144424", rooms: ["OR 11", "OR 12"] },
      { name: "Egrie",      id: "30059201", rooms: ["OR 7"] },
      { name: "Chan",       id: "309844",   rooms: ["OR 1"] },
      { name: "Lin",        id: "107858",   rooms: ["OR 5"] },
      { name: "Kardos",     id: "108387",   rooms: ["OR 2"] },
      { name: "Macdougall", id: "20120390", rooms: ["OR 11", "OR 12"] },
      { name: "Valone",     id: "20041597", rooms: ["OR 11", "OR 12"] },
      { name: "Kennedy",    id: "515122",   rooms: ["OR 4"] },
      { name: "Shah",       id: "20159245", rooms: ["OR 5"] },
      { name: "So",         id: "30069070", rooms: ["OR 5"] },
      { name: "Weber",      id: "105621",   rooms: ["OR 11", "OR 12"] },
      { name: "Sheth",      id: "20137324", rooms: ["OR 4"] },
      { name: "Kim",        id: "30113240", rooms: ["OR 11", "OR 12"] },
      { name: "Oshtory",    id: "30079667", rooms: ["OR 11", "OR 12"] },
      { name: "Leng",       id: "20048503", rooms: ["OR 11", "OR 12"] },
      { name: "Char",       id: "500276",   rooms: ["OR 10"] },
      { name: "Seiff",      id: "501360",   rooms: ["OR 10"] },
      { name: "Reiter",     id: "20063777", rooms: ["OR 5"] },
      { name: "Goyal",      id: "96086",    rooms: ["OR 14"] },
      { name: "Hongo",      id: "30068728", rooms: ["OR 14"] },
      { name: "Nathanson",  id: "30045153", rooms: ["OR 12", "OR 14"] },
      { name: "Kutzscher",  id: "20002631", rooms: ["OR 5"] },
      { name: "Zhang",      id: "20158330", rooms: ["OR 11", "OR 12"] },
      { name: "Liu",        id: "20028386", rooms: ["OR 5"] },
      { name: "Denny",      id: "20063171", rooms: ["OR 5"] },
      { name: "Kan",        id: "20126149", rooms: ["OR 4"] },
      { name: "Agarwal",    id: "20111453", rooms: ["OR 10", "OR 5"] },
      { name: "Thomas",     id: "20113222", rooms: ["OR 5"] },
      { name: "Longar",     id: "30068849", rooms: ["OR 10", "OR 5"] },
      { name: "Korver",     id: "30025215", rooms: ["OR 7", "OR 8"] },
      { name: "Moscato",    id: "30068912", rooms: ["OR 10", "OR 5"] },
      { name: "Good",       id: "500568",   rooms: ["OR 4"] },
      { name: "Yeh",        id: "20150680", rooms: ["OR 5"] },
      { name: "Ali",        id: "10028590", rooms: ["OR 4", "OR 5"] },
      { name: "Fuchs",      id: "10003434", rooms: ["OR 4", "OR 5"] },
      { name: "Charlson",   id: "20131783", rooms: ["OR 10", "OR 5"] },
      { name: "Lu",         id: "10101593", rooms: ["OR 5"] },
      { name: "Chen",       id: "30233068", rooms: ["OR 12", "OR 5"] }
    ];

    const ROOM_RULES = [
      // ── Tier 1: Physical Absolute ─────────────────────────────────────────
      {
        id: "hard-1",
        tier: 1,
        label: "DaVinci DV5 Robot",
        description: "DaVinci DV5 robot is immovable. Cases must be in OR 2 or OR 3.",
        match: { equipmentContainsAny: ["Robot DaVinci DV5", "Davinci Robot Xi"] },
        allowedRooms: ["OR 2", "OR 3"]
      },
      {
        id: "hard-2",
        tier: 1,
        label: "DaVinci SP Robot",
        description: "DaVinci SP robot is immovable. Cases must be in OR 5.",
        match: { equipmentContainsAny: ["DaVinci Robot SP"] },
        allowedRooms: ["OR 5"],
        suppressesWhenCompliant: ["hard-1"]
      },
      {
        id: "hard-3",
        tier: 1,
        label: "Neuro/Spine Room",
        description: "Neuro/spine equipment is fixed to OR 11 or OR 12.",
        match: { equipmentContainsAny: ["Robot Neuro Excelsius GPS Globus", "Table Intraop CT Spine AIRO", "Table Intraop CT Cranial AIRO", "Scanner Airo Mobile Intraoperative CT", "System Navigation Brainlab", "Unit Doppler Micro Neuro", "Table Jackson", "Frame Wilson", "Mayfield Basic Unit", "Table Double Decker", "Trios Jackson Spinal", "Cart Electrophysiology Neuro"] },
        allowedRooms: ["OR 11", "OR 12"],
        serviceExclusions: ["Maxillofacial", "Dental"]
      },
      {
        id: "hard-4",
        tier: 1,
        label: "Cardiac Surgery Room",
        description: "Cardiac surgery equipment is fixed to OR 7.",
        match: { equipmentContainsAny: ["Machine Heart Lung Perfusion", "Mount Table Large Estech", "Stool Hydraulic Ima", "Unit Hemopro 5500", "Cable Pacing Tester"] },
        allowedRooms: ["OR 7"]
      },
      {
        id: "hard-5",
        tier: 1,
        label: "Transplant Room",
        description: "Transplant equipment requires OR 6 or OR 9.",
        match: { equipmentContainsAny: ["Table Back w/o shelf (Transplant)", "Table Small w/o shelf (Transplant)", "Cooler Donor", "Cart Renal Transplant", "ORGANOX"] },
        allowedRooms: ["OR 6", "OR 9"]
      },
      {
        id: "hard-6",
        tier: 1,
        label: "Hybrid/Cath Lab",
        description: "Hybrid/cath lab equipment requires OR 14.",
        match: { equipmentContainsAny: ["CV ACCESSION EQ"] },
        allowedRooms: ["OR 14"]
      },
      {
        id: "hard-7",
        tier: 1,
        label: "Free Flap Procedure",
        description: "Free flap procedures require a room with three overhead lights. Cases must be in OR 6, OR 7, OR 8, or OR 9.",
        match: { procedureTextContains: "free flap" },
        allowedRooms: ["OR 6", "OR 7", "OR 8", "OR 9"]
      },
      // ── Tier 2: Strong Operational ────────────────────────────────────────
      {
        id: "ops-1",
        tier: 2,
        label: "Ophthalmology Equipment Room",
        description: "Ophthalmology equipment should be in OR 5 or OR 10.",
        match: { equipmentContainsAny: ["Unit Phaco Centurion", "Microscope Zeiss Eye", "Microscope Leica Eye", "Suction Irrigation System ROSI", "Cart Eye", "Gurney Eye", "Unit MIRA Diathermy", "Unit MIRA Transilluminator", "Wristrest Chan", "Tower Video Eye", "Ophthalmoscope Indirect Omega", "Unit Vitrectomy Constellation", "Machine Optiwave Refractive Analysis (ORA)", "Cart Vitrectomy"] },
        allowedRooms: ["OR 5", "OR 10"]
      },
      {
        id: "ops-2",
        tier: 2,
        label: "Pediatric Room",
        description: "Pediatric cases should be in OR 4.",
        match: { anyOf: [{ equipmentContainsAny: ["Cart Pediatric", "Warmer Overhead (French Fry)"] }, { patientAgeUnder: 18 }] },
        allowedRooms: ["OR 4"]
      },
      // ── Tier 3: Service Preference ────────────────────────────────────────
      {
        id: "svc-1",
        tier: 3,
        label: "Cardiac Surgery Service",
        description: "Cardiac surgery cases are typically in OR 7, OR 8, or OR 14.",
        match: { service: "Cardiac" },
        allowedRooms: ["OR 7", "OR 8", "OR 14"]
      },
      {
        id: "svc-2",
        tier: 3,
        label: "Neurosurgery Service",
        description: "Neurosurgery cases are typically in OR 11 or OR 12.",
        match: { service: "Neurosurgery" },
        allowedRooms: ["OR 11", "OR 12"]
      },
      {
        id: "svc-3",
        tier: 3,
        label: "Ophthalmology Service",
        description: "Ophthalmology cases are typically in OR 5 or OR 10.",
        match: { service: "Ophthalmology" },
        allowedRooms: ["OR 5", "OR 10"]
      },
      {
        id: "svc-4",
        tier: 3,
        label: "Spine Service",
        description: "Spine cases are typically in OR 11 or OR 12.",
        match: { service: "Spine" },
        allowedRooms: ["OR 11", "OR 12"]
      },
      {
        id: "svc-5",
        tier: 3,
        label: "Orthopedics Service",
        description: "Orthopedics cases are typically in OR 11 or OR 12.",
        match: { service: "Orthopedics" },
        allowedRooms: ["OR 11", "OR 12"]
      },
      {
        id: "svc-6",
        tier: 3,
        label: "Cardiology Service",
        description: "Cardiology cases are typically in OR 14.",
        match: { service: "Cardiology" },
        allowedRooms: ["OR 14"]
      },
      {
        id: "svc-7",
        tier: 3,
        label: "Pain Management Service",
        description: "Pain management cases are typically in OR 11, OR 12, or OR 4.",
        match: { service: "Pain Management" },
        allowedRooms: ["OR 11", "OR 12", "OR 4"]
      },
      {
        id: "svc-8",
        tier: 3,
        label: "Bronchoscopy Room",
        description: "Bronchoscopy cases are generally scheduled in OR 8. Please verify room assignment.",
        match: { procedureTextContains: "bronch" },
        allowedRooms: ["OR 8"]
      },
      {
        id: "svc-9",
        tier: 3,
        label: "Gynecology/Obstetrics Room",
        description: "Gynecology and Obstetrics cases are generally assigned to OR 1. Please verify this room assignment.",
        match: { anyOf: [{ service: "Gynecology" }, { service: "Obstetrics" }] },
        allowedRooms: ["OR 1"]
      },
      // ── Tier 4: Surgeon Preference (generated from SURGEON_PREFS) ─────────
      ...SURGEON_PREFS.map((s) => ({
        id: `surgeon-${s.id}`,
        tier: 4,
        label: `${s.name} Preference`,
        description: `${s.name} typically operates in ${s.rooms.join(" or ")}.`,
        match: { surgeonId: s.id },
        allowedRooms: s.rooms
      })),
      // ── Tier 5: Laterality Suggestion ─────────────────────────────────────
      {
        id: "lat-001",
        tier: 5,
        label: "PCNL Right",
        description: "Right PCNL cases are suggested in OR 2, OR 8, or OR 12.",
        match: { procedureTextContains: "PCNL", laterality: "right" },
        allowedRooms: ["OR 2", "OR 8", "OR 12"]
      },
      {
        id: "lat-002",
        tier: 5,
        label: "PCNL Left",
        description: "Left PCNL cases are suggested in OR 4, OR 5, or OR 11.",
        match: { procedureTextContains: "PCNL", laterality: "left" },
        allowedRooms: ["OR 4", "OR 5", "OR 11"]
      }
    ];

    const equipmentKeywords = [
      "C-arm",
      "Airo",
      "Myosure fluid management",
      "Fluid management system",
      "Fluent",
      "Myosure",
      "NIM",
      "Microscope",
      "Gamma",
      "Neoprobe",
      "Geiger",
      "Trunode",
      "Sonopet",
      "CUSA",
      "Aquamantys",
      "Stealth",
      "Ultrasound",
      "Spy ICG",
      "PTeye"
    ];

    // Optional per-keyword matching constraints.
    // requiresPrefix: for non-exact matches, the matched text or the immediately
    // preceding chars in the source must start with this prefix (case-insensitive).
    // This prevents e.g. "arms" from fuzzy-matching "C-arm".
    const KEYWORD_OPTIONS = {
      "C-arm": { requiresPrefix: "c" }
    };

    const KEYWORD_ALIASES = {
      "PTeye": ["parathyroid"]
    };

    const KEYWORD_DISPLAY_NAMES = {
      "Neoprobe": "TruNode"
    };

    const SURGEON_EQUIPMENT_PREFS = {
      "300002": { ultrasound: "W Unit Ultrasound Aloka" },
      "20111453": { microscope: "W Microscope Zeiss Eye" },
      "10028590": { microscope: "W Microscope Zeiss Eye" },
      "515396": { ultrasound: "W Unit Ultrasound Sonosite", microscope: "W Microscope Leica Neuro/General" },
      "11000197": { microscope: "W Microscope Leica Neuro/General" },
      "106348": { microscope: "W Microscope Zeiss Eye" },
      "20164498": { ultrasound: "W Unit Ultrasound Anesthesia" },
      "91213": { ultrasound: "W Unit Ultrasound Sonosite" },
      "20150744": { microscope: "W Microscope Zeiss Eye" },
      "105955": { microscope: "W Microscope Zeiss Eye" },
      "41288": { ultrasound: "W Unit Ultrasound Anesthesia", microscope: "W Microscope Mitaka Plastics" },
      "10064348": { microscope: "W Microscope Zeiss Eye" },
      "30233068": { microscope: "W Microscope Zeiss Eye" },
      "30068533": { ultrasound: "W Unit Ultrasound Sonosite", microscope: "W Microscope ENT" },
      "30068549": { ultrasound: "W Unit Ultrasound Sonosite" },
      "20090862": { microscope: "W Microscope Leica ENT" },
      "30048657": { ultrasound: "W ULTRASOUND CONSOLE BK" },
      "20005554": { ultrasound: "W Unit Ultrasound Aloka" },
      "20047310": { microscope: "W Microscope Zeiss Eye" },
      "30193982": { ultrasound: "W Unit Ultrasound Aloka" },
      "30040090": { microscope: "W Microscope Zeiss Eye" },
      "20063171": { microscope: "W Microscope Zeiss Eye" },
      "10078893": { microscope: "W Microscope Leica ENT" },
      "20140347": { ultrasound: "W Unit Ultrasound Sonosite" },
      "30059201": { ultrasound: "W Unit Ultrasound Sonosite" },
      "20005172": { microscope: "W Microscope Leica ENT" },
      "20045706": { microscope: "Microscope ENT" },
      "10015253": { ultrasound: "W Unit Ultrasound Sonosite", microscope: "W Microscope Leica ENT" },
      "105914": { microscope: "W Microscope Leica Eye" },
      "20002975": { ultrasound: "W Unit Ultrasound Aloka" },
      "10025": { microscope: "Microscope ENT" },
      "48428": { ultrasound: "W Unit Ultrasound from L&D" },
      "566531": { microscope: "W Microscope Leica ENT" },
      "30068703": { microscope: "W Microscope Leica ENT" },
      "700227": { ultrasound: "W Unit Ultrasound Aloka" },
      "20089611": { ultrasound: "W Unit Ultrasound from L&D" },
      "106089": { ultrasound: "W Unit Ultrasound Aloka" },
      "30091595": { microscope: "W Microscope ENT" },
      "10013430": { ultrasound: "W Unit Ultrasound Anesthesia" },
      "6601": { ultrasound: "W Unit Ultrasound from L&D" },
      "30277959": { ultrasound: "W Unit Ultrasound Sonosite", microscope: "W Microscope ENT" },
      "30291330": { ultrasound: "W Unit Ultrasound Aloka" },
      "20150422": { microscope: "W Microscope Zeiss Eye" },
      "20005259": { ultrasound: "W Unit Ultrasound Aloka" },
      "2143": { ultrasound: "W Unit Ultrasound Anesthesia", microscope: "W Microscope ENT" },
      "105751": { ultrasound: "W ULTRASOUND CONSOLE BK" },
      "30021704": { microscope: "W Microscope Zeiss Eye" },
      "20150578": { microscope: "W Microscope Zeiss Eye" },
      "20028364": { ultrasound: "W Unit Ultrasound Sonosite", microscope: "W Microscope ENT" },
      "20142245": { microscope: "W Microscope Leica Neuro/General" },
      "105858": { ultrasound: "W Unit Ultrasound Aloka" },
      "20005926": { ultrasound: "W Unit Ultrasound Aloka" },
      "98786": { ultrasound: "W Unit Ultrasound Sonosite", microscope: "W Microscope Leica ENT" },
      "515122": { microscope: "W Microscope Leica ENT" },
      "30113240": { microscope: "W Microscope Leica Neuro/General" },
      "10087662": { microscope: "W Microscope Zeiss Eye" },
      "30025215": { ultrasound: "W Unit Ultrasound Sonosite" },
      "20002631": { microscope: "W Microscope Zeiss Eye" },
      "20016947": { ultrasound: "W Unit Ultrasound Sonosite" },
      "30276343": { ultrasound: "W Unit Ultrasound Anesthesia", microscope: "W Microscope Leica ENT" },
      "20002295": { ultrasound: "W Unit Ultrasound Aloka" },
      "30068825": { microscope: "W Microscope Zeiss Eye" },
      "10063670": { microscope: "W Microscope Leica ENT" },
      "20048503": { microscope: "W Microscope Leica Neuro/General" },
      "30068835": { ultrasound: "W Unit Ultrasound Sonosite" },
      "30068839": { ultrasound: "W Unit Ultrasound Anesthesia" },
      "20125830": { microscope: "W Microscope Zeiss Eye" },
      "107858": { microscope: "W Microscope Zeiss Eye" },
      "10103762": { microscope: "W Microscope Leica Neuro/General" },
      "20028386": { microscope: "W Microscope Leica Eye" },
      "10010963": { microscope: "W Microscope Zeiss Eye" },
      "30068849": { microscope: "W Microscope Zeiss Eye" },
      "2136": { microscope: "W Microscope ENT" },
      "10101593": { microscope: "W Microscope Zeiss Eye" },
      "45714": { microscope: "W Microscope Leica ENT" },
      "20120390": { microscope: "W Microscope Leica Neuro/General" },
      "30067968": { ultrasound: "W Unit Ultrasound Aloka" },
      "10041213": { microscope: "W Microscope Leica Neuro/General" },
      "30068870": { microscope: "W Microscope ENT" },
      "20150064": { ultrasound: "W Unit Ultrasound from L&D" },
      "20160094": { ultrasound: "W Unit Ultrasound from L&D" },
      "102825": { microscope: "W Microscope Leica Neuro/General" },
      "30058757": { ultrasound: "W Unit Ultrasound Aloka" },
      "20139153": { ultrasound: "W Unit Ultrasound Aloka" },
      "30068900": { microscope: "W Microscope Leica Neuro/General" },
      "30070766": { microscope: "W Microscope Zeiss Eye" },
      "30099401": { ultrasound: "W Unit Ultrasound Sonosite", microscope: "W Microscope ENT" },
      "30277019": { microscope: "W Microscope Leica ENT" },
      "30045153": { ultrasound: "W Unit Ultrasound Sonosite" },
      "30079667": { microscope: "W Microscope Leica Neuro/General" },
      "2025": { ultrasound: "W Unit Ultrasound Aloka" },
      "30068943": { microscope: "W Microscope Zeiss Eye" },
      "20004518": { ultrasound: "W Unit Ultrasound Sonosite", microscope: "W Microscope Leica Neuro/General" },
      "10040515": { microscope: "W Microscope Leica Eye" },
      "20135204": { microscope: "W Microscope ENT" },
      "10028082": { microscope: "W Microscope Zeiss Eye" },
      "515128": { ultrasound: "W Unit Ultrasound Aloka" },
      "30039501": { microscope: "W Microscope Leica ENT" },
      "20147696": { ultrasound: "W Unit Ultrasound Aloka" },
      "20063777": { microscope: "W Microscope Zeiss Eye" },
      "30037685": { ultrasound: "W Unit Ultrasound Anesthesia", microscope: "W Microscope ENT" },
      "20121305": { microscope: "W Microscope Zeiss Eye" },
      "162092": { microscope: "W Microscope Leica Neuro/General" },
      "20159245": { microscope: "W Microscope Leica Eye" },
      "10012049": { ultrasound: "W Unit Ultrasound Sonosite" },
      "30069070": { microscope: "W Microscope Zeiss Eye" },
      "10031337": { ultrasound: "W Unit Ultrasound Aloka" },
      "98136": { ultrasound: "W Unit Ultrasound Anesthesia", microscope: "W Microscope Leica Neuro/General" },
      "10000883": { ultrasound: "W Unit Ultrasound from L&D" },
      "20007772": { ultrasound: "W Unit Ultrasound Sonosite" },
      "10105859": { microscope: "W Microscope Leica Neuro/General" },
      "30093262": { microscope: "W Microscope Zeiss Eye" },
      "20072308": { ultrasound: "W ULTRASOUND CONSOLE BK" },
      "20086795": { microscope: "W Microscope Zeiss Eye" },
      "105748": { microscope: "W Microscope Zeiss Eye" },
      "20113222": { microscope: "W Microscope Zeiss Eye" },
      "876": { ultrasound: "W Unit Ultrasound Aloka", microscope: "W Microscope Hand/Uro" },
      "20041597": { microscope: "W Microscope Leica Neuro/General" },
      "30103628": { microscope: "W Microscope Leica ENT" },
      "20096372": { ultrasound: "W Unit Ultrasound Aloka" },
      "105621": { microscope: "W Microscope Leica Neuro/General" },
      "30021640": { microscope: "W Microscope Zeiss Eye" },
      "20155760": { microscope: "W Microscope ENT" },
      "96000": { ultrasound: "W ULTRASOUND CONSOLE BK" },
      "30025687": { ultrasound: "W ULTRASOUND CONSOLE BK" },
      "20150680": { microscope: "W Microscope Zeiss Eye" },
      "30069162": { ultrasound: "W Unit Ultrasound Sonosite", microscope: "W Microscope Leica ENT" },
      "30111501": { microscope: "W Microscope ENT" },
      "20059009": { microscope: "W Microscope Zeiss Eye" },
      "20144424": { microscope: "W Microscope Leica Neuro/General" },
      "30069176": { microscope: "W Microscope ENT" },
      "10078621": { microscope: "W Microscope Zeiss Eye" },
      "20158330": { ultrasound: "W Unit Ultrasound Anesthesia", microscope: "W Microscope Leica Neuro/General" },
      "6552": { ultrasound: "W Unit Ultrasound Aloka" }
    };

    const KNOWN_PROBLEM_CPTS = [
      { code: "J7296", description: "Levonorgestrel-releasing intrauterine contraceptive system (Kyleena), 19.5 mg", dateAdded: "2026-06-17", ticket: "Pending" },
      { code: "J7297", description: "Levonorgestrel-releasing intrauterine contraceptive system (Liletta), 52 mg", dateAdded: "2026-06-17", ticket: "Pending" },
      { code: "J7298", description: "Levonorgestrel-releasing intrauterine contraceptive system (Mirena), 52 mg", dateAdded: "2026-06-17", ticket: "Pending" },
      { code: "J7301", description: "Levonorgestrel-releasing intrauterine contraceptive system (Skyla), 13.5 mg", dateAdded: "2026-06-17", ticket: "Pending" },
      { code: "Q0091", description: "Screening Papanicolaou smear; obtaining, preparing and conveyance of cervical or vaginal smear to laboratory", dateAdded: "2026-06-17", ticket: "Pending" },
      { code: "Q9967", description: "Low osmolar contrast material, 300-399 mg/ml iodine concentration, per ml", dateAdded: "2026-06-17", ticket: "Pending" },
      { code: "45386", description: "Colonoscopy, flexible; with transendoscopic balloon dilation", dateAdded: "2026-06-17", ticket: "Pending" },
      { code: "44394", description: "Colonoscopy through stoma; with removal of tumor(s), polyp(s), or other lesion(s) by snare technique", dateAdded: "2026-06-17", ticket: "Pending" }
    ];
