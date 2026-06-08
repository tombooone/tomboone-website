    let sharedAuditData = null;
    let sharedAuditResults = null;

    const requiredColumns = [
      {
        key: "date",
        label: "Date",
        accepted: ["date", "case/appt date", "surgery date", "procedure date"]
      },
      {
        key: "caseNumber",
        label: "Case #",
        accepted: ["case #", "case id", "case number"]
      },
      {
        key: "insuranceInfo",
        label: "Insurance Info",
        accepted: ["insurance info", "or case insurance information"]
      },
      {
        key: "panelCodes",
        label: "CPT Codes - All Panels",
        accepted: ["cpt codes - all panels", "sh or scheduled case cpts - all panels", "cpt codes all panels"]
      },
      {
        key: "patientClass",
        label: "Base Patient Class",
        accepted: ["base patient class", "case/log base patient class", "patient class (as scheduled)", "patient class"]
      },
      {
        key: "room",
        label: "Room",
        optional: true,
        accepted: ["room", "room (as scheduled)", "or room", "location"]
      },
      {
        key: "department",
        label: "Department",
        optional: true,
        accepted: ["department", "department name", "or department"]
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

    const KNOWN_PROBLEM_CPTS = [
      // { code: "XXXXX", description: "...", dateAdded: "YYYY-MM-DD", ticket: "TICKET-###" }
    ];

    const equipmentRequiredColumns = [
      {
        key: "caseNumber",
        label: "Case #",
        accepted: ["case #", "case id", "case number"]
      },
      {
        key: "specialNeeds",
        label: "Special Needs",
        accepted: ["special needs", "special needs (as scheduled)", "special need"]
      },
      {
        key: "equipment",
        label: "Equipment",
        accepted: ["equipment", "sh ip surgical equipment"]
      },
      {
        key: "room",
        label: "Room",
        optional: true,
        accepted: ["room", "room (as scheduled)", "or room", "location"]
      },
      {
        key: "department",
        label: "Department",
        optional: true,
        accepted: ["department", "department name", "or department"]
      }
    ];

    // DOM refs for navigation
    const homeView = document.getElementById("homeView");
    const auditView = document.getElementById("auditView");
    const equipmentView = document.getElementById("equipmentView");

    // DOM refs for CPT audit results (used by renderResults)
    const missingTable = document.getElementById("missingTable");
    const inpatientTable = document.getElementById("inpatientTable");
    const totalRowsEl = document.getElementById("totalRows");
    const missingCountEl = document.getElementById("missingCount");
    const inpatientCountEl = document.getElementById("inpatientCount");

    // DOM refs for equipment audit results (used by renderEquipmentResults)
    const equipmentMissingTable = document.getElementById("equipmentMissingTable");
    const equipmentTotalRowsEl = document.getElementById("equipmentTotalRows");
    const equipmentMissingCountEl = document.getElementById("equipmentMissingCount");
    const equipmentKeywordCountEl = document.getElementById("equipmentKeywordCount");

    const inpatientOnlyCodes = new Set([
      "00176","00211","00214","00215","00524","00540","00542","00546","00560","00561",
      "00562","00567","00580","00632","0075T","0076T","00792","00794","00796","00844",
      "00846","00848","00864","00866","00868","00882","00908","00932","00934","00936",
      "01272","01442","01444","01502","01652","01654","01656","01990","0235T","0345T",
      "0483T","0484T","0494T","0495T","0496T","0543T","0544T","0545T","0569T","0570T",
      "0584T","0585T","0586T","0643T","0646T","0659T","0805T","0806T","0894T","0895T",
      "0896T","11004","11005","11006","11008","15756","15757","15758","15778","16036",
      "19305","19306","19361","19364","19367","19368","19369","31225","31230","31290",
      "31291","31360","31365","31367","31368","31370","31375","31380","31382","31390",
      "31395","31725","31760","31766","31770","31775","31780","31781","31786","31800",
      "31805","32035","32036","32096","32097","32098","32100","32110","32120","32124",
      "32140","32141","32150","32151","32160","32200","32215","32220","32225","32310",
      "32320","32440","32442","32445","32480","32482","32484","32486","32488","32491",
      "32501","32503","32504","32505","32506","32507","32540","32650","32651","32652",
      "32653","32654","32655","32656","32658","32659","32661","32662","32663","32664",
      "32665","32666","32667","32668","32669","32670","32671","32672","32673","32674",
      "32800","32810","32815","32820","32850","32851","32852","32853","32854","32855",
      "32856","32900","32905","32906","32940","32997","33017","33018","33019","33020",
      "33025","33030","33031","33050","33120","33130","33140","33141","33202","33203",
      "33236","33237","33238","33243","33250","33251","33254","33255","33256","33257",
      "33258","33259","33261","33265","33266","33267","33268","33269","33300","33305",
      "33310","33315","33320","33321","33322","33330","33335","33340","33361","33362",
      "33363","33364","33365","33366","33367","33368","33369","33390","33391","33404",
      "33405","33406","33410","33411","33412","33413","33414","33415","33416","33417",
      "33418","33420","33422","33425","33426","33427","33430","33440","33460","33463",
      "33464","33465","33468","33474","33475","33476","33477","33478","33496","33500",
      "33501","33502","33503","33504","33505","33506","33507","33509","33510","33511",
      "33512","33513","33514","33516","33517","33518","33519","33521","33522","33523",
      "33530","33533","33534","33535","33536","33542","33545","33548","33572","33600",
      "33602","33606","33608","33610","33611","33612","33615","33617","33619","33620",
      "33621","33622","33641","33645","33647","33660","33665","33670","33675","33676",
      "33677","33681","33684","33688","33690","33692","33694","33697","33702","33710",
      "33720","33724","33726","33730","33732","33735","33736","33741","33745","33746",
      "33750","33755","33762","33764","33766","33767","33768","33770","33771","33774",
      "33775","33776","33777","33778","33779","33780","33781","33782","33783","33786",
      "33788","33800","33802","33803","33814","33820","33822","33824","33840","33845",
      "33851","33852","33853","33858","33859","33863","33864","33871","33875","33877",
      "33880","33881","33882","33883","33886","33894","33895","33897","33910","33915",
      "33916","33917","33920","33922","33924","33925","33926","33927","33928","33929",
      "33930","33933","33935","33940","33944","33945","33946","33947","33948","33949",
      "33951","33952","33953","33954","33955","33956","33957","33958","33959","33962",
      "33963","33964","33965","33966","33967","33968","33969","33970","33971","33973",
      "33974","33975","33976","33977","33978","33979","33980","33981","33982","33983",
      "33984","33985","33986","33987","33988","33989","33990","33991","33992","33993",
      "33995","33997","34001","34051","34151","34401","34451","34502","34701","34702",
      "34703","34704","34705","34706","34707","34708","34709","34710","34711","34712",
      "34717","34718","34808","34812","34813","34820","34830","34831","34832","34833",
      "34834","34841","34842","34843","34844","34845","34846","34847","34848","35001",
      "35002","35005","35013","35021","35022","35081","35082","35091","35092","35102",
      "35103","35111","35112","35121","35122","35131","35132","35141","35142","35151",
      "35152","35182","35189","35211","35216","35221","35241","35246","35251","35271",
      "35276","35281","35301","35302","35303","35304","35305","35306","35311","35331",
      "35341","35351","35355","35361","35363","35371","35390","35400","35501","35506",
      "35508","35509","35510","35511","35512","35515","35516","35518","35521","35522",
      "35523","35525","35526","35531","35533","35535","35536","35537","35538","35539",
      "35540","35556","35558","35560","35563","35565","35566","35570","35571","35583",
      "35585","35587","35600","35601","35602","35606","35612","35616","35621","35623",
      "35626","35631","35632","35633","35634","35636","35637","35638","35642","35645",
      "35646","35647","35650","35654","35656","35661","35663","35665","35666","35671",
      "35681","35682","35683","35691","35693","35694","35695","35697","35700","35701",
      "35702","35703","35820","35840","35870","35901","35905","35907","36660","36823",
      "37140","37145","37160","37180","37181","37215","37217","37218","37616","37618",
      "37660","37788","38100","38101","38102","38115","38380","38381","38382","38564",
      "38724","38746","38747","38765","38770","38780","39000","39010","39200","39220",
      "39499","39501","39503","39540","39541","39545","39560","39561","39599","41130",
      "41135","41140","41145","41150","41153","41155","42426","42845","42894","42953",
      "42961","42971","43045","43100","43101","43107","43108","43112","43113","43116",
      "43117","43118","43121","43122","43123","43124","43135","43279","43283","43286",
      "43287","43288","43300","43305","43310","43312","43313","43314","43320","43325",
      "43327","43328","43330","43331","43332","43333","43334","43335","43336","43337",
      "43338","43340","43341","43351","43352","43360","43361","43400","43405","43410",
      "43415","43425","43460","43496","43500","43501","43502","43520","43605","43610",
      "43611","43620","43621","43622","43631","43632","43633","43634","43635","43640",
      "43641","43644","43645","43771","43775","43800","43810","43820","43825","43832",
      "43843","43845","43846","43847","43848","43860","43865","43880","43881","43882",
      "44005","44010","44015","44020","44021","44025","44050","44055","44110","44111",
      "44120","44121","44125","44126","44127","44128","44130","44132","44133","44135",
      "44136","44137","44139","44140","44141","44143","44144","44145","44146","44147",
      "44150","44151","44155","44156","44157","44158","44160","44187","44188","44202",
      "44203","44204","44205","44206","44207","44208","44210","44211","44212","44213",
      "44227","44310","44316","44320","44322","44603","44604","44605","44615","44620",
      "44625","44626","44640","44650","44660","44661","44680","44700","44715","44720",
      "44721","44800","44820","44850","44899","44900","44960","45110","45111","45112",
      "45113","45114","45116","45119","45120","45121","45123","45126","45130","45135",
      "45136","45395","45397","45400","45402","45540","45550","45562","45563","45800",
      "45805","45820","45825","46705","46710","46712","46715","46716","46730","46735",
      "46740","46742","46744","46746","46748","46751","47010","47015","47100","47120",
      "47122","47125","47130","47133","47135","47140","47141","47142","47143","47144",
      "47145","47146","47147","47300","47350","47360","47361","47362","47380","47381",
      "47400","47420","47425","47460","47480","47570","47600","47605","47610","47612",
      "47620","47700","47701","47711","47712","47715","47720","47721","47740","47741",
      "47760","47765","47780","47785","47800","47801","47900","48000","48001","48020",
      "48100","48105","48120","48140","48145","48146","48148","48150","48152","48153",
      "48154","48155","48400","48500","48510","48520","48540","48545","48547","48548",
      "48551","48552","48554","48556","49000","49002","49013","49014","49020","49040",
      "49060","49062","49186","49187","49188","49189","49190","49215","49412","49425",
      "49428","49596","49605","49606","49610","49611","49616","49617","49618","49621",
      "49622","49900","49904","49905","49906","50010","50040","50045","50060","50065",
      "50070","50075","50100","50120","50125","50130","50205","50220","50225","50230",
      "50234","50236","50240","50250","50280","50290","50300","50320","50323","50325",
      "50327","50328","50329","50340","50360","50365","50370","50380","50400","50405",
      "50500","50520","50525","50526","50540","50545","50546","50547","50548","50600",
      "50605","50610","50620","50630","50650","50660","50700","50715","50722","50725",
      "50728","50740","50750","50760","50770","50780","50782","50783","50785","50800",
      "50810","50815","50820","50825","50830","50840","50845","50860","50900","50920",
      "50930","50940","51525","51530","51550","51555","51565","51570","51575","51580",
      "51585","51590","51595","51596","51597","51800","51820","51841","51865","51900",
      "51920","51925","51940","51960","51980","53415","53448","54125","54130","54135",
      "54390","54430","55605","55650","55801","55810","55812","55815","55821","55831",
      "55840","55842","55845","55862","55865","56631","56632","56633","56634","56637",
      "56640","57110","57111","57270","57280","57296","57305","57307","57308","57311",
      "57531","57540","57545","58140","58146","58150","58152","58180","58200","58210",
      "58240","58267","58275","58280","58285","58400","58410","58520","58540","58548",
      "58575","58605","58611","58700","58720","58740","58750","58752","58760","58822",
      "58825","58940","58943","58950","58951","58952","58953","58954","58956","58958",
      "58960","59120","59121","59130","59136","59140","59325","59350","59514","59525",
      "59620","59830","59850","59851","59852","59855","59856","59857","60254","60270",
      "60505","60521","60522","60540","60545","60600","60605","60650","61105","61107",
      "61108","61120","61140","61150","61151","61154","61156","61210","61250","61253",
      "61304","61305","61312","61313","61314","61315","61316","61320","61321","61322",
      "61323","61333","61340","61343","61345","61450","61458","61460","61500","61501",
      "61510","61512","61514","61516","61517","61518","61519","61520","61521","61522",
      "61524","61526","61530","61531","61533","61534","61535","61536","61537","61538",
      "61539","61540","61541","61543","61544","61545","61546","61548","61550","61552",
      "61556","61557","61558","61559","61563","61564","61566","61567","61570","61571",
      "61575","61576","61580","61581","61582","61583","61584","61585","61586","61590",
      "61591","61592","61595","61596","61597","61598","61600","61601","61605","61606",
      "61607","61608","61611","61613","61615","61616","61618","61619","61630","61635",
      "61645","61650","61651","61680","61682","61684","61686","61690","61692","61697",
      "61698","61700","61702","61703","61705","61708","61710","61711","61735","61736",
      "61737","61750","61751","61760","61850","61860","61863","61864","61867","61868",
      "61889","62005","62010","62100","62115","62117","62120","62121","62140","62141",
      "62142","62143","62145","62146","62147","62148","62161","62162","62164","62165",
      "62180","62190","62192","62200","62201","62220","62223","62256","62258","63050",
      "63051","63077","63078","63081","63082","63085","63086","63087","63088","63090",
      "63091","63101","63102","63103","63170","63172","63173","63185","63190","63191",
      "63197","63200","63250","63251","63252","63270","63271","63272","63273","63275",
      "63276","63277","63278","63280","63281","63282","63283","63285","63286","63287",
      "63290","63295","63300","63301","63302","63303","63304","63305","63306","63307",
      "63308","63700","63702","63704","63706","63707","63709","63710","63740","64755",
      "64760","64809","64818","64866","64868","65273","69155","69535","69554","69950",
      "76984","76987","76988","76989","92941","92970","92971","93583","99184","99190",
      "99191","99192","99418","99462","99468","99469","99471","99472","99475","99476",
      "99477","99478","99479","99480","C9606","G0341","G0342","G0343"
    ]);

    equipmentKeywordCountEl.textContent = String(equipmentKeywords.length);

    document.getElementById("openAuditTool").addEventListener("click", () => showView("audit"));
    document.getElementById("openEquipmentTool").addEventListener("click", () => showView("equipment"));
    document.getElementById("backHome").addEventListener("click", () => showView("home"));
    document.getElementById("equipmentBackHome").addEventListener("click", () => showView("home"));

    let _cptTool = wireAuditTool({
      fileInput: document.getElementById("fileInput"),
      runButton: document.getElementById("runAudit"),
      clearButton: document.getElementById("clearAudit"),
      statusEl: document.getElementById("status"),
      resultsPanel: document.getElementById("resultsPanel"),
      tables: [missingTable, inpatientTable],
      toolKey: "cpt",
    });

    let _equipTool = wireAuditTool({
      fileInput: document.getElementById("equipmentFileInput"),
      runButton: document.getElementById("runEquipmentAudit"),
      clearButton: document.getElementById("clearEquipmentAudit"),
      statusEl: document.getElementById("equipmentStatus"),
      resultsPanel: document.getElementById("equipmentResultsPanel"),
      tables: [equipmentMissingTable],
      toolKey: "equipment",
    });

    function showView(viewName) {
      homeView.classList.toggle("active", viewName === "home");
      auditView.classList.toggle("active", viewName === "audit");
      equipmentView.classList.toggle("active", viewName === "equipment");
      document.getElementById("roomRulesView").classList.toggle("active", viewName === "roomRules");
      document.getElementById("ruleManagementView").classList.toggle("active", viewName === "ruleManagement");
      document.getElementById("equipmentTermsView").classList.toggle("active", viewName === "equipmentTerms");
      document.getElementById("ruleInfoView").classList.toggle("active", viewName === "ruleInfo");
      document.getElementById("knownProblemCptsView").classList.toggle("active", viewName === "knownProblemCpts");
      if (viewName === "audit" && _cptTool) _cptTool.showFromShared();
      if (viewName === "equipment" && _equipTool) _equipTool.showFromShared();
      if (viewName === "roomRules" && _roomRulesTool) _roomRulesTool.showFromShared();
      if (viewName === "ruleManagement") buildRuleManagementView();
      if (viewName === "equipmentTerms") buildEquipmentTermsView();
      if (viewName === "knownProblemCpts") buildKnownProblemCptsView();
    }

    function wireAuditTool({ fileInput, runButton, clearButton, statusEl, resultsPanel, tables, toolKey }) {
      let selectedFile = null;

      function setStatus(message, isError = false) {
        statusEl.textContent = message;
        statusEl.classList.toggle("error", isError);
      }

      function showFromShared() {
        console.log("[showFromShared] toolKey:", toolKey, "| sharedAuditResults:", sharedAuditResults ? { hasCpt: !!sharedAuditResults.cpt, hasEquipment: !!sharedAuditResults.equipment, hasRoomRules: !!sharedAuditResults.roomRules } : null);
        if (sharedAuditResults) {
          _showCachedResult(toolKey);
        } else if (sharedAuditData) {
          runButton.disabled = false;
          clearButton.disabled = false;
          statusEl.classList.remove("error");
        }
      }

      function reset() {
        selectedFile = null;
        fileInput.value = "";
        runButton.disabled = true;
        clearButton.disabled = true;
        resultsPanel.hidden = true;
        tables.forEach((t) => { t.textContent = ""; });
        setStatus("Cleared. No spreadsheet data is retained in this page.");
      }

      fileInput.addEventListener("change", () => {
        selectedFile = fileInput.files[0] || null;
        runButton.disabled = !selectedFile;
        clearButton.disabled = !selectedFile;
        resultsPanel.hidden = true;
        setStatus(selectedFile ? `Ready: ${selectedFile.name}` : "Waiting for a spreadsheet.");
      });

      runButton.addEventListener("click", async () => {
        if (!selectedFile && !sharedAuditData) return;
        runButton.disabled = true;
        setStatus("Reading spreadsheet locally...");
        try {
          await _runAllAudits(selectedFile);
          _showCachedResult(toolKey);
          const firstHeading = resultsPanel.querySelector("h2");
          if (firstHeading) { firstHeading.tabIndex = -1; firstHeading.focus(); }
        } catch (error) {
          console.error(error);
          setStatus(error.message || "Unable to process this spreadsheet.", true);
        } finally {
          runButton.disabled = !selectedFile && !sharedAuditData;
          clearButton.disabled = !selectedFile && !sharedAuditData;
        }
      });

      clearButton.addEventListener("click", () => {
        sharedAuditData = null;
        sharedAuditResults = null;
        if (_cptTool) _cptTool.reset();
        if (_equipTool) _equipTool.reset();
        if (_roomRulesTool) _roomRulesTool.reset();
        const sb = document.getElementById("ganttSidebar");
        if (sb) sb.hidden = true;
        hideGanttTooltip();
      });

      return { showFromShared, reset };
    }

    async function _runAllAudits(file) {
      let rows;
      if (sharedAuditData) {
        rows = sharedAuditData.rows;
      } else {
        rows = await readXlsxRows(file, requiredColumns);
        sharedAuditData = { rows, filename: file.name };
      }

      sharedAuditResults = {};

      // CPT audit
      try {
        sharedAuditResults.cpt = auditRows(rows);
      } catch (e) {
        sharedAuditResults.cptError = e.message || "Unable to run CPT audit on this file.";
      }

      // Equipment audit
      try {
        sharedAuditResults.equipment = auditEquipmentRows(rows);
      } catch (e) {
        sharedAuditResults.equipmentError = e.message || "Unable to run equipment audit on this file.";
      }

      // Room rules audit
      try {
        sharedAuditResults.roomRules = auditRoomRules(rows);
      } catch (e) {
        sharedAuditResults.roomRulesError = e.message || "Unable to run room rules audit on this file.";
      }

      console.log("[_runAllAudits] sharedAuditResults after all audits:", {
        hasCpt: !!sharedAuditResults.cpt, cptError: sharedAuditResults.cptError,
        hasEquipment: !!sharedAuditResults.equipment, equipmentError: sharedAuditResults.equipmentError,
        hasRoomRules: !!sharedAuditResults.roomRules, roomRulesError: sharedAuditResults.roomRulesError,
      });
    }

    function _showCachedResult(toolKey) {
      if (!sharedAuditResults) return;

      if (toolKey === "cpt") {
        const panel = document.getElementById("resultsPanel");
        const status = document.getElementById("status");
        if (sharedAuditResults.cpt) {
          renderResults(sharedAuditResults.cpt);
          panel.hidden = false;
          const r = sharedAuditResults.cpt;
          status.textContent = `Audit complete. Reviewed ${r.totalRows} data row${r.totalRows === 1 ? "" : "s"}.`;
          status.classList.remove("error");
        } else if (sharedAuditResults.cptError) {
          status.textContent = sharedAuditResults.cptError;
          status.classList.add("error");
        }
        document.getElementById("runAudit").disabled = false;
        document.getElementById("clearAudit").disabled = false;
      }

      if (toolKey === "equipment") {
        const panel = document.getElementById("equipmentResultsPanel");
        const status = document.getElementById("equipmentStatus");
        if (sharedAuditResults.equipment) {
          renderEquipmentResults(sharedAuditResults.equipment);
          panel.hidden = false;
          const r = sharedAuditResults.equipment;
          status.textContent = `Audit complete. Reviewed ${r.totalRows} data row${r.totalRows === 1 ? "" : "s"}.`;
          status.classList.remove("error");
        } else if (sharedAuditResults.equipmentError) {
          status.textContent = sharedAuditResults.equipmentError;
          status.classList.add("error");
        }
        document.getElementById("runEquipmentAudit").disabled = false;
        document.getElementById("clearEquipmentAudit").disabled = false;
      }

      if (toolKey === "roomRules") {
        const panel = roomRulesResultsPanel;
        const status = document.getElementById("roomRulesStatus");
        if (sharedAuditResults.roomRules) {
          renderRoomRulesResults(sharedAuditResults.roomRules);
          panel.hidden = false;
          const r = sharedAuditResults.roomRules;
          status.textContent = `Audit complete. Reviewed ${r.totalRows} case${r.totalRows === 1 ? "" : "s"}.`;
          status.classList.remove("error");
        } else if (sharedAuditResults.roomRulesError) {
          status.textContent = sharedAuditResults.roomRulesError;
          status.classList.add("error");
        }
        document.getElementById("runRoomRulesAudit").disabled = false;
        document.getElementById("clearRoomRulesAudit").disabled = false;
      }
    }

    function auditRows(rows) {
      const populatedRows = rows.filter(hasData);

      if (populatedRows.length < 2) {
        throw new Error("The spreadsheet was readable, but no worksheet with data rows was found.");
      }

      const headerInfo = findHeaderInfoForColumns(populatedRows, requiredColumns);
      if (!headerInfo) throw new Error("Could not find the required audit columns in this spreadsheet.");
      const { indexes, headerRowIndex } = headerInfo;

      const missingRows = [];
      const inpatientRows = [];
      const errorMessages = [];
      const dataRows = populatedRows.slice(headerRowIndex + 1);
      const knownProblemSet = new Set(KNOWN_PROBLEM_CPTS.map((e) => e.code));

      dataRows.forEach((row, offset) => {
        const spreadsheetRowNumber = offset + headerRowIndex + 2;
        const caseNumber = cell(row, indexes.caseNumber) || `Row ${spreadsheetRowNumber}`;
        const dateValue = parseDateCell(cell(row, indexes.date));
        const insuranceInfo = cell(row, indexes.insuranceInfo);
        const panelInfo = cell(row, indexes.panelCodes);
        const patientClass = cell(row, indexes.patientClass).toUpperCase();
        const location = cell(row, indexes.department) || cell(row, indexes.room);
        const orderCodes = extractCodes(insuranceInfo);
        const panelCodesList = extractCodes(panelInfo).codes;
        const panelCodes = new Set(panelCodesList);
        const missingCodes = orderCodes.codes.filter((code) => !panelCodes.has(code) && !knownProblemSet.has(code));
        const inpatientMatches = orderCodes.codes.filter((code) => inpatientOnlyCodes.has(code) && !knownProblemSet.has(code));

        if (missingCodes.length) {
          missingRows.push({
            date: dateValue.display,
            sortDate: dateValue.sort,
            caseNumber,
            location,
            orderCodes: orderCodes.codes,
            caseCodes: panelCodesList,
            missingCodes,
            explanation: codeSentence(
              missingCodes,
              "on the surgical order but has not been associated with any of the procedure panels",
              "on the surgical order but have not been associated with any of the procedure panels"
            )
          });
        }

        if (isOutpatient(patientClass) && inpatientMatches.length) {
          inpatientRows.push({
            date: dateValue.display,
            sortDate: dateValue.sort,
            caseNumber,
            location,
            codes: inpatientMatches,
            explanation: codeSentence(inpatientMatches, "listed by CMS Addendum E as inpatient-only but appears on an outpatient case")
          });
        }

        orderCodes.errors.forEach((badCode) => {
          errorMessages.push(`Row ${spreadsheetRowNumber}, case ${caseNumber}: CPT-like value "${badCode}" has fewer than 5 characters and was not audited.`);
        });
      });

      return {
        totalRows: dataRows.length,
        missingRows: sortAuditRows(missingRows),
        inpatientRows: sortAuditRows(inpatientRows),
        errorMessages
      };
    }

    function auditEquipmentRows(rows) {
      const populatedRows = rows.filter(hasData);

      if (populatedRows.length < 2) {
        throw new Error("The spreadsheet was readable, but no worksheet with data rows was found.");
      }

      const headerInfo = findHeaderInfoForColumns(populatedRows, equipmentRequiredColumns);
      if (!headerInfo) throw new Error("Could not find the required equipment audit columns: Case #, Special Needs, and Equipment.");
      const { indexes, headerRowIndex } = headerInfo;
      const dataRows = populatedRows.slice(headerRowIndex + 1);
      const includedRows = [];
      dataRows.forEach((row) => {
        const caseNumber = cell(row, indexes.caseNumber);
        const specialNeeds = cell(row, indexes.specialNeeds);
        const equipment = cell(row, indexes.equipment);
        const location = cell(row, indexes.department) || cell(row, indexes.room);
        const foundTerms = findEquipmentTermsInText(specialNeeds);

        if (!foundTerms.length) return;

        const missingTerm = foundTerms.find((term) => !containsEquipmentTerm(equipment, term));
        if (!missingTerm) return;

        includedRows.push({
          caseNumber,
          location,
          specialNeeds,
          equipment,
          keyword: missingTerm.keyword,
          matchStart: missingTerm.startIndex,
          matchEnd: missingTerm.startIndex + missingTerm.matchedText.length,
          explanation: `${missingTerm.keyword} was listed in Special Needs but not added to Equipment`
        });
      });

      return {
        totalRows: dataRows.length,
        includedRows
      };
    }

    function renderResults(result) {
      totalRowsEl.textContent = String(result.totalRows);
      missingCountEl.textContent = String(result.missingRows.length);
      inpatientCountEl.textContent = String(result.inpatientRows.length);

      missingTable.textContent = "";
      inpatientTable.textContent = "";

      if (result.missingRows.length) {
        result.missingRows.forEach((row) => {
          const tr = document.createElement("tr");
          tr.append(td(row.date));
          tr.append(td(row.location || ""));
          const missingCaseCell = td(row.caseNumber);
          missingCaseCell.style.fontWeight = "700";
          makeCopyable(missingCaseCell, row.caseNumber);
          tr.append(missingCaseCell);
          tr.append(codeListTd(row.orderCodes));
          tr.append(codeListTd(row.caseCodes));
          tr.append(missingCodesTd(row.missingCodes));
          missingTable.append(tr);
        });
      } else {
        missingTable.append(emptyRow(6, "No missing CPT discrepancies found."));
      }

      result.errorMessages.forEach((message) => {
        const tr = document.createElement("tr");
        tr.className = "error-row";
        const errorCell = td(`Error check: ${message}`);
        errorCell.colSpan = 6;
        tr.append(errorCell);
        missingTable.append(tr);
      });

      if (result.inpatientRows.length) {
        result.inpatientRows.forEach((row) => {
          const tr = document.createElement("tr");
          tr.append(td(row.date));
          tr.append(td(row.location || ""));
          const inpatientCaseCell = td(row.caseNumber);
          inpatientCaseCell.style.fontWeight = "700";
          makeCopyable(inpatientCaseCell, row.caseNumber);
          tr.append(inpatientCaseCell);
          tr.append(explanationTd(row.explanation, row.codes));
          inpatientTable.append(tr);
        });
      } else {
        inpatientTable.append(emptyRow(4, "No CMS inpatient-only CPT codes found on outpatient cases."));
      }
    }

    function renderEquipmentResults(result) {
      equipmentTotalRowsEl.textContent = String(result.totalRows);
      equipmentMissingCountEl.textContent = String(result.includedRows.length);
      equipmentKeywordCountEl.textContent = String(equipmentKeywords.length);
      equipmentMissingTable.textContent = "";

      if (result.includedRows.length) {
        result.includedRows.forEach((row) => {
          // Main row with toggle
          const tr = document.createElement("tr");
          tr.className = "equip-row-main";

          const caseCell = document.createElement("td");
          const equipCaseSpan = document.createElement("span");
          equipCaseSpan.textContent = row.caseNumber || "";
          equipCaseSpan.style.fontWeight = "700";
          makeCopyable(equipCaseSpan, row.caseNumber);
          const toggleAffordance = document.createElement("div");
          toggleAffordance.className = "equip-toggle-affordance";
          const icon = document.createElement("span");
          icon.className = "equip-toggle-icon";
          icon.textContent = "▶";
          const toggleLabel = document.createElement("span");
          toggleLabel.className = "equip-toggle-label";
          toggleLabel.textContent = "Details";
          toggleAffordance.append(icon, toggleLabel);
          caseCell.append(equipCaseSpan, toggleAffordance);
          tr.append(caseCell);
          tr.append(td(row.location || ""));
          tr.append(td(row.specialNeeds));
          const explCell = td(row.explanation);
          explCell.style.cursor = "pointer";
          explCell.addEventListener("click", (e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(row.explanation || "").then(() => showToast("Copied"));
          });
          tr.append(explCell);

          // Detail row (hidden until expanded)
          const detailTr = document.createElement("tr");
          detailTr.className = "equip-detail-row";
          detailTr.hidden = true;

          const detailCell = document.createElement("td");
          detailCell.colSpan = 4;

          const detailDiv = document.createElement("div");
          detailDiv.className = "equip-detail";

          const snSection = document.createElement("div");
          const snLabel = document.createElement("div");
          snLabel.className = "equip-detail-label";
          snLabel.textContent = "Special Needs";
          const snValue = document.createElement("div");
          snValue.className = "equip-detail-value";
          const snText = row.specialNeeds || "–";
          if (row.matchStart !== undefined && row.matchEnd !== undefined && row.matchEnd <= snText.length) {
            snValue.append(document.createTextNode(snText.slice(0, row.matchStart)));
            const mark = document.createElement("mark");
            mark.style.cssText = "background: #fef3c7; font-weight: 700; border-radius: 2px; padding: 0 2px; color: #92400e;";
            mark.textContent = snText.slice(row.matchStart, row.matchEnd);
            mark.style.cursor = "pointer";
            mark.addEventListener("click", (e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(mark.textContent).then(() => showToast("Copied: " + mark.textContent));
            });
            snValue.append(mark);
            snValue.append(document.createTextNode(snText.slice(row.matchEnd)));
          } else {
            snValue.textContent = snText;
          }
          snSection.append(snLabel, snValue);

          const eqSection = document.createElement("div");
          const eqLabel = document.createElement("div");
          eqLabel.className = "equip-detail-label";
          eqLabel.textContent = "Equipment List";
          if (row.keyword) {
            const missingTag = document.createElement("span");
            missingTag.style.cssText = "margin-left: 6px; font-size: 0.68rem; font-weight: 700; color: #b91c1c; text-transform: none; letter-spacing: 0;";
            missingTag.textContent = `(${row.keyword} not found)`;
            eqLabel.append(missingTag);
          }
          const eqValue = document.createElement("div");
          eqValue.className = "equip-detail-value";
          const eqItems = String(row.equipment || "")
            .split(/\n/)
            .map((s) => s.replace(/^W\s+/, "").trim())
            .filter(Boolean);
          eqValue.textContent = eqItems.length ? eqItems.join("\n") : "–";
          eqSection.append(eqLabel, eqValue);

          detailDiv.append(snSection, eqSection);

          const reportBtnHeader = document.createElement("div");
          reportBtnHeader.style.cssText = "display: flex; justify-content: flex-end; padding: 8px 12px 0;";
          const reportBtn = document.createElement("button");
          reportBtn.type = "button";
          reportBtn.className = "rule-flag-btn";
          reportBtn.textContent = "Report an issue";
          reportBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const subject = encodeURIComponent("Equipment Audit Issue");
            const body = encodeURIComponent("CASE: " + row.caseNumber + "\n\nISSUE: ");
            window.location.href = `mailto:Thomas.Boone@SutterHealth.org?subject=${subject}&body=${body}`;
          });
          reportBtnHeader.append(reportBtn);
          detailCell.append(reportBtnHeader, detailDiv);
          detailTr.append(detailCell);

          tr.addEventListener("click", () => {
            const nowHidden = detailTr.hidden;
            detailTr.hidden = !nowHidden;
            tr.classList.toggle("expanded", nowHidden);
          });

          equipmentMissingTable.append(tr, detailTr);
        });
      } else {
        equipmentMissingTable.append(emptyRow(4, "No matching equipment request discrepancies found."));
      }
    }

    function findEquipmentTermsInText(text) {
      const source = String(text || "");
      const lowered = source.toLowerCase();
      const matches = [];

      equipmentKeywords.forEach((keyword, keywordIndex) => {
        const search = keyword.toLowerCase();
        let startIndex = 0;
        let foundIndex = lowered.indexOf(search, startIndex);

        while (foundIndex !== -1) {
          matches.push({
            keyword,
            keywordIndex,
            startIndex: foundIndex,
            matchedText: source.slice(foundIndex, foundIndex + keyword.length),
            matchType: "exact"
          });
          startIndex = foundIndex + 1;
          foundIndex = lowered.indexOf(search, startIndex);
        }

        if (!matches.some((match) => match.keywordIndex === keywordIndex)) {
          const kwOpts = KEYWORD_OPTIONS[keyword];
          const prefixMatch = findPrefixTokenMatch(source, keyword);
          if (prefixMatch && (!kwOpts?.requiresPrefix || matchSatisfiesPrefix(source, prefixMatch.startIndex, prefixMatch.matchedText, kwOpts.requiresPrefix))) {
            matches.push({ keyword, keywordIndex, startIndex: prefixMatch.startIndex, matchedText: prefixMatch.matchedText, matchType: "prefix" });
          } else {
            const fuzzyMatch = findBestFuzzyEquipmentMatch(source, keyword);
            if (fuzzyMatch && (!kwOpts?.requiresPrefix || matchSatisfiesPrefix(source, fuzzyMatch.startIndex, fuzzyMatch.matchedText, kwOpts.requiresPrefix))) {
              matches.push({ keyword, keywordIndex, startIndex: fuzzyMatch.startIndex, matchedText: fuzzyMatch.matchedText, matchType: "fuzzy", score: fuzzyMatch.score });
            }
          }
        }
      });

      return matches.sort((a, b) => {
        if (a.startIndex !== b.startIndex) return a.startIndex - b.startIndex;
        return a.keywordIndex - b.keywordIndex;
      });
    }

    function containsEquipmentTerm(text, termMatch) {
      const source = String(text || "");
      if (source.toLowerCase().includes(termMatch.keyword.toLowerCase())) return true;
      const kwOpts = KEYWORD_OPTIONS[termMatch.keyword];
      const prefixResult = findPrefixTokenMatch(source, termMatch.keyword);
      if (prefixResult) {
        if (!kwOpts?.requiresPrefix || matchSatisfiesPrefix(source, prefixResult.startIndex, prefixResult.matchedText, kwOpts.requiresPrefix)) return true;
      }
      if (!kwOpts?.requiresPrefix && tokenBagMatch(source, termMatch.keyword)) return true;
      const fuzzyResult = findBestFuzzyEquipmentMatch(source, termMatch.keyword);
      if (fuzzyResult) {
        if (!kwOpts?.requiresPrefix || matchSatisfiesPrefix(source, fuzzyResult.startIndex, fuzzyResult.matchedText, kwOpts.requiresPrefix)) return true;
      }
      return false;
    }

    function matchSatisfiesPrefix(sourceText, matchStart, matchedText, prefix) {
      const p = prefix.toLowerCase();
      if (matchedText.toLowerCase().startsWith(p)) return true;
      const lookback = sourceText.slice(Math.max(0, matchStart - prefix.length - 1), matchStart).replace(/\s+$/, "");
      return lookback.toLowerCase().endsWith(p);
    }

    function tokenBagMatch(sourceText, keyword) {
      const kwTokens = normalizedTokens(keyword).filter((t) => t.length >= 3);
      if (!kwTokens.length) return false;
      const srcTokens = tokenSpans(sourceText).map((s) => s.normalized);
      return kwTokens.every((kt) =>
        srcTokens.some((st) => st === kt || st.startsWith(kt))
      );
    }

    function findPrefixTokenMatch(sourceText, keyword) {
      const kwTokens = normalizedTokens(keyword);
      const srcSpans = tokenSpans(sourceText);
      if (!kwTokens.length || !srcSpans.length) return null;
      for (const srcSpan of srcSpans) {
        for (const kwToken of kwTokens) {
          if (kwToken.length >= 3 && srcSpan.normalized.startsWith(kwToken) && srcSpan.normalized !== kwToken) {
            return { startIndex: srcSpan.startIndex, matchedText: sourceText.slice(srcSpan.startIndex, srcSpan.endIndex) };
          }
        }
      }
      return null;
    }

    function findBestFuzzyEquipmentMatch(text, keyword) {
      const source = String(text || "");
      const keywordTokens = normalizedTokens(keyword);
      const sourceTokens = tokenSpans(source);

      if (!keywordTokens.length || !sourceTokens.length) return null;

      const target = keywordTokens.join(" ");
      const windowSize = keywordTokens.length;
      const maxWindowSize = Math.min(sourceTokens.length, windowSize + 1);
      const minWindowSize = Math.max(1, windowSize - 1);
      let best = null;

      for (let size = minWindowSize; size <= maxWindowSize; size += 1) {
        for (let start = 0; start <= sourceTokens.length - size; start += 1) {
          const windowTokens = sourceTokens.slice(start, start + size);
          const candidate = windowTokens.map((token) => token.normalized).join(" ");
          const score = similarityScore(candidate, target);
          const threshold = fuzzyThreshold(target);

          if (score >= threshold && (!best || score > best.score || (score === best.score && windowTokens[0].startIndex < best.startIndex))) {
            best = {
              score,
              startIndex: windowTokens[0].startIndex,
              matchedText: source.slice(windowTokens[0].startIndex, windowTokens[windowTokens.length - 1].endIndex)
            };
          }
        }
      }

      return best;
    }

    function normalizedTokens(text) {
      return String(text || "")
        .normalize("NFKC")
        .toLowerCase()
        .replace(/[‐-―]/g, "-")
        .match(/[a-z0-9]+/g) || [];
    }

    function tokenSpans(text) {
      const source = String(text || "");
      const tokens = [];
      const pattern = /[A-Za-z0-9]+/g;
      let match;

      while ((match = pattern.exec(source)) !== null) {
        tokens.push({
          normalized: match[0].toLowerCase(),
          startIndex: match.index,
          endIndex: match.index + match[0].length
        });
      }

      return tokens;
    }

    function similarityScore(candidate, target) {
      if (!candidate && !target) return 1;
      if (!candidate || !target) return 0;
      const distance = levenshteinDistance(candidate, target);
      return 1 - distance / Math.max(candidate.length, target.length);
    }

    function fuzzyThreshold(target) {
      const compactLength = String(target || "").replace(/\s+/g, "").length;
      if (compactLength <= 4) return 0.9;
      if (compactLength <= 8) return 0.84;
      return 0.78;
    }

    function levenshteinDistance(a, b) {
      const source = String(a || "");
      const target = String(b || "");
      let prev = Array.from({ length: target.length + 1 }, (_, i) => i);
      let curr = new Array(target.length + 1);

      for (let i = 1; i <= source.length; i += 1) {
        curr[0] = i;
        for (let j = 1; j <= target.length; j += 1) {
          const cost = source[i - 1] === target[j - 1] ? 0 : 1;
          curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
        }
        [prev, curr] = [curr, prev];
      }

      return prev[target.length];
    }

    function td(text, className = "") {
      const el = document.createElement("td");
      el.textContent = text || "";
      if (className) el.className = className;
      return el;
    }

    let _toastTimer;
    function showToast(message) {
      const toast = document.getElementById("copyToast");
      toast.textContent = message;
      clearTimeout(_toastTimer);
      toast.classList.add("visible");
      _toastTimer = setTimeout(() => toast.classList.remove("visible"), 1500);
    }
    function showCopyToast(caseNumber) {
      showToast("Case #" + caseNumber + " copied");
    }

    function makeCopyable(el, text) {
      el.classList.add("copy-case");
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(String(text)).then(() => showCopyToast(text));
      });
    }

    function codeListTd(codes) {
      const el = document.createElement("td");
      el.className = "code-list";
      appendCodeText(el, codes.join(", "), codes);
      return el;
    }

    function missingCodesTd(codes) {
      const el = document.createElement("td");
      el.className = "code-list";
      codes.forEach((code, i) => {
        if (i > 0) el.append(document.createTextNode(" "));
        const wrap = document.createElement("span");
        wrap.style.cssText = "display:inline-flex;align-items:center;gap:4px;white-space:nowrap;";
        const mark = document.createElement("mark");
        mark.style.cssText = "background:#fef3c7;font-weight:700;border-radius:2px;padding:0 2px;color:#92400e;";
        mark.textContent = code;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = "Not in Epic";
        btn.style.cssText = "font-size:0.68rem;padding:1px 5px;border-radius:3px;border:1px solid var(--border,#d1d5db);background:var(--panel,#fff);color:var(--muted,#6b7280);cursor:pointer;line-height:1.4;";
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const subject = encodeURIComponent("CPT Not in Epic");
          const body = encodeURIComponent(`CPT CODE: ${code}`);
          window.location.href = `mailto:Thomas.Boone@SutterHealth.org?subject=${subject}&body=${body}`;
        });
        wrap.append(mark, btn);
        el.append(wrap);
      });
      return el;
    }

    function explanationTd(text, codes) {
      const el = document.createElement("td");
      appendCodeText(el, text, codes);
      return el;
    }

    function appendCodeText(container, text, codes) {
      const uniqueCodes = [...new Set(codes)].sort((a, b) => b.length - a.length);
      const pattern = uniqueCodes.length ? new RegExp(`\\b(${uniqueCodes.map(escapeRegExp).join("|")})\\b`, "g") : null;

      if (!pattern) {
        container.textContent = text || "";
        return;
      }

      let lastIndex = 0;
      String(text || "").replace(pattern, (match, code, offset) => {
        container.append(document.createTextNode(String(text).slice(lastIndex, offset)));
        const strong = document.createElement("strong");
        strong.textContent = code;
        container.append(strong);
        lastIndex = offset + match.length;
        return match;
      });
      container.append(document.createTextNode(String(text || "").slice(lastIndex)));
    }

    function escapeRegExp(value) {
      return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    function emptyRow(colSpan, message) {
      const row = document.createElement("tr");
      row.className = "empty-row";
      const emptyCell = td(message);
      emptyCell.colSpan = colSpan;
      row.append(emptyCell);
      return row;
    }

    function findHeaderInfoForColumns(rows, columns) {
      const scanLimit = Math.min(rows.length, 40);

      for (let rowIndex = 0; rowIndex < scanLimit; rowIndex += 1) {
        const row = rows[rowIndex] || [];
        const headers = Array.from({ length: row.length }, (_, index) => normalizeHeader(row[index]));
        const indexes = Object.fromEntries(
          columns.map((column) => [column.key, findHeader(headers, column.accepted)])
        );
        const missingHeaders = columns.filter((column) => !column.optional && indexes[column.key] === -1);

        if (!missingHeaders.length) {
          return { indexes, headerRowIndex: rowIndex };
        }
      }

      return null;
    }

    function hasData(row) {
      return row.some((value) => String(value ?? "").trim() !== "");
    }

    function normalizeHeader(value) {
      return String(value || "")
        .normalize("NFKC")
        .trim()
        .replace(/[‐-―]/g, "-")
        .replace(/[_/]+/g, " ")
        .replace(/\s+/g, " ")
        .toLowerCase();
    }

    function findHeader(headers, accepted) {
      const normalizedAccepted = accepted.map((value) => normalizeHeader(value));
      const safeHeaders = Array.from(headers || [], (header) => normalizeHeader(header));
      const exactIndex = safeHeaders.findIndex((header) => normalizedAccepted.includes(header));
      if (exactIndex !== -1) return exactIndex;

      return safeHeaders.findIndex((header) => {
        return normalizedAccepted.some((acceptedHeader) => {
          return acceptedHeader.length > 3 && header.includes(acceptedHeader);
        });
      });
    }

    function cell(row, index) {
      return String(row[index] ?? "").trim();
    }

    function extractCodes(text) {
      const source = String(text || "").toUpperCase();
      const codes = [];
      const errors = [];
      const seen = new Set();
      const codePattern = /[A-Z]\d{4}|\d{5}|\d{4}[A-Z]/g;
      const shortPattern = /\d{3,4}/g;
      let match;

      while ((match = codePattern.exec(source)) !== null) {
        const code = match[0];
        if (isCodeBoundary(source, match.index, match.index + code.length) && !seen.has(code)) {
          seen.add(code);
          codes.push(code);
        }
      }

      while ((match = shortPattern.exec(source)) !== null) {
        const shortCode = match[0];
        if (isCodeBoundary(source, match.index, match.index + shortCode.length, true)) {
          errors.push(shortCode);
        }
      }

      return { codes, errors };
    }

    function isCodeBoundary(source, start, end, rejectHyphenBefore = false) {
      const before = source[start - 1] || "";
      const after = source[end] || "";
      const beforePattern = rejectHyphenBefore ? /[-A-Z0-9]/ : /[A-Z0-9]/;
      return !beforePattern.test(before) && !/[A-Z0-9]/.test(after);
    }

    function codeSentence(codes, singularEnding, pluralEnding) {
      const verb = codes.length === 1 ? "is" : "are";
      const label = codes.length === 1 ? "CPT code" : "CPT codes";
      const ending = codes.length === 1 ? singularEnding : (pluralEnding ?? singularEnding);
      return `${label} ${codes.join(", ")} ${verb} ${ending}.`;
    }

    function isOutpatient(patientClass) {
      return ["OP", "OUTPATIENT", "OUT PATIENT"].includes(patientClass);
    }

    function parseDateCell(value) {
      const text = String(value || "").trim();
      const serial = Number(text);
      if (text && Number.isFinite(serial) && serial > 25000 && serial < 80000) {
        const date = excelSerialToDate(serial);
        return {
          display: `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`,
          sort: date.getTime()
        };
      }

      const parsed = Date.parse(text);
      return {
        display: text,
        sort: Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER
      };
    }

    function sortAuditRows(rows) {
      return rows.sort((a, b) => {
        if (a.sortDate !== b.sortDate) return a.sortDate - b.sortDate;
        return String(a.caseNumber).localeCompare(String(b.caseNumber), undefined, { numeric: true });
      });
    }

    function excelSerialToDate(serial) {
      const utcDays = Math.floor(serial - 25569);
      const utcValue = utcDays * 86400;
      const dateInfo = new Date(utcValue * 1000);
      return new Date(dateInfo.getUTCFullYear(), dateInfo.getUTCMonth(), dateInfo.getUTCDate());
    }

    async function readXlsxRows(file, columnDefs) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (!isZipFile(bytes)) return parseTextWorkbook(new TextDecoder().decode(bytes));

      const entries = await unzipEntries(bytes);
      const sharedStrings = parseSharedStrings(textEntry(entries, "xl/sharedStrings.xml", true));
      const worksheetPaths = [...entries.keys()]
        .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name))
        .sort((a, b) => sheetNumber(a) - sheetNumber(b));

      if (!worksheetPaths.length) throw new Error("No worksheet was found in this XLSX file.");

      const parsedSheets = worksheetPaths.map((sheetPath) => {
        const rows = parseSheetRows(textEntry(entries, sheetPath), sharedStrings);
        return {
          path: sheetPath,
          rows,
          populatedRowCount: rows.filter(hasData).length
        };
      });
      const matchingSheet = parsedSheets.find((sheet) => findHeaderInfoForColumns(sheet.rows.filter(hasData), columnDefs));

      if (matchingSheet) return matchingSheet.rows;

      const sheetWithMostRows = parsedSheets
        .filter((sheet) => sheet.populatedRowCount > 0)
        .sort((a, b) => b.populatedRowCount - a.populatedRowCount)[0];

      if (sheetWithMostRows) return sheetWithMostRows.rows;

      const sheetSummary = parsedSheets
        .map((sheet) => `${sheet.path.replace("xl/worksheets/", "")}: ${sheet.populatedRowCount} rows`)
        .join(", ");
      throw new Error(`No worksheet data rows were found. Sheets checked: ${sheetSummary}.`);
    }

    function sheetNumber(sheetPath) {
      const match = sheetPath.match(/sheet(\d+)\.xml$/);
      return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
    }

    function isZipFile(bytes) {
      return bytes[0] === 0x50 && bytes[1] === 0x4b;
    }

    function parseTextWorkbook(text) {
      const trimmed = String(text || "").trim();
      if (!trimmed) throw new Error("The selected file is empty.");

      if (/^\s*</.test(trimmed)) {
        const doc = new DOMParser().parseFromString(trimmed, "text/html");
        const table = doc.querySelector("table");
        if (table) {
          return [...table.querySelectorAll("tr")].map((row) => {
            return [...row.querySelectorAll("th,td")].map((cell) => cell.textContent || "");
          });
        }

        const xmlDoc = new DOMParser().parseFromString(trimmed, "application/xml");
        const xmlRows = elementsByLocalName(xmlDoc, "Row");
        if (xmlRows.length) {
          return xmlRows.map((rowNode) => {
            return elementsByLocalName(rowNode, "Cell").map((cellNode) => cellNode.textContent || "");
          });
        }
      }

      return trimmed.split(/\r?\n/).map(parseDelimitedRow);
    }

    function parseDelimitedRow(line) {
      const delimiter = line.includes("\t") ? "\t" : ",";
      const cells = [];
      let value = "";
      let inQuotes = false;

      for (let index = 0; index < line.length; index += 1) {
        const char = line[index];
        const next = line[index + 1];

        if (char === "\"" && next === "\"" && inQuotes) {
          value += "\"";
          index += 1;
        } else if (char === "\"") {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          cells.push(value);
          value = "";
        } else {
          value += char;
        }
      }

      cells.push(value);
      return cells;
    }

    function textEntry(entries, name, optional = false) {
      const bytes = entries.get(name);
      if (!bytes) {
        if (optional) return "";
        throw new Error(`The XLSX file is missing ${name}.`);
      }
      return new TextDecoder().decode(bytes);
    }

    async function unzipEntries(bytes) {
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const eocdOffset = findEndOfCentralDirectory(view);
      const centralDirectoryOffset = view.getUint32(eocdOffset + 16, true);
      const entryCount = view.getUint16(eocdOffset + 10, true);
      const entries = new Map();
      let offset = centralDirectoryOffset;

      for (let i = 0; i < entryCount; i += 1) {
        if (view.getUint32(offset, true) !== 0x02014b50) {
          throw new Error("The XLSX zip directory could not be read.");
        }

        const method = view.getUint16(offset + 10, true);
        const compressedSize = view.getUint32(offset + 20, true);
        const nameLength = view.getUint16(offset + 28, true);
        const extraLength = view.getUint16(offset + 30, true);
        const commentLength = view.getUint16(offset + 32, true);
        const localHeaderOffset = view.getUint32(offset + 42, true);
        const nameBytes = bytes.slice(offset + 46, offset + 46 + nameLength);
        const name = new TextDecoder().decode(nameBytes);

        const localNameLength = view.getUint16(localHeaderOffset + 26, true);
        const localExtraLength = view.getUint16(localHeaderOffset + 28, true);
        const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
        const compressed = bytes.slice(dataStart, dataStart + compressedSize);

        if (!name.endsWith("/")) {
          entries.set(name, await inflateZipData(compressed, method));
        }

        offset += 46 + nameLength + extraLength + commentLength;
      }

      return entries;
    }

    function findEndOfCentralDirectory(view) {
      for (let offset = view.byteLength - 22; offset >= 0; offset -= 1) {
        if (view.getUint32(offset, true) === 0x06054b50) return offset;
      }
      throw new Error("This does not look like a valid XLSX file.");
    }

    async function inflateZipData(compressed, method) {
      if (method === 0) return compressed;
      if (method !== 8) throw new Error(`Unsupported XLSX compression method: ${method}.`);
      if (!("DecompressionStream" in window)) {
        throw new Error("This browser cannot read XLSX files locally. Try current Chrome, Edge, or Safari.");
      }

      try {
        const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
        return new Uint8Array(await new Response(stream).arrayBuffer());
      } catch (firstError) {
        console.error("deflate-raw failed, retrying with deflate:", firstError);
        const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate"));
        return new Uint8Array(await new Response(stream).arrayBuffer());
      }
    }

    function parseSharedStrings(xmlText) {
      if (!xmlText) return [];
      const doc = new DOMParser().parseFromString(xmlText, "application/xml");
      return elementsByLocalName(doc, "si").map((item) => {
        return elementsByLocalName(item, "t").map((node) => node.textContent || "").join("");
      });
    }

    function parseSheetRows(xmlText, sharedStrings) {
      const doc = new DOMParser().parseFromString(xmlText, "application/xml");
      const rows = [];

      elementsByLocalName(doc, "row").forEach((rowNode) => {
        const row = [];
        elementsByLocalName(rowNode, "c").forEach((cellNode, cellOffset) => {
          const ref = cellNode.getAttribute("r") || "";
          const columnRef = ref.replace(/\d+/g, "");
          const columnIndex = columnRef ? columnRefToIndex(columnRef) : cellOffset;
          row[columnIndex] = readCellValue(cellNode, sharedStrings);
        });
        rows.push(row);
      });

      return rows;
    }

    function readCellValue(cellNode, sharedStrings) {
      const type = cellNode.getAttribute("t");
      if (type === "inlineStr") {
        const textNode = elementsByLocalName(cellNode, "t")[0];
        return textNode ? textNode.textContent || "" : "";
      }

      const valueNode = elementsByLocalName(cellNode, "v")[0];
      const rawValue = valueNode ? valueNode.textContent || "" : "";

      if (type === "s") return sharedStrings[Number(rawValue)] || "";
      if (type === "b") return rawValue === "1" ? "TRUE" : "FALSE";
      return rawValue;
    }

    function elementsByLocalName(root, name) {
      const lowerName = name.toLowerCase();
      return [...root.getElementsByTagName("*")].filter((element) => {
        return element.localName.toLowerCase() === lowerName;
      });
    }

    function columnRefToIndex(ref) {
      let index = 0;
      for (let i = 0; i < ref.length; i += 1) {
        index = index * 26 + ref.charCodeAt(i) - 64;
      }
      return index - 1;
    }

    // ─── Room Rules ───────────────────────────────────────────────────────────

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
        label: "Gynecology Room",
        description: "Gynecology cases are generally assigned to OR 1. Please verify this room assignment.",
        match: { service: "Gynecology" },
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

    const roomRulesColumns = [
      { key: "caseNumber", label: "Case #",         accepted: ["case #", "case id", "case number"] },
      { key: "date",       label: "Date",            accepted: ["date", "case/appt date", "surgery date", "procedure date"] },
      { key: "room",       label: "Room",            accepted: ["room", "room (as scheduled)", "or room", "location"] },
      { key: "procedures", label: "Case Procedures", accepted: ["case procedures", "case/appt procedures (as scheduled)", "procedure name", "procedures"] },
      { key: "equipment",  label: "Equipment",       accepted: ["equipment", "sh ip surgical equipment", "equipment items"] },
      { key: "patientAge", label: "Patient Age",     accepted: ["patient age", "patient age in years"] },
      { key: "service",    label: "Service",          accepted: ["service", "surgical service (as scheduled)"] },
      { key: "surgeon",    label: "Lead Surgeon",     accepted: ["lead surgeon", "lead surgeon (as scheduled)"] },
      { key: "projStart",  label: "Proj Start Time",  accepted: ["proj start time", "case/appt projected start time (as scheduled)"] },
      { key: "projEnd",    label: "Proj End Time",    accepted: ["proj end time", "projected end time (as scheduled)"] },
      { key: "procStart",  label: "Proc Start",       accepted: ["proc start", "procedures start time (as scheduled)"] },
      { key: "procEnd",    label: "Proc End",          accepted: ["proc end", "procedure end time (as scheduled)"] }
    ];

    const roomRulesRequiredColumns = [
      { label: "Date",                accepted: ["date", "case/appt date", "surgery date"] },
      { label: "Proc Start",          accepted: ["proc start", "procedures start time (as scheduled)"] },
      { label: "Proc End",            accepted: ["proc end", "procedure end time (as scheduled)"] },
      { label: "Case #",              accepted: ["case #", "case id", "case number"] },
      { label: "Lead Surgeon",        accepted: ["lead surgeon", "lead surgeon (as scheduled)"] },
      { label: "Service",             accepted: ["service", "surgical service (as scheduled)"] },
      { label: "Case Procedures",     accepted: ["case procedures", "case/appt procedures (as scheduled)"] },
      { label: "Patient Class",       accepted: ["patient class", "case/log base patient class", "base patient class"] },
      { label: "Room",                accepted: ["room", "room (as scheduled)"] },
      { label: "Status",              accepted: ["status", "scheduling status (as scheduled)", "pref cards status"] },
      { label: "Equipment",           accepted: ["equipment", "sh ip surgical equipment"] },
      { label: "Patient Age",         accepted: ["patient age", "patient age in years"] },
      { label: "Proj Start Time",     accepted: ["proj start time", "case/appt projected start time (as scheduled)"] },
      { label: "Proj End Time",       accepted: ["proj end time", "projected end time (as scheduled)"] },
      { label: "Case Classification", accepted: ["case classification"] }
    ];

    // DOM refs for room rules
    const roomRulesView = document.getElementById("roomRulesView");
    const roomRulesResultsPanel = document.getElementById("roomRulesResultsPanel");
    const roomRulesTotalRowsEl = document.getElementById("roomRulesTotalRows");
    const roomRulesHardCountEl = document.getElementById("roomRulesHardCount");
    const roomRulesSoftCountEl = document.getElementById("roomRulesSoftCount");
    const roomRulesViolationsTable = document.getElementById("roomRulesViolationsTable");

    let _violGroupDataMap = new Map();
    roomRulesViolationsTable.addEventListener("click", (e) => {
      const rowEl = e.target.closest("tr[data-sort-date]");
      if (!rowEl) return;
      const caseNumber = rowEl.dataset.caseNum;
      const sortDate = Number(rowEl.dataset.sortDate);
      const grp = _violGroupDataMap.get(`${sortDate}:${caseNumber}`);
      if (!grp) return;
      const first = grp.viols[0];
      const casesForDay = _ganttByDate.get(sortDate) || [];
      const caseObj = casesForDay.find((c) => String(c.caseNumber) === caseNumber)
        || { caseNumber, date: first.date, sortDate, room: first.room, surgeon: first.surgeon,
             procedures: first.procedures, service: "", startMin: null, endMin: null };
      const allViols = (_lastAuditResult ? _lastAuditResult.violations : []).filter(
        (v) => String(v.caseNumber) === caseNumber && v.sortDate === sortDate
      );
      if (_calActiveSd !== sortDate && typeof _calOnSelect === "function") {
        try { navigateToDay(sortDate); } catch (_) {}
      }
      showGanttSidebar(caseObj, allViols);
    });

    document.getElementById("openRoomRulesTool").addEventListener("click", () => showView("roomRules"));
    document.getElementById("roomRulesBackHome").addEventListener("click", () => showView("home"));
    document.getElementById("ruleManagementBackHome").addEventListener("click", () => showView("home"));
    document.getElementById("ruleInfoBackBtn").addEventListener("click", () => showView("ruleManagement"));
    document.getElementById("howThisWorksBtn").addEventListener("click", () => showView("ruleInfo"));

    let _roomRulesTool = wireAuditTool({
      fileInput: document.getElementById("roomRulesFileInput"),
      runButton: document.getElementById("runRoomRulesAudit"),
      clearButton: document.getElementById("clearRoomRulesAudit"),
      statusEl: document.getElementById("roomRulesStatus"),
      resultsPanel: roomRulesResultsPanel,
      tables: [roomRulesViolationsTable],
      toolKey: "roomRules",
    });

    document.getElementById("viewActiveRulesBtn").addEventListener("click", () => showView("ruleManagement"));
    document.getElementById("requestNewRuleBtn").addEventListener("click", () => {
      const subject = encodeURIComponent("New Rule Request");
      const body = encodeURIComponent("COMMENT: \n\nThis is a request for a new room assignment rule.");
      window.location.href = `mailto:Thomas.Boone@SutterHealth.org?subject=${subject}&body=${body}`;
    });
    document.getElementById("viewKnownProblemCptsBtn").addEventListener("click", () => showView("knownProblemCpts"));
    document.getElementById("knownProblemCptsBack").addEventListener("click", () => showView("audit"));
    document.getElementById("viewEquipmentTermsBtn").addEventListener("click", () => showView("equipmentTerms"));
    document.getElementById("equipmentTermsBack").addEventListener("click", () => showView("equipment"));
    document.getElementById("suggestEquipmentBtn").addEventListener("click", () => {
      window.location.href = "mailto:Thomas.Boone@SutterHealth.org?subject=Equipment%20Term%20Suggestion&body=SUGGESTED%20TERM%3A%20%0A%0AThis%20is%20a%20suggestion%20to%20add%20a%20new%20equipment%20term%20to%20the%20audit%20keyword%20list.";
    });



    function normalizeRoomName(text) {
      const match = String(text || "").match(/\bOR\s*(\d+)/i);
      return match ? "OR " + parseInt(match[1], 10) : String(text || "").trim().toUpperCase();
    }

    function extractSurgeonId(text) {
      const match = String(text || "").match(/\[(\d+)\]/);
      return match ? match[1] : null;
    }

    function parseLaterality(text) {
      const match = String(text || "").match(/\b(left|right)\b/i);
      return match ? match[1].toLowerCase() : null;
    }

    function parseSurgeonLastName(text) {
      const s = String(text || "").trim();
      const commaIdx = s.indexOf(",");
      return commaIdx !== -1 ? s.slice(0, commaIdx).trim() : s;
    }

    function parsePatientAge(text) {
      const match = String(text || "").match(/^(\d+)/);
      return match ? parseInt(match[1], 10) : null;
    }

    function parseTimeToMinutes(value) {
      if (value === null || value === undefined || value === "") return null;

      // Native JS number: pure fraction (0.3125) OR datetime serial (46209.3125).
      // Use modulo to extract the time-of-day portion in both cases.
      if (typeof value === "number") {
        if (value >= 0) return Math.round((value % 1) * 1440);
        return null;
      }

      const s = String(value).trim();
      if (!s) return null;

      // Pure numeric string — covers "0.3125" and datetime serials like "46209.3125".
      // readCellValue returns the raw <v> textContent, which is always a decimal string
      // for numeric/date/time cells in XLSX (never a formatted string like "07:30:00").
      if (/^\d+(\.\d+)?$/.test(s)) {
        const n = parseFloat(s);
        return Math.round((n % 1) * 1440);
      }

      // Time string: find HH:MM[:SS] [AM/PM] anywhere in the value.
      // Word-boundary \b lets this handle both bare "07:30:00" and
      // date-prefixed strings like "5/28/2026 7:30:00 AM".
      const mT = s.match(/\b(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?\b/i);
      if (mT) {
        let h = parseInt(mT[1], 10);
        const min = parseInt(mT[2], 10);
        const ampm = mT[3] ? mT[3].toLowerCase() : null;
        if (ampm === "pm" && h !== 12) h += 12;
        if (ampm === "am" && h === 12) h = 0;
        if (h <= 23 && min <= 59) return h * 60 + min;
      }

      // Military HHMM (3–4 digits, no colon)
      const mMil = s.match(/^(\d{3,4})$/);
      if (mMil) {
        const n = parseInt(mMil[1], 10);
        const h = Math.floor(n / 100), mm = n % 100;
        if (h <= 23 && mm <= 59) return h * 60 + mm;
      }

      return null;
    }

    function formatRoomList(rooms, conjunction) {
      if (rooms.length === 1) return rooms[0];
      if (rooms.length === 2) return `${rooms[0]} ${conjunction} ${rooms[1]}`;
      return `${rooms.slice(0, -1).join(", ")}, ${conjunction} ${rooms[rooms.length - 1]}`;
    }

    function buildExplanation(rule) {
      const rooms = rule.allowedRooms;
      switch (rule.tier) {
        case 1: {
          const fixed = formatRoomList(rooms, "and");
          const move  = formatRoomList(rooms, "or");
          return `${rule.label} is fixed in ${fixed}. Please move this case to ${move}.`;
        }
        case 2: {
          if (rule.id === "ops-2") {
            return "Pediatric cases belong in OR 4. If unavailable, consider OR 3 or OR 5.";
          }
          const list = formatRoomList(rooms, "and");
          return `${rule.label} equipment is designated for ${list}. Please move this case if available.`;
        }
        case 3: {
          const list = formatRoomList(rooms, "and");
          const subject = rule.match.service || rule.label.replace(/ Room$| Service$/, "");
          return `${subject} cases are generally assigned to ${list}. Please verify this room assignment.`;
        }
        case 4: {
          const surgeonName = rule.label.replace(/ Preference$/, "");
          const list = formatRoomList(rooms, "or");
          return `${surgeonName} typically operates in ${list}. Consider reassigning if possible.`;
        }
        case 5: {
          const list = formatRoomList(rooms, "or");
          return `${rule.match.procedureTextContains} on the ${rule.match.laterality} side is usually scheduled in ${list} for setup convenience.`;
        }
        default:
          return `Allowed rooms: ${rooms.join(", ")}.`;
      }
    }

    function describeMatch(rule) {
      const m = rule.match;
      if (!m) return "–";
      if (m.anyOf) {
        return m.anyOf.map((sub) => describeMatch({ match: sub })).join(" or ");
      }
      if (m.equipmentContainsAny) {
        const n = m.equipmentContainsAny.length;
        if (n <= 2) return "Equipment: " + m.equipmentContainsAny.join(", ");
        return `Equipment (any of ${n}): ${m.equipmentContainsAny.join(", ")}`;
      }
      if (m.service !== undefined) return "Service: " + m.service;
      if (m.surgeonId !== undefined) return "Surgeon ID: " + m.surgeonId;
      if (m.procedureTextContains !== undefined) {
        return "Procedure: " + m.procedureTextContains + (m.laterality ? " (" + m.laterality + " side)" : "");
      }
      if (m.patientAgeUnder !== undefined) return "Patient age < " + m.patientAgeUnder;
      return "–";
    }

    const TIER_META = [
      null,
      { label: "Tier 1: Physical Absolute", desc: "Immovable equipment or other physical constraint" },
      { label: "Tier 2: Strong Operational", desc: "Designated room assignments" },
      { label: "Tier 3: Service Preference", desc: "Service line clustering, strong but flexible" },
      { label: "Tier 4: Surgeon Preference", desc: "Behavioral patterns, no hard clinical reason" },
      { label: "Tier 5: Suggestion", desc: "Low-confidence patterns, convenience preferences" }
    ];

    function buildRuleManagementView() {
      const content = document.getElementById("ruleManagementContent");
      if (!content) return;
      content.textContent = "";

      const byTier = new Map();
      ROOM_RULES.forEach((rule) => {
        if (!byTier.has(rule.tier)) byTier.set(rule.tier, []);
        byTier.get(rule.tier).push(rule);
      });

      [1, 2, 3, 4, 5].forEach((tier) => {
        const rules = byTier.get(tier) || [];
        if (!rules.length) return;

        const meta = TIER_META[tier];
        const section = document.createElement("div");
        section.className = "rule-tier-section";

        const header = document.createElement("div");
        header.className = "rule-tier-header";
        const hdg = document.createElement("h3");
        hdg.textContent = meta.label;
        const desc = document.createElement("span");
        desc.className = "rule-tier-desc";
        desc.textContent = meta.desc;
        header.append(hdg, desc);
        section.append(header);

        const cards = document.createElement("div");
        cards.className = "rule-cards";

        rules.forEach((rule) => {
          const tierConf = ["High", "High", "High", "Medium", "Low"][tier - 1];

          const card = document.createElement("div");
          card.className = "rule-card";

          // Badge column
          const badgeWrap = document.createElement("div");
          badgeWrap.className = "rule-card-badge";
          const badge = document.createElement("span");
          badge.className = `badge badge-tier-${tier}`;
          badge.textContent = "Tier " + tier;
          badgeWrap.append(badge);

          // Main column
          const main = document.createElement("div");
          main.className = "rule-card-main";

          const labelRow = document.createElement("div");
          labelRow.className = "rule-card-label";
          labelRow.textContent = rule.label;

          const matchRow = document.createElement("div");
          matchRow.className = "rule-card-match";
          matchRow.textContent = "Trigger: " + describeMatch(rule);

          const roomsRow = document.createElement("div");
          roomsRow.className = "rule-card-rooms";
          roomsRow.textContent = "Rooms: " + rule.allowedRooms.join(", ");

          const meta2 = document.createElement("div");
          meta2.className = "rule-card-meta";
          const confSpan = document.createElement("span");
          confSpan.textContent = "Confidence: " + tierConf;
          meta2.append(confSpan);

          main.append(labelRow, matchRow, roomsRow, meta2);

          // Actions column
          const actions = document.createElement("div");
          actions.className = "rule-card-actions";

          const flagBtn = document.createElement("button");
          flagBtn.type = "button";
          flagBtn.className = "rule-flag-btn";
          flagBtn.textContent = "Flag for review";

          const reviewPanel = document.createElement("div");
          reviewPanel.style.cssText = "flex-direction: column; gap: 5px; min-width: 190px; display: none;";

          const commentInput = document.createElement("textarea");
          commentInput.className = "rule-note-input";
          commentInput.placeholder = "Describe the issue with this rule...";
          commentInput.rows = 3;

          const errorMsg = document.createElement("p");
          errorMsg.style.cssText = "color: var(--warn); font-size: 0.72rem; margin: 0; display: none;";
          errorMsg.textContent = "Please add a comment before sending.";

          const sendBtn = document.createElement("button");
          sendBtn.type = "button";
          sendBtn.className = "primary-button";
          sendBtn.style.cssText = "font-size: 0.75rem; min-height: 30px; padding: 4px 12px;";
          sendBtn.textContent = "Send";

          reviewPanel.append(commentInput, errorMsg, sendBtn);
          actions.append(flagBtn, reviewPanel);

          flagBtn.addEventListener("click", () => {
            flagBtn.style.display = "none";
            reviewPanel.style.display = "flex";
            commentInput.focus();
          });

          sendBtn.addEventListener("click", () => {
            const comment = commentInput.value.trim();
            if (!comment) {
              errorMsg.style.display = "block";
              return;
            }
            errorMsg.style.display = "none";
            const subject = encodeURIComponent(`Rule Review Request: ${rule.label}`);
            const body = encodeURIComponent([
              `COMMENT: ${comment}`,
              "",
              `Rule: ${rule.label} (Tier ${rule.tier})`
            ].join("\n"));
            window.location.href = `mailto:Thomas.Boone@SutterHealth.org?subject=${subject}&body=${body}`;
            commentInput.value = "";
            reviewPanel.style.display = "none";
            flagBtn.style.display = "";
          });

          card.append(badgeWrap, main, actions);
          cards.append(card);
        });

        section.append(cards);
        content.append(section);
      });
    }

    function buildEquipmentTermsView() {
      const content = document.getElementById("equipmentTermsContent");
      if (!content) return;
      content.textContent = "";
      const list = document.createElement("div");
      list.className = "keyword-list";
      equipmentKeywords.forEach((kw) => {
        const pill = document.createElement("span");
        pill.className = "keyword-pill";
        pill.textContent = kw;
        list.append(pill);
      });
      content.append(list);
    }

    function buildKnownProblemCptsView() {
      const content = document.getElementById("knownProblemCptsContent");
      if (!content) return;
      content.textContent = "";
      const wrap = document.createElement("div");
      wrap.className = "table-section";
      const tableWrap = document.createElement("div");
      tableWrap.className = "table-wrap";
      const table = document.createElement("table");
      const thead = document.createElement("thead");
      const headerRow = document.createElement("tr");
      ["Code", "Description", "Date Added", "Ticket"].forEach((label) => {
        const th = document.createElement("th");
        th.textContent = label;
        headerRow.append(th);
      });
      thead.append(headerRow);
      table.append(thead);
      const tbody = document.createElement("tbody");
      if (!KNOWN_PROBLEM_CPTS.length) {
        const tr = document.createElement("tr");
        tr.className = "empty-row";
        const emptyCell = document.createElement("td");
        emptyCell.colSpan = 4;
        emptyCell.textContent = "No known problem CPTs on file.";
        tr.append(emptyCell);
        tbody.append(tr);
      } else {
        KNOWN_PROBLEM_CPTS.forEach((entry) => {
          const tr = document.createElement("tr");
          [entry.code, entry.description, entry.dateAdded, entry.ticket].forEach((val) => {
            const cell = document.createElement("td");
            cell.textContent = val || "";
            tr.append(cell);
          });
          tbody.append(tr);
        });
      }
      table.append(tbody);
      tableWrap.append(table);
      wrap.append(tableWrap);
      content.append(wrap);
    }

    function validateRoomRulesColumns(populatedRows) {
      const scanLimit = Math.min(populatedRows.length, 40);
      let bestHeaders = [];
      let bestCount = 0;

      for (let i = 0; i < scanLimit; i++) {
        const headers = (populatedRows[i] || []).map((v) => normalizeHeader(v));
        const count = roomRulesRequiredColumns.filter(
          (col) => findHeader(headers, col.accepted) !== -1
        ).length;
        if (count > bestCount) {
          bestCount = count;
          bestHeaders = headers;
        }
      }

      return roomRulesRequiredColumns
        .filter((col) => findHeader(bestHeaders, col.accepted) === -1)
        .map((col) => col.label);
    }

    function ruleTriggersForCase(rule, ctx) {
      if (rule.serviceExclusions) {
        const svc = String(ctx.serviceText || "").toLowerCase();
        if (rule.serviceExclusions.some((excl) => excl.toLowerCase() === svc)) return false;
      }
      const m = rule.match;
      if (m.anyOf) {
        return m.anyOf.some((sub) => ruleTriggersForCase({ match: sub }, ctx));
      }
      if (m.equipmentContainsAny) {
        const src = String(ctx.equipmentText || "").toLowerCase();
        return m.equipmentContainsAny.some((term) => src.includes(term.toLowerCase()));
      }
      if (m.service !== undefined) {
        return String(ctx.serviceText || "").toLowerCase() === m.service.toLowerCase();
      }
      if (m.surgeonId !== undefined) {
        return ctx.surgeonId === m.surgeonId;
      }
      if (m.procedureTextContains !== undefined) {
        const textMatch = String(ctx.proceduresText || "").toLowerCase().includes(m.procedureTextContains.toLowerCase());
        if (!textMatch) return false;
        if (m.laterality !== undefined) return ctx.laterality === m.laterality;
        return true;
      }
      if (m.patientAgeUnder !== undefined) {
        return ctx.patientAge !== null && ctx.patientAge < m.patientAgeUnder;
      }
      return false;
    }

    function auditRoomRules(rows) {
      const populatedRows = rows.filter(hasData);
      if (populatedRows.length < 2) {
        throw new Error("The spreadsheet was readable, but no data rows were found.");
      }

      const missingColumns = validateRoomRulesColumns(populatedRows);
      if (missingColumns.length) {
        throw new Error(
          `This file is missing ${missingColumns.length} required column${missingColumns.length === 1 ? "" : "s"}: ` +
          missingColumns.join(", ") +
          ". Please export a complete OR schedule from Epic."
        );
      }

      const headerInfo = findHeaderInfoForColumns(populatedRows, roomRulesColumns);
      if (!headerInfo) throw new Error("Could not locate the header row in this spreadsheet.");
      const { indexes, headerRowIndex } = headerInfo;
      const dataRows = populatedRows.slice(headerRowIndex + 1)
        .filter((row) => /wbvc\s+or\b/i.test(cell(row, indexes.room)));
      const violations = [];
      const cases = [];
      const ruleMatchCounts = new Map();
      ROOM_RULES.forEach((rule) => ruleMatchCounts.set(rule.id, 0));

      dataRows.forEach((row) => {
        const caseNumber     = cell(row, indexes.caseNumber);
        const dateValue      = parseDateCell(cell(row, indexes.date));
        const rawRoom        = cell(row, indexes.room);
        const normalizedRoom = normalizeRoomName(rawRoom);
        const equipmentText  = cell(row, indexes.equipment);
        const proceduresText = cell(row, indexes.procedures);
        const patientAge     = parsePatientAge(cell(row, indexes.patientAge));
        const serviceText    = cell(row, indexes.service);
        const surgeonRaw     = cell(row, indexes.surgeon);
        const surgeonId      = extractSurgeonId(surgeonRaw);
        const surgeonName    = parseSurgeonLastName(surgeonRaw);
        const laterality     = parseLaterality(proceduresText);
        const rawStart       = cell(row, indexes.projStart);
        const rawEnd         = cell(row, indexes.projEnd);
        const startMin       = parseTimeToMinutes(rawStart);
        const endMin         = parseTimeToMinutes(rawEnd);
        const procStartMin   = parseTimeToMinutes(cell(row, indexes.procStart));
        const procEndMin     = parseTimeToMinutes(cell(row, indexes.procEnd));

        cases.push({
          caseNumber,
          date:         dateValue.display,
          sortDate:     dateValue.sort,
          room:         normalizedRoom || rawRoom,
          procedures:   proceduresText,
          surgeon:      surgeonName,
          service:      serviceText,
          patientAge,
          equipmentText,
          startMin,
          endMin,
          procStartMin,
          procEndMin
        });

        const ctx = { equipmentText, proceduresText, patientAge, serviceText, surgeonId, laterality };

        const firedRules = ROOM_RULES.filter((rule) => ruleTriggersForCase(rule, ctx));

        firedRules.forEach((rule) => {
          ruleMatchCounts.set(rule.id, (ruleMatchCounts.get(rule.id) || 0) + 1);
        });

        const suppressedIds = new Set();
        firedRules.forEach((rule) => {
          if (rule.suppressesWhenCompliant && rule.allowedRooms.includes(normalizedRoom)) {
            rule.suppressesWhenCompliant.forEach((id) => suppressedIds.add(id));
          }
        });

        const hasTier12Compliant = firedRules.some(
          (rule) => rule.tier <= 2 && rule.allowedRooms.includes(normalizedRoom)
        );

        firedRules.forEach((rule) => {
          if (suppressedIds.has(rule.id)) return;
          if (hasTier12Compliant && rule.tier >= 3) return;
          if (!rule.allowedRooms.includes(normalizedRoom)) {
            violations.push({
              caseNumber,
              date:        dateValue.display,
              sortDate:    dateValue.sort,
              surgeon:     surgeonName,
              room:        normalizedRoom || rawRoom,
              procedures:  proceduresText,
              ruleId:      rule.id,
              ruleTier:    rule.tier,
              ruleLabel:   rule.label,
              explanation: buildExplanation(rule)
            });
          }
        });
      });

      // Post-process Tier 3: suppress flags when no allowed room has a prime-time gap
      // large enough to fit the contiguous block of related cases for that rule.
      const T3_PRIME_END = 930; // 15:30
      const t3DayMs = 86400000;
      const t3Suppressed = new Set(); // "caseNumber:ruleId"
      const t3ProcessedBlocks = new Set(); // "sortDate:room:ruleId:blockStart"
      violations.forEach((v) => {
        if (v.ruleTier !== 3) return;
        const suppressKey = `${v.caseNumber}:${v.ruleId}`;
        if (t3Suppressed.has(suppressKey)) return;

        const rule = ROOM_RULES.find((r) => r.id === v.ruleId);
        if (!rule) return;

        const ac = cases.find((c) => c.caseNumber === v.caseNumber);
        if (!ac || ac.startMin === null || ac.endMin === null) return;

        // Related cases: same day, same room, matching service or surgeon
        const related = cases
          .filter((c) =>
            c.sortDate === v.sortDate &&
            c.room === v.room &&
            c.startMin !== null &&
            c.endMin !== null &&
            (c.service === ac.service || c.surgeon === ac.surgeon)
          )
          .sort((a, b) => a.startMin - b.startMin);

        // Group into contiguous blocks (gap ≤ 30 min)
        const blocks = [];
        let cur = [related[0]];
        for (let i = 1; i < related.length; i++) {
          if (related[i].startMin - cur[cur.length - 1].endMin <= 30) {
            cur.push(related[i]);
          } else {
            blocks.push(cur);
            cur = [related[i]];
          }
        }
        blocks.push(cur);

        // Find the block containing the anchor case
        const block = blocks.find((b) => b.some((c) => c.caseNumber === ac.caseNumber));
        if (!block) return;

        const blockStart = Math.min(...block.map((c) => c.startMin));
        const blockEnd   = Math.max(...block.map((c) => c.endMin));
        const blockDur   = blockEnd - blockStart;
        if (blockDur <= 0) return;

        const blockKey = `${v.sortDate}:${v.room}:${v.ruleId}:${blockStart}`;
        if (t3ProcessedBlocks.has(blockKey)) return;
        t3ProcessedBlocks.add(blockKey);

        // Biweekly inservice Friday: OR start shifts 07:30 → 09:00
        const diffDays = Math.round((v.sortDate - BIWEEKLY_FRI_ANCHOR_MS) / t3DayMs);
        const isInserviceFri = new Date(v.sortDate).getDay() === 5 && diffDays >= 0 && diffDays % 14 === 0;
        const primeStart = isInserviceFri ? 540 : 450; // 09:00 or 07:30

        // Feasibility: does any allowed room have a prime-time gap ≥ blockDur?
        let feasible = false;
        for (const allowedRoom of rule.allowedRooms) {
          if (feasible) break;
          const occ = cases
            .filter((c) => c.room === allowedRoom && c.sortDate === v.sortDate && c.startMin !== null && c.endMin !== null)
            .map((c) => [c.startMin, c.endMin])
            .sort((a, b) => a[0] - b[0]);
          let cursor = primeStart;
          for (const [s, e] of occ) {
            if (s > cursor && s - cursor >= blockDur) { feasible = true; break; }
            if (e > cursor) cursor = e;
          }
          if (!feasible && T3_PRIME_END - cursor >= blockDur) feasible = true;
        }

        if (!feasible) {
          block.forEach((c) => t3Suppressed.add(`${c.caseNumber}:${v.ruleId}`));
        }
      });
      // Post-process ops-2 (Pediatric Room): suppress flags when OR 4 has no feasible slot
      const ops2Suppressed = new Set(); // "caseNumber:ops-2"
      const ops2ProcessedBlocks = new Set(); // "sortDate:room:blockStart"
      violations.forEach((v) => {
        if (v.ruleId !== "ops-2") return;
        const suppressKey = `${v.caseNumber}:ops-2`;
        if (ops2Suppressed.has(suppressKey)) return;

        const ac = cases.find((c) => c.caseNumber === v.caseNumber);
        if (!ac || ac.startMin === null || ac.endMin === null) return;

        const isPeds = (c) => {
          const eq = String(c.equipmentText || "").toLowerCase();
          return (c.patientAge !== null && c.patientAge < 18) ||
            eq.includes("cart pediatric") ||
            eq.includes("warmer overhead (french fry)");
        };

        const related = cases
          .filter((c) =>
            c.sortDate === v.sortDate &&
            c.room === v.room &&
            c.startMin !== null &&
            c.endMin !== null &&
            isPeds(c)
          )
          .sort((a, b) => a.startMin - b.startMin);

        if (!related.length) return;

        const blocks = [];
        let cur = [related[0]];
        for (let i = 1; i < related.length; i++) {
          if (related[i].startMin - cur[cur.length - 1].endMin <= 30) cur.push(related[i]);
          else { blocks.push(cur); cur = [related[i]]; }
        }
        blocks.push(cur);

        const block = blocks.find((b) => b.some((c) => c.caseNumber === ac.caseNumber));
        if (!block) return;

        const blockStart = Math.min(...block.map((c) => c.startMin));
        const blockEnd   = Math.max(...block.map((c) => c.endMin));
        const blockDur   = blockEnd - blockStart;
        if (blockDur <= 0) return;

        const blockKey = `${v.sortDate}:${v.room}:${blockStart}`;
        if (ops2ProcessedBlocks.has(blockKey)) return;
        ops2ProcessedBlocks.add(blockKey);

        const diffDays = Math.round((v.sortDate - BIWEEKLY_FRI_ANCHOR_MS) / t3DayMs);
        const isInserviceFri = new Date(v.sortDate).getDay() === 5 && diffDays >= 0 && diffDays % 14 === 0;
        const primeStart = isInserviceFri ? 540 : 450;

        let feasible = false;
        for (const checkRoom of ["OR 4", "OR 3", "OR 5"]) {
          if (feasible) break;
          const occ = cases
            .filter((c) => c.room === checkRoom && c.sortDate === v.sortDate && c.startMin !== null && c.endMin !== null)
            .map((c) => [c.startMin, c.endMin])
            .sort((a, b) => a[0] - b[0]);
          let cursor = primeStart;
          for (const [s, e] of occ) {
            if (s > cursor && s - cursor >= blockDur) { feasible = true; break; }
            if (e > cursor) cursor = e;
          }
          if (!feasible && T3_PRIME_END - cursor >= blockDur) feasible = true;
        }

        if (!feasible) {
          block.forEach((c) => ops2Suppressed.add(`${c.caseNumber}:ops-2`));
        }
      });

      const finalViolations = (t3Suppressed.size > 0 || ops2Suppressed.size > 0)
        ? violations.filter((v) => {
            if (v.ruleTier === 3 && t3Suppressed.has(`${v.caseNumber}:${v.ruleId}`)) return false;
            if (v.ruleId === "ops-2" && ops2Suppressed.has(`${v.caseNumber}:ops-2`)) return false;
            return true;
          })
        : violations;

      const tier12Count  = finalViolations.filter((v) => v.ruleTier <= 2).length;
      const tier345Count = finalViolations.filter((v) => v.ruleTier >= 3).length;

      return { totalRows: dataRows.length, violations: finalViolations, tier12Count, tier345Count, cases, ruleMatchCounts };
    }

    function renderRoomRulesResults(result) {
      _lastAuditResult = result;
      roomRulesTotalRowsEl.textContent = String(result.totalRows);
      roomRulesHardCountEl.textContent = String(result.tier12Count);
      roomRulesSoftCountEl.textContent = String(result.tier345Count);
      roomRulesViolationsTable.textContent = "";
      if (result.ruleMatchCounts) _lastRuleMatchCounts = result.ruleMatchCounts;
      buildGantt(result);

      if (!result.violations.length) {
        roomRulesViolationsTable.append(emptyRow(8, "No room rule alerts or flags found."));
        return;
      }

      // Group violations by case, ordered by date → min tier → case number
      const groupMap = new Map();
      const groupOrder = [];
      result.violations.forEach((v) => {
        const key = `${v.sortDate}:${v.caseNumber}`;
        if (!groupMap.has(key)) {
          const grp = { sortDate: v.sortDate, date: v.date, caseNumber: v.caseNumber, minTier: v.ruleTier, viols: [v] };
          groupMap.set(key, grp);
          groupOrder.push(grp);
        } else {
          const grp = groupMap.get(key);
          grp.viols.push(v);
          if (v.ruleTier < grp.minTier) grp.minTier = v.ruleTier;
        }
      });
      groupOrder.sort((a, b) => {
        if (a.sortDate !== b.sortDate) return a.sortDate - b.sortDate;
        if (a.minTier !== b.minTier) return a.minTier - b.minTier;
        return String(a.caseNumber).localeCompare(String(b.caseNumber), undefined, { numeric: true });
      });
      groupOrder.forEach((grp) => grp.viols.sort((a, b) => a.ruleTier - b.ruleTier));

      _violGroupDataMap = new Map();
      groupOrder.forEach((grp) => _violGroupDataMap.set(`${grp.sortDate}:${grp.caseNumber}`, grp));

      let lastDate = null;
      groupOrder.forEach((grp) => {
        const first = grp.viols[0];
        if (grp.date !== lastDate) {
          const sep = document.createElement("tr");
          sep.className = "date-separator";
          const sepCell = document.createElement("td");
          sepCell.colSpan = 8;
          sepCell.textContent = grp.date;
          sep.append(sepCell);
          roomRulesViolationsTable.append(sep);
          lastDate = grp.date;
        }

        const tr = document.createElement("tr");
        tr.className = `violation-tier-${grp.minTier}`;
        tr.dataset.sortDate = String(grp.sortDate);
        tr.dataset.caseNum = String(grp.caseNumber);
        const violCaseCell = td(first.caseNumber);
        violCaseCell.style.fontWeight = "700";
        tr.append(violCaseCell);
        tr.append(td(first.date));
        tr.append(td(first.surgeon));
        tr.append(td(first.room));
        tr.append(td(first.procedures));
        const severityCell = document.createElement("td");
        const topBadge = document.createElement("span");
        topBadge.className = `badge badge-tier-${grp.minTier}`;
        topBadge.textContent = `Tier ${grp.minTier}`;
        severityCell.append(topBadge);
        tr.append(severityCell);

        const ruleCell = document.createElement("td");
        const explCell = document.createElement("td");
        grp.viols.forEach((v, i) => {
          const ruleLine = document.createElement("div");
          if (i > 0) ruleLine.style.marginTop = "5px";
          const inlineBadge = document.createElement("span");
          inlineBadge.className = `badge badge-tier-${v.ruleTier}`;
          inlineBadge.style.cssText = "font-size:0.68rem;padding:1px 6px;margin-right:5px;vertical-align:middle;";
          inlineBadge.textContent = `T${v.ruleTier}`;
          ruleLine.append(inlineBadge, document.createTextNode(v.ruleLabel));
          ruleCell.append(ruleLine);

          const explLine = document.createElement("div");
          if (i > 0) explLine.style.marginTop = "5px";
          explLine.textContent = v.explanation;
          explCell.append(explLine);
        });
        tr.append(ruleCell, explCell);
        roomRulesViolationsTable.append(tr);
      });
    }

    // ── Audit result state (for table→Gantt navigation) ──────────────────────
    let _lastAuditResult = null;
    let _ganttByDate     = new Map();

    // ── Rule management state ─────────────────────────────────────────────────
    let _lastRuleMatchCounts = new Map();

    // ── Calendar navigation state ─────────────────────────────────────────────
    let _calMonths       = [];
    let _calMonthIdx     = 0;
    let _calDateMap      = new Map();
    let _calOnSelect     = null;
    let _calContainer    = null;
    let _calActiveSd     = null;
    let _calSortedDates  = [];

    // ── Gantt constants ───────────────────────────────────────────────────────
    const GANTT_START_MIN = 390;   // 06:30
    const GANTT_END_MIN   = 1140;  // 19:00
    // Biweekly staff inservice Fridays (every 14 days from 2026-05-29) → OR start at 09:00
    const BIWEEKLY_FRI_ANCHOR_MS = new Date(2026, 4, 29).getTime();
    const GANTT_PX_MIN    = 1.5;
    const GANTT_ROW_H     = 44;
    const GANTT_AXIS_H    = 28;
    const GANTT_LABEL_W   = 72;
    const GANTT_MIN_W     = 20;
    const GANTT_TOTAL_W   = (GANTT_END_MIN - GANTT_START_MIN) * GANTT_PX_MIN;
    const GANTT_ROOMS     = ["OR 1","OR 2","OR 3","OR 4","OR 5","OR 6","OR 7",
                             "OR 8","OR 9","OR 10","OR 11","OR 12","OR 13","OR 14"];

    // ── buildGantt ────────────────────────────────────────────────────────────
    function buildGantt(result) {
      const ganttSection  = document.getElementById("ganttSection");
      const ganttCalCol   = document.getElementById("ganttCalCol");
      if (!result.cases || result.cases.length === 0) {
        ganttSection.hidden = true;
        ganttCalCol.hidden  = true;
        return;
      }

      ganttSection.hidden = false;
      ganttCalCol.hidden  = false;
      hideGanttTooltip();
      document.getElementById("ganttSidebar").hidden = true;

      // Group by sortDate
      const byDate = new Map();
      result.cases.forEach((c) => {
        if (!byDate.has(c.sortDate)) byDate.set(c.sortDate, []);
        byDate.get(c.sortDate).push(c);
      });
      const sortedDates = [...byDate.keys()].sort((a, b) => a - b);
      _ganttByDate = byDate;

      // Compute per-day violation status
      const dayStatus = new Map();
      sortedDates.forEach((sd) => {
        const hasTier12 = result.violations.some((v) => v.sortDate === sd && v.ruleTier <= 2);
        const hasViol   = result.violations.some((v) => v.sortDate === sd);
        dayStatus.set(sd, hasTier12 ? "red" : hasViol ? "amber" : "green");
      });

      // Build selection handler (shared by calendar cells and day-nav arrows)
      const ganttCalendar = document.getElementById("ganttCalendar");
      function selectDay(cell, sd) {
        _calActiveSd = sd;
        ganttCalendar.querySelectorAll(".gantt-cal-cell").forEach((el) => {
          el.classList.toggle("active", el.dataset.sd !== undefined && Number(el.dataset.sd) === sd);
        });
        buildDailyGantt(sd, byDate.get(sd), result.violations);
        renderDayNav();
      }

      // Build monthly calendar (single-month view with prev/next nav)
      buildCalendar(ganttCalendar, sortedDates, dayStatus, selectDay);

      // Auto-select earliest date
      const firstSd = sortedDates[0];
      selectDay(null, firstSd);
      for (const el of ganttCalendar.querySelectorAll("[data-sd]")) {
        if (Number(el.dataset.sd) === firstSd) { el.classList.add("active"); break; }
      }
    }

    // ── buildCalendar ─────────────────────────────────────────────────────────
    function buildCalendar(container, sortedDates, dayStatus, onSelect) {
      // Initialise navigation state
      _calContainer   = container;
      _calOnSelect    = onSelect;
      _calActiveSd    = null;
      _calSortedDates = sortedDates.slice().sort((a, b) => a - b);

      _calDateMap = new Map();
      sortedDates.forEach((sd) => {
        const d = new Date(sd);
        _calDateMap.set(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`,
                        { sd, color: dayStatus.get(sd) });
      });

      _calMonths = [];
      sortedDates.forEach((sd) => {
        const d = new Date(sd);
        const key = d.getFullYear() * 100 + d.getMonth();
        if (!_calMonths.length || _calMonths[_calMonths.length - 1].key !== key) {
          _calMonths.push({ key, year: d.getFullYear(), month: d.getMonth() });
        }
      });

      _calMonthIdx = 0;
      renderCalendarMonth();
    }

    function renderCalendarMonth() {
      const container = _calContainer;
      container.textContent = "";

      if (!_calMonths.length) return;
      const { year, month } = _calMonths[_calMonthIdx];
      const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

      const monthEl = document.createElement("div");
      monthEl.className = "gantt-cal-month";

      // Navigation row
      const nav = document.createElement("div");
      nav.className = "gantt-cal-nav";

      const prevBtn = document.createElement("button");
      prevBtn.type = "button";
      prevBtn.className = "gantt-cal-nav-btn";
      prevBtn.textContent = "‹";
      prevBtn.disabled = _calMonthIdx === 0;
      prevBtn.addEventListener("click", () => { _calMonthIdx--; renderCalendarMonth(); });

      const lbl = document.createElement("span");
      lbl.className = "gantt-cal-month-label";
      lbl.textContent = new Date(year, month, 1)
        .toLocaleString("en-US", { month: "long", year: "numeric" });

      const nextBtn = document.createElement("button");
      nextBtn.type = "button";
      nextBtn.className = "gantt-cal-nav-btn";
      nextBtn.textContent = "›";
      nextBtn.disabled = _calMonthIdx === _calMonths.length - 1;
      nextBtn.addEventListener("click", () => { _calMonthIdx++; renderCalendarMonth(); });

      nav.append(prevBtn, lbl, nextBtn);
      monthEl.append(nav);

      // Day-of-week headers
      const dowRow = document.createElement("div");
      dowRow.className = "gantt-cal-dow";
      DOW.forEach((d) => {
        const s = document.createElement("span");
        s.textContent = d;
        dowRow.append(s);
      });
      monthEl.append(dowRow);

      // Day grid
      const grid = document.createElement("div");
      grid.className = "gantt-cal-grid";

      const firstDow    = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      for (let i = 0; i < firstDow; i++) {
        const empty = document.createElement("div");
        empty.className = "gantt-cal-cell gantt-cal-cell-empty";
        empty.textContent = "0";
        grid.append(empty);
      }

      for (let day = 1; day <= daysInMonth; day++) {
        const info = _calDateMap.get(`${year}-${month}-${day}`);
        const el = document.createElement("div");
        el.textContent = String(day);
        if (info) {
          el.className = `gantt-cal-cell gantt-cal-cell-${info.color}`;
          el.dataset.sd = String(info.sd);
          if (info.sd === _calActiveSd) el.classList.add("active");
          el.addEventListener("click", () => _calOnSelect(el, info.sd));
        } else {
          el.className = "gantt-cal-cell gantt-cal-cell-no-case";
        }
        grid.append(el);
      }

      // Pad to 42 cells (6 full rows) so the calendar height is constant across months
      const totalCells = firstDow + daysInMonth;
      for (let i = totalCells; i < 42; i++) {
        const empty = document.createElement("div");
        empty.className = "gantt-cal-cell gantt-cal-cell-empty";
        empty.textContent = "0";
        grid.append(empty);
      }

      monthEl.append(grid);
      container.append(monthEl);
    }

    // ── Day navigation (prev/next arrows below calendar) ──────────────────────
    function renderDayNav() {
      const nav = document.getElementById("ganttDayNav");
      if (!nav) return;
      nav.textContent = "";
      if (!_calSortedDates.length || _calActiveSd === null) return;
      const idx = _calSortedDates.indexOf(_calActiveSd);

      const prevBtn = document.createElement("button");
      prevBtn.type = "button";
      prevBtn.className = "gantt-day-nav-btn";
      prevBtn.textContent = "‹";
      prevBtn.title = "Previous day";
      prevBtn.disabled = idx <= 0;
      prevBtn.addEventListener("click", () => { if (idx > 0) navigateToDay(_calSortedDates[idx - 1]); });

      const lbl = document.createElement("span");
      lbl.className = "gantt-day-nav-label";
      lbl.textContent = new Date(_calActiveSd).toLocaleDateString("en-US",
        { weekday: "long", month: "long", day: "numeric", year: "numeric" });

      const nextBtn = document.createElement("button");
      nextBtn.type = "button";
      nextBtn.className = "gantt-day-nav-btn";
      nextBtn.textContent = "›";
      nextBtn.title = "Next day";
      nextBtn.disabled = idx >= _calSortedDates.length - 1;
      nextBtn.addEventListener("click", () => {
        if (idx < _calSortedDates.length - 1) navigateToDay(_calSortedDates[idx + 1]);
      });

      nav.append(prevBtn, lbl, nextBtn);
    }

    function navigateToDay(sd) {
      const d = new Date(sd);
      const key = d.getFullYear() * 100 + d.getMonth();
      const mIdx = _calMonths.findIndex((m) => m.key === key);
      if (mIdx !== -1 && mIdx !== _calMonthIdx) {
        _calMonthIdx = mIdx;
        renderCalendarMonth();
      }
      _calOnSelect(null, sd);
    }

    // ── buildDailyGantt ───────────────────────────────────────────────────────
    function buildDailyGantt(sortDate, cases, allViolations) {
      const fixedCol   = document.getElementById("ganttFixedCol");
      const scrollable = document.getElementById("ganttScrollable");

      fixedCol.textContent   = "";
      scrollable.textContent = "";

      // Fixed col: corner + room labels
      const corner = document.createElement("div");
      corner.className = "gantt-corner";
      fixedCol.append(corner);

      GANTT_ROOMS.forEach((room) => {
        const label = document.createElement("div");
        label.className = "gantt-room-label";
        label.textContent = room;
        fixedCol.append(label);
      });

      // Time axis — start at first full hour >= GANTT_START_MIN to avoid mislabeled ticks
      const firstTickMin = Math.ceil(GANTT_START_MIN / 60) * 60;
      const axis = document.createElement("div");
      axis.className = "gantt-time-axis";
      axis.style.width = GANTT_TOTAL_W + "px";
      for (let m = firstTickMin; m <= GANTT_END_MIN; m += 60) {
        const tick = document.createElement("div");
        tick.className = "gantt-time-tick";
        const h = Math.floor(m / 60);
        tick.textContent = `${h}:00`;
        tick.style.left = ((m - GANTT_START_MIN) * GANTT_PX_MIN) + "px";
        axis.append(tick);
      }
      scrollable.append(axis);

      // Biweekly inservice Friday → OR start at 09:00 instead of 07:30
      const dayMs = 86400000;
      const diffDays = Math.round((sortDate - BIWEEKLY_FRI_ANCHOR_MS) / dayMs);
      const isInserviceFriday = new Date(sortDate).getDay() === 5
        && diffDays >= 0 && diffDays % 14 === 0;
      const refMin = isInserviceFriday ? 9 * 60 : 7 * 60 + 30;

      // Index violations for this day by case number
      const violsByCaseNum = new Map();
      allViolations.filter((v) => v.sortDate === sortDate).forEach((v) => {
        if (!violsByCaseNum.has(v.caseNumber)) violsByCaseNum.set(v.caseNumber, []);
        violsByCaseNum.get(v.caseNumber).push(v);
      });

      // Room lanes
      GANTT_ROOMS.forEach((room, i) => {
        const lane = document.createElement("div");
        lane.className = "gantt-lane" + (i % 2 === 1 ? " gantt-lane-alt" : "");
        lane.style.width = GANTT_TOTAL_W + "px";

        // Gridlines on the hour (aligned to tick marks)
        for (let m = firstTickMin; m <= GANTT_END_MIN; m += 60) {
          const gl = document.createElement("div");
          gl.className = "gantt-lane-gridline";
          gl.style.left = ((m - GANTT_START_MIN) * GANTT_PX_MIN) + "px";
          lane.append(gl);
        }

        // Reference line (07:30 standard, 09:00 on biweekly inservice Fridays)
        const ref = document.createElement("div");
        ref.className = "gantt-ref-line";
        ref.style.left = ((refMin - GANTT_START_MIN) * GANTT_PX_MIN) + "px";
        lane.append(ref);

        // Case blocks — 3-segment Epic-snapboard style
        cases.filter((c) => c.room === room && c.startMin !== null && c.endMin !== null)
          .forEach((c) => {
            const viols   = violsByCaseNum.get(c.caseNumber) || [];
            const minTier = viols.length ? Math.min(...viols.map((v) => v.ruleTier)) : null;
            const clampS  = Math.max(c.startMin, GANTT_START_MIN);
            const clampE  = Math.min(c.endMin,   GANTT_END_MIN);
            if (clampS >= clampE) return;

            const blockW  = Math.max((clampE - clampS) * GANTT_PX_MIN, GANTT_MIN_W);
            const rangeMin = clampE - clampS;

            // Pixel widths for setup/cleanup bands
            const procS  = c.procStartMin !== null ? Math.max(c.procStartMin, clampS) : clampS;
            const procE  = c.procEndMin   !== null ? Math.min(c.procEndMin,   clampE) : clampE;
            const prepPx  = rangeMin > 0 ? ((procS - clampS) / rangeMin) * blockW : 0;
            const cleanPx = rangeMin > 0 ? ((clampE - procE) / rangeMin) * blockW : 0;

            const block = document.createElement("div");
            block.className = "gantt-case-block" +
              (minTier !== null ? " gantt-viol-" + minTier : "");
            block.style.left  = ((clampS - GANTT_START_MIN) * GANTT_PX_MIN) + "px";
            block.style.width = blockW + "px";
            block.dataset.caseNum = String(c.caseNumber);

            // Background segments (prep / proc / cleanup)
            if (prepPx > 0.5) {
              const prep = document.createElement("div");
              prep.className = "gantt-block-prep";
              prep.style.width = Math.round(prepPx) + "px";
              block.append(prep);
            }

            const proc = document.createElement("div");
            proc.className = "gantt-block-proc";
            block.append(proc);

            if (cleanPx > 0.5) {
              const cleanup = document.createElement("div");
              cleanup.className = "gantt-block-cleanup";
              cleanup.style.width = Math.round(cleanPx) + "px";
              block.append(cleanup);
            }

            // Text overlay — position:absolute so text starts at the left edge of the full tile
            const txt = document.createElement("div");
            txt.className = "gantt-block-text";
            const s1 = document.createElement("div");
            s1.className = "gantt-block-surgeon";
            s1.textContent = c.surgeon || "";
            const s2 = document.createElement("div");
            s2.className = "gantt-block-proctxt";
            s2.textContent = c.procedures
              ? c.procedures.replace(/\s*\(.*?\)\s*/g, " ").split(/\s*[;,]\s*/)[0].trim()
              : "";
            const s3 = document.createElement("div");
            s3.className = "gantt-block-casenum";
            s3.textContent = String(c.caseNumber);
            txt.append(s1, s2, s3);
            block.append(txt);

            block.addEventListener("mouseenter", (e) => showGanttTooltip(e, c, viols));
            block.addEventListener("mousemove",  moveGanttTooltip);
            block.addEventListener("mouseleave", hideGanttTooltip);
            block.addEventListener("click", () => {
              showGanttSidebar(c, viols);
            });

            lane.append(block);
          });

        scrollable.append(lane);
      });
    }

    // ── Gantt tooltip ─────────────────────────────────────────────────────────
    function showGanttTooltip(e, c, viols) {
      const tt = document.getElementById("ganttTooltip");
      tt.textContent = "";

      const strong = document.createElement("strong");
      strong.textContent = "Case #" + c.caseNumber;
      tt.append(strong);

      const surgDiv = document.createElement("div");
      surgDiv.className = "tt-row";
      surgDiv.textContent = c.surgeon || "–";
      tt.append(surgDiv);

      if (c.startMin !== null) {
        const fmtMin = (m) => `${Math.floor(m / 60)}:${(m % 60).toString().padStart(2, "0")}`;
        const timeDiv = document.createElement("div");
        timeDiv.className = "tt-row";
        timeDiv.textContent = fmtMin(c.startMin) + "–" +
          (c.endMin !== null ? fmtMin(c.endMin) : "?");
        tt.append(timeDiv);
      }

      if (viols.length) {
        const hdr = document.createElement("div");
        hdr.className = "tt-viol-header";
        const _t12 = viols.filter((v) => v.ruleTier <= 2).length;
        const _t35 = viols.filter((v) => v.ruleTier >= 3).length;
        const _issueWord = _t12 && _t35 ? "alerts & flags" : _t12 ? (_t12 === 1 ? "alert" : "alerts") : (_t35 === 1 ? "flag" : "flags");
        hdr.textContent = viols.length + " " + _issueWord;
        tt.append(hdr);
        viols.forEach((v) => {
          const item  = document.createElement("div");
          item.className = "tt-viol-item";
          const lbl   = document.createElement("div");
          lbl.className = "tt-viol-label";
          lbl.textContent = v.ruleLabel;
          const expl  = document.createElement("div");
          expl.className = "tt-viol-expl";
          expl.textContent = v.explanation;
          item.append(lbl, expl);
          tt.append(item);
        });
      }

      tt.hidden = false;
      moveGanttTooltip(e);
    }

    function moveGanttTooltip(e) {
      const tt = document.getElementById("ganttTooltip");
      if (tt.hidden) return;
      const x = Math.min(e.clientX + 14, window.innerWidth  - tt.offsetWidth  - 10);
      const y = Math.min(e.clientY - 10, window.innerHeight - tt.offsetHeight - 10);
      tt.style.left = x + "px";
      tt.style.top  = y + "px";
    }

    function hideGanttTooltip() {
      document.getElementById("ganttTooltip").hidden = true;
    }

    // ── Gantt sidebar ─────────────────────────────────────────────────────────
    function showGanttSidebar(c, viols) {
      hideGanttTooltip();
      const sb      = document.getElementById("ganttSidebar");
      const content = document.getElementById("ganttSidebarContent");
      content.textContent = "";

      const h3 = document.createElement("h3");
      h3.textContent = "Case #" + c.caseNumber;
      makeCopyable(h3, c.caseNumber);
      content.append(h3);

      const fmtMin = (m) => `${Math.floor(m / 60)}:${(m % 60).toString().padStart(2, "0")}`;
      const timeStr = c.startMin !== null
        ? fmtMin(c.startMin) + "–" + (c.endMin !== null ? fmtMin(c.endMin) : "?")
        : null;

      [["Date", c.date], ["Room", c.room], ["Surgeon", c.surgeon || "–"],
       ["Service", c.service || "–"],
       ...(timeStr ? [["Time", timeStr]] : []),
       ["Procedures", c.procedures || "–"]
      ].forEach(([label, val]) => {
        const row   = document.createElement("div");
        row.className = "sb-row";
        const lDiv  = document.createElement("div");
        lDiv.className = "sb-label";
        lDiv.textContent = label;
        const vDiv  = document.createElement("div");
        vDiv.className = "sb-val";
        vDiv.textContent = val;
        row.append(lDiv, vDiv);
        content.append(row);
      });

      const viewBtn = document.createElement("button");
      viewBtn.type = "button";
      viewBtn.className = "sb-view-btn";
      viewBtn.textContent = "View on schedule";
      viewBtn.addEventListener("click", () => {
        if (_calActiveSd !== c.sortDate) navigateToDay(c.sortDate);
        const dayNav = document.getElementById("ganttDayNav");
        if (dayNav) dayNav.scrollIntoView({ behavior: "smooth", block: "start" });
        const scrollable = document.getElementById("ganttScrollable");
        const block = scrollable
          ? scrollable.querySelector(`[data-case-num="${CSS.escape(String(c.caseNumber))}"]`)
          : null;
        if (block) {
          scrollable.scrollTo({ left: Math.max(0, block.offsetLeft - 60), behavior: "smooth" });
          block.classList.remove("gantt-block-highlight");
          void block.offsetWidth;
          block.classList.add("gantt-block-highlight");
          setTimeout(() => block.classList.remove("gantt-block-highlight"), 1400);
        }
      });
      content.append(viewBtn);

      if (viols.length) {
        const vSection = document.createElement("div");
        vSection.className = "sb-violations";
        const h4 = document.createElement("h4");
        const _sb12 = viols.filter((v) => v.ruleTier <= 2).length;
        const _sb35 = viols.filter((v) => v.ruleTier >= 3).length;
        const _sbLabel = _sb12 && _sb35 ? "Alerts & flags" : _sb12 ? "Alerts" : "Flags";
        h4.textContent = _sbLabel + " (" + viols.length + ")";
        vSection.append(h4);
        viols.forEach((v) => {
          const item  = document.createElement("div");
          item.className = "sb-viol-item";
          const badge = document.createElement("span");
          badge.className = "badge badge-tier-" + v.ruleTier;
          badge.textContent = "Tier " + v.ruleTier;
          const text  = document.createElement("div");
          text.className = "sb-viol-text";
          text.textContent = v.explanation;
          item.append(badge, text);
          vSection.append(item);
        });
        content.append(vSection);
      }

      sb.hidden = false;
    }

    // ── Table row → sidebar ──────────────────────────────────────────────────
    function jumpToCase(caseNumber, sortDate) {
      // Switch to the correct day if needed so the Gantt matches the sidebar
      if (_calActiveSd !== sortDate) {
        navigateToDay(sortDate);
      }
      // Open sidebar for the case
      const casesForDay = _ganttByDate.get(sortDate) || [];
      const c = casesForDay.find((cas) => String(cas.caseNumber) === String(caseNumber));
      if (c) {
        const viols = (_lastAuditResult ? _lastAuditResult.violations : []).filter(
          (v) => String(v.caseNumber) === String(caseNumber) && v.sortDate === sortDate
        );
        showGanttSidebar(c, viols);
      }
    }

    // ── Sidebar close on outside click ───────────────────────────────────────
    document.addEventListener("pointerdown", (e) => {
      const sb = document.getElementById("ganttSidebar");
      if (sb.hidden) return;
      if (sb.contains(e.target)) return;
      if (e.target.closest(".gantt-case-block")) return;
      if (e.target.closest("#roomRulesViolationsTable")) return;
      sb.hidden = true;
    });

    // Sidebar close button + back button closes sidebar
    document.getElementById("ganttSidebarClose").addEventListener("click", () => {
      document.getElementById("ganttSidebar").hidden = true;
    });
    document.getElementById("roomRulesBackHome").addEventListener("click", () => {
      document.getElementById("ganttSidebar").hidden = true;
      hideGanttTooltip();
    });


  (function() {
    const TARGET = "worm";
    let buf = "";
    const modal = document.getElementById("wormModal");
    const canvas = document.getElementById("wormCanvas");
    const ctx = canvas.getContext("2d");
    const scoreEl = document.getElementById("wormScore");
    const gameOverEl = document.getElementById("wormGameOver");
    const finalScoreEl = document.getElementById("wormFinalScore");
    const restartBtn = document.getElementById("wormRestartBtn");

    const CELL = 20, COLS = 20, ROWS = 20, SPEED = 140;
    canvas.width = COLS * CELL;
    canvas.height = ROWS * CELL;

    let snake, dir, dirQueue, food, score, running, animId, lastTs;

    function openGame() {
      modal.classList.add("active");
      startGame();
    }

    function closeGame() {
      modal.classList.remove("active");
      cancelAnimationFrame(animId);
      running = false;
    }

    function startGame() {
      snake = [{x: 10, y: 10}, {x: 9, y: 10}];
      dir = {x: 1, y: 0};
      dirQueue = [];
      score = 0;
      running = true;
      lastTs = null;
      gameOverEl.style.display = "none";
      spawnFood();
      updateScore();
      cancelAnimationFrame(animId);
      animId = requestAnimationFrame(loop);
    }

    function spawnFood() {
      let pos;
      do {
        pos = {x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS)};
      } while (snake.some(s => s.x === pos.x && s.y === pos.y));
      food = pos;
    }

    function updateScore() { scoreEl.textContent = "Score: " + score; }

    function loop(ts) {
      if (!running) return;
      animId = requestAnimationFrame(loop);
      if (lastTs === null) lastTs = ts;
      if (ts - lastTs < SPEED) return;
      lastTs = ts;
      if (dirQueue.length) dir = dirQueue.shift();
      step();
    }

    function step() {
      const head = {x: snake[0].x + dir.x, y: snake[0].y + dir.y};
      if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS
          || snake.some(s => s.x === head.x && s.y === head.y)) {
        endGame(); return;
      }
      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) { score++; updateScore(); spawnFood(); }
      else snake.pop();
      draw();
    }

    function draw() {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#1a1a1a";
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= COLS; i++) {
        ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, canvas.height); ctx.stroke();
      }
      for (let j = 0; j <= ROWS; j++) {
        ctx.beginPath(); ctx.moveTo(0, j * CELL); ctx.lineTo(canvas.width, j * CELL); ctx.stroke();
      }
      ctx.fillStyle = "#f87171";
      ctx.beginPath();
      ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2 - 3, 0, Math.PI * 2);
      ctx.fill();
      snake.forEach((s, i) => {
        ctx.fillStyle = i === 0 ? "#4ade80" : "#16a34a";
        ctx.beginPath();
        ctx.roundRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2, 3);
        ctx.fill();
      });
    }

    function endGame() {
      running = false;
      cancelAnimationFrame(animId);
      finalScoreEl.textContent = "Score: " + score;
      gameOverEl.style.display = "flex";
    }

    document.addEventListener("keydown", (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") { buf = ""; return; }
      if (modal.classList.contains("active")) {
        if (e.key === "Escape") { closeGame(); return; }
        const map = {ArrowUp:{x:0,y:-1}, ArrowDown:{x:0,y:1}, ArrowLeft:{x:-1,y:0}, ArrowRight:{x:1,y:0}};
        if (map[e.key]) {
          const d = map[e.key];
          const last = dirQueue.length ? dirQueue[dirQueue.length - 1] : dir;
          if ((d.x !== -last.x || d.y !== -last.y) && dirQueue.length < 2) dirQueue.push(d);
          e.preventDefault();
        }
        return;
      }
      if (e.key.length === 1) {
        buf += e.key.toLowerCase();
        if (buf.length > TARGET.length) buf = buf.slice(-TARGET.length);
        if (buf === TARGET) { buf = ""; openGame(); }
      }
    });

    modal.addEventListener("click", (e) => { if (e.target === modal) closeGame(); });
    restartBtn.addEventListener("click", startGame);
  })();

