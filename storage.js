const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

// Initialize auth
const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : '',
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
  ],
});

const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);

async function saveReport(report) {
    try {
        // Loads document properties and worksheets
        await doc.loadInfo(); 
        const sheet = doc.sheetsByIndex[0]; 
        
        // Auto-generate timestamp
        report.tanggal = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
        
        // Ensure headers exactly match our keys, overwriting any "Column 1" defaults from Google Tables
        await sheet.setHeaderRow(['Tanggal', 'Nama', 'Unit', 'Tipe', 'Kategori', 'Detail']);

        // Insert into the first sheet
        // Note: Make sure the Google Sheet has headers that match these EXACT keys
        await sheet.addRow({
            Tanggal: report.tanggal,
            Nama: report.nama,
            Unit: report.unit,
            Tipe: report.type,
            Kategori: report.category,
            Detail: report.detail
        });
        
        console.log("Report saved successfully to Google Sheets.");
    } catch (err) {
        console.error("Error saving report to Google Sheets. Check your credentials and Sheet ID.", err.message);
    }
}

module.exports = { saveReport };
