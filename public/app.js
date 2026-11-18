let token = localStorage.getItem("qq_token"), user = null, socket = null, register = false, matchId = null, slot = 0, turn = -1, tick = null, timeLeft = 18, answered = false, queueActive = false;
const $ = id => document.getElementById(id);
let activeRoom = null, roomTick = null, roomTime = 20, roomAnswered = false;
function show(id) { ["auth", "dashboard", "arena", "result", "roomPage", "roomBattle"].forEach(x => $(x).classList.toggle("hidden", x !== id)); }
function toast(t) { $("toast").textContent = t; $("toast").classList.remove("hidden"); setTimeout(() => $("toast").classList.add("hidden"), 2800); }
async function api(url, opts = {}) { const r = await fetch(url, { ...opts, headers: { "Content-Type": "application/json", ...(opts.headers || {}), ...(token ? { Authorization: "Bearer " + token } : {}) } }); const d = await r.json(); if (!r.ok)
    throw Error(d.error || "Request gagal"); return d; }
$("loginTab").onclick = () => { register = false; $("loginTab").className = "btn"; $("registerTab").className = "btn secondary"; $("authBtn").textContent = "MASUK ARENA"; };
$("registerTab").onclick = () => { register = true; $("registerTab").className = "btn"; $("loginTab").className = "btn secondary"; $("authBtn").textContent = "BUAT AKUN"; };
$("authBtn").onclick = async () => { try {
    const d = await api(register ? "/api/register" : "/api/login", { method: "POST", body: JSON.stringify({ username: $("username").value, password: $("password").value }) });
    if (register) {
        token = null;
        user = null;
        localStorage.removeItem("qq_token");
        register = false;
        $("loginTab").className = "btn";
        $("registerTab").className = "btn secondary";
        $("authBtn").textContent = "MASUK ARENA";
        $("password").value = "";
        $("authMsg").textContent = "Akun berhasil dibuat. Silakan login ulang.";
        return;
    }
    token = d.token;
    localStorage.setItem("qq_token", token);
    user = d.user;
    enter();
}
catch (e) {
    $("authMsg").textContent = e.message;
} };
async function enter() { try {
    const d = await api("/api/me");
    user = d.user;
    $("playerName").textContent = user.username;
    $("xp").textContent = user.xp;
    $("coins").textContent = user.coins;
    $("wins").textContent = user.wins;
    $("played").textContent = user.played;
    show("dashboard");
    connect();
    loadBoard();
}
catch (e) {
    token = null;
    localStorage.removeItem("qq_token");
    show("auth");
} }
function connect() { if (socket)
    socket.disconnect(); socket = io({ auth: { token } }); socket.on("connect_error", e => toast(e.message)); socket.on("online:list", list => renderPlayers(list)); socket.on("queue:waiting", () => { $("queueBox").classList.remove("hidden"); queueActive = true; }); socket.on("match:start", d => { matchId = d.id; slot = d.slot; $("matchMode").textContent = d.mode === "bot" ? "NEON BOT BATTLE" : d.mode === "challenge" ? "PRIVATE DUEL" : "QUICK MATCH"; $("p1").textContent = user.username; $("p2").textContent = d.opponents[1 - slot]; $("queueBox").classList.add("hidden"); show("arena"); }); socket.on("match:question", d => { turn = d.turn; answered = false; $("round").textContent = d.number; $("category").textContent = d.question.cat; $("question").textContent = d.question.q; $("score0").textContent = d.scores[slot] + " PTS"; $("score1").textContent = d.scores[1 - slot] + " PTS"; $("hp0").style.width = d.hp[slot] + "%"; $("hp1").style.width = d.hp[1 - slot] + "%"; $("turnInfo").textContent = turn === slot ? "YOUR TURN — PILIH JAWABAN" : "OPPONENT TURN — TUNGGU"; renderAnswers(d.question.a, turn === slot); startTimer(turn === slot); }); socket.on("match:your-turn", () => { }); socket.on("match:answer-result", d => { const buttons = [...$("answers").children]; buttons.forEach((b, i) => { b.disabled = true; if (i === d.correct)
    b.classList.add("correct");
else if (i === Number(b.dataset.index) && !d.ok)
    b.classList.add("wrong"); }); $("feedback").classList.remove("hidden"); $("feedback").innerHTML = (d.ok ? "<b style='color:#55f2a4'>BENAR! + SCORE</b>" : "<b style='color:#ff4fa3'>KURANG TEPAT</b>") + "<br>Jawaban benar: " + escapeHtml(buttons[d.correct]?.textContent || "") + "<br>" + escapeHtml(d.explanation); $("score0").textContent = d.score + " PTS"; $("hp0").style.width = d.hp[slot] + "%"; $("hp1").style.width = d.hp[1 - slot] + "%"; }); socket.on("match:opponent-answered", d => { $("score1").textContent = d.score + " PTS"; $("hp1").style.width = d.hp[1 - slot] + "%"; $("turnInfo").textContent = "Lawan sudah menjawab."; }); socket.on("match:end", async (d) => { clearInterval(tick); show("result"); $("resultTitle").textContent = d.result === "win" ? "🏆 VICTORY" : d.result === "draw" ? "🤝 DRAW" : "💥 DEFEAT"; $("resultText").textContent = "Pertandingan melawan " + d.opponent + " selesai."; const score = d.scores[slot]; $("finalScore").textContent = score; $("earnedXp").textContent = d.result === "win" ? 120 : d.result === "draw" ? 70 : 35; $("earnedCoins").textContent = d.result === "win" ? 60 : d.result === "draw" ? 30 : 15; await enter(); show("result"); }); socket.on("challenge:incoming", d => { if (confirm(d.from + " menantangmu duel PPLG. Terima?"))
    socket.emit("challenge:reply", { id: d.id, accept: true });
else
    socket.emit("challenge:reply", { id: d.id, accept: false }); }); socket.on("challenge:sent", () => toast("Tantangan terkirim!")); socket.on("challenge:declined", d => toast(d.username + " menolak tantangan.")); socket.on("notice", d => toast(d.message)); socket.on("room:created", d => { activeRoom = d; $("roomLobby").classList.remove("hidden"); renderRoom(d); }); socket.on("room:joined", d => { activeRoom = d; $("roomLobby").classList.remove("hidden"); renderRoom(d); }); socket.on("room:update", d => { activeRoom = d; renderRoom(d); }); socket.on("room:error", d => $("roomMessage").textContent = d.message); socket.on("room:notice", d => toast(d.message)); socket.on("room:closed", d => { activeRoom = null; show("dashboard"); toast(d.message); }); socket.on("room:started", d => { activeRoom = d; show("roomBattle"); $("roomBattleName").textContent = d.name; }); socket.on("room:question", d => { roomAnswered = false; roomTime = d.timeLimit; $("roomRound").textContent = d.number; $("roomQuestion").textContent = d.question.q; $("roomFeedback").classList.add("hidden"); $("roomAnswers").innerHTML = d.question.a.map((a, i) => `<button class="answer" data-room-answer="${i}">${String.fromCharCode(65 + i)}. ${escapeHtml(a)}</button>`).join(""); [...$("roomAnswers").children].forEach(b => b.onclick = () => { if (roomAnswered)
    return; roomAnswered = true; socket.emit("room:answer", { answer: Number(b.dataset.roomAnswer) }); [...$("roomAnswers").children].forEach(x => x.disabled = true); }); clearInterval(roomTick); $("roomTimer").textContent = roomTime; roomTick = setInterval(() => { $("roomTimer").textContent = --roomTime; if (roomTime <= 0) {
    clearInterval(roomTick);
    [...$("roomAnswers").children].forEach(x => x.disabled = true);
} }, 1000); }); socket.on("room:locked", d => { clearInterval(roomTick); [...$("roomAnswers").children].forEach((b, i) => { b.disabled = true; if (i === d.correct)
    b.classList.add("correct"); }); $("roomFeedback").classList.remove("hidden"); $("roomFeedback").textContent = d.username + " menjawab lebih dulu • " + (d.ok ? "BENAR" : "SALAH") + ". " + d.explanation; }); socket.on("room:timeout", d => { clearInterval(roomTick); $("roomFeedback").classList.remove("hidden"); $("roomFeedback").textContent = "Waktu habis. Jawaban benar: " + $("roomAnswers").children[d.correct]?.textContent + ". " + d.explanation; }); socket.on("room:finished", d => { clearInterval(roomTick); $("roomScores").innerHTML = d.ranking.map(p => `<div class="player"><b>#${p.rank} ${escapeHtml(p.username)}</b><strong>${p.score} PTS</strong></div>`).join(""); $("roomFeedback").classList.remove("hidden"); $("roomFeedback").textContent = "Pertandingan selesai! Hasil akhir ada di klasemen."; }); }
function renderRoom(d) { $("roomTitle").textContent = "ROOM: " + d.name; $("roomMeta").textContent = d.players.length + " / " + d.maxPlayers + " pemain • " + (d.status === "lobby" ? "Lobby" : "Pertandingan berjalan"); $("roomPlayers").innerHTML = d.players.map(p => `<div class="player"><span><span class="online"></span>${escapeHtml(p.username)} ${p.id === d.hostId ? "<span class=badge>HOST</span>" : ""}</span><b>${p.ready ? "READY" : "NOT READY"}</b></div>`).join(""); $("roomStart").disabled = d.hostId !== user.id || d.players.length < 2 || d.players.some(p => !p.ready); $("roomReady").disabled = d.status !== "lobby"; $("roomStart").style.opacity = $("roomStart").disabled ? .5 : 1; }
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function renderPlayers(list) { $("players").innerHTML = "<h3 class='section'>🟢 PEMAIN ONLINE (" + list.length + ")</h3>" + (list.length ? list.filter(p => p.id !== user.id).map(p => "<div class='player'><div><span class='online'></span><b>" + escapeHtml(p.username) + "</b><br><small class='muted'>" + p.xp + " XP • " + p.wins + " wins</small></div><button class='btn pink' data-id='" + p.id + "'>TANTANG</button></div>").join("") : "<p class='muted'>Belum ada pemain lain yang online. Coba Quick Match.</p>"); $("players").querySelectorAll("[data-id]").forEach(b => b.onclick = () => socket.emit("challenge:send", Number(b.dataset.id))); }
async function loadBoard() { try {
    const a = await api("/api/leaderboard");
    $("leaderboard").innerHTML = a.map((p, i) => "<div class='player'><span><span class='rank'>#" + (i + 1) + "</span> " + escapeHtml(p.username) + "</span><b>" + p.xp + " XP</b></div>").join("") || "Belum ada pemain.";
}
catch (e) { } }
function renderAnswers(a, enabled) { $("feedback").classList.add("hidden"); $("answers").innerHTML = a.map((v, i) => "<button class='answer' data-index='" + i + "' " + (enabled ? "" : "disabled") + ">" + String.fromCharCode(65 + i) + ". " + escapeHtml(v) + "</button>").join(""); [...$("answers").children].forEach(b => b.onclick = () => answer(Number(b.dataset.index))); }
function answer(n) { if (answered || turn !== slot)
    return; answered = true; clearInterval(tick); socket.emit("match:answer", { matchId, answer: n }); [...$("answers").children].forEach(b => b.disabled = true); }
function startTimer(active) { clearInterval(tick); timeLeft = 18; $("timer").textContent = timeLeft; if (!active)
    return; tick = setInterval(() => { timeLeft--; $("timer").textContent = timeLeft; if (timeLeft <= 0) {
    clearInterval(tick);
    answer(-1);
} }, 1000); }
$("quick").onclick = () => { if (socket?.connected) {
    socket.emit("queue:join");
    $("queueBox").classList.remove("hidden");
} };
$("cancelQueue").onclick = () => { socket.emit("queue:cancel"); $("queueBox").classList.add("hidden"); queueActive = false; };
$("refreshPlayers").onclick = () => socket.emit("online:get");
$("logout").onclick = () => { if (socket)
    socket.disconnect(); localStorage.removeItem("qq_token"); token = null; show("auth"); };
$("backHome").onclick = () => { enter(); };
$("openRoom").onclick = () => { show("roomPage"); $("roomLobby").classList.add("hidden"); $("roomMessage").textContent = ""; };
$("closeRoomPage").onclick = () => show("dashboard");
$("createRoom").onclick = () => { if (!socket?.connected)
    return toast("Koneksi belum siap."); socket.emit("room:create", { name: $("createRoomName").value, maxPlayers: Number($("roomCapacity").value) }); };
$("joinRoom").onclick = () => { if (!socket?.connected)
    return toast("Koneksi belum siap."); socket.emit("room:join", { name: $("joinRoomName").value }); };
$("roomReady").onclick = () => socket.emit("room:ready");
$("roomStart").onclick = () => socket.emit("room:start");
$("leaveRoom").onclick = () => { socket.emit("room:leave"); activeRoom = null; $("roomLobby").classList.add("hidden"); show("dashboard"); };
if (token)
    enter();
else
    show("auth");

