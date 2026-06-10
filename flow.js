const { saveReport } = require('./storage');
const { getSession, updateSession, clearSession } = require('./session');

async function handleMessage(client, msg) {
    const chat = await msg.getChat();
    // Only respond in private chats, ignore groups
    if (chat.isGroup) return;

    const sender = msg.from;
    const text = msg.body.trim();
    const session = getSession(sender);

    let response = "";

    switch (session.step) {
        case 'START':
            response = "Selamat datang di Layanan Pengaduan Management.\nSilakan masukkan *Nama* Bapak/Ibu:";
            updateSession(sender, { step: 'ASK_NAMA' });
            break;

        case 'ASK_NAMA':
            updateSession(sender, { 
                step: 'ASK_UNIT', 
                data: { ...session.data, nama: text } 
            });
            response = `Terimakasih Bapak/Ibu ${text}. Silakan masukkan *Nomor Unit* Anda:`;
            break;

        case 'ASK_UNIT':
            updateSession(sender, { 
                step: 'MAIN_MENU', 
                data: { ...session.data, unit: text } 
            });
            response = "Pilihan Menu:\n1. Complain\n2. Request\n\nBalas dengan angka pilihan Anda.";
            break;

        case 'MAIN_MENU':
            if (text === '1') {
                updateSession(sender, { 
                    step: 'COMPLAIN_MENU',
                    data: { ...session.data, type: 'Complain' }
                });
                response = "Menu Complain:\n1. Complain Lingkungan\n2. Complain Fasilitas Umum\n3. Complain Utilitas Air\n4. Complain Utilitas Listrik\n5. Back to Main Menu\n\nBalas dengan angka pilihan Anda.";
            } else if (text === '2') {
                updateSession(sender, { 
                    step: 'REQUEST_MENU',
                    data: { ...session.data, type: 'Request' }
                });
                response = "Menu Request:\n1. Request Utilitas Air\n2. Request Utilitas Listrik\n3. Request Layanan Umum\n4. Back To Main Menu\n\nBalas dengan angka pilihan Anda.";
            } else {
                response = "Pilihan tidak valid. Balas dengan angka 1 atau 2.";
            }
            break;

        case 'COMPLAIN_MENU':
            if (text === '1') {
                updateSession(sender, { step: 'COMPLAIN_LINGKUNGAN', data: { ...session.data, category: 'Complain Lingkungan' }});
                response = "Pilih kategori Complain Lingkungan:\n1. Gangguan Kebisingan\n2. Gangguan Kualitas Udara\n\nBalas dengan angka pilihan Anda.";
            } else if (text === '2') {
                updateSession(sender, { step: 'COMPLAIN_FASILITAS', data: { ...session.data, category: 'Complain Fasilitas Umum' }});
                response = "Pilih kategori Complain Fasilitas Umum:\n1. Gangguan Sarana Parkir\n2. Gangguan Sarana Lift\n3. Gangguan Sarana Lampu\n4. Gangguan Sarana Rekreasi dan Olah Raga\n\nBalas dengan angka pilihan Anda.";
            } else if (text === '3') {
                updateSession(sender, { step: 'COMPLAIN_AIR', data: { ...session.data, category: 'Complain Utilitas Air' }});
                response = "Pilih kategori Complain Utilitas Air:\n1. Gangguan Supply Air\n2. Gangguan Kualitas Air\n\nBalas dengan angka pilihan Anda.";
            } else if (text === '4') {
                updateSession(sender, { step: 'COMPLAIN_LISTRIK', data: { ...session.data, category: 'Complain Utilitas Listrik' }});
                response = "Pilih kategori Complain Utilitas Listrik:\n1. Gangguan Supply Listrik\n\nBalas dengan angka pilihan Anda.";
            } else if (text === '5') {
                updateSession(sender, { step: 'MAIN_MENU' });
                response = "Pilihan Menu:\n1. Complain\n2. Request\n\nBalas dengan angka pilihan Anda.";
            } else {
                response = "Pilihan tidak valid.";
            }
            break;

        case 'REQUEST_MENU':
            if (text === '1') {
                updateSession(sender, { step: 'REQUEST_AIR', data: { ...session.data, category: 'Request Utilitas Air' }});
                response = "Pilih kategori Request Utilitas Air:\n1. Request Aktifasi Supply Air Unit\n2. Request Mematikan Supply Air Unit\n\nBalas dengan angka pilihan Anda.";
            } else if (text === '2') {
                updateSession(sender, { step: 'REQUEST_LISTRIK', data: { ...session.data, category: 'Request Utilitas Listrik' }});
                response = "Pilih kategori Request Utilitas Listrik:\n1. Request Aktifasi Supply Listrik\n2. Request Mematikan Supply Listrik Unit\n\nBalas dengan angka pilihan Anda.";
            } else if (text === '3') {
                updateSession(sender, { step: 'REQUEST_LAYANAN', data: { ...session.data, category: 'Request Layanan Umum' }});
                response = "Pilih kategori Request Layanan Umum:\n1. Request Pemeriksaan AudioPhone\n2. Request Pemeriksaan Instalasi Air\n3. Request Pemeriksaan Instalasi Listrik\n\nBalas dengan angka pilihan Anda.";
            } else if (text === '4') {
                updateSession(sender, { step: 'MAIN_MENU' });
                response = "Pilihan Menu:\n1. Complain\n2. Request\n\nBalas dengan angka pilihan Anda.";
            } else {
                response = "Pilihan tidak valid.";
            }
            break;
            
        case 'COMPLAIN_LINGKUNGAN':
        case 'COMPLAIN_FASILITAS':
        case 'COMPLAIN_AIR':
        case 'COMPLAIN_LISTRIK':
            response = await finalizeComplain(session, text, sender);
            break;

        case 'REQUEST_AIR':
        case 'REQUEST_LISTRIK':
        case 'REQUEST_LAYANAN':
            response = await finalizeRequest(session, text, sender);
            break;

        default:
            // If they just typed something but don't have an active session
            clearSession(sender);
            updateSession(sender, { step: 'ASK_NAMA' });
            response = "Selamat datang di Layanan Pengaduan Management.\nSilakan masukkan *Nama* Bapak/Ibu:";
            break;
    }

    if (response) {
        await client.sendMessage(sender, response);
    }
}

function finalizeComplain(session, text, sender) {
    let detail = "";
    if (session.step === 'COMPLAIN_LINGKUNGAN') {
        if (text === '1') detail = 'Gangguan Kebisingan';
        else if (text === '2') detail = 'Gangguan Kualitas Udara';
    } else if (session.step === 'COMPLAIN_FASILITAS') {
        if (text === '1') detail = 'Gangguan Sarana Parkir';
        else if (text === '2') detail = 'Gangguan Sarana Lift';
        else if (text === '3') detail = 'Gangguan Sarana Lampu';
        else if (text === '4') detail = 'Gangguan Sarana Rekreasi dan Olah Raga';
    } else if (session.step === 'COMPLAIN_AIR') {
        if (text === '1') detail = 'Gangguan Supply Air';
        else if (text === '2') detail = 'Gangguan Kualitas Air';
    } else if (session.step === 'COMPLAIN_LISTRIK') {
        if (text === '1') detail = 'Gangguan Supply Listrik';
    }

    if (!detail) return "Pilihan tidak valid. Balas dengan angka yang tersedia.";

    const report = {
        nama: session.data.nama,
        unit: session.data.unit,
        type: session.data.type,
        category: session.data.category,
        detail: detail
    };
    saveReport(report);
    clearSession(sender);

    return "Terimakasih atas informasi yang diberikan. Team bertugas akan segera melakukan pemeriksaan dan tindakan langsung atas informasi yang diberikan. Bapak / Ibu juga dapat melakukan konfirmasi pelaporan kepada Petugas Jaga Lobby sesuai Unit Bapak / Ibu. Terimakasih.";
}

function finalizeRequest(session, text, sender) {
    let detail = "";
    if (session.step === 'REQUEST_AIR') {
        if (text === '1') detail = 'Request Aktifasi Supply Air Unit';
        else if (text === '2') detail = 'Request Mematikan Supply Air Unit';
    } else if (session.step === 'REQUEST_LISTRIK') {
        if (text === '1') detail = 'Request Aktifasi Supply Listrik';
        else if (text === '2') detail = 'Request Mematikan Supply Listrik Unit';
    } else if (session.step === 'REQUEST_LAYANAN') {
        if (text === '1') detail = 'Request Pemeriksaan AudioPhone';
        else if (text === '2') detail = 'Request Pemeriksaan Instalasi Air';
        else if (text === '3') detail = 'Request Pemeriksaan Instalasi Listrik';
    }

    if (!detail) return "Pilihan tidak valid. Balas dengan angka yang tersedia.";

    const report = {
        nama: session.data.nama,
        unit: session.data.unit,
        type: session.data.type,
        category: session.data.category,
        detail: detail
    };
    saveReport(report);
    clearSession(sender);

    return "Terimakasih atas informasi yang diberikan. Team bertugas akan segera melakukan pemeriksaan serta tindakan sesuai permohonan yang diberikan. Bapak / Ibu juga dapat melakukan konfirmasi pelaporan kepada Petugas Jaga Lobby sesuai Unit Bapak / Ibu. Terimakasih.";
}

module.exports = { handleMessage };
