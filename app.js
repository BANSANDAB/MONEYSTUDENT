/**
 * ==============================================================================
 * ระบบทุนการศึกษา โรงเรียนบ้านสันดาบ
 * เชื่อมต่อกับฐานข้อมูล Google Sheet ID: 1ABtqJTeh7AOBsk0RZJMKBhbUW_anBXV0tzdryFuousI
 * Folder ID: 1cHaDYk8XORmfsgwSQo_3W1TAKRN0sKSj
 * 
 * กฎสำคัญ:
 * 1. ยึดตามฐานข้อมูลจริงเท่านั้น ไม่คิดหรือสร้างข้อมูลจำลองขึ้นมาเอง
 * 2. ประวัติการรับทุนจะแก้ไขหรือลบได้ ก็ต่อเมื่อเข้าระบบบันทึกทุนการศึกษาเท่านั้น
 * 3. เมื่อเข้าระบบบันทึกทุน จะแสดงประวัติการรับทุนด้านล่าง พร้อมปุ่มแก้ไขและลบในช่องจัดการ
 * ==============================================================================
 */

// Configuration Constants
const CONFIG = {
  // ฐานข้อมูลเดิมสำหรับบันทึกข้อมูลทุนการศึกษา
  SHEET_ID: "1ABtqJTeh7AOBsk0RZJMKBhbUW_anBXV0tzdryFuousI",
  // ฐานข้อมูลสำหรับดึงข้อมูลนักเรียน (ชื่อ-นามสกุล, ระดับชั้น ฯลฯ)
  STUDENTS_SHEET_ID: "1jqxY-MFf26KpYpYR2J6Lq0FBOp7HS-fe58sSWAOBnsA",
  FOLDER_ID: "1cHaDYk8XORmfsgwSQo_3W1TAKRN0sKSj",
  PASSWORD: "thunsandab1234",
  STORAGE_KEYS: {
    API_URL: "sandab_api_url",
    SCHOLARSHIPS: "sandab_scholarships_db",
    STUDENTS: "sandab_students_db",
    STUDENTS_SHEET_ID: "sandab_students_sheet_id"
  }
};

// Available School Grades
const DEFAULT_GRADES = [
  "อ.1", "อ.2", "อ.3",
  "ป.1", "ป.2", "ป.3", "ป.4", "ป.5", "ป.6",
  "ม.1", "ม.2", "ม.3"
];

// Application State (ไม่มีการแต่งข้อมูลขึ้นมาเอง เริ่มต้นจากฐานข้อมูล)
const state = {
  selectedAcademicYear: "2569",
  students: [],
  scholarships: [],
  filteredScholarships: [],
  isAuthenticated: false,
  editingRecordId: null,
  apiUrl: localStorage.getItem(CONFIG.STORAGE_KEYS.API_URL) || ""
};

// Cached DOM Elements
let elements = {};

/**
 * Initialize Application
 */
document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  initAcademicYearDropdown();
  bindEvents();
  loadDatabase();
});

/**
 * Cache DOM elements for fast access
 */
function cacheElements() {
  elements = {
    academicYearSelect: document.getElementById("academicYearSelect"),
    academicYearDisplay: document.getElementById("academicYearDisplay"),
    
    // Action Buttons
    btnOpenRecord: document.getElementById("btnOpenRecord"),
    btnOpenStudents: document.getElementById("btnOpenStudents"),
    btnDownloadPdf: document.getElementById("btnDownloadPdf"),
    btnPrint: document.getElementById("btnPrint"),
    
    // Main Search & Filter
    filterGrade: document.getElementById("filterGrade"),
    filterStudent: document.getElementById("filterStudent"),
    btnResetFilter: document.getElementById("btnResetFilter"),
    
    // Main Scholarship Table (View-Only) & Footer Total
    scholarshipTableBody: document.getElementById("scholarshipTableBody"),
    tableRecordCount: document.getElementById("tableRecordCount"),
    tableTotalLabel: document.getElementById("tableTotalLabel"),
    tableTotalAmount: document.getElementById("tableTotalAmount"),
    tableTotalYearLabel: document.getElementById("tableTotalYearLabel"),
    
    // Password Modal
    passwordModal: document.getElementById("passwordModal"),
    passwordInput: document.getElementById("passwordInput"),
    passwordErrorMsg: document.getElementById("passwordErrorMsg"),
    btnConfirmPassword: document.getElementById("btnConfirmPassword"),
    btnClosePasswordModal: document.getElementById("btnClosePasswordModal"),
    btnTogglePassword: document.getElementById("btnTogglePassword"),
    
    // Record Scholarship Modal
    recordModal: document.getElementById("recordModal"),
    recordForm: document.getElementById("recordForm"),
    editRecordId: document.getElementById("editRecordId"),
    recordDate: document.getElementById("recordDate"),
    recordYear: document.getElementById("recordYear"),
    recordGrade: document.getElementById("recordGrade"),
    recordStudent: document.getElementById("recordStudent"),
    recordAmount: document.getElementById("recordAmount"),
    recordOrg: document.getElementById("recordOrg"),
    recordNote: document.getElementById("recordNote"),
    btnSaveRecord: document.getElementById("btnSaveRecord"),
    btnResetRecordForm: document.getElementById("btnResetRecordForm"),
    btnCloseRecordModal: document.getElementById("btnCloseRecordModal"),
    
    // Bottom History Table in Record Modal (มีปุ่มแก้ไข และ ลบ)
    modalRecordCount: document.getElementById("modalRecordCount"),
    modalScholarshipTableBody: document.getElementById("modalScholarshipTableBody"),
    
    // Student Management Modal
    studentsModal: document.getElementById("studentsModal"),
    studentManageYearTag: document.getElementById("studentManageYearTag"),
    excelFileInput: document.getElementById("excelFileInput"),
    btnImportExcel: document.getElementById("btnImportExcel"),
    btnAddStudentSingle: document.getElementById("btnAddStudentSingle"),
    btnExportStudentsPdf: document.getElementById("btnExportStudentsPdf"),
    studentManageGradeFilter: document.getElementById("studentManageGradeFilter"),
    studentCountBadge: document.getElementById("studentCountBadge"),
    studentsManageTableBody: document.getElementById("studentsManageTableBody"),
    btnCloseStudentsModal: document.getElementById("btnCloseStudentsModal"),
    
    // Student Edit Sub-Modal
    studentEditModal: document.getElementById("studentEditModal"),
    studentEditModalTitle: document.getElementById("studentEditModalTitle"),
    studentEditForm: document.getElementById("studentEditForm"),
    studentEditIndex: document.getElementById("studentEditIndex"),
    studentEditGrade: document.getElementById("studentEditGrade"),
    studentEditGender: document.getElementById("studentEditGender"),
    studentEditCode: document.getElementById("studentEditCode"),
    studentEditCitizenId: document.getElementById("studentEditCitizenId"),
    studentEditName: document.getElementById("studentEditName"),
    studentEditBirthDate: document.getElementById("studentEditBirthDate"),
    studentEditStatus: document.getElementById("studentEditStatus"),
    btnCloseStudentEditModal: document.getElementById("btnCloseStudentEditModal"),
    btnCancelStudentEdit: document.getElementById("btnCancelStudentEdit"),
    
    // Settings Modal
    btnOpenSettings: document.getElementById("btnOpenSettings"),
    settingsModal: document.getElementById("settingsModal"),
    btnCloseSettingsModal: document.getElementById("btnCloseSettingsModal"),
    apiUrlInput: document.getElementById("apiUrlInput"),
    btnTestConnection: document.getElementById("btnTestConnection"),
    btnSaveSettings: document.getElementById("btnSaveSettings"),

    // Toast Container
    toastContainer: document.getElementById("toastContainer")
  };
}

/**
 * Initialize Academic Year Selector: 2569 to 2580
 */
function initAcademicYearDropdown() {
  const startYear = 2569;
  const endYear = 2580;
  
  elements.academicYearSelect.innerHTML = "";
  elements.recordYear.innerHTML = "";
  
  for (let y = startYear; y <= endYear; y++) {
    const opt1 = document.createElement("option");
    opt1.value = y.toString();
    opt1.textContent = `ปีการศึกษา ${y}`;
    if (y === 2569) opt1.selected = true;
    elements.academicYearSelect.appendChild(opt1);

    const opt2 = document.createElement("option");
    opt2.value = y.toString();
    opt2.textContent = `ปีการศึกษา ${y}`;
    if (y === 2569) opt2.selected = true;
    elements.recordYear.appendChild(opt2);
  }
}

/**
 * Load Database strictly from Google Sheets (and LocalStorage cache)
 * "ระบบต้องไม่คิดข้อมูลขึ้นมาเอง ให้ยึดตามฐานข้อมูลเท่านั้น"
 */
async function loadDatabase() {
  // 1. Try loading cached data from localStorage first
  const cachedScholarships = localStorage.getItem(CONFIG.STORAGE_KEYS.SCHOLARSHIPS);
  const cachedStudents = localStorage.getItem(CONFIG.STORAGE_KEYS.STUDENTS);
  const cachedStudentsSheetId = localStorage.getItem(CONFIG.STORAGE_KEYS.STUDENTS_SHEET_ID);

  // ตรวจสอบว่าเคยแคชข้อมูลนักเรียนจาก Sheet ID นี้หรือไม่ ถ้าเปลี่ยน Sheet ID ให้ล้างแคชเก่าออก
  if (cachedStudentsSheetId && cachedStudentsSheetId !== CONFIG.STUDENTS_SHEET_ID) {
    localStorage.removeItem(CONFIG.STORAGE_KEYS.STUDENTS);
    state.students = [];
  } else if (cachedStudents) {
    try { state.students = JSON.parse(cachedStudents); } catch (e) {}
  }

  if (cachedScholarships) {
    try { 
      state.scholarships = JSON.parse(cachedScholarships).map(s => ({
        ...s,
        recordDate: formatToThaiDate(s.recordDate)
      })); 
    } catch (e) {}
  }

  updateAcademicYearHeader();
  populateGradeDropdowns();
  applyFilters();

  // 2. Fetch live database directly from Google Sheet ID via Google Visualization API
  showToast("กำลังดึงข้อมูลนักเรียนและประวัติทุนจาก Google Sheet...", "info");
  await fetchAllFromGoogleSheet();
}

/**
 * Fetch Real Data from Google Sheets using GViz API
 * - ข้อมูลนักเรียน: ดึงจาก STUDENTS_SHEET_ID (1jqxY-MFf26KpYpYR2J6Lq0FBOp7HS-fe58sSWAOBnsA)
 * - ข้อมูลทุนการศึกษา: ดึงและบันทึกลง SHEET_ID เดิม (1ABtqJTeh7AOBsk0RZJMKBhbUW_anBXV0tzdryFuousI)
 */
async function fetchAllFromGoogleSheet() {
  try {
    let hasLoadedAny = false;

    // 1. ดึงข้อมูลนักเรียน (ชื่อ-นามสกุล, ระดับชั้น ฯลฯ) จาก Google Sheet ข้อมูลนักเรียน
    const studentsUrl = `https://docs.google.com/spreadsheets/d/${CONFIG.STUDENTS_SHEET_ID}/gviz/tq?tqx=out:json&sheet=Students`;
    let resStudents = null;
    try {
      resStudents = await fetch(studentsUrl);
      if (!resStudents.ok) {
        resStudents = await fetch(`https://docs.google.com/spreadsheets/d/${CONFIG.STUDENTS_SHEET_ID}/gviz/tq?tqx=out:json`);
      }
    } catch (errStudentsFetch) {
      console.warn("Direct sheet=Students fetch error, attempting default tab:", errStudentsFetch);
      try {
        resStudents = await fetch(`https://docs.google.com/spreadsheets/d/${CONFIG.STUDENTS_SHEET_ID}/gviz/tq?tqx=out:json`);
      } catch (e2) {
        console.warn("GViz student fetch failed:", e2);
      }
    }

    if (resStudents && resStudents.ok) {
      const text = await resStudents.text();
      const parsedStudents = parseGVizStudents(text);
      if (parsedStudents && parsedStudents.length > 0) {
        state.students = parsedStudents;
        localStorage.setItem(CONFIG.STORAGE_KEYS.STUDENTS, JSON.stringify(state.students));
        localStorage.setItem(CONFIG.STORAGE_KEYS.STUDENTS_SHEET_ID, CONFIG.STUDENTS_SHEET_ID);
        hasLoadedAny = true;
      }
    }

    // 2. ดึงข้อมูลทุนการศึกษาจาก Google Sheet ฐานข้อมูลเดิม (Sheet=Scholarships)
    const scholarshipsUrl = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq?tqx=out:json&sheet=Scholarships`;
    const resScholarships = await fetch(scholarshipsUrl);
    if (resScholarships.ok) {
      const text = await resScholarships.text();
      const parsedScholarships = parseGVizScholarships(text);
      if (parsedScholarships && parsedScholarships.length > 0) {
        state.scholarships = parsedScholarships;
        localStorage.setItem(CONFIG.STORAGE_KEYS.SCHOLARSHIPS, JSON.stringify(state.scholarships));
        hasLoadedAny = true;
      }
    }

    if (hasLoadedAny) {
      populateGradeDropdowns();
      applyFilters();
      renderStudentsManageTable();
      if (elements.recordModal.classList.contains("active")) {
        renderModalScholarshipsTable();
      }
      showToast(`โหลดข้อมูลจากฐานข้อมูลสำเร็จ (นักเรียน ${state.students.length} คน, ทุน ${state.scholarships.length} รายการ)`, "success");
    } else {
      if (state.scholarships.length === 0 && state.students.length === 0) {
        showToast("เชื่อมต่อฐานข้อมูลได้ แต่ยังไม่มีข้อมูลบันทึกไว้ในชีต", "info");
      }
    }

  } catch (error) {
    console.warn("GViz fetch failed or offline:", error);
    // Continue with whatever is in localStorage
    if (state.scholarships.length > 0 || state.students.length > 0) {
      showToast("ใช้งานข้อมูลล่าสุดที่บันทึกไว้ในระบบ", "info");
    }
  }
}

/**
 * Parse GViz response for Students (รองรับคอลัมน์ชื่อ-นามสกุล, ระดับชั้น, รหัส, วันเกิด ฯลฯ)
 */
function parseGVizStudents(rawText) {
  try {
    const start = rawText.indexOf("{");
    const end = rawText.lastIndexOf("}");
    if (start === -1 || end === -1) return [];
    const json = JSON.parse(rawText.substring(start, end + 1));
    if (!json.table || !json.table.rows) return [];

    // ระบุ index คอลัมน์โดยอัตโนมัติตาม Label หากมี หรือ fallback ตามลำดับมาตรฐาน
    const colMap = {
      academicYear: 0,
      grade: 1,
      citizenId: 2,
      studentCode: 3,
      name: 4,
      gender: 5,
      birthDate: 6,
      status: 7
    };

    if (json.table.cols && json.table.cols.length > 0) {
      json.table.cols.forEach((col, idx) => {
        const lbl = (col.label || "").trim();
        if (/ปีการศึกษา/i.test(lbl)) colMap.academicYear = idx;
        else if (/ระดับชั้น|ชั้น/i.test(lbl)) colMap.grade = idx;
        else if (/บัตรประชาชน/i.test(lbl)) colMap.citizenId = idx;
        else if (/รหัสประจำตัว|รหัสนักเรียน/i.test(lbl)) colMap.studentCode = idx;
        else if (/ชื่อ-นามสกุล|ชื่อ/i.test(lbl)) colMap.name = idx;
        else if (/เพศ/i.test(lbl)) colMap.gender = idx;
        else if (/วันเกิด/i.test(lbl)) colMap.birthDate = idx;
        else if (/สถานะ/i.test(lbl)) colMap.status = idx;
      });
    }

    return json.table.rows.map(row => {
      const c = row.c || [];
      const getVal = idx => {
        if (!c[idx]) return "";
        if (c[idx].f !== undefined && c[idx].f !== null) return String(c[idx].f).trim();
        if (c[idx].v !== undefined && c[idx].v !== null) return String(c[idx].v).trim();
        return "";
      };

      const name = getVal(colMap.name);
      return {
        academicYear: getVal(colMap.academicYear) || "2569",
        grade: getVal(colMap.grade),
        citizenId: getVal(colMap.citizenId),
        studentCode: getVal(colMap.studentCode),
        name: name,
        gender: getVal(colMap.gender) || "ชาย",
        birthDate: getVal(colMap.birthDate),
        status: getVal(colMap.status) || "เรียนอยู่"
      };
    }).filter(s => s.name && s.name.length > 0);
  } catch (e) {
    console.error("parseGVizStudents error:", e);
    return [];
  }
}

/**
 * Parse GViz response for Scholarships
 */
function parseGVizScholarships(rawText) {
  try {
    const start = rawText.indexOf("{");
    const end = rawText.lastIndexOf("}");
    if (start === -1 || end === -1) return [];
    const json = JSON.parse(rawText.substring(start, end + 1));
    if (!json.table || !json.table.rows) return [];

    return json.table.rows.map((row, index) => {
      const c = row.c || [];
      const getVal = idx => (c[idx] ? (c[idx].f !== undefined ? c[idx].f : c[idx].v) : "");

      // Mapping columns from Google Sheet Scholarships
      // Col 0: ปีการศึกษา
      // Col 1: วัน/เดือน/ปี
      // Col 2: ชื่อ-นามสกุลนักเรียน
      // Col 3: จำนวนเงิน
      // Col 4: หน่วยงานมอบ
      // Col 5: หมายเหตุ
      const academicYear = String(getVal(0) || "2569").trim();
      const rawDateVal = c[1] ? c[1].v : "";
      const rawDateFormatted = c[1] ? c[1].f : "";
      const recordDate = formatToThaiDate(rawDateVal, rawDateFormatted);
      const studentName = String(getVal(2) || "").trim();
      const amount = Number(c[3] ? c[3].v : 0) || 0;
      const organization = String(getVal(4) || "").trim();
      const note = String(getVal(5) || "").trim();

      // Find grade from students list if available
      let grade = "";
      const matchStu = state.students.find(s => s.name === studentName && s.academicYear === academicYear);
      if (matchStu) grade = matchStu.grade;

      return {
        id: "SCH-" + (index + 1) + "-" + Date.now(),
        academicYear,
        recordDate,
        studentName,
        grade,
        amount,
        organization,
        note,
        timestamp: new Date().toLocaleString("th-TH")
      };
    }).filter(s => s.studentName && s.studentName.length > 0);
  } catch (e) {
    console.error("parseGVizScholarships error:", e);
    return [];
  }
}

/**
 * แปลงวันที่จากฐานข้อมูลให้อยู่ในรูปแบบ "วัน/เดือน/ปี" (dd/mm/yyyy พ.ศ.)
 * แก้ไขปัญหา Google Sheets ที่บันทึกเป็น mm/dd/yyyy ให้แสดงเป็น วัน/เดือน/ปี อย่างถูกต้อง
 */
function formatToThaiDate(rawDateVal, rawDateFormatted) {
  let day, month, year;

  // 1. กรณีเป็น GViz Date(yyyy, monthIndex, day)
  if (typeof rawDateVal === "string" && rawDateVal.includes("Date(")) {
    const m = rawDateVal.match(/Date\((\d+),\s*(\d+),\s*(\d+)/);
    if (m) {
      year = parseInt(m[1], 10);
      month = parseInt(m[2], 10) + 1; // Month ใน JS/GViz เริ่มจาก 0
      day = parseInt(m[3], 10);
    }
  }

  // 2. ถ้ายังไม่ได้ค่า ให้ดูจากข้อความ formatted หรือ string วันที่
  const dateStr = (typeof rawDateVal === "string" && !rawDateVal.includes("Date(")) 
    ? rawDateVal 
    : (rawDateFormatted || "");

  if (!day && dateStr) {
    if (dateStr.includes("/")) {
      const parts = dateStr.split("/");
      if (parts.length === 3) {
        const p0 = parseInt(parts[0], 10);
        const p1 = parseInt(parts[1], 10);
        const p2 = parseInt(parts[2], 10);

        // ถ้าหลักที่ 2 > 12 แสดงว่าต้นทางเป็น mm/dd/yyyy เช่น 07/13/2026 -> เดือน 7 วัน 13
        if (p1 > 12 && p0 <= 12) {
          month = p0;
          day = p1;
          year = p2;
        }
        // ถ้าหลักแรก > 12 แสดงว่าเป็น dd/mm/yyyy อยู่แล้ว เช่น 13/07/2026
        else if (p0 > 12 && p1 <= 12) {
          day = p0;
          month = p1;
          year = p2;
        }
        // ถ้าทั้งสองค่าน้อยกว่าหรือเท่ากับ 12 ในชีตต้นฉบับตั้งค่า locale US (mm/dd/yyyy)
        else {
          month = p0;
          day = p1;
          year = p2;
        }
      }
    } else if (dateStr.includes("-")) {
      // รูปแบบมาตรฐาน HTML date input (yyyy-mm-dd)
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
        day = parseInt(parts[2], 10);
      }
    }
  }

  if (day && month && year) {
    // แปลงปี ค.ศ. เป็น พ.ศ. ให้ตรงกับปีการศึกษา 2569 (เช่น 2026 -> 2569)
    if (year < 2500) {
      year += 543;
    }
    const dStr = String(day).padStart(2, "0");
    const mStr = String(month).padStart(2, "0");
    return `${dStr}/${mStr}/${year}`;
  }

  return dateStr || String(rawDateVal || "-");
}

/**
 * Get Students registered for the currently selected academic year
 */
function getCurrentYearStudents() {
  return state.students.filter(s => s.academicYear === state.selectedAcademicYear);
}

/**
 * Populate Grade Dropdowns based on distinct classes found in database or default
 */
function populateGradeDropdowns() {
  const currentStudents = getCurrentYearStudents();
  
  // รวบรวมระดับชั้นที่มีทั้งในฐานข้อมูลนักเรียนและในรายการทุนการศึกษา
  let gradesInUse = Array.from(new Set([
    ...currentStudents.map(s => s.grade).filter(Boolean),
    ...state.scholarships.map(s => s.grade).filter(Boolean)
  ]));
  
  if (gradesInUse.length === 0) {
    gradesInUse = [...DEFAULT_GRADES];
  } else {
    // Sort logically
    gradesInUse.sort((a, b) => {
      const ia = DEFAULT_GRADES.indexOf(a);
      const ib = DEFAULT_GRADES.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b, 'th');
    });
  }

  // 1. Search Filter Grade
  const prevFilterGrade = elements.filterGrade ? elements.filterGrade.value : "";
  elements.filterGrade.innerHTML = `<option value="">ทุกระดับชั้น</option>`;
  gradesInUse.forEach(grade => {
    const opt = document.createElement("option");
    opt.value = grade;
    opt.textContent = grade;
    elements.filterGrade.appendChild(opt);
  });
  if (prevFilterGrade && gradesInUse.includes(prevFilterGrade)) {
    elements.filterGrade.value = prevFilterGrade;
  }

  // 2. Record Modal Grade (สำหรับปีการศึกษาที่เลือก)
  elements.recordGrade.innerHTML = `<option value="" disabled selected>-- เลือกระดับชั้น --</option>`;
  let recordGrades = Array.from(new Set(currentStudents.map(s => s.grade).filter(Boolean)));
  if (recordGrades.length === 0) recordGrades = [...DEFAULT_GRADES];
  recordGrades.sort((a, b) => DEFAULT_GRADES.indexOf(a) - DEFAULT_GRADES.indexOf(b));
  recordGrades.forEach(grade => {
    const opt = document.createElement("option");
    opt.value = grade;
    opt.textContent = grade;
    elements.recordGrade.appendChild(opt);
  });

  // 3. Student Management Grade Filter
  elements.studentManageGradeFilter.innerHTML = `<option value="">ทุกระดับชั้น</option>`;
  recordGrades.forEach(grade => {
    const opt = document.createElement("option");
    opt.value = grade;
    opt.textContent = grade;
    elements.studentManageGradeFilter.appendChild(opt);
  });

  updateFilterStudentDropdown(elements.filterGrade ? elements.filterGrade.value : "");
}

/**
 * Update Student Dropdown in Filter Area
 * รวบรวมรายชื่อนักเรียนเพื่อค้นหารายบุคคลและกระทบยอดเงินได้ครบทุกคน ไม่แยกปีการศึกษา
 */
function updateFilterStudentDropdown(selectedGrade) {
  const prevVal = elements.filterStudent ? elements.filterStudent.value : "";
  elements.filterStudent.innerHTML = `<option value="">นักเรียนทั้งหมด</option>`;
  
  const studentNamesSet = new Set();
  
  // 1. จากรายการประวัติทุนการศึกษา (เพื่อให้ค้นหาและกระทบยอดได้แน่นอน)
  state.scholarships.forEach(item => {
    if (item.studentName) {
      if (!selectedGrade || item.grade === selectedGrade) {
        studentNamesSet.add(item.studentName);
      }
    }
  });

  // 2. จากฐานข้อมูลนักเรียน
  state.students.forEach(s => {
    if (s.name) {
      if (!selectedGrade || s.grade === selectedGrade) {
        studentNamesSet.add(s.name);
      }
    }
  });

  const sortedNames = Array.from(studentNamesSet).sort((a, b) => a.localeCompare(b, 'th'));

  sortedNames.forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    elements.filterStudent.appendChild(opt);
  });

  if (prevVal && studentNamesSet.has(prevVal)) {
    elements.filterStudent.value = prevVal;
  }
}

/**
 * Update Student Dropdown in Record Form (Strict: Only shows students in selected class)
 */
function updateRecordStudentDropdown(selectedGrade) {
  elements.recordStudent.innerHTML = `<option value="" disabled selected>-- เลือกชื่อ-นามสกุลนักเรียน --</option>`;
  
  if (!selectedGrade) {
    elements.recordStudent.disabled = true;
    return;
  }

  const currentStudents = getCurrentYearStudents();
  const matchingStudents = currentStudents.filter(s => s.grade === selectedGrade);
  
  if (matchingStudents.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = `ไม่พบรายชื่อนักเรียนในชั้น ${selectedGrade} ในฐานข้อมูล`;
    opt.disabled = true;
    elements.recordStudent.appendChild(opt);
    elements.recordStudent.disabled = false;
    return;
  }

  matchingStudents.forEach(student => {
    const opt = document.createElement("option");
    opt.value = student.name;
    opt.textContent = `${student.name} [รหัส: ${student.studentCode || '-'}]`;
    elements.recordStudent.appendChild(opt);
  });

  elements.recordStudent.disabled = false;
}

/**
 * Bind All Event Listeners
 */
function bindEvents() {
  // 1. เปลี่ยนปีการศึกษา (สลับข้อมูลนักเรียนและประวัติทุนตามปีนั้น ๆ โดยอิงจากฐานข้อมูล)
  elements.academicYearSelect.addEventListener("change", (e) => {
    state.selectedAcademicYear = e.target.value;
    onAcademicYearChanged();
  });

  // 2. Action Buttons
  elements.btnOpenRecord.addEventListener("click", openPasswordModal);
  elements.btnOpenStudents.addEventListener("click", openStudentsModal);
  elements.btnDownloadPdf.addEventListener("click", handleDownloadPdf);
  elements.btnPrint.addEventListener("click", handlePrint);

  // 3. Search & Filter
  elements.filterGrade.addEventListener("change", (e) => {
    updateFilterStudentDropdown(e.target.value);
    applyFilters();
  });

  elements.filterStudent.addEventListener("change", applyFilters);
  elements.btnResetFilter.addEventListener("click", resetFilters);

  // 4. Password Security
  elements.btnConfirmPassword.addEventListener("click", handlePasswordSubmit);
  elements.passwordInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handlePasswordSubmit();
  });
  elements.btnClosePasswordModal.addEventListener("click", closePasswordModal);
  elements.btnTogglePassword.addEventListener("click", togglePasswordVisibility);

  // 5. Record Scholarship Modal Form
  elements.recordGrade.addEventListener("change", (e) => {
    updateRecordStudentDropdown(e.target.value);
  });

  elements.recordYear.addEventListener("change", (e) => {
    const modalYear = e.target.value;
    const grade = elements.recordGrade.value;
    if (grade) {
      const yearStudents = state.students.filter(s => s.academicYear === modalYear && s.grade === grade);
      elements.recordStudent.innerHTML = `<option value="" disabled selected>-- เลือกชื่อ-นามสกุลนักเรียน --</option>`;
      yearStudents.forEach(st => {
        const opt = document.createElement("option");
        opt.value = st.name;
        opt.textContent = `${st.name} [รหัส: ${st.studentCode || '-'}]`;
        elements.recordStudent.appendChild(opt);
      });
      elements.recordStudent.disabled = yearStudents.length === 0;
    }
  });

  elements.recordForm.addEventListener("submit", handleRecordSubmit);
  elements.btnResetRecordForm.addEventListener("click", resetRecordFormToCreate);
  elements.btnCloseRecordModal.addEventListener("click", closeRecordModal);

  document.querySelectorAll(".preset-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const amount = chip.getAttribute("data-amount");
      if (amount) elements.recordAmount.value = amount;
    });
  });

  // 6. Student Management Events
  elements.btnCloseStudentsModal.addEventListener("click", closeStudentsModal);
  elements.studentManageGradeFilter.addEventListener("change", renderStudentsManageTable);
  elements.btnAddStudentSingle.addEventListener("click", openAddStudentModal);
  elements.btnImportExcel.addEventListener("click", handleExcelImport);
  elements.btnExportStudentsPdf.addEventListener("click", exportStudentsToPdf);

  // 7. Student Edit/Add Sub-Modal
  elements.studentEditForm.addEventListener("submit", handleSaveStudentEdit);
  elements.btnCloseStudentEditModal.addEventListener("click", closeStudentEditModal);
  elements.btnCancelStudentEdit.addEventListener("click", closeStudentEditModal);

  // 8. Settings Modal Events (Google Apps Script Web App API)
  if (elements.btnOpenSettings) elements.btnOpenSettings.addEventListener("click", openSettingsModal);
  if (elements.btnCloseSettingsModal) elements.btnCloseSettingsModal.addEventListener("click", closeSettingsModal);
  if (elements.btnTestConnection) elements.btnTestConnection.addEventListener("click", handleTestApiConnection);
  if (elements.btnSaveSettings) elements.btnSaveSettings.addEventListener("click", handleSaveApiSettings);

  // Close modals when clicking overlay
  document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.classList.remove("active");
      }
    });
  });
}

/**
 * Handle Year Change: strictly reload from database without making up records
 */
function onAcademicYearChanged() {
  updateAcademicYearHeader();
  
  if (elements.studentManageYearTag) {
    elements.studentManageYearTag.textContent = `ปีการศึกษา ${state.selectedAcademicYear}`;
  }

  // อัปเดตข้อมูลนักเรียนตามปีการศึกษาที่เลือก (ตามข้อกำหนด: เมื่อเปลี่ยนปีการศึกษา ข้อมูลนักเรียนต้องเปลี่ยน)
  elements.recordYear.value = state.selectedAcademicYear;
  elements.recordGrade.value = "";
  updateRecordStudentDropdown("");

  renderStudentsManageTable();
  populateGradeDropdowns();

  // "เมื่อเปลี่ยนปีการศึกษา รายการประวัติการรับทุนการศึกษา จะยังคงแสดงอยู่ และสามารถกระทบยอดเงินได้ ไม่แยก"
  applyFilters();

  if (elements.recordModal.classList.contains("active")) {
    renderModalScholarshipsTable();
  }

  const stuCount = getCurrentYearStudents().length;
  showToast(`ปีการศึกษา ${state.selectedAcademicYear} (นักเรียน ${stuCount} คน - ประวัติทุนแสดงต่อเนื่อง)`, "info");
}

function updateAcademicYearHeader() {
  elements.academicYearDisplay.innerHTML = `<i class="fa-solid fa-graduation-cap"></i> ปีการศึกษา ${state.selectedAcademicYear}`;
}

/**
 * Filter Scholarship Records (ระดับชั้น และ ชื่อ-นามสกุลนักเรียน)
 * ตามข้อกำหนด: "เมื่อเปลี่ยนปีการศึกษา รายการประวัติการรับทุนการศึกษา จะยังคงแสดงอยู่ และสามารถกระทบยอดเงินได้ ไม่แยก"
 */
function applyFilters() {
  const selectedGrade = elements.filterGrade ? elements.filterGrade.value : "";
  const selectedStudent = elements.filterStudent ? elements.filterStudent.value : "";

  state.filteredScholarships = state.scholarships.filter(item => {
    const matchGrade = !selectedGrade || item.grade === selectedGrade;
    const matchStudent = !selectedStudent || item.studentName === selectedStudent;
    return matchGrade && matchStudent;
  });

  renderScholarshipsTable();
  updateTableTotal();
}

function resetFilters() {
  if (elements.filterGrade) elements.filterGrade.value = "";
  updateFilterStudentDropdown("");
  if (elements.filterStudent) elements.filterStudent.value = "";
  applyFilters();
  showToast("รีเซ็ตตัวกรองเรียบร้อยแล้ว", "info");
}

/**
 * Render Scholarships Table on Main Page (View-Only, NO Edit/Delete buttons)
 * - แสดงวันที่ในรูปแบบ วัน/เดือน/ปี
 * - ไม่ต้องแสดงระดับชั้น
 * - จัดระยะห่างพอดี ไม่ต้องมี icon ในตาราง
 * - ข้อมูลอยู่ในบรรทัดเดียว และหมายเหตุกว้างน้อยสุด
 */
function renderScholarshipsTable() {
  const tbody = elements.scholarshipTableBody;
  tbody.innerHTML = "";

  const list = state.filteredScholarships;
  if (elements.tableRecordCount) {
    elements.tableRecordCount.textContent = `${list.length} รายการ`;
  }

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center empty-state">
          <i class="fa-regular fa-folder-open"></i>
          <p>ยังไม่มีข้อมูลในฐานข้อมูล</p>
        </td>
      </tr>
    `;
    return;
  }

  list.forEach((item, index) => {
    const tr = document.createElement("tr");
    const formattedAmount = Number(item.amount || 0).toLocaleString("th-TH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    const formattedDate = formatToThaiDate(item.recordDate);

    tr.innerHTML = `
      <td class="text-center font-semibold col-seq">${index + 1}</td>
      <td class="text-center col-date">${escapeHtml(formattedDate)}</td>
      <td class="col-name">${escapeHtml(item.studentName)}</td>
      <td class="text-right amount-display col-amount">${formattedAmount}</td>
      <td class="col-org">${escapeHtml(item.organization || "-")}</td>
      <td class="text-center col-note">${escapeHtml(item.note || "-")}</td>
    `;
    tbody.appendChild(tr);
  });
}

/**
 * ยอดรวมเงินทุนการศึกษา แสดงใต้ตารางรวมกับตารางรายการประวัติการรับทุนการศึกษา
 * สามารถกระทบยอดเงินได้ ไม่แยกตามปีการศึกษา และแสดงยอดรวมของนักเรียนที่เลือกเมื่อค้นหารายบุคคล
 */
function updateTableTotal() {
  const list = state.filteredScholarships;
  const count = list.length;
  const totalAmount = list.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const selectedStudent = elements.filterStudent ? elements.filterStudent.value : "";
  const selectedGrade = elements.filterGrade ? elements.filterGrade.value : "";

  if (elements.tableTotalAmount) {
    elements.tableTotalAmount.textContent = `${Number(totalAmount).toLocaleString("th-TH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })} บาท`;
  }

  if (elements.tableTotalLabel) {
    if (selectedStudent) {
      elements.tableTotalLabel.innerHTML = `ยอดรวมเงินทุนการศึกษาของ <strong style="color: var(--primary);">${escapeHtml(selectedStudent)}</strong>`;
    } else if (selectedGrade) {
      elements.tableTotalLabel.innerHTML = `ยอดรวมเงินทุนการศึกษา ระดับชั้น <strong style="color: var(--primary);">${escapeHtml(selectedGrade)}</strong>`;
    } else {
      elements.tableTotalLabel.innerHTML = `<strong>ยอดรวมเงินทุนการศึกษาทั้งหมด</strong>`;
    }
  }

  if (elements.tableTotalYearLabel) {
    elements.tableTotalYearLabel.textContent = "";
  }
}

function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* --------------------------------------------------------------------------
   Password Security & Authentication (thunsandab1234)
   -------------------------------------------------------------------------- */
function openPasswordModal() {
  if (state.isAuthenticated) {
    openRecordModal();
    return;
  }

  elements.passwordInput.value = "";
  elements.passwordErrorMsg.style.display = "none";
  elements.passwordModal.classList.add("active");
  setTimeout(() => elements.passwordInput.focus(), 150);
}

function closePasswordModal() {
  elements.passwordModal.classList.remove("active");
}
window.closePasswordModal = closePasswordModal;

function togglePasswordVisibility() {
  const input = elements.passwordInput;
  const icon = elements.btnTogglePassword.querySelector("i");
  if (input.type === "password") {
    input.type = "text";
    icon.classList.remove("fa-eye");
    icon.classList.add("fa-eye-slash");
  } else {
    input.type = "password";
    icon.classList.remove("fa-eye-slash");
    icon.classList.add("fa-eye");
  }
}

function handlePasswordSubmit() {
  const entered = elements.passwordInput.value.trim();

  if (entered === CONFIG.PASSWORD) {
    state.isAuthenticated = true;
    closePasswordModal();
    showToast("เข้าสู่ระบบบันทึกทุนการศึกษาเรียบร้อยแล้ว", "success");
    openRecordModal();
  } else {
    elements.passwordErrorMsg.style.display = "block";
    elements.passwordInput.classList.add("shake-animation");
    setTimeout(() => elements.passwordInput.classList.remove("shake-animation"), 400);
    elements.passwordInput.select();
  }
}

/* --------------------------------------------------------------------------
   Record Scholarship Modal (เข้าระบบบันทึกทุนการศึกษา)
   "เมื่อเข้าแล้ว ระบบจะแสดงประวัติการรับทุนด้านล่างด้วย และจะมีปุ่มแก้ไข ลบ เพิ่มมาในช่องจัดการ"
   -------------------------------------------------------------------------- */
function openRecordModal() {
  resetRecordFormToCreate();
  renderModalScholarshipsTable();
  elements.recordModal.classList.add("active");
}

function closeRecordModal() {
  elements.recordModal.classList.remove("active");
  resetRecordFormToCreate();
}
window.closeRecordModal = closeRecordModal;

function resetRecordFormToCreate() {
  state.editingRecordId = null;
  elements.editRecordId.value = "";
  
  const today = new Date().toISOString().split("T")[0];
  elements.recordDate.value = today;
  elements.recordYear.value = state.selectedAcademicYear;

  elements.recordGrade.value = "";
  updateRecordStudentDropdown("");
  elements.recordAmount.value = "";
  elements.recordOrg.value = "";
  elements.recordNote.value = "";

  elements.btnSaveRecord.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> บันทึกข้อมูลทุนการศึกษา`;
  elements.btnResetRecordForm.style.display = "none";
}

/**
 * Render Bottom Scholarship Table inside Record Modal (WITH [แก้ไข] and [ลบ])
 */
function renderModalScholarshipsTable() {
  const tbody = elements.modalScholarshipTableBody;
  tbody.innerHTML = "";

  // แสดงรายการทุนทั้งหมดเพื่อให้จัดการ แก้ไข/ลบ และกระทบยอดได้ ไม่แยกปีการศึกษา
  const list = state.scholarships;
  elements.modalRecordCount.textContent = `${list.length} รายการ`;

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-muted" style="padding: 24px;">
          ยังไม่มีข้อมูลประวัติการรับทุนในฐานข้อมูล
        </td>
      </tr>
    `;
    return;
  }

  list.forEach((item, index) => {
    const tr = document.createElement("tr");
    const formattedAmount = Number(item.amount || 0).toLocaleString("th-TH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    tr.innerHTML = `
      <td class="text-center font-semibold col-seq">${index + 1}</td>
      <td class="text-center col-date">${escapeHtml(formatToThaiDate(item.recordDate))}</td>
      <td class="col-name" style="font-weight: 600; color: #1e1b4b;">
        ${escapeHtml(item.studentName)}
        ${item.grade ? `<span class="badge-grade" style="margin-left: 4px;">${escapeHtml(item.grade)}</span>` : ""}
      </td>
      <td class="text-right amount-display col-amount">${formattedAmount}</td>
      <td class="col-org"><span class="badge-org">${escapeHtml(item.organization || "-")}</span></td>
      <td class="text-center col-note">${escapeHtml(item.note || "-")}</td>
      <td class="text-center col-action">
        <button type="button" class="btn-table-edit" onclick="startEditScholarship('${item.id}')">
          <i class="fa-solid fa-pen-to-square"></i> แก้ไข
        </button>
        <button type="button" class="btn-table-delete" onclick="deleteScholarship('${item.id}')">
          <i class="fa-regular fa-trash-can"></i> ลบ
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/**
 * Start Editing an existing scholarship record
 */
window.startEditScholarship = function(id) {
  const item = state.scholarships.find(s => s.id === id);
  if (!item) return;

  state.editingRecordId = id;
  elements.editRecordId.value = id;

  // Set date in HTML5 format (yyyy-mm-dd)
  if (item.recordDate) {
    const formatted = formatToThaiDate(item.recordDate);
    const parts = formatted.split("/");
    if (parts.length === 3) {
      const d = parts[0].padStart(2, '0');
      const m = parts[1].padStart(2, '0');
      let y = parseInt(parts[2], 10);
      if (y > 2500) y -= 543;
      elements.recordDate.value = `${y}-${m}-${d}`;
    } else {
      elements.recordDate.value = item.recordDate;
    }
  }

  elements.recordYear.value = item.academicYear || state.selectedAcademicYear;

  // Grade & Student
  if (item.grade) {
    elements.recordGrade.value = item.grade;
    updateRecordStudentDropdown(item.grade);
    elements.recordStudent.value = item.studentName;
  } else {
    // Find student's grade from student database
    const st = state.students.find(s => s.name === item.studentName);
    if (st && st.grade) {
      elements.recordGrade.value = st.grade;
      updateRecordStudentDropdown(st.grade);
      elements.recordStudent.value = item.studentName;
    } else {
      elements.recordStudent.disabled = false;
      elements.recordStudent.innerHTML = `<option value="${escapeHtml(item.studentName)}" selected>${escapeHtml(item.studentName)}</option>`;
    }
  }

  elements.recordAmount.value = item.amount || "";
  elements.recordOrg.value = item.organization || "";
  elements.recordNote.value = item.note || "";

  elements.btnSaveRecord.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> บันทึกการแก้ไข`;
  elements.btnResetRecordForm.style.display = "inline-flex";

  // Scroll modal smoothly to the form
  elements.recordModal.querySelector(".modal-dialog").scrollTo({ top: 0, behavior: "smooth" });
  showToast(`กำลังแก้ไขข้อมูลของ ${item.studentName}`, "info");
};

/**
 * Submit Scholarship Record (Add or Update)
 */
async function handleRecordSubmit(e) {
  e.preventDefault();

  const recordDate = elements.recordDate.value;
  const academicYear = elements.recordYear.value;
  const grade = elements.recordGrade.value;
  const studentName = elements.recordStudent.value;
  const amount = parseFloat(elements.recordAmount.value);
  const organization = elements.recordOrg.value.trim();
  const note = elements.recordNote.value.trim();

  if (!recordDate || !studentName || isNaN(amount) || amount <= 0 || !organization) {
    showToast("กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน", "warning");
    return;
  }

  const thaiFormattedDate = formatToThaiDate(recordDate);

  if (state.editingRecordId) {
    // Update existing record
    const idx = state.scholarships.findIndex(s => s.id === state.editingRecordId);
    if (idx !== -1) {
      state.scholarships[idx] = {
        ...state.scholarships[idx],
        recordDate: thaiFormattedDate,
        academicYear,
        grade,
        studentName,
        amount,
        organization,
        note,
        timestamp: new Date().toLocaleString("th-TH")
      };
      showToast(`อัปเดตข้อมูลทุนการศึกษาของ ${studentName} สำเร็จแล้ว`, "success");
    }
  } else {
    // Add new record
    const newRecord = {
      id: "SCH-" + Date.now(),
      recordDate: thaiFormattedDate,
      academicYear,
      grade,
      studentName,
      amount,
      organization,
      note,
      timestamp: new Date().toLocaleString("th-TH")
    };
    state.scholarships.unshift(newRecord);
    showToast(`บันทึกทุนการศึกษาของ ${studentName} สำเร็จแล้ว`, "success");
  }

  localStorage.setItem(CONFIG.STORAGE_KEYS.SCHOLARSHIPS, JSON.stringify(state.scholarships));

  // Sync to Google Sheet via Apps Script API if available (Auto Expand Rows)
  const savedRecord = state.scholarships.find(s => s.id === (state.editingRecordId || state.scholarships[0]?.id));
  if (savedRecord) {
    syncScholarshipToApi(savedRecord);
  }

  resetRecordFormToCreate();
  renderModalScholarshipsTable();
  applyFilters();
}

/**
 * Delete Scholarship Record (เฉพาะในระบบบันทึกทุนการศึกษา)
 */
window.deleteScholarship = function(id) {
  const item = state.scholarships.find(s => s.id === id);
  if (!item) return;

  if (confirm(`คุณต้องการลบข้อมูลทุนการศึกษาของ "${item.studentName}" จำนวน ${Number(item.amount).toLocaleString()} บาท หรือไม่?`)) {
    state.scholarships = state.scholarships.filter(s => s.id !== id);
    localStorage.setItem(CONFIG.STORAGE_KEYS.SCHOLARSHIPS, JSON.stringify(state.scholarships));
    
    renderModalScholarshipsTable();
    applyFilters();
    showToast("ลบข้อมูลทุนการศึกษาเรียบร้อยแล้ว", "info");

    if (state.editingRecordId === id) {
      resetRecordFormToCreate();
    }

    // ลบจาก Google Sheet ผ่าน Apps Script API
    deleteScholarshipFromApi(id);
  }
};

/* --------------------------------------------------------------------------
   Student Management Interface (จัดการข้อมูลนักเรียน)
   -------------------------------------------------------------------------- */
function openStudentsModal() {
  elements.studentManageYearTag.textContent = `ปีการศึกษา ${state.selectedAcademicYear}`;
  renderStudentsManageTable();
  elements.studentsModal.classList.add("active");
}

function closeStudentsModal() {
  elements.studentsModal.classList.remove("active");
}
window.closeStudentsModal = closeStudentsModal;

function renderStudentsManageTable() {
  const currentStudents = getCurrentYearStudents();
  const gradeFilter = elements.studentManageGradeFilter.value;
  const tbody = elements.studentsManageTableBody;
  tbody.innerHTML = "";

  const filtered = currentStudents.filter(s => !gradeFilter || s.grade === gradeFilter);
  elements.studentCountBadge.textContent = filtered.length;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-muted" style="padding: 32px;">
          <i class="fa-regular fa-folder-open" style="font-size: 2rem; color: #c4b5fd; margin-bottom: 8px; display: block;"></i>
          ยังไม่มีข้อมูลนักเรียนในปีการศึกษา ${state.selectedAcademicYear} ในฐานข้อมูล
          <div style="margin-top: 10px;">
            <button type="button" class="btn btn-secondary" onclick="openAddStudentModal()" style="font-size: 0.85rem;">
              <i class="fa-solid fa-plus"></i> เพิ่มนักเรียนรายบุคคล
            </button>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  filtered.forEach(student => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="text-align: center; font-weight: 600;">${escapeHtml(student.grade || "-")}</td>
      <td style="text-align: center; color: #475569;">${escapeHtml(student.citizenId || "-")}</td>
      <td style="text-align: center; font-weight: 600; color: var(--secondary);">${escapeHtml(student.studentCode || "-")}</td>
      <td style="text-align: left; font-weight: 500;">${escapeHtml(student.name || "-")}</td>
      <td style="text-align: center;">${escapeHtml(student.gender || "-")}</td>
      <td style="text-align: center; color: #64748b;">${escapeHtml(student.birthDate || "-")}</td>
      <td style="text-align: center;">
        <span style="color: #15803d; font-weight: 500;">${escapeHtml(student.status || "เรียนอยู่")}</span>
      </td>
      <td style="text-align: center; white-space: nowrap;">
        <button type="button" class="btn-table-edit" onclick="editStudent('${escapeHtml(student.studentCode)}')">แก้ไข</button>
        <button type="button" class="btn-table-delete" onclick="deleteStudent('${escapeHtml(student.studentCode)}')">ลบ</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openAddStudentModal() {
  elements.studentEditModalTitle.innerHTML = `<i class="fa-solid fa-user-plus" style="color: var(--primary);"></i> <span>เพิ่มข้อมูลนักเรียน (ปีการศึกษา ${state.selectedAcademicYear})</span>`;
  elements.studentEditIndex.value = "-1";
  elements.studentEditGrade.value = "อ.1";
  elements.studentEditGender.value = "ชาย";
  elements.studentEditCode.value = "";
  elements.studentEditCitizenId.value = "";
  elements.studentEditName.value = "";
  elements.studentEditBirthDate.value = "";
  elements.studentEditStatus.value = "เรียนอยู่";

  elements.studentEditModal.classList.add("active");
  setTimeout(() => elements.studentEditCode.focus(), 150);
}

window.editStudent = function(studentCode) {
  const currentStudents = getCurrentYearStudents();
  const student = currentStudents.find(s => s.studentCode === studentCode);
  if (!student) return;

  elements.studentEditModalTitle.innerHTML = `<i class="fa-solid fa-user-pen" style="color: var(--primary);"></i> <span>แก้ไขข้อมูลนักเรียน (ปีการศึกษา ${state.selectedAcademicYear})</span>`;
  elements.studentEditIndex.value = student.studentCode;
  elements.studentEditGrade.value = student.grade || "อ.1";
  elements.studentEditGender.value = student.gender || "ชาย";
  elements.studentEditCode.value = student.studentCode || "";
  elements.studentEditCitizenId.value = student.citizenId || "";
  elements.studentEditName.value = student.name || "";
  elements.studentEditBirthDate.value = student.birthDate || "";
  elements.studentEditStatus.value = student.status || "เรียนอยู่";

  elements.studentEditModal.classList.add("active");
};

function closeStudentEditModal() {
  elements.studentEditModal.classList.remove("active");
}
window.closeStudentEditModal = closeStudentEditModal;

async function handleSaveStudentEdit(e) {
  e.preventDefault();

  const isEdit = elements.studentEditIndex.value !== "-1";
  const origCode = elements.studentEditIndex.value;
  const grade = elements.studentEditGrade.value;
  const gender = elements.studentEditGender.value;
  const studentCode = elements.studentEditCode.value.trim();
  const citizenId = elements.studentEditCitizenId.value.trim();
  const name = elements.studentEditName.value.trim();
  const birthDate = elements.studentEditBirthDate.value.trim();
  const status = elements.studentEditStatus.value;

  if (!grade || !studentCode || !name) {
    showToast("กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน", "warning");
    return;
  }

  const studentObj = {
    academicYear: state.selectedAcademicYear,
    grade,
    citizenId,
    studentCode,
    name,
    gender,
    birthDate,
    status
  };

  if (isEdit) {
    const idx = state.students.findIndex(s => s.academicYear === state.selectedAcademicYear && s.studentCode === origCode);
    if (idx !== -1) state.students[idx] = studentObj;
    showToast(`อัปเดตข้อมูลนักเรียน ${name} เรียบร้อยแล้ว`, "success");
  } else {
    state.students.push(studentObj);
    showToast(`เพิ่มข้อมูลนักเรียน ${name} เรียบร้อยแล้ว`, "success");
  }

  localStorage.setItem(CONFIG.STORAGE_KEYS.STUDENTS, JSON.stringify(state.students));
  closeStudentEditModal();
  populateGradeDropdowns();
  renderStudentsManageTable();

  // ซิงค์ไปยัง Google Sheet ผ่าน Apps Script API (ขยายแถวอัตโนมัติหากแถวเต็ม)
  syncStudentToApi(studentObj);
}

window.deleteStudent = function(studentCode) {
  const currentStudents = getCurrentYearStudents();
  const student = currentStudents.find(s => s.studentCode === studentCode);
  if (!student) return;

  if (confirm(`คุณต้องการลบข้อมูลนักเรียน "${student.name}" ออกจากปีการศึกษา ${state.selectedAcademicYear} หรือไม่?`)) {
    state.students = state.students.filter(s => !(s.academicYear === state.selectedAcademicYear && s.studentCode === studentCode));
    localStorage.setItem(CONFIG.STORAGE_KEYS.STUDENTS, JSON.stringify(state.students));
    populateGradeDropdowns();
    renderStudentsManageTable();
    showToast(`ลบข้อมูลนักเรียน ${student.name} เรียบร้อยแล้ว`, "info");

    // ลบจาก Google Sheet ผ่าน Apps Script API
    deleteStudentFromApi(state.selectedAcademicYear, student.studentCode, student.name);
  }
};

/**
 * Import Students from Excel (.xlsx) using SheetJS
 */
function handleExcelImport() {
  const fileInput = elements.excelFileInput;
  if (!fileInput.files || fileInput.files.length === 0) {
    showToast("กรุณาเลือกไฟล์ Excel (.xlsx) ก่อนกดนำเข้าข้อมูล", "warning");
    return;
  }

  const file = fileInput.files[0];
  const reader = new FileReader();

  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      if (!window.XLSX) {
        showToast("ไม่พบไลบรารีอ่านไฟล์ Excel", "error");
        return;
      }

      const workbook = XLSX.read(data, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (!rows || rows.length <= 1) {
        showToast("ไม่พบข้อมูลในไฟล์ Excel", "warning");
        return;
      }

      const importedStudents = [];
      const currentYear = state.selectedAcademicYear;

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        const grade = String(row[0] || "").trim();
        const citizenId = String(row[1] || "").trim();
        const studentCode = String(row[2] || "").trim();
        const name = String(row[3] || "").trim();
        const gender = String(row[4] || "ชาย").trim();
        const birthDate = String(row[5] || "").trim();
        const status = String(row[6] || "เรียนอยู่").trim();

        if (name) {
          importedStudents.push({
            academicYear: currentYear,
            grade: grade || "อ.1",
            citizenId,
            studentCode: studentCode || ("STD-" + (i)),
            name,
            gender,
            birthDate,
            status
          });
        }
      }

      if (importedStudents.length === 0) {
        showToast("ไม่พบข้อมูลนักเรียนที่ถูกต้องในไฟล์ Excel", "error");
        return;
      }

      importedStudents.forEach(newSt => {
        const existingIdx = state.students.findIndex(s => s.academicYear === currentYear && s.studentCode === newSt.studentCode);
        if (existingIdx !== -1) {
          state.students[existingIdx] = newSt;
        } else {
          state.students.push(newSt);
        }
      });

      localStorage.setItem(CONFIG.STORAGE_KEYS.STUDENTS, JSON.stringify(state.students));
      populateGradeDropdowns();
      renderStudentsManageTable();

      showToast(`นำเข้าข้อมูลนักเรียน ${importedStudents.length} คน สำเร็จแล้ว`, "success");
      fileInput.value = "";

      // ซิงค์ทั้งกลุ่มไปยัง Google Sheet ผ่าน Apps Script API (Safe Batch Append with Auto Expand)
      syncBatchStudentsToApi(importedStudents);

    } catch (err) {
      console.error(err);
      showToast("เกิดข้อผิดพลาดในการอ่านไฟล์ Excel: " + err.message, "error");
    }
  };

  reader.readAsArrayBuffer(file);
}

function exportStudentsToPdf() {
  const currentStudents = getCurrentYearStudents();
  if (currentStudents.length === 0) {
    showToast(`ไม่มีข้อมูลนักเรียนในปีการศึกษา ${state.selectedAcademicYear} ที่จะดาวน์โหลด`, "warning");
    return;
  }

  showToast("กำลังสร้างไฟล์ PDF รายชื่อนักเรียน...", "info");

  const pdfContainer = document.createElement("div");
  pdfContainer.style.padding = "25px 30px";
  pdfContainer.style.fontFamily = "'TH Sarabun PSK', 'TH Sarabun New', 'Sarabun', sans-serif";
  pdfContainer.style.color = "#000";
  pdfContainer.style.background = "#fff";

  const rowsHtml = currentStudents.map(s => `
    <tr>
      <td style="text-align: center; border: 1px solid #000; padding: 4px 6px; font-size: 13.5pt;">${escapeHtml(s.grade)}</td>
      <td style="text-align: center; border: 1px solid #000; padding: 4px 6px; font-size: 13.5pt;">${escapeHtml(s.citizenId)}</td>
      <td style="text-align: center; border: 1px solid #000; padding: 4px 6px; font-weight: bold; font-size: 13.5pt;">${escapeHtml(s.studentCode)}</td>
      <td style="border: 1px solid #000; padding: 4px 8px; font-size: 13.5pt;">${escapeHtml(s.name)}</td>
      <td style="text-align: center; border: 1px solid #000; padding: 4px 6px; font-size: 13.5pt;">${escapeHtml(s.gender)}</td>
      <td style="text-align: center; border: 1px solid #000; padding: 4px 6px; font-size: 13.5pt;">${escapeHtml(s.birthDate)}</td>
      <td style="text-align: center; border: 1px solid #000; padding: 4px 6px; font-size: 13.5pt;">${escapeHtml(s.status)}</td>
    </tr>
  `).join("");

  pdfContainer.innerHTML = `
    <div style="text-align: center; margin-bottom: 15px;">
      <img src="ตราโรงเรียน.png" style="width: 60px; height: auto; margin-bottom: 4px;">
      <h2 style="font-size: 18pt; font-weight: bold; margin: 0; color: #000; line-height: 1.2;">บัญชีรายชื่อนักเรียน</h2>
      <h3 style="font-size: 16pt; font-weight: bold; margin: 2px 0; color: #000; line-height: 1.2;">โรงเรียนบ้านสันดาบ</h3>
      <p style="font-size: 14pt; margin: 2px 0 8px 0; color: #000;">ประจำปีการศึกษา ${state.selectedAcademicYear} (จำนวนทั้งหมด ${currentStudents.length} คน)</p>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; border: 1px solid #000; font-family: 'TH Sarabun PSK', 'TH Sarabun New', 'Sarabun', sans-serif;">
      <thead>
        <tr style="background-color: #f2f2f2; color: #000;">
          <th style="border: 1px solid #000; padding: 6px 4px; width: 65px; text-align: center; font-size: 14pt; font-weight: bold;">ระดับชั้น</th>
          <th style="border: 1px solid #000; padding: 6px 4px; width: 130px; text-align: center; font-size: 14pt; font-weight: bold;">เลขบัตรประชาชน</th>
          <th style="border: 1px solid #000; padding: 6px 4px; width: 85px; text-align: center; font-size: 14pt; font-weight: bold;">รหัสประจำตัว</th>
          <th style="border: 1px solid #000; padding: 6px 8px; text-align: left; font-size: 14pt; font-weight: bold;">ชื่อ-นามสกุล</th>
          <th style="border: 1px solid #000; padding: 6px 4px; width: 60px; text-align: center; font-size: 14pt; font-weight: bold;">เพศ</th>
          <th style="border: 1px solid #000; padding: 6px 4px; width: 95px; text-align: center; font-size: 14pt; font-weight: bold;">วันเกิด</th>
          <th style="border: 1px solid #000; padding: 6px 4px; width: 85px; text-align: center; font-size: 14pt; font-weight: bold;">สถานะ</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <div style="margin-top: 40px; display: flex; justify-content: space-around; text-align: center; font-size: 13px;">
      <div>
        <p style="margin-bottom: 50px;">ลงชื่อ ............................................................ นายทะเบียน/ผู้จัดทำ</p>
        <p>( ............................................................ )</p>
        <p>ตำแหน่ง ครูผู้รับผิดชอบงานทะเบียนนักเรียน</p>
      </div>
      <div>
        <p style="margin-bottom: 50px;">ลงชื่อ ............................................................ ผู้รับรอง</p>
        <p>( ............................................................ )</p>
        <p>ผู้อำนวยการโรงเรียนบ้านสันดาบ</p>
      </div>
    </div>
  `;

  document.body.appendChild(pdfContainer);

  const opt = {
    margin: [10, 10, 15, 10],
    filename: `รายชื่อนักเรียน_โรงเรียนบ้านสันดาบ_ปี${state.selectedAcademicYear}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
  };

  if (window.html2pdf) {
    window.html2pdf().set(opt).from(pdfContainer).save().then(() => {
      document.body.removeChild(pdfContainer);
      showToast("ดาวน์โหลดไฟล์ PDF เรียบร้อยแล้ว", "success");
    }).catch(err => {
      document.body.removeChild(pdfContainer);
      window.print();
    });
  } else {
    document.body.removeChild(pdfContainer);
    window.print();
  }
}

/* --------------------------------------------------------------------------
   Printing & PDF Generation for Scholarships
   -------------------------------------------------------------------------- */
function handlePrint() {
  if (state.filteredScholarships.length === 0) {
    showToast("ไม่พบข้อมูลที่จะพิมพ์", "warning");
    return;
  }
  window.print();
}

function handleDownloadPdf() {
  const records = state.filteredScholarships;
  if (records.length === 0) {
    showToast("ไม่พบข้อมูลที่จะดาวน์โหลดเป็น PDF", "warning");
    return;
  }

  showToast("กำลังสร้างไฟล์ PDF ประวัติการรับทุนการศึกษา...", "info");

  const totalAmount = records.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const pdfContainer = document.createElement("div");
  pdfContainer.id = "pdfExportWrapper";
  pdfContainer.style.padding = "15px 25px";
  pdfContainer.style.fontFamily = "'TH Sarabun PSK', 'TH Sarabun New', 'Sarabun', sans-serif";
  pdfContainer.style.color = "#000";
  pdfContainer.style.background = "#fff";

  const rowsHtml = records.map((r, i) => `
    <tr>
      <td style="text-align: center; border: 1px solid #000; padding: 4px 6px; font-size: 14pt; white-space: nowrap;">${i + 1}</td>
      <td style="text-align: center; border: 1px solid #000; padding: 4px 6px; font-size: 14pt; white-space: nowrap;">${escapeHtml(formatToThaiDate(r.recordDate))}</td>
      <td style="text-align: left; border: 1px solid #000; padding: 4px 8px; font-size: 14pt; white-space: nowrap;">${escapeHtml(r.studentName)}</td>
      <td style="text-align: right; border: 1px solid #000; padding: 4px 8px; font-size: 14pt; font-weight: bold; white-space: nowrap;">${Number(r.amount).toLocaleString('th-TH', {minimumFractionDigits: 2})}</td>
      <td style="text-align: left; border: 1px solid #000; padding: 4px 8px; font-size: 13.5pt; white-space: nowrap;">${escapeHtml(r.organization || "-")}</td>
      <td style="text-align: center; border: 1px solid #000; padding: 4px 6px; font-size: 14pt; white-space: nowrap;">${escapeHtml(r.note || "-")}</td>
    </tr>
  `).join("");

  const selectedStudent = elements.filterStudent ? elements.filterStudent.value : "";
  const selectedGrade = elements.filterGrade ? elements.filterGrade.value : "";
  let pdfSubTitle = `รวมประวัติการรับทุนการศึกษาทั้งหมด (${records.length} รายการ)`;
  if (selectedStudent) {
    pdfSubTitle = `ประวัติการรับทุนการศึกษาของ ${selectedStudent} (จำนวน ${records.length} รายการ)`;
  } else if (selectedGrade) {
    pdfSubTitle = `ประวัติการรับทุนการศึกษา ระดับชั้น ${selectedGrade} (จำนวน ${records.length} รายการ)`;
  }

  pdfContainer.innerHTML = `
    <div style="text-align: center; margin-bottom: 12px;">
      <img src="ตราโรงเรียน.png" style="width: 60px; height: auto; margin-bottom: 4px;">
      <h2 style="font-size: 18pt; font-weight: bold; margin: 0; color: #000; line-height: 1.2;">ประวัติการรับทุนการศึกษา</h2>
      <h3 style="font-size: 16pt; font-weight: bold; margin: 2px 0; color: #000; line-height: 1.2;">โรงเรียนบ้านสันดาบ</h3>
      <p style="font-size: 15pt; font-weight: bold; margin: 2px 0 8px 0; color: #000;">${pdfSubTitle}</p>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; border: 1px solid #000; font-family: 'TH Sarabun PSK', 'TH Sarabun New', 'Sarabun', sans-serif;">
      <thead>
        <tr style="background-color: #f2f2f2; color: #000;">
          <th style="border: 1px solid #000; padding: 6px 4px; width: 6%; text-align: center; font-size: 14pt; font-weight: bold; white-space: nowrap;">ลำดับ</th>
          <th style="border: 1px solid #000; padding: 6px 4px; width: 14%; text-align: center; font-size: 14pt; font-weight: bold; white-space: nowrap;">วัน/เดือน/ปี</th>
          <th style="border: 1px solid #000; padding: 6px 8px; width: 30%; text-align: left; font-size: 14pt; font-weight: bold; white-space: nowrap;">ชื่อ-นามสกุลนักเรียน</th>
          <th style="border: 1px solid #000; padding: 6px 8px; width: 15%; text-align: right; font-size: 14pt; font-weight: bold; white-space: nowrap;">ยอดเงิน (บาท)</th>
          <th style="border: 1px solid #000; padding: 6px 8px; width: 27%; text-align: left; font-size: 14pt; font-weight: bold; white-space: nowrap;">หน่วยงาน</th>
          <th style="border: 1px solid #000; padding: 6px 4px; width: 8%; text-align: center; font-size: 14pt; font-weight: bold; white-space: nowrap;">หมายเหตุ</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
        <tr style="background-color: #fff; font-weight: bold; border-top: 1px solid #000;">
          <td colspan="3" style="text-align: right; border: 1px solid #000; padding: 6px 8px; font-size: 14pt; color: #000;">รวมทั้งสิ้น (${records.length} รายการ):</td>
          <td style="text-align: right; border: 1px solid #000; padding: 6px 8px; font-size: 14.5pt; color: #000;">${totalAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})}</td>
          <td colspan="2" style="border: 1px solid #000; padding: 6px 8px; font-size: 14pt; color: #000;">บาท</td>
        </tr>
      </tbody>
    </table>

    <div style="margin-top: 30px; display: flex; justify-content: space-around; text-align: center; font-size: 14pt; color: #000; line-height: 1.4;">
      <div style="width: 45%;">
        <p style="margin: 4px 0;">ลงชื่อ ............................................................ ผู้รายงาน</p>
        <p style="margin: 4px 0;">( ............................................................ )</p>
        <p style="margin: 4px 0;">ครูผู้รับผิดชอบงานทุนการศึกษา โรงเรียนบ้านสันดาบ</p>
      </div>
      <div style="width: 45%;">
        <p style="margin: 4px 0;">ลงชื่อ ............................................................ ผู้รับรอง</p>
        <p style="margin: 4px 0;">( ............................................................ )</p>
        <p style="margin: 4px 0;">ผู้อำนวยการโรงเรียนบ้านสันดาบ</p>
    </div>
  `;

  document.body.appendChild(pdfContainer);

  const opt = {
    margin: [10, 12, 12, 12],
    filename: `ประวัติการรับทุนการศึกษา_โรงเรียนบ้านสันดาบ_ปี${state.selectedAcademicYear}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  if (window.html2pdf) {
    window.html2pdf().set(opt).from(pdfContainer).save().then(() => {
      document.body.removeChild(pdfContainer);
      showToast("ดาวน์โหลดไฟล์ PDF เรียบร้อยแล้ว", "success");
    }).catch(err => {
      document.body.removeChild(pdfContainer);
      window.print();
    });
  } else {
    document.body.removeChild(pdfContainer);
    window.print();
  }
}

/**
 * Toast Notifications
 */
function showToast(message, type = "success") {
  if (!elements.toastContainer) return;
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  let icon = "fa-circle-check";
  if (type === "error") icon = "fa-circle-exclamation";
  if (type === "warning") icon = "fa-triangle-exclamation";
  if (type === "info") icon = "fa-circle-info";

  toast.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <i class="fa-solid ${icon}" style="font-size: 1.1rem; color: ${type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#7c3aed'};"></i>
      <span>${escapeHtml(message)}</span>
    </div>
    <button style="border:none; background:none; color:#94a3b8; cursor:pointer;" onclick="this.parentElement.remove()">
      <i class="fa-solid fa-xmark"></i>
    </button>
  `;

  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.4s ease";
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}

/* --------------------------------------------------------------------------
   Google Apps Script API Integration & Settings
   (เชื่อมต่อกับ Google Sheet เพื่อบันทึกและขยายแถวอัตโนมัติเมื่อแถวเต็ม)
   -------------------------------------------------------------------------- */

function openSettingsModal() {
  if (elements.apiUrlInput) {
    elements.apiUrlInput.value = state.apiUrl || "";
  }
  if (elements.settingsModal) {
    elements.settingsModal.classList.add("active");
  }
}
window.openSettingsModal = openSettingsModal;

function closeSettingsModal() {
  if (elements.settingsModal) {
    elements.settingsModal.classList.remove("active");
  }
}
window.closeSettingsModal = closeSettingsModal;

async function handleTestApiConnection() {
  const url = (elements.apiUrlInput ? elements.apiUrlInput.value : "").trim();
  if (!url) {
    showToast("กรุณากรอก Google Apps Script Web App URL ก่อนทดสอบ", "warning");
    return;
  }
  showToast("กำลังทดสอบการเชื่อมต่อ Google Apps Script...", "info");
  try {
    const res = await fetch(url + (url.includes("?") ? "&" : "?") + "action=getAllData");
    if (res.ok) {
      const data = await res.json();
      if (data && data.status === "success") {
        showToast("เชื่อมต่อสำเร็จ! สามารถบันทึกข้อมูลและขยายแถว Google Sheet อัตโนมัติได้", "success");
        return;
      }
    }
    showToast("เชื่อมต่อได้ แต่ไม่ได้รับข้อมูลที่ถูกต้อง กรุณาตรวจสอบสิทธิ์ของ Web App (ตั้งเป็น Anyone)", "warning");
  } catch (err) {
    showToast("ไม่สามารถเชื่อมต่อได้: " + err.message, "error");
  }
}

function handleSaveApiSettings() {
  const url = (elements.apiUrlInput ? elements.apiUrlInput.value : "").trim();
  state.apiUrl = url;
  localStorage.setItem(CONFIG.STORAGE_KEYS.API_URL, url);
  closeSettingsModal();
  showToast(url ? "บันทึกการตั้งค่าเชื่อมต่อ Google Sheet API เรียบร้อยแล้ว" : "ยกเลิกการตั้งค่า API", "success");
}

/**
 * Generic POST Request Helper for Google Apps Script Web App
 */
async function sendAppsScriptRequest(payload) {
  if (!state.apiUrl) return null;
  try {
    const res = await fetch(state.apiUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("Apps Script API notice:", err);
  }
  return null;
}

/**
 * 1. ซิงค์ทุนการศึกษา (บันทึกใหม่ หรือ แก้ไข) ไปยัง Google Sheet
 * Google Apps Script จะเรียก ensureSheetCapacity ตรวจสอบและเพิ่มแถวอัตโนมัติหากแถวเต็ม
 */
async function syncScholarshipToApi(record) {
  if (!state.apiUrl) return;
  const payload = {
    action: "addScholarship",
    password: CONFIG.PASSWORD,
    ...record
  };
  const result = await sendAppsScriptRequest(payload);
  if (result && result.status === "success") {
    showToast("บันทึกข้อมูลลง Google Sheet เรียบร้อยแล้ว (ตรวจสอบและขยายแถวอัตโนมัติ)", "success");
  }
}

/**
 * 2. ลบรายการทุนการศึกษาใน Google Sheet
 */
async function deleteScholarshipFromApi(id) {
  if (!state.apiUrl) return;
  const payload = {
    action: "deleteScholarship",
    id: id
  };
  await sendAppsScriptRequest(payload);
}

/**
 * 3. ซิงค์ข้อมูลนักเรียนรายบุคคลไปยัง Google Sheet
 */
async function syncStudentToApi(studentObj) {
  if (!state.apiUrl) return;
  const payload = {
    action: "saveStudent",
    ...studentObj
  };
  const result = await sendAppsScriptRequest(payload);
  if (result && result.status === "success") {
    showToast(`ซิงค์ข้อมูลนักเรียน ${studentObj.name} ไปยัง Google Sheet เรียบร้อยแล้ว`, "success");
  }
}

/**
 * 4. ลบข้อมูลนักเรียนใน Google Sheet
 */
async function deleteStudentFromApi(academicYear, studentCode, name) {
  if (!state.apiUrl) return;
  const payload = {
    action: "deleteStudent",
    academicYear,
    studentCode,
    name
  };
  await sendAppsScriptRequest(payload);
}

/**
 * 5. นำเข้าข้อมูลนักเรียนแบบกลุ่มจาก Excel ไปยัง Google Sheet (ขยายแถวอัตโนมัติ)
 */
async function syncBatchStudentsToApi(studentsList) {
  if (!state.apiUrl || !Array.isArray(studentsList) || studentsList.length === 0) return;
  const payload = {
    action: "importStudentsBatch",
    academicYear: state.selectedAcademicYear,
    students: studentsList
  };
  const result = await sendAppsScriptRequest(payload);
  if (result && result.status === "success") {
    showToast(`นำเข้าข้อมูลนักเรียน ${studentsList.length} คน สู่ Google Sheet สำเร็จ (ขยายแถวอัตโนมัติ)`, "success");
  }
}
