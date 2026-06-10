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
                    .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                    h1 { color: #128C7E; }
                    .status { font-size: 22px; font-weight: bold; margin-bottom: 20px; color: #333; }
                    .qr-container { margin: 20px auto; padding: 20px; border: 2px dashed #128C7E; display: inline-block; border-radius: 10px; background: #fff; }
                    .qr-container p { font-size: 18px; color: #555; }
                    .success { color: #25D366; }
                    .error { color: #d9534f; }
                </style>
                <!-- Auto-refresh the page every 5 seconds so they don't have to manually refresh to see the QR code update -->
                <meta http-equiv="refresh" content="5">
            </head>
            <body>
                <div class="container">
                    <h1>Pengaduan Management Bot</h1>
                    <div class="status">Status: 
                        <span class="${clientStatus === 'Connected' ? 'success' : 'error'}">${clientStatus}</span>
                    </div>
                    ${qrImage ? `<div class="qr-container"><p>Please scan this QR code using your WhatsApp Linked Devices:</p><img src="${qrImage}" alt="QR Code" /></div>` : ''}
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
        '--single-process',
        '--disable-gpu'
    ],
    timeout: 60000,
    protocolTimeout: 60000
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
