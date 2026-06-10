const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcodeTerminal = require('qrcode-terminal'); // Still useful for local testing
const qrcode = require('qrcode'); // To generate Web QR
const { handleMessage } = require('./flow');

// 1. Set up the Express Web Dashboard
const app = express();
const port = process.env.PORT || 3000;

let qrImage = null;
let clientStatus = 'Initializing...';

// The main page that the client will see to check status or scan QR
app.get('/', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>WhatsApp Bot Dashboard</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; margin-top: 50px; background-color: #f0f2f5; }
                    .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                    h1 { color: #128C7E; }
                    .status { font-size: 22px; font-weight: bold; margin-bottom: 20px; color: #333; }
                    .qr-container { margin: 20px auto; padding: 20px; border: 2px dashed #128C7E; display: inline-block; border-radius: 10px; background: #fff; }
                    .qr-container p { font-size: 18px; color: #555; }
                    .success { color: #25D366; }
                    .error { color: #d9534f; }
                    .instructions { text-align: left; margin-top: 30px; padding: 20px; background: #e9f5f4; border-radius: 8px; border-left: 5px solid #128C7E; }
                    .instructions h3 { margin-top: 0; color: #128C7E; }
                    .instructions ol { padding-left: 20px; line-height: 1.6; color: #444; font-size: 16px; }
                </style>
                <meta http-equiv="refresh" content="5">
            </head>
            <body>
                <div class="container">
                    <h1>Pengaduan Management Bot</h1>
                    <div class="status">Status: 
                        <span class="${clientStatus === 'Connected' ? 'success' : 'error'}">${clientStatus}</span>
                    </div>
                    ${qrImage ? `<div class="qr-container"><p>Please scan this QR code using your WhatsApp Linked Devices:</p><img src="${qrImage}" alt="QR Code" /></div>` : ''}
                    
                    <div class="instructions">
                        <h3>📖 Panduan Cara Penggunaan</h3>
                        <ol>
                            <li><strong>🚨 PENTING - Cara Mengaktifkan Bot:</strong> Silakan scan QR Code di atas <strong>HANYA MENGGUNAKAN Akun WhatsApp yang akan dijadikan sebagai Nomor Resmi Pengaduan</strong>. Jangan di-scan menggunakan nomor pribadi Anda! <br><em>(Buka aplikasi WhatsApp di HP tersebut ➔ ketuk menu Perangkat Taut / Linked Devices ➔ lalu arahkan kamera ke gambar QR).</em></li>
                            <li><strong>Tunggu Proses Loading:</strong> Setelah di-scan, HP Anda mungkin akan menampilkan tulisan "Masuk / Logging in" yang bisa memakan waktu hingga 5 menit. <strong>Tolong bersabar!</strong> Jangan di-refresh atau ditutup halamannya sampai Status di atas berubah menjadi <span style="color: #25D366; font-weight: bold;">Connected</span>.</li>
                            <li><strong>Sudah Selesai!</strong> Jika status sudah Connected, berarti bot sudah siap bekerja otomatis 24 jam penuh. Anda sudah boleh menutup halaman web ini.</li>
                            <li><strong>Mengecek Daftar Keluhan:</strong> Semua pesan keluhan akan otomatis diketik dan disusun rapi ke dalam <a href="https://docs.google.com/spreadsheets/d/1HuCkq8Fm74R5B7Kiioovn5DBKw7KbexOUBXDNk6sXlA/edit?usp=sharing" target="_blank" style="color: #128C7E; font-weight: bold; text-decoration: underline;">Google Sheet Pengaduan</a> Anda. Anda tidak perlu melihatnya di web ini lagi.</li>
                            <li><strong>Catatan Penting:</strong> Anda hanya perlu melakukan scan QR Code ini <em>satu kali saja seumur hidup</em>. Anda tidak perlu repot-repot scan ulang besok-besok, kecuali Anda tidak sengaja memencet tombol "Keluar / Log out" di HP.</li>
                        </ol>
                    </div>
                </div>
            </body>
        </html>
    `);
});

// The secret /ping endpoint for UptimeRobot to keep Render awake 24/7
app.get('/ping', (req, res) => {
    res.send('pong');
});

// Start the web server
app.listen(port, () => {
    console.log('\n======================================================');
    console.log(`🌐 Web Dashboard running on http://localhost:${port}`);
    console.log('======================================================\n');
});

// 2. Initialize the WhatsApp client
const puppeteerOptions = {
    args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
    ],
    timeout: 0,
    protocolTimeout: 0
};

// If running locally on Windows, use local Chrome. If on Render (Linux), use their Chrome.
if (process.platform === 'win32') {
    puppeteerOptions.executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
} else {
    // Render typically installs Chrome here if configured, or Puppeteer will use its own
    // but setting it ensures no download errors if using a pre-installed Chrome buildpack
    puppeteerOptions.executablePath = '/usr/bin/google-chrome-stable';
}

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: puppeteerOptions
});

// Generate and display the QR code
client.on('qr', async (qr) => {
    console.log('QR Code received. Check the Web Dashboard or terminal to scan.');
    qrcodeTerminal.generate(qr, { small: true });
    
    try {
        // Convert the raw QR text into an image Data URL for the web page
        qrImage = await qrcode.toDataURL(qr);
        clientStatus = 'Waiting for scan...';
    } catch (err) {
        console.error('Failed to generate web QR', err);
    }
});

// Triggers when the bot is fully logged in and ready
client.on('ready', () => {
    console.log('✅ Client is ready! Bot is now running and listening.');
    clientStatus = 'Connected';
    qrImage = null; // Clear QR code from the website
});

// Triggers if the client forcibly logs out from their phone
client.on('disconnected', (reason) => {
    console.log('Client was logged out', reason);
    clientStatus = 'Disconnected (Requires Re-Scan)';
    qrImage = null;
    
    // In some cases, it's safer to restart the process here if running on a server,
    // but whatsapp-web.js will try to re-initialize or you can call client.initialize() again.
    // For now, we will destroy and re-initialize so it generates a new QR code.
    client.destroy().then(() => client.initialize());
});

// Triggers when a new message is received
client.on('message_create', async msg => {
    // Ignore messages sent by yourself
    if (msg.fromMe) return;

    try {
        await handleMessage(client, msg);
    } catch (error) {
        console.error('Error handling message:', error);
    }
});

// Start the client
console.log('Starting WhatsApp client, please wait...');
client.initialize();
