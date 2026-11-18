require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.CORS_ORIGIN || "*" } });
app.use(express.json());
app.use(express.static("public"));
const DB_CONFIG = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT || 10000),
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    charset: "utf8mb4"
};
const pool = mysql.createPool(DB_CONFIG);
let databaseOnline = false;
pool.on("connection", () => { databaseOnline = true; });
pool.on("error", err => {
    databaseOnline = false;
    console.error("[MYSQL] Pool error:", err.code || err.message);
});
function explainDbError(err) {
    const code = err && err.code;
    console.error("[MYSQL] Connection failed:", code || err.message);
    if (["ETIMEDOUT", "ECONNREFUSED", "EHOSTUNREACH"].includes(code)) {
        console.error("[MYSQL] Periksa IP/hostname DB, port 3306, firewall/Remote MySQL allowlist, dan izin koneksi keluar aplikasi Node.js.");
    }
    else if (code === "ER_ACCESS_DENIED_ERROR") {
        console.error("[MYSQL] Username/password salah atau user belum diberi hak akses ke database.");
    }
    else if (code === "ER_BAD_DB_ERROR") {
        console.error("[MYSQL] Database tidak ditemukan. Import database.sql atau periksa DB_NAME.");
    }
}
const questions = [
    { cat: "Algoritma", level: "Dasar", seconds: 20, q: "Apa yang dimaksud dengan algoritma?", a: ["Urutan langkah logis untuk menyelesaikan masalah", "Nama perangkat komputer", "Bahasa untuk menggambar", "Jenis jaringan"], c: 0, e: "Algoritma adalah langkah-langkah logis dan berurutan untuk menyelesaikan masalah." },
    { cat: "Algoritma", level: "Dasar", seconds: 20, q: "Contoh algoritma dalam kehidupan sehari-hari adalah ...", a: ["Mengikuti langkah membuat mi instan", "Melihat layar", "Membeli keyboard", "Menyalakan lampu tanpa tujuan"], c: 0, e: "Kegiatan dengan langkah berurutan merupakan contoh algoritma." },
    { cat: "Algoritma", level: "Dasar", seconds: 20, q: "Langkah algoritma harus disusun secara ...", a: ["Acak", "Logis dan berurutan", "Rahasia", "Berulang tanpa tujuan"], c: 1, e: "Algoritma harus jelas, logis, dan terstruktur." },
    { cat: "Algoritma", level: "Dasar", seconds: 20, q: "Apa tujuan membuat algoritma?", a: ["Merencanakan solusi sebelum membuat program", "Menghias komputer", "Menghapus data", "Mempercepat internet"], c: 0, e: "Algoritma membantu merencanakan penyelesaian masalah." },
    { cat: "Algoritma", level: "Dasar", seconds: 20, q: "Data yang dimasukkan ke dalam program disebut ...", a: ["Output", "Input", "Proses", "Variabel kosong"], c: 1, e: "Input adalah data yang diberikan kepada program." },
    { cat: "Algoritma", level: "Dasar", seconds: 20, q: "Hasil yang dikeluarkan program disebut ...", a: ["Input", "Proses", "Output", "Perulangan"], c: 2, e: "Output adalah hasil dari pengolahan data." },
    { cat: "Algoritma", level: "Dasar", seconds: 20, q: "Urutan instruksi satu demi satu disebut struktur ...", a: ["Sekuensial", "Percabangan", "Perulangan", "Acak"], c: 0, e: "Sekuensial menjalankan instruksi secara berurutan." },
    { cat: "Algoritma", level: "Dasar", seconds: 20, q: "Struktur untuk memilih aksi berdasarkan kondisi adalah ...", a: ["Sekuensial", "Percabangan", "Komentar", "Input"], c: 1, e: "Percabangan memilih aksi berdasarkan kondisi benar atau salah." },
    { cat: "Algoritma", level: "Dasar", seconds: 20, q: "Perulangan digunakan untuk ...", a: ["Mengulang instruksi", "Menghapus variabel", "Mematikan komputer", "Mengganti monitor"], c: 0, e: "Perulangan menjalankan instruksi lebih dari satu kali." },
    { cat: "Algoritma", level: "Dasar", seconds: 20, q: "Pseudocode adalah ...", a: ["Penulisan algoritma dengan bahasa sederhana", "Kode mesin", "Nama perangkat", "Jenis database"], c: 0, e: "Pseudocode menuliskan logika program dengan bahasa sederhana." },
    { cat: "Python", level: "Dasar", seconds: 20, q: "Python merupakan ...", a: ["Bahasa pemrograman", "Perangkat keras", "Sistem operasi", "Kabel jaringan"], c: 0, e: "Python adalah bahasa pemrograman tingkat tinggi." },
    { cat: "Python", level: "Dasar", seconds: 20, q: "Perintah untuk menampilkan teks adalah ...", a: ["print()", "input()", "read()", "showText()"], c: 0, e: "print() menampilkan keluaran ke layar." },
    { cat: "Python", level: "Dasar", seconds: 20, q: "Manakah contoh variabel Python yang benar?", a: ["nama = 'Budi'", "var nama == Budi", "<nama>", "nama :=: Budi"], c: 0, e: "Variabel dibuat dengan nama, tanda sama dengan, dan nilai." },
    { cat: "Python", level: "Dasar", seconds: 20, q: "Tipe data bilangan bulat adalah ...", a: ["int", "str", "bool", "list"], c: 0, e: "int digunakan untuk bilangan bulat." },
    { cat: "Python", level: "Dasar", seconds: 20, q: "Tipe data untuk teks adalah ...", a: ["str", "int", "float", "bool"], c: 0, e: "str adalah tipe data string untuk teks." },
    { cat: "Python", level: "Dasar", seconds: 20, q: "Apa hasil dari 5 + 3?", a: ["8", "53", "2", "15"], c: 0, e: "Operator + menjumlahkan bilangan." },
    { cat: "Python", level: "Dasar", seconds: 20, q: "Tanda komentar satu baris Python adalah ...", a: ["#", "//", "<!--", "**"], c: 0, e: "Tanda # digunakan untuk komentar." },
    { cat: "Python", level: "Dasar", seconds: 20, q: "Kata kunci untuk membuat kondisi adalah ...", a: ["if", "when", "check", "caseof"], c: 0, e: "if digunakan untuk memeriksa kondisi." },
    { cat: "Python", level: "Dasar", seconds: 20, q: "Fungsi untuk menerima masukan pengguna adalah ...", a: ["input()", "print()", "type()", "range()"], c: 0, e: "input() membaca masukan dari pengguna." },
    { cat: "Python", level: "Dasar", seconds: 20, q: "Manakah contoh perulangan Python?", a: ["for i in range(3):", "repeat 3 times", "loop(i=3)", "again(3)"], c: 0, e: "for dan range() dapat digunakan untuk perulangan." },
    { cat: "AI", level: "Dasar", seconds: 20, q: "AI merupakan singkatan dari ...", a: ["Artificial Intelligence", "Automatic Internet", "Applied Interface", "Advanced Input"], c: 0, e: "AI berarti kecerdasan buatan." },
    { cat: "AI", level: "Dasar", seconds: 20, q: "Contoh penerapan AI adalah ...", a: ["Asisten virtual", "Penggaris", "Buku tulis", "Kabel USB"], c: 0, e: "Asisten virtual dapat menggunakan AI untuk memahami perintah." },
    { cat: "AI", level: "Dasar", seconds: 20, q: "AI membantu komputer melakukan tugas yang biasanya membutuhkan ...", a: ["Kecerdasan manusia", "Baterai besar", "Monitor", "Keyboard"], c: 0, e: "AI meniru kemampuan tertentu seperti mengenali pola dan memahami bahasa." },
    { cat: "AI", level: "Dasar", seconds: 20, q: "Machine learning adalah bagian dari AI yang belajar dari ...", a: ["Data", "Kabel", "Warna monitor", "Ukuran meja"], c: 0, e: "Machine learning mempelajari pola dari data." },
    { cat: "AI", level: "Dasar", seconds: 20, q: "Pengenalan wajah pada ponsel merupakan contoh ...", a: ["AI", "Printer", "Spreadsheet", "Sistem kabel"], c: 0, e: "AI dapat digunakan untuk mengenali wajah." },
    { cat: "AI", level: "Dasar", seconds: 20, q: "Mengapa hasil jawaban AI perlu diperiksa?", a: ["AI bisa memberikan informasi keliru", "AI selalu benar", "AI tidak memakai data", "AI tidak bisa membaca teks"], c: 0, e: "Hasil AI perlu diverifikasi karena tidak selalu benar." },
    { cat: "AI", level: "Dasar", seconds: 20, q: "Chatbot dirancang untuk ...", a: ["Berinteraksi melalui percakapan", "Mencetak kertas", "Mengukur panjang", "Mengisi baterai"], c: 0, e: "Chatbot berkomunikasi dengan pengguna melalui teks atau suara." },
    { cat: "AI", level: "Dasar", seconds: 20, q: "Data latihan pada machine learning digunakan untuk ...", a: ["Melatih model mengenali pola", "Menghias layar", "Mengisi baterai", "Menghapus file"], c: 0, e: "Data latihan membantu model mempelajari pola." },
    { cat: "Flowchart", level: "Dasar", seconds: 20, q: "Flowchart adalah ...", a: ["Diagram alur proses", "Bahasa pemrograman", "Jenis keyboard", "Database"], c: 0, e: "Flowchart menggambarkan alur algoritma dengan simbol." },
    { cat: "Flowchart", level: "Dasar", seconds: 20, q: "Simbol oval menunjukkan ...", a: ["Mulai atau selesai", "Proses", "Keputusan", "Input"], c: 0, e: "Oval atau terminator menandai Start dan End." },
    { cat: "Flowchart", level: "Dasar", seconds: 20, q: "Simbol persegi panjang menunjukkan ...", a: ["Proses", "Keputusan", "Mulai", "Arah panah"], c: 0, e: "Persegi panjang berarti proses atau instruksi." },
    { cat: "Flowchart", level: "Dasar", seconds: 20, q: "Simbol belah ketupat digunakan untuk ...", a: ["Keputusan/kondisi", "Proses", "Mulai", "Output"], c: 0, e: "Belah ketupat menunjukkan percabangan keputusan." },
    { cat: "Flowchart", level: "Dasar", seconds: 20, q: "Simbol jajar genjang menunjukkan ...", a: ["Input atau output", "Keputusan", "Mulai", "Penghubung"], c: 0, e: "Jajar genjang digunakan untuk masukan atau keluaran." },
    { cat: "Flowchart", level: "Dasar", seconds: 20, q: "Panah pada flowchart berfungsi untuk ...", a: ["Menunjukkan arah alur", "Menyimpan data", "Menghapus proses", "Menandai warna"], c: 0, e: "Panah menunjukkan arah jalannya proses." },
    { cat: "Flowchart", level: "Dasar", seconds: 20, q: "Simbol Start biasanya diletakkan ...", a: ["Di awal alur", "Di akhir saja", "Di luar diagram", "Di setiap proses"], c: 0, e: "Start adalah titik awal flowchart." },
    { cat: "Flowchart", level: "Dasar", seconds: 20, q: "Cabang keputusan biasanya diberi label ...", a: ["Ya dan Tidak", "Atas dan bawah", "Merah dan biru", "Besar dan kecil"], c: 0, e: "Keputusan sering memiliki cabang Ya/Tidak." },
    { cat: "Flowchart", level: "Dasar", seconds: 20, q: "Apa manfaat flowchart?", a: ["Memudahkan memahami alur solusi", "Menambah RAM", "Mengganti bahasa program", "Mempercepat internet"], c: 0, e: "Flowchart memvisualisasikan langkah penyelesaian masalah." },
    { cat: "Flowchart", level: "Dasar", seconds: 20, q: "Simbol dokumen biasanya memiliki sisi bawah ...", a: ["Bergelombang", "Runcing", "Bulat penuh", "Berbentuk bintang"], c: 0, e: "Simbol dokumen digambarkan dengan sisi bawah bergelombang." },
    { cat: "Flowchart", level: "Dasar", seconds: 20, q: "Urutan flowchart umumnya dibaca ...", a: ["Mengikuti arah panah", "Dari kanan ke kiri selalu", "Secara acak", "Dari bawah saja"], c: 0, e: "Ikuti arah panah untuk membaca alur." }
];
const usersOnline = new Map();
const queue = [];
const matches = new Map();
const challenges = new Map();
const timers = new Map();
const rooms = new Map();
const roomTimers = new Map();
const publicUser = u => ({ id: u.id, username: u.username, xp: u.xp, coins: u.coins, wins: u.wins, played: u.played });
async function auth(req, res, next) {
    try {
        const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
        if (!token)
            return res.status(401).json({ error: "Silakan login." });
        const [rows] = await pool.execute("SELECT id,username,xp,coins,wins,played FROM users WHERE id=?", [Number(token)]);
        if (!rows.length)
            return res.status(401).json({ error: "Sesi tidak valid." });
        req.user = rows[0];
        next();
    }
    catch (e) {
        res.status(500).json({ error: "Database tidak dapat diakses." });
    }
}
app.get("/api/health", async (_, res) => {
    try {
        await pool.query("SELECT 1");
        databaseOnline = true;
        res.json({ ok: true, application: "quiz-quest-pplg-v5", database: "mysql", databaseOnline: true });
    }
    catch (e) {
        databaseOnline = false;
        res.status(503).json({ ok: false, application: "quiz-quest-pplg-v5", database: "mysql", databaseOnline: false,
            error: e.code === "ETIMEDOUT" ? "Koneksi MySQL timeout. Periksa host, port, firewall, dan remote database access." : "MySQL belum terhubung. Periksa konfigurasi dan log server." });
    }
});
app.post("/api/register", async (req, res) => {
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username) || password.length < 6)
        return res.status(400).json({ error: "Username 3-30 karakter (huruf/angka/_) dan password minimal 6 karakter." });
    try {
        const hash = await bcrypt.hash(password, 12);
        const [r] = await pool.execute("INSERT INTO users(username,password_hash) VALUES(?,?)", [username, hash]);
        res.json({ ok: true, message: "Akun berhasil dibuat. Silakan login kembali." });
    }
    catch (e) {
        res.status(409).json({ error: e.code === "ER_DUP_ENTRY" ? "Username sudah digunakan." : "Gagal membuat akun. Periksa database." });
    }
});
app.post("/api/login", async (req, res) => {
    try {
        const [rows] = await pool.execute("SELECT * FROM users WHERE username=?", [String(req.body.username || "").trim()]);
        if (!rows.length || !(await bcrypt.compare(String(req.body.password || ""), rows[0].password_hash)))
            return res.status(401).json({ error: "Username atau password salah." });
        res.json({ token: String(rows[0].id), user: publicUser(rows[0]) });
    }
    catch (e) {
        res.status(500).json({ error: "Tidak dapat login. Periksa koneksi MySQL." });
    }
});
app.get("/api/me", auth, (req, res) => res.json({ user: req.user }));
app.get("/api/leaderboard", async (_, res) => {
    try {
        const [rows] = await pool.query("SELECT username,xp,coins,wins,played FROM users ORDER BY xp DESC,wins DESC LIMIT 20");
        res.json(rows);
    }
    catch (e) {
        res.status(500).json({ error: "Gagal memuat leaderboard" });
    }
});
app.get("/api/history", auth, async (req, res) => {
    const [rows] = await pool.execute("SELECT opponent_name,result,score,questions,created_at FROM match_history WHERE user_id=? ORDER BY id DESC LIMIT 20", [req.user.id]);
    res.json(rows);
});
async function reward(userId, opponent, result, score) {
    const xp = result === "win" ? 120 : result === "draw" ? 70 : 35;
    const coins = result === "win" ? 60 : result === "draw" ? 30 : 15;
    await pool.execute("UPDATE users SET xp=xp+?,coins=coins+?,wins=wins+?,played=played+1 WHERE id=?", [xp, coins, result === "win" ? 1 : 0, userId]);
    await pool.execute("INSERT INTO match_history(user_id,opponent_name,result,score,questions) VALUES(?,?,?,?,10)", [userId, opponent, result, score]);
}
function onlineList() {
    return [...usersOnline.values()].map(x => ({ id: x.user.id, username: x.user.username, xp: x.user.xp, wins: x.user.wins }));
}
function broadcastOnline() { io.emit("online:list", onlineList()); }
function pickQuestions() { return [...questions].sort(() => Math.random() - .5).slice(0, 10).map(q => ({ ...q, id: crypto.randomUUID() })); }
function sendToMatch(m, event, data) { m.players.forEach(p => { if (p.socket)
    io.to(p.socket).emit(event, data); }); }
function clearTimer(id) { if (timers.has(id)) {
    clearTimeout(timers.get(id));
    timers.delete(id);
} }
function startMatch(players, mode) {
    const id = crypto.randomUUID();
    const m = { id, players, mode, questions: pickQuestions(), index: 0, turn: 0, scores: [0, 0], hp: [100, 100], combo: [0, 0], answers: [null, null], done: false };
    matches.set(id, m);
    players.forEach((p, i) => { if (p.socket)
        io.to(p.socket).emit("match:start", { id, mode, slot: i, opponents: players.map(x => x.user.username), total: 10 }); });
    askQuestion(m);
    return m;
}
function askQuestion(m) {
    if (m.done)
        return;
    m.turn = m.index % 2;
    m.answers = [null, null];
    const q = m.questions[m.index];
    sendToMatch(m, "match:question", { number: m.index + 1, total: 10, turn: m.turn, question: { id: q.id, cat: q.cat, q: q.q, a: q.a }, scores: m.scores, hp: m.hp, combo: m.combo });
    if (m.players[m.turn].isBot)
        scheduleBot(m);
    else if (m.players[m.turn].socket)
        io.to(m.players[m.turn].socket).emit("match:your-turn", { number: m.index + 1 });
}
function scheduleBot(m) {
    clearTimer(m.id);
    timers.set(m.id, setTimeout(() => {
        if (m.done)
            return;
        const idx = m.turn, q = m.questions[m.index];
        const correct = Math.random() < .91;
        const answer = correct ? q.c : (q.c + 1 + Math.floor(Math.random() * 3)) % 4;
        submitAnswer(m, idx, answer, true);
    }, 1100 + Math.random() * 1500));
}
function submitAnswer(m, idx, answer, isBot = false) {
    if (m.done || idx !== m.turn || m.answers[idx] !== null)
        return;
    const q = m.questions[m.index], ok = Number(answer) === q.c;
    m.answers[idx] = { ok, answer: Number(answer) };
    if (ok) {
        m.scores[idx] += 100 + Math.min(m.combo[idx] * 15, 60);
        m.combo[idx]++;
        m.hp[1 - idx] = Math.max(0, m.hp[1 - idx] - 8);
    }
    else {
        m.combo[idx] = 0;
        m.hp[idx] = Math.max(0, m.hp[idx] - 12);
    }
    if (m.players[idx].socket)
        io.to(m.players[idx].socket).emit("match:answer-result", { ok, correct: q.c, explanation: q.e, score: m.scores[idx], hp: m.hp, combo: m.combo[idx] });
    const other = 1 - idx;
    if (m.players[other].socket)
        io.to(m.players[other].socket).emit("match:opponent-answered", { ok, score: m.scores[idx], hp: m.hp });
    clearTimer(m.id);
    setTimeout(() => {
        if (m.done)
            return;
        if (m.hp.some(v => v <= 0) || m.index >= 9) {
            finishMatch(m);
            return;
        }
        m.index++;
        askQuestion(m);
    }, 1800);
}
async function finishMatch(m) {
    if (m.done)
        return;
    m.done = true;
    clearTimer(m.id);
    let result = m.scores[0] === m.scores[1] ? "draw" : m.scores[0] > m.scores[1] ? "win" : "loss";
    const summary = { scores: m.scores, hp: m.hp, result, total: 10 };
    for (let i = 0; i < 2; i++) {
        const p = m.players[i], r = i === 0 ? result : result === "win" ? "loss" : result === "loss" ? "win" : "draw";
        if (!p.isBot) {
            try {
                await reward(p.user.id, m.players[1 - i].user.username, r, m.scores[i]);
            }
            catch (e) {
                console.error(e);
            }
        }
        if (p.socket)
            io.to(p.socket).emit("match:end", { ...summary, result: r, opponent: m.players[1 - i].user.username });
    }
    matches.delete(m.id);
}
function removeFromQueue(socketId) { const i = queue.findIndex(p => p.socket === socketId); if (i >= 0)
    queue.splice(i, 1); }
function roomPublic(room) { return { name: room.name, hostId: room.hostId, maxPlayers: room.maxPlayers, status: room.status, players: room.players.map(p => ({ id: p.user.id, username: p.user.username, ready: p.ready, score: p.score })) }; }
function roomBroadcast(room) { io.to(room.name).emit("room:update", roomPublic(room)); }
function roomQuestion(room) {
    if (room.status !== "playing")
        return;
    if (room.index >= 10) {
        finishRoom(room);
        return;
    }
    const q = room.questions[room.index];
    room.locked = false;
    room.startedAt = Date.now();
    io.to(room.name).emit("room:question", { number: room.index + 1, total: 10, timeLimit: 20, question: { cat: q.cat, q: q.q, a: q.a }, scores: room.players.map(p => ({ username: p.user.username, score: p.score })) });
    clearTimeout(roomTimers.get(room.name));
    roomTimers.set(room.name, setTimeout(() => { if (room.locked || room.status !== "playing")
        return; room.locked = true; io.to(room.name).emit("room:timeout", { correct: q.c, explanation: q.e }); setTimeout(() => { room.index++; roomQuestion(room); }, 1500); }, 20000));
}
function finishRoom(room) {
    room.status = "finished";
    clearTimeout(roomTimers.get(room.name));
    const ranking = [...room.players].sort((a, b) => b.score - a.score).map((p, i) => ({ rank: i + 1, username: p.user.username, score: p.score }));
    io.to(room.name).emit("room:finished", { ranking, room: room.name });
    roomBroadcast(room);
}
io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth?.token;
        if (!token)
            return next(new Error("Login diperlukan"));
        const [rows] = await pool.execute("SELECT id,username,xp,coins,wins,played FROM users WHERE id=?", [Number(token)]);
        if (!rows.length)
            return next(new Error("Sesi tidak valid"));
        socket.user = rows[0];
        next();
    }
    catch (e) {
        next(new Error("Database tidak tersedia"));
    }
});
io.on("connection", socket => {
    usersOnline.set(socket.user.id, { socket: socket.id, user: socket.user });
    broadcastOnline();
    socket.emit("profile", publicUser(socket.user));
    socket.on("online:get", () => socket.emit("online:list", onlineList()));
    socket.on("room:create", data => {
        const name = String(data?.name || "").trim().replace(/\s+/g, " ");
        const max = Number(data?.maxPlayers || 4);
        if (name.length < 3 || name.length > 24)
            return socket.emit("room:error", { message: "Nama room harus 3-24 karakter." });
        if (!Number.isInteger(max) || max < 2 || max > 12)
            return socket.emit("room:error", { message: "Maksimal pemain harus 2-12." });
        if (rooms.has(name.toLowerCase()))
            return socket.emit("room:error", { message: "Nama room sudah digunakan." });
        for (const r of rooms.values())
            if (r.players.some(p => p.user.id === socket.user.id))
                return socket.emit("room:error", { message: "Anda sudah berada di room lain." });
        const room = { name, key: name.toLowerCase(), hostId: socket.user.id, maxPlayers: max, status: "lobby", index: 0, locked: false, questions: [], players: [{ socket: socket.id, user: socket.user, ready: true, score: 0 }] };
        rooms.set(room.key, room);
        socket.join(room.name);
        socket.emit("room:created", roomPublic(room));
        roomBroadcast(room);
    });
    socket.on("room:join", data => {
        const name = String(data?.name || "").trim().toLowerCase(), room = rooms.get(name);
        if (!room)
            return socket.emit("room:error", { message: "Room tidak ditemukan." });
        if (room.status !== "lobby")
            return socket.emit("room:error", { message: "Pertandingan room sudah dimulai." });
        if (room.players.length >= room.maxPlayers)
            return socket.emit("room:error", { message: "Room sudah penuh." });
        if ([...rooms.values()].some(r => r.players.some(p => p.user.id === socket.user.id)))
            return socket.emit("room:error", { message: "Anda sudah berada di room lain." });
        room.players.push({ socket: socket.id, user: socket.user, ready: false, score: 0 });
        socket.join(room.name);
        socket.emit("room:joined", roomPublic(room));
        roomBroadcast(room);
    });
    socket.on("room:ready", () => { for (const room of rooms.values()) {
        const p = room.players.find(x => x.socket === socket.id);
        if (p && room.status === "lobby") {
            p.ready = !p.ready;
            roomBroadcast(room);
            break;
        }
    } });
    socket.on("room:start", () => { for (const room of rooms.values()) {
        if (room.hostId !== socket.user.id)
            continue;
        if (room.status !== "lobby")
            return socket.emit("room:error", { message: "Room tidak berada di lobby." });
        if (room.players.length < 2)
            return socket.emit("room:error", { message: "Minimal 2 pemain untuk mulai." });
        if (room.players.some(p => !p.ready))
            return socket.emit("room:error", { message: "Semua pemain harus Ready." });
        room.status = "playing";
        room.index = 0;
        room.questions = pickQuestions();
        room.players.forEach(p => p.score = 0);
        io.to(room.name).emit("room:started", roomPublic(room));
        roomQuestion(room);
        break;
    } });
    socket.on("room:answer", data => { for (const room of rooms.values()) {
        const p = room.players.find(x => x.socket === socket.id);
        if (!p || room.status !== "playing")
            continue;
        if (room.locked)
            return socket.emit("room:notice", { message: "Jawaban soal ini sudah dikunci." });
        const q = room.questions[room.index], answer = Number(data?.answer);
        if (!Number.isInteger(answer) || answer < 0 || answer > 3)
            return;
        room.locked = true;
        clearTimeout(roomTimers.get(room.name));
        const ok = answer === q.c;
        if (ok)
            p.score += 100;
        io.to(room.name).emit("room:locked", { username: p.user.username, answer, correct: q.c, ok, score: p.score, explanation: q.e, elapsedMs: Date.now() - room.startedAt });
        setTimeout(() => { room.index++; roomQuestion(room); }, 1800);
        break;
    } });
    socket.on("room:leave", () => { for (const [key, room] of rooms) {
        const i = room.players.findIndex(p => p.socket === socket.id);
        if (i < 0)
            continue;
        room.players.splice(i, 1);
        socket.leave(room.name);
        if (!room.players.length || room.status !== "lobby") {
            rooms.delete(key);
            clearTimeout(roomTimers.get(room.name));
            io.to(room.name).emit("room:closed", { message: "Room telah ditutup." });
        }
        else {
            if (room.hostId === socket.user.id)
                room.hostId = room.players[0].user.id;
            roomBroadcast(room);
        }
        break;
    } });
    socket.on("queue:join", () => {
        if (queue.some(p => p.user.id === socket.user.id))
            return;
        const me = { socket: socket.id, user: socket.user, isBot: false };
        const otherIndex = queue.findIndex(p => p.user.id !== socket.user.id);
        if (otherIndex >= 0) {
            const other = queue.splice(otherIndex, 1)[0];
            startMatch([other, me], "quick");
        }
        else {
            queue.push(me);
            socket.emit("queue:waiting");
            const timeout = setTimeout(() => {
                const ix = queue.findIndex(p => p.socket === socket.id);
                if (ix >= 0) {
                    queue.splice(ix, 1);
                    startMatch([me, { socket: null, user: { id: 0, username: "NEON BOT", xp: 9999, wins: 999 }, isBot: true }], "bot");
                }
            }, 15000);
            socket.once("queue:cancel", () => { clearTimeout(timeout); removeFromQueue(socket.id); });
        }
    });
    socket.on("challenge:send", targetId => {
        const target = usersOnline.get(Number(targetId));
        if (!target || target.socket === socket.id)
            return socket.emit("notice", { message: "Pemain tidak tersedia." });
        const id = crypto.randomUUID();
        challenges.set(id, { from: socket.id, to: target.socket, fromUser: socket.user, toUser: target.user });
        io.to(target.socket).emit("challenge:incoming", { id, from: socket.user.username, xp: socket.user.xp });
        socket.emit("challenge:sent", { id });
        setTimeout(() => { if (challenges.has(id)) {
            challenges.delete(id);
            io.to(socket.id).emit("notice", { message: "Tantangan kedaluwarsa." });
        } }, 30000);
    });
    socket.on("challenge:reply", data => {
        const c = challenges.get(data.id);
        if (!c || c.to !== socket.id)
            return;
        challenges.delete(data.id);
        if (!data.accept) {
            io.to(c.from).emit("challenge:declined", { username: socket.user.username });
            return;
        }
        const a = io.sockets.sockets.get(c.from);
        if (!a)
            return socket.emit("notice", { message: "Penantang sudah offline." });
        startMatch([{ socket: c.from, user: c.fromUser, isBot: false }, { socket: socket.id, user: socket.user, isBot: false }], "challenge");
    });
    socket.on("match:answer", data => {
        const m = matches.get(data.matchId);
        if (!m)
            return;
        const idx = m.players.findIndex(p => p.socket === socket.id);
        if (idx < 0)
            return;
        submitAnswer(m, idx, data.answer, false);
    });
    socket.on("disconnect", () => {
        removeFromQueue(socket.id);
        usersOnline.delete(socket.user.id);
        for (const [key, room] of rooms) {
            const i = room.players.findIndex(p => p.socket === socket.id);
            if (i >= 0) {
                room.players.splice(i, 1);
                if (!room.players.length) {
                    rooms.delete(key);
                    clearTimeout(roomTimers.get(room.name));
                }
                else {
                    if (room.hostId === socket.user.id)
                        room.hostId = room.players[0].user.id;
                    roomBroadcast(room);
                }
            }
        }
        for (const [id, c] of challenges)
            if (c.from === socket.id || c.to === socket.id) {
                challenges.delete(id);
                io.to(c.from === socket.id ? c.to : c.from).emit("notice", { message: "Pemain terputus." });
            }
        for (const m of matches.values()) {
            const idx = m.players.findIndex(p => p.socket === socket.id);
            if (idx >= 0) {
                m.players[idx].socket = null;
                const other = m.players[1 - idx];
                if (other.socket)
                    io.to(other.socket).emit("notice", { message: "Lawan terputus. Pertandingan diakhiri." });
                finishMatch(m);
            }
        }
        broadcastOnline();
    });
});
const port = Number(process.env.PORT);
// Start HTTP even if MySQL is temporarily unreachable; retry database checks.
server.listen(port, () => {
    console.log(`Quiz Quest V5 running on :${port}`);
    console.log(`[MYSQL] Connecting to ${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database} as ${DB_CONFIG.user}`);
    checkDatabase();
});
let dbCheckRunning = false;
async function checkDatabase() {
    if (dbCheckRunning)
        return;
    dbCheckRunning = true;
    try {
        await pool.query("SELECT 1");
        if (!databaseOnline)
            console.log("[MYSQL] Database connection established.");
        databaseOnline = true;
    }
    catch (err) {
        databaseOnline = false;
        explainDbError(err);
    }
    finally {
        dbCheckRunning = false;
    }
}
setInterval(checkDatabase, 15000).unref();

