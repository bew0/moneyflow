/**
 * Google Apps Script — MoneyFlow Expense Tracker
 * 
 * วิธีใช้:
 * 1. สร้าง Google Sheet ใหม่
 * 2. ไปที่ Extensions > Apps Script
 * 3. ลบโค้ดเดิมทั้งหมด แล้ววางโค้ดนี้ลงไป
 * 4. กด Deploy > New deployment
 *    - Type: Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Copy URL ที่ได้ไปวางในหน้าเว็บ Settings
 */

const SHEET_NAME = 'Transactions';

/* ═══════════ Design Colors ═══════════ */
const COLORS = {
    headerBg: '#1e1b4b',        // Deep indigo
    headerText: '#e0e7ff',       // Light indigo
    incomeBg: '#dcfce7',         // Light green
    incomeText: '#166534',       // Dark green
    expenseBg: '#fee2e2',        // Light red
    expenseText: '#991b1b',      // Dark red
    evenRow: '#f8fafc',          // Slate 50
    oddRow: '#ffffff',           // White
    borderColor: '#e2e8f0',     // Slate 200
    amountIncome: '#16a34a',    // Green 600
    amountExpense: '#dc2626',   // Red 600
    summaryBg: '#eef2ff',       // Indigo 50
    summaryText: '#3730a3',     // Indigo 800
};

function getOrCreateSheet() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
        sheet = ss.insertSheet(SHEET_NAME);
        sheet.appendRow(['id', 'type', 'category', 'amount', 'date', 'note', 'createdAt']);
        formatSheet(sheet);
    }
    return sheet;
}

/* ═══════════ Sheet Formatting ═══════════ */
function formatSheet(sheet) {
    const lastCol = 7;

    // --- Column Widths ---
    sheet.setColumnWidth(1, 140);  // id
    sheet.setColumnWidth(2, 100);  // type
    sheet.setColumnWidth(3, 140);  // category
    sheet.setColumnWidth(4, 140);  // amount
    sheet.setColumnWidth(5, 130);  // date
    sheet.setColumnWidth(6, 220);  // note
    sheet.setColumnWidth(7, 180);  // createdAt

    // --- Header Row ---
    const headerRange = sheet.getRange(1, 1, 1, lastCol);
    headerRange.setValues([['🆔 ID', '📋 ประเภท', '🏷️ หมวดหมู่', '💰 จำนวนเงิน', '📅 วันที่', '📝 หมายเหตุ', '🕐 สร้างเมื่อ']]);
    headerRange.setBackground(COLORS.headerBg);
    headerRange.setFontColor(COLORS.headerText);
    headerRange.setFontWeight('bold');
    headerRange.setFontSize(11);
    headerRange.setHorizontalAlignment('center');
    headerRange.setVerticalAlignment('middle');
    headerRange.setWrap(false);
    sheet.setRowHeight(1, 40);
    sheet.setFrozenRows(1);

    // --- Border on header ---
    headerRange.setBorder(true, true, true, true, true, true, COLORS.borderColor, SpreadsheetApp.BorderStyle.SOLID);
}

function formatDataRows(sheet) {
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return;

    const dataRange = sheet.getRange(2, 1, lastRow - 1, 7);
    const values = dataRange.getValues();

    // --- Base formatting ---  
    dataRange.setFontSize(10);
    dataRange.setVerticalAlignment('middle');
    dataRange.setWrap(false);
    dataRange.setBorder(true, true, true, true, true, true, COLORS.borderColor, SpreadsheetApp.BorderStyle.SOLID);

    // --- Format each row ---
    for (let i = 0; i < values.length; i++) {
        const row = sheet.getRange(i + 2, 1, 1, 7);
        const type = values[i][1];
        const isIncome = type === 'income';

        // Alternating row colors
        const bgColor = i % 2 === 0 ? COLORS.evenRow : COLORS.oddRow;
        row.setBackground(bgColor);
        sheet.setRowHeight(i + 2, 32);

        // Type cell — colored badge style
        const typeCell = sheet.getRange(i + 2, 2);
        typeCell.setValue(isIncome ? '✅ รายรับ' : '🔴 รายจ่าย');
        typeCell.setBackground(isIncome ? COLORS.incomeBg : COLORS.expenseBg);
        typeCell.setFontColor(isIncome ? COLORS.incomeText : COLORS.expenseText);
        typeCell.setFontWeight('bold');
        typeCell.setHorizontalAlignment('center');

        // Amount cell — colored + formatted
        const amountCell = sheet.getRange(i + 2, 4);
        const amount = values[i][3];
        amountCell.setNumberFormat('#,##0.00');
        amountCell.setFontColor(isIncome ? COLORS.amountIncome : COLORS.amountExpense);
        amountCell.setFontWeight('bold');
        amountCell.setHorizontalAlignment('right');

        // Category cell
        const catCell = sheet.getRange(i + 2, 3);
        catCell.setHorizontalAlignment('center');

        // Date cell
        const dateCell = sheet.getRange(i + 2, 5);
        dateCell.setHorizontalAlignment('center');
        dateCell.setNumberFormat('dd/mm/yyyy');

        // ID cell — smaller, muted
        const idCell = sheet.getRange(i + 2, 1);
        idCell.setFontColor('#94a3b8');
        idCell.setFontSize(9);

        // CreatedAt cell
        const createdCell = sheet.getRange(i + 2, 7);
        createdCell.setFontColor('#94a3b8');
        createdCell.setFontSize(9);
        createdCell.setHorizontalAlignment('center');
    }

    // --- Summary Row ---
    const summaryRow = lastRow + 1;
    const summaryRange = sheet.getRange(summaryRow, 1, 1, 7);
    summaryRange.setBackground(COLORS.summaryBg);
    summaryRange.setFontColor(COLORS.summaryText);
    summaryRange.setFontWeight('bold');
    summaryRange.setFontSize(11);
    sheet.setRowHeight(summaryRow, 36);

    sheet.getRange(summaryRow, 3).setValue('📊 รวมทั้งหมด');
    sheet.getRange(summaryRow, 3).setHorizontalAlignment('right');

    // Sum formula for amount
    sheet.getRange(summaryRow, 4).setFormula(`=SUMPRODUCT((B2:B${lastRow}="income")*1, D2:D${lastRow}) - SUMPRODUCT((B2:B${lastRow}<>"income")*1, D2:D${lastRow})`);
    sheet.getRange(summaryRow, 4).setNumberFormat('#,##0.00" ฿"');
    sheet.getRange(summaryRow, 4).setHorizontalAlignment('right');

    sheet.getRange(summaryRow, 5).setValue(`${values.length} รายการ`);
    sheet.getRange(summaryRow, 5).setHorizontalAlignment('center');

    // Top border on summary
    summaryRange.setBorder(true, true, true, true, null, null, COLORS.headerBg, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
}

/* ═══════════ API Handlers ═══════════ */
function doGet(e) {
    try {
        const sheet = getOrCreateSheet();
        const data = sheet.getDataRange().getValues();
        const headers = ['id', 'type', 'category', 'amount', 'date', 'note', 'createdAt'];
        const rows = [];
        for (let i = 1; i < data.length; i++) {
            // Skip summary row (check if first cell is empty or not an ID)
            if (!data[i][0] || String(data[i][0]).startsWith('📊')) continue;
            const obj = {};
            headers.forEach((h, idx) => {
                obj[h] = data[i][idx];
                // Clean up type display back to raw value
                if (h === 'type') {
                    const val = String(data[i][idx]);
                    obj[h] = val.includes('รายรับ') ? 'income' : val.includes('รายจ่าย') ? 'expense' : val;
                }
            });
            obj.amount = Number(obj.amount);
            rows.push(obj);
        }
        return ContentService.createTextOutput(JSON.stringify({ success: true, data: rows }))
            .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

function doPost(e) {
    try {
        const body = JSON.parse(e.postData.contents);
        const action = body.action;
        const sheet = getOrCreateSheet();

        if (action === 'add') {
            const tx = body.transaction;
            // Remove summary row if exists
            removeSummaryRow(sheet);
            sheet.appendRow([tx.id, tx.type, tx.category, tx.amount, tx.date, tx.note || '', new Date().toISOString()]);
            formatDataRows(sheet);
            return jsonResponse({ success: true, message: 'Added' });
        }

        if (action === 'delete') {
            const id = body.id;
            removeSummaryRow(sheet);
            const data = sheet.getDataRange().getValues();
            for (let i = 1; i < data.length; i++) {
                if (data[i][0] === id) {
                    sheet.deleteRow(i + 1);
                    break;
                }
            }
            formatDataRows(sheet);
            return jsonResponse({ success: true, message: 'Deleted' });
        }

        if (action === 'sync') {
            const txList = body.transactions || [];
            // Clear all data rows + summary
            const lastRow = sheet.getLastRow();
            if (lastRow > 1) {
                sheet.getRange(2, 1, lastRow - 1, 7).clearContent();
                sheet.getRange(2, 1, lastRow - 1, 7).clearFormat();
                if (lastRow > 2) {
                    try { sheet.deleteRows(2, lastRow - 1); } catch (e) { }
                }
            }
            txList.forEach(tx => {
                sheet.appendRow([tx.id, tx.type, tx.category, tx.amount, tx.date, tx.note || '', tx.createdAt || new Date().toISOString()]);
            });
            // Re-format header (in case it was cleared)
            formatSheet(sheet);
            if (txList.length > 0) formatDataRows(sheet);
            return jsonResponse({ success: true, message: 'Synced ' + txList.length + ' items' });
        }

        return jsonResponse({ success: false, error: 'Unknown action' });
    } catch (err) {
        return jsonResponse({ success: false, error: err.message });
    }
}

function removeSummaryRow(sheet) {
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return;
    const val = sheet.getRange(lastRow, 3).getValue();
    if (String(val).includes('📊') || String(val).includes('รวม')) {
        sheet.deleteRow(lastRow);
    }
}

function jsonResponse(obj) {
    return ContentService.createTextOutput(JSON.stringify(obj))
        .setMimeType(ContentService.MimeType.JSON);
}

/* ═══════════ Manual Format Trigger ═══════════ */
// Run this function manually to format existing data
function reformatSheet() {
    const sheet = getOrCreateSheet();
    removeSummaryRow(sheet);
    formatSheet(sheet);
    formatDataRows(sheet);
}
