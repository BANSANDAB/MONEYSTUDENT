/**
 * ==============================================================================
 * ระบบทุนการศึกษา โรงเรียนบ้านสันดาบ
 * Google Apps Script Backend API (เวอร์ชันรองรับการจัดการข้อมูลนักเรียนรายปีการศึกษา)
 * เชื่อมต่อกับ Google Sheet ID: 1ABtqJTeh7AOBsk0RZJMKBhbUW_anBXV0tzdryFuousI
 * Google Drive Folder ID: 1cHaDYk8XORmfsgwSQo_3W1TAKRN0sKSj
 * ==============================================================================
 */

const SPREADSHEET_ID = "1ABtqJTeh7AOBsk0RZJMKBhbUW_anBXV0tzdryFuousI"; // ฐานข้อมูลหลัก (สำหรับบันทึกและจัดการข้อมูลทุนการศึกษา)
const STUDENTS_SPREADSHEET_ID = "1jqxY-MFf26KpYpYR2J6Lq0FBOp7HS-fe58sSWAOBnsA"; // ฐานข้อมูลนักเรียน (ดึงชื่อ-นามสกุล, ระดับชั้น ฯลฯ)
const FOLDER_ID = "1cHaDYk8XORmfsgwSQo_3W1TAKRN0sKSj";
const AUTH_PASSWORD = "thunsandab1234";

const SHEET_NAMES = {
  STUDENTS: "Students",
  TEACHERS: "Teachers",
  SCHOLARSHIPS: "Scholarships"
};

/**
 * ฟังก์ชันเปิดชีตนักเรียนจาก STUDENTS_SPREADSHEET_ID
 */
function getStudentSheet(fallbackSS) {
  try {
    const studentSS = SpreadsheetApp.openById(STUDENTS_SPREADSHEET_ID);
    return studentSS.getSheetByName(SHEET_NAMES.STUDENTS) || studentSS.getSheets()[0];
  } catch (err) {
    Logger.log("ไม่สามารถเปิด STUDENTS_SPREADSHEET_ID ได้ ใช้ชีตสำรอง: " + err);
    return fallbackSS ? fallbackSS.getSheetByName(SHEET_NAMES.STUDENTS) : null;
  }
}

/**
 * ฟังก์ชันสำหรับรับคำขอแบบ GET (อ่านข้อมูล)
 */
function doGet(e) {
  try {
    const action = e && e.parameter && e.parameter.action ? e.parameter.action : "getAllData";
    const academicYear = e && e.parameter && e.parameter.academicYear ? e.parameter.academicYear : null;
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    checkAndInitSheets(ss);

    const studentSheet = getStudentSheet(ss);
    let result = {};

    if (action === "getAllData") {
      result = {
        status: "success",
        students: getSheetData(studentSheet),
        teachers: getSheetData(ss.getSheetByName(SHEET_NAMES.TEACHERS)),
        scholarships: getSheetData(ss.getSheetByName(SHEET_NAMES.SCHOLARSHIPS)),
        sheetId: SPREADSHEET_ID,
        studentsSheetId: STUDENTS_SPREADSHEET_ID,
        folderId: FOLDER_ID
      };
    } else if (action === "getStudents") {
      let students = getSheetData(studentSheet);
      if (academicYear) {
        students = students.filter(s => s.academicYear === academicYear);
      }
      result = {
        status: "success",
        students: students
      };
    } else if (action === "getTeachers") {
      result = {
        status: "success",
        teachers: getSheetData(ss.getSheetByName(SHEET_NAMES.TEACHERS))
      };
    } else if (action === "getScholarships") {
      result = {
        status: "success",
        scholarships: getSheetData(ss.getSheetByName(SHEET_NAMES.SCHOLARSHIPS))
      };
    } else {
      result = { status: "error", message: "Action ไม่ถูกต้อง" };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * ฟังก์ชันสำหรับรับคำขอแบบ POST (บันทึกข้อมูล/ลบข้อมูล/นำเข้าข้อมูลนักเรียน)
 */
function doPost(e) {
  try {
    let data;
    if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      data = e.parameter;
    } else {
      throw new Error("ไม่พบข้อมูลที่ส่งมา");
    }

    // ตรวจสอบรหัสผ่านความปลอดภัย (ถ้ามีการระบุ)
    if (data.action === "addScholarship" && data.password !== AUTH_PASSWORD) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "รหัสผ่านไม่ถูกต้อง! กรุณากรอกรหัสผ่าน thunsandab1234"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    checkAndInitSheets(ss);

    const action = data.action || "addScholarship";

    // 1. บันทึกทุนการศึกษา (รองรับทั้งเพิ่มใหม่และแก้ไข)
    if (action === "addScholarship" || action === "saveScholarship") {
      const sheet = ss.getSheetByName(SHEET_NAMES.SCHOLARSHIPS);
      const targetId = data.id || ("SCH-" + Utilities.formatDate(new Date(), "Asia/Bangkok", "yyyyMMdd-HHmmss"));
      const recordDate = data.recordDate || Utilities.formatDate(new Date(), "Asia/Bangkok", "dd/MM/yyyy");
      const academicYear = data.academicYear || "2569";
      const grade = data.grade || "";
      const studentName = data.studentName || "";
      const amount = Number(data.amount) || 0;
      const organization = data.organization || "";
      const note = data.note || "";
      const timestamp = Utilities.formatDate(new Date(), "Asia/Bangkok", "dd/MM/yyyy HH:mm:ss");

      // ตรวจสอบโครงสร้างหัวตารางของชีตทุนการศึกษา (รองรับทั้ง 6 คอลัมน์ และ 9 คอลัมน์)
      const firstHeader = sheet.getRange(1, 1).getValue().toString().trim();
      const isSixColFormat = (firstHeader === "ปีการศึกษา");

      if (isSixColFormat) {
        // รูปแบบ 6 คอลัมน์ตามชีตจริง: ปีการศึกษา, วันเดือนปี, ชื่อ-นามสกุลนักเรียน, จำนวนเงิน, หน่วยงานที่มอบ, หมายเหตุ
        const values = sheet.getDataRange().getValues();
        let updated = false;
        for (let i = 1; i < values.length; i++) {
          if (values[i][0] == academicYear && values[i][2] == studentName) {
            sheet.getRange(i + 1, 1, 1, 6).setValues([[
              academicYear, recordDate, studentName, amount, organization, note
            ]]);
            updated = true;
            break;
          }
        }
        if (!updated) {
          safeAppendRow(sheet, [academicYear, recordDate, studentName, amount, organization, note]);
        }
      } else {
        // รูปแบบ 9 คอลัมน์: รหัส, วันที่บันทึก, ปีการศึกษา, ระดับชั้น, ชื่อ-นามสกุลนักเรียน, ยอดเงิน, หน่วยงาน, หมายเหตุ, วันเวลา
        const values = sheet.getDataRange().getValues();
        let updated = false;
        for (let i = 1; i < values.length; i++) {
          if (values[i][0] == targetId) {
            sheet.getRange(i + 1, 1, 1, 9).setValues([[
              targetId, recordDate, academicYear, grade, studentName, amount, organization, note, timestamp
            ]]);
            updated = true;
            break;
          }
        }
        if (!updated) {
          safeAppendRow(sheet, [
            targetId, recordDate, academicYear, grade, studentName, amount, organization, note, timestamp
          ]);
        }
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: updated ? "อัปเดตข้อมูลทุนการศึกษาสำเร็จเรียบร้อยแล้ว" : "บันทึกทุนการศึกษาสำเร็จเรียบร้อยแล้ว",
        record: {
          id: targetId,
          recordDate,
          academicYear,
          grade,
          studentName,
          amount,
          organization,
          note,
          timestamp
        }
      })).setMimeType(ContentService.MimeType.JSON);

    } else if (action === "deleteScholarship") {
      const sheet = ss.getSheetByName(SHEET_NAMES.SCHOLARSHIPS);
      const targetId = data.id;
      const values = sheet.getDataRange().getValues();
      let found = false;

      for (let i = 1; i < values.length; i++) {
        if (values[i][0] == targetId) {
          sheet.deleteRow(i + 1);
          found = true;
          break;
        }
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: found ? "success" : "error",
        message: found ? "ลบรายการเรียบร้อยแล้ว" : "ไม่พบรายการที่ต้องการลบ"
      })).setMimeType(ContentService.MimeType.JSON);

    // 2. จัดการข้อมูลนักเรียน (เพิ่มรายบุคคล - บันทึกลงฐานข้อมูลนักเรียน)
    } else if (action === "saveStudent") {
      const sheet = getStudentSheet(ss);
      const academicYear = data.academicYear || "2569";
      const grade = data.grade || "";
      const citizenId = data.citizenId || "";
      const studentCode = data.studentCode || "";
      const name = data.name || "";
      const gender = data.gender || "ชาย";
      const birthDate = data.birthDate || "";
      const status = data.status || "เรียนอยู่";

      // ตรวจสอบว่าเป็นการแก้ไขรายการเดิมหรือไม่ (เช็คจาก studentCode + academicYear)
      const values = sheet.getDataRange().getValues();
      let updated = false;

      for (let i = 1; i < values.length; i++) {
        if (values[i][0] == academicYear && (values[i][3] == studentCode || values[i][4] == name)) {
          sheet.getRange(i + 1, 1, 1, 8).setValues([[
            academicYear, grade, citizenId, studentCode, name, gender, birthDate, status
          ]]);
          updated = true;
          break;
        }
      }

      if (!updated) {
        safeAppendRow(sheet, [
          academicYear, grade, citizenId, studentCode, name, gender, birthDate, status
        ]);
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: updated ? "อัปเดตข้อมูลนักเรียนเรียบร้อยแล้ว" : "เพิ่มข้อมูลนักเรียนเรียบร้อยแล้ว"
      })).setMimeType(ContentService.MimeType.JSON);

    // 3. นำเข้าข้อมูลนักเรียนแบบกลุ่มจาก Excel
    } else if (action === "importStudentsBatch") {
      const sheet = getStudentSheet(ss);
      const academicYear = data.academicYear || "2569";
      const studentsList = data.students || [];

      if (!Array.isArray(studentsList) || studentsList.length === 0) {
        return ContentService.createTextOutput(JSON.stringify({
          status: "error",
          message: "ไม่มีข้อมูลนักเรียนที่จะนำเข้า"
        })).setMimeType(ContentService.MimeType.JSON);
      }

      const rowsToInsert = studentsList.map(s => [
        academicYear,
        s.grade || "",
        s.citizenId || "",
        s.studentCode || "",
        s.name || "",
        s.gender || "",
        s.birthDate || "",
        s.status || "เรียนอยู่"
      ]);

      safeBatchAppendRows(sheet, rowsToInsert);

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: `นำเข้าข้อมูลนักเรียนจำนวน ${studentsList.length} คน เรียบร้อยแล้ว`
      })).setMimeType(ContentService.MimeType.JSON);

    // 4. ลบข้อมูลนักเรียน
    } else if (action === "deleteStudent") {
      const sheet = getStudentSheet(ss);
      const academicYear = data.academicYear;
      const studentCode = data.studentCode;
      const name = data.name;
      const values = sheet.getDataRange().getValues();
      let found = false;

      for (let i = 1; i < values.length; i++) {
        if (values[i][0] == academicYear && (values[i][3] == studentCode || values[i][4] == name)) {
          sheet.deleteRow(i + 1);
          found = true;
          break;
        }
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: found ? "success" : "error",
        message: found ? "ลบข้อมูลนักเรียนเรียบร้อยแล้ว" : "ไม่พบข้อมูลนักเรียน"
      })).setMimeType(ContentService.MimeType.JSON);

    } else {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "ไม่รองรับคำสั่งนี้"
      })).setMimeType(ContentService.MimeType.JSON);
    }

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * ฟังก์ชันอ่านข้อมูลจากชีตแปลงเป็น Array of Objects
 */
function getSheetData(sheet) {
  if (!sheet) return [];
  const range = sheet.getDataRange();
  const values = range.getValues();
  if (values.length <= 1) return [];

  const headers = values[0];
  const rows = values.slice(1);

  return rows.map(row => {
    const obj = {};
    headers.forEach((header, i) => {
      let key = header.toString().trim();
      // map standard keys
      if (key === "ปีการศึกษา") key = "academicYear";
      else if (key === "ระดับชั้น" || key === "ชั้น") key = "grade";
      else if (key === "เลขบัตรประชาชน" || key === "เลขประจำตัวประชาชน") key = "citizenId";
      else if (key === "รหัสประจำตัว" || key === "รหัสประจำตัวนักเรียน" || key === "รหัสนักเรียน" || key === "ID") key = "studentCode";
      else if (key === "ชื่อ-นามสกุล" || key === "ชื่อ-นามสกุลนักเรียน" || key === "ชื่อ") key = "name";
      else if (key === "เพศ") key = "gender";
      else if (key === "วันเกิด") key = "birthDate";
      else if (key === "สถานะ") key = "status";
      else if (key === "วันที่" || key === "วันที่บันทึก" || key === "วันเดือนปี" || key === "วัน/เดือน/ปี") key = "recordDate";
      else if (key === "ยอดเงิน" || key === "จำนวนเงิน" || key === "ยอดเงิน (บาท)") key = "amount";
      else if (key === "หน่วยงาน" || key === "หน่วยงานที่มอบ" || key === "แหล่งทุน") key = "organization";
      else if (key === "หมายเหตุ") key = "note";
      else if (key === "วันเวลาบันทึก" || key === "Timestamp") key = "timestamp";
      else if (key === "ตำแหน่ง") key = "position";
      else if (key === "กลุ่มสาระ" || key === "หมวดวิชา") key = "department";
      else if (key === "เบอร์โทร" || key === "เบอร์โทรศัพท์") key = "phone";
      
      let val = row[i];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, "Asia/Bangkok", "yyyy-MM-dd");
      }
      obj[key] = val;
    });
    return obj;
  });
}

/**
 * ตรวจสอบและสร้างชีตพร้อม Header หากยังไม่มี
 */
function checkAndInitSheets(ss) {
  // 1. Sheet Scholarships
  let scholarshipSheet = ss.getSheetByName(SHEET_NAMES.SCHOLARSHIPS);
  if (!scholarshipSheet) {
    scholarshipSheet = ss.insertSheet(SHEET_NAMES.SCHOLARSHIPS);
    scholarshipSheet.appendRow([
      "รหัส", "วันที่บันทึก", "ปีการศึกษา", "ระดับชั้น", "ชื่อ-นามสกุลนักเรียน", "ยอดเงิน (บาท)", "หน่วยงาน", "หมายเหตุ", "วันเวลาบันทึก"
    ]);
    scholarshipSheet.getRange(1, 1, 1, 9).setFontWeight("bold").setBackground("#c82333").setFontColor("#ffffff");
  }
  ensureSheetCapacity(scholarshipSheet, 10, 100);

  // 2. Sheet Students (โครงสร้างตามภาพแนบ: ปีการศึกษา, ระดับชั้น, เลขบัตรประชาชน, รหัสประจำตัว, ชื่อ-นามสกุล, เพศ, วันเกิด, สถานะ)
  let studentSheet = ss.getSheetByName(SHEET_NAMES.STUDENTS);
  if (!studentSheet) {
    studentSheet = ss.insertSheet(SHEET_NAMES.STUDENTS);
    studentSheet.appendRow([
      "ปีการศึกษา", "ระดับชั้น", "เลขบัตรประชาชน", "รหัสประจำตัว", "ชื่อ-นามสกุล", "เพศ", "วันเกิด", "สถานะ"
    ]);
    studentSheet.getRange(1, 1, 1, 8).setFontWeight("bold").setBackground("#b71c1c").setFontColor("#ffffff");

    // ใส่ตัวอย่างนักเรียนปี 2569 ตามภาพแนบ
    const sampleStudents2569 = [
      ["2569", "อ.1", "1749901802476", "1600", "เด็กชายวัชระพงษ์ บุญธัญกรณ์", "ชาย", "13/11/2565", "เรียนอยู่"],
      ["2569", "อ.1", "1749901810045", "1601", "เด็กหญิงนิดา ฉ่ำวารี", "หญิง", "24/03/2566", "เรียนอยู่"],
      ["2569", "อ.1", "74991845106", "1602", "เด็กชายเวยานเฮิน -", "ชาย", "3/8/2565", "เรียนอยู่"],
      ["2569", "อ.1", "74991857040", "1603", "เด็กชายโฟปีก -", "ชาย", "10/12/2565", "เรียนอยู่"],
      ["2569", "อ.1", "1749901793809", "1604", "เด็กหญิงพัชรพร เอี้ยะเจริญ", "หญิง", "18/07/2565", "เรียนอยู่"],
      ["2569", "อ.1", "1749901795453", "1605", "เด็กชายธัญวิทสิษฐ์ โพธิ์รักษา", "ชาย", "9/8/2565", "เรียนอยู่"],
      ["2569", "อ.2", "1749901755112", "1550", "เด็กชายกรวิชญ์ สดใส", "ชาย", "12/04/2564", "เรียนอยู่"],
      ["2569", "อ.2", "1749901755120", "1551", "เด็กหญิงกัญญาพร ชูใจ", "หญิง", "18/06/2564", "เรียนอยู่"],
      ["2569", "ป.1", "1749901611001", "1501", "เด็กชายธนภัทร แสนสุข", "ชาย", "05/01/2563", "เรียนอยู่"],
      ["2569", "ป.1", "1749901611002", "1502", "เด็กหญิงปภาวดี มั่งมี", "หญิง", "14/02/2563", "เรียนอยู่"],
      ["2569", "ป.3", "1749901411005", "1405", "เด็กชายวรเมธ คงกระพัน", "ชาย", "19/09/2561", "เรียนอยู่"],
      ["2569", "ม.1", "1749901211010", "1310", "เด็กชายปัณณธร ชัยชนะ", "ชาย", "22/11/2558", "เรียนอยู่"],
      ["2569", "ม.3", "1749901011025", "1225", "เด็กหญิงอารียา สมบูรณ์ทรัพย์", "หญิง", "08/07/2556", "เรียนอยู่"]
    ];
    sampleStudents2569.forEach(row => studentSheet.appendRow(row));

    // ตัวอย่างนักเรียนปี 2570 (เลื่อนชั้นขึ้นมา ข้อมูลเปลี่ยนใหม่ตามที่ผู้ใช้กำหนด)
    const sampleStudents2570 = [
      ["2570", "อ.1", "1749901900111", "1650", "เด็กชายณภัทร รุ่งเรือง", "ชาย", "15/02/2566", "เรียนอยู่"],
      ["2570", "อ.1", "1749901900122", "1651", "เด็กหญิงกุลนัดดา รัตนกูล", "หญิง", "28/05/2566", "เรียนอยู่"],
      ["2570", "อ.2", "1749901802476", "1600", "เด็กชายวัชระพงษ์ บุญธัญกรณ์", "ชาย", "13/11/2565", "เรียนอยู่"],
      ["2570", "อ.2", "1749901810045", "1601", "เด็กหญิงนิดา ฉ่ำวารี", "หญิง", "24/03/2566", "เรียนอยู่"],
      ["2570", "ป.2", "1749901611001", "1501", "เด็กชายธนภัทร แสนสุข", "ชาย", "05/01/2563", "เรียนอยู่"],
      ["2570", "ป.2", "1749901611002", "1502", "เด็กหญิงปภาวดี มั่งมี", "หญิง", "14/02/2563", "เรียนอยู่"]
    ];
    sampleStudents2570.forEach(row => studentSheet.appendRow(row));
  }
  ensureSheetCapacity(studentSheet, 30, 100);

  // 3. Sheet Teachers
  let teacherSheet = ss.getSheetByName(SHEET_NAMES.TEACHERS);
  if (!teacherSheet) {
    teacherSheet = ss.insertSheet(SHEET_NAMES.TEACHERS);
    teacherSheet.appendRow(["รหัสครู", "ชื่อ-นามสกุล", "ตำแหน่ง", "กลุ่มสาระ", "เบอร์โทรศัพท์"]);
    teacherSheet.getRange(1, 1, 1, 5).setFontWeight("bold").setBackground("#2a9d8f").setFontColor("#ffffff");

    const sampleTeachers = [
      ["TCH-001", "นายสมชาย ใจดี", "ผู้อำนวยการโรงเรียน", "บริหารสถานศึกษา", "081-234-5678"],
      ["TCH-002", "นางวิไลลักษณ์ สันติธรรม", "ครูชำนาญการพิเศษ", "หัวหน้างานแนะแนว/ทุนการศึกษา", "089-876-5432"],
      ["TCH-003", "นางสาวสุพัตรา บุญเลิศ", "ครู", "ภาษาไทย", "082-111-2233"],
      ["TCH-004", "นายเกียรติศักดิ์ ศรีวิไล", "ครู", "คณิตศาสตร์", "084-222-3344"],
      ["TCH-005", "นางดวงใจ มงคลสุข", "ครูชำนาญการ", "วิทยาศาสตร์และเทคโนโลยี", "085-333-4455"],
      ["TCH-006", "นายธนวัฒน์ ประเสริฐสุข", "ครูผู้ช่วย", "สังคมศึกษา ศาสนา และวัฒนธรรม", "086-444-5566"]
    ];
    sampleTeachers.forEach(row => teacherSheet.appendRow(row));
  }
  ensureSheetCapacity(teacherSheet, 15, 100);
}

/**
 * ==============================================================================
 * ฟังก์ชันตรวจสอบความจุแถวใน Google Sheet (Auto Expand Rows When Full)
 * ถ้าแถวเต็มหรือเหลือน้อย ให้เพิ่มแถวให้อัตโนมัติ เพื่อให้สามารถบันทึกข้อมูลได้ตลอดเวลา
 * ==============================================================================
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - ชีตที่ต้องการตรวจสอบ
 * @param {number} [requiredRows=1] - จำนวนแถวที่ต้องการบันทึกเพิ่ม
 * @param {number} [bufferToAdd=100] - จำนวนแถวที่จะขยายเพิ่มไว้ล่วงหน้า (ค่าเริ่มต้น 100 แถว)
 * @returns {number} จำนวนแถวที่ขยายเพิ่ม (0 หากไม่ต้องขยาย)
 */
function ensureSheetCapacity(sheet, requiredRows, bufferToAdd) {
  if (!sheet) return 0;
  try {
    const needed = Math.max(1, Number(requiredRows) || 1);
    const buffer = Math.max(50, Number(bufferToAdd) || 100);
    const lastRow = sheet.getLastRow();
    const maxRows = sheet.getMaxRows();

    // คำนวณจำนวนแถวว่างที่เหลืออยู่ในชีต
    const availableRows = maxRows - lastRow;

    // ถ้าแถวว่างเหลือน้อยกว่าจำนวนที่ต้องการ + เผื่อ 5 แถว หรือแถวเต็มแล้ว
    if (availableRows <= needed + 5 || lastRow + needed >= maxRows) {
      const rowsToAdd = Math.max(buffer, needed + 50);
      sheet.insertRowsAfter(maxRows, rowsToAdd);
      SpreadsheetApp.flush(); // บังคับให้ Google Sheet บันทึกแถวใหม่ทันที
      Logger.log(`[Auto-Expand] ชีต "${sheet.getName()}": ขยายเพิ่ม ${rowsToAdd} แถว (เดิม ${maxRows} แถว -> เป็น ${sheet.getMaxRows()} แถว)`);
      return rowsToAdd;
    }
    return 0;
  } catch (err) {
    Logger.log("ensureSheetCapacity notice: " + err.toString());
    // กรณีฉุกเฉิน หาก insertRowsAfter มีปัญหา ให้ลอง insertRows
    try {
      sheet.insertRows(sheet.getMaxRows(), 100);
      SpreadsheetApp.flush();
      return 100;
    } catch (e2) {
      Logger.log("Fallback insertRows error: " + e2.toString());
    }
    return 0;
  }
}

/**
 * ฟังก์ชันบันทึกข้อมูลต่อท้าย 1 แถวอย่างปลอดภัย (Safe Append Row with Auto Capacity)
 * ถ้าแถวเต็มจะเพิ่มแถวให้อัตโนมัติทันทีก่อนบันทึกเสมอ ป้องกันข้อผิดพลาดแถวเต็ม 100%
 */
function safeAppendRow(sheet, rowData) {
  if (!sheet || !rowData) return;
  // ตรวจสอบความจุแถวก่อนบันทึกเสมอ
  ensureSheetCapacity(sheet, 1, 100);
  try {
    sheet.appendRow(rowData);
  } catch (err) {
    // หาก appendRow ล้มเหลวจากขอบเขตแถว ให้บังคับขยาย 100 แถวแล้วบันทึกผ่าน Range โดยตรง
    ensureSheetCapacity(sheet, 10, 100);
    const nextRow = sheet.getLastRow() + 1;
    sheet.getRange(nextRow, 1, 1, rowData.length).setValues([rowData]);
    SpreadsheetApp.flush();
  }
}

/**
 * ฟังก์ชันบันทึกข้อมูลแบบกลุ่มอย่างปลอดภัย (Safe Batch Append Rows with Auto Capacity)
 * ใช้สำหรับการนำเข้าข้อมูลนักเรียนจาก Excel จำนวนมากในครั้งเดียว
 */
function safeBatchAppendRows(sheet, rowsList) {
  if (!sheet || !Array.isArray(rowsList) || rowsList.length === 0) return;
  
  // ขยายแถวล่วงหน้าให้รองรับจำนวนข้อมูลทั้งหมด + เผื่อสำรอง 100 แถว
  ensureSheetCapacity(sheet, rowsList.length, 100);
  
  const startRow = sheet.getLastRow() + 1;
  const numRows = rowsList.length;
  const numCols = rowsList[0].length;
  
  sheet.getRange(startRow, 1, numRows, numCols).setValues(rowsList);
  SpreadsheetApp.flush();
}

/**
 * ==============================================================================
 * Triggers & Menus สำหรับ Google Sheets
 * ทำงานเมื่อผู้ใช้เปิดหรือพิมพ์ข้อมูลใน Google Sheet โดยตรง
 * ==============================================================================
 */

/**
 * Simple Trigger: onOpen
 * ทำงานอัตโนมัติเมื่อเปิดไฟล์ Google Sheet
 * - เพิ่มเมนูอำนวยความสะดวกบนแถบเครื่องมือ
 * - ตรวจสอบความจุแถวของทุกชีตอัตโนมัติ
 */
function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu("⚡ ระบบทุนการศึกษา")
      .addItem("➕ ตรวจสอบและขยายแถว (ชีตปัจจุบัน 100 แถว)", "manualExpandCurrentSheet")
      .addItem("🔄 ตรวจสอบและขยายแถวทุกชีตพร้อมใช้งาน", "autoExpandAllSheets")
      .addSeparator()
      .addItem("📊 ตรวจสอบสถานะความจุของชีต", "checkSheetStatus")
      .addToUi();
  } catch (e) {
    // Ignore when running outside spreadsheet context
  }

  // ตรวจสอบล่วงหน้า หากชีตใดเหลือน้อยกว่า 20 แถว ให้ขยายทันที
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID);
    ss.getSheets().forEach(sheet => {
      ensureSheetCapacity(sheet, 20, 100);
    });
  } catch (err) {
    Logger.log("onOpen capacity check notice: " + err.toString());
  }
}

/**
 * Simple Trigger: onEdit
 * ทำงานอัตโนมัติทันทีที่มีการพิมพ์หรือแก้ไขข้อมูลใน Google Sheet โดยตรง
 * หากพิมพ์จนใกล้ถึงแถวสุดท้าย (เหลือว่างน้อยกว่า 5 แถว) ระบบจะเพิ่มแถวต่อท้ายให้อัตโนมัติ 100 แถวทันที
 */
function onEdit(e) {
  try {
    if (!e || !e.range) return;
    const sheet = e.range.getSheet();
    const editedRow = e.range.getRow();
    const maxRows = sheet.getMaxRows();

    // หากตำแหน่งแถวที่กำลังพิมพ์อยู่ ใกล้ถึงขอบล่างสุดของชีต
    if (editedRow >= maxRows - 5 || sheet.getLastRow() >= maxRows - 5) {
      ensureSheetCapacity(sheet, 5, 100);
    }
  } catch (err) {
    // Ignore trigger error
  }
}

/**
 * ขยายแถวชีตปัจจุบันที่กำลังเปิดดูอยู่ (100 แถว)
 */
function manualExpandCurrentSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return;
  const sheet = ss.getActiveSheet();
  const added = ensureSheetCapacity(sheet, 50, 100) || 100;
  if (added === 0) {
    sheet.insertRowsAfter(sheet.getMaxRows(), 100);
  }
  SpreadsheetApp.flush();
  ss.toast(`เพิ่มแถวในชีต "${sheet.getName()}" เรียบร้อยแล้ว (รวม ${sheet.getMaxRows()} แถว)`, "สำเร็จ", 5);
}

/**
 * ตรวจสอบและขยายแถวทุกชีตพร้อมใช้งานล่วงหน้า (สามารถกด Run ใน Apps Script ได้)
 */
function autoExpandAllSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheets = ss.getSheets();
  let msg = [];
  sheets.forEach(sheet => {
    ensureSheetCapacity(sheet, 50, 100);
    msg.push(`${sheet.getName()}: ${sheet.getMaxRows()} แถว (ใช้งาน ${sheet.getLastRow()} แถว)`);
  });
  Logger.log("Auto-expand summary: " + msg.join(", "));
  try {
    ss.toast("ขยายแถวทุกชีตพร้อมใช้งานเรียบร้อยแล้ว", "สำเร็จ", 5);
  } catch (e) {}
}

/**
 * ตรวจสอบและรายงานสถานะความจุของทุกชีต
 */
function checkSheetStatus() {
  const ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheets = ss.getSheets();
  let report = "📊 รายงานสถานะความจุของชีตในระบบ:\n\n";

  sheets.forEach(sheet => {
    const lastRow = sheet.getLastRow();
    const maxRows = sheet.getMaxRows();
    const available = maxRows - lastRow;
    report += `• ${sheet.getName()}:\n`;
    report += `   - ใช้งานแล้ว: ${lastRow} แถว\n`;
    report += `   - แถวทั้งหมด: ${maxRows} แถว\n`;
    report += `   - ที่ว่างคงเหลือ: ${available} แถว\n\n`;
  });

  report += "✅ ระบบเปิดใช้งาน Auto-Expand เพิ่มแถวอัตโนมัติเมื่อแถวเต็มแล้ว พร้อมบันทึกข้อมูลตลอดเวลา";

  try {
    SpreadsheetApp.getUi().alert("สถานะความจุ Google Sheet", report, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {
    Logger.log(report);
  }
}

