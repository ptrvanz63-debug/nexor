# Quiz Quest PPLG V5 — Neon Battle Arena

Project kuis PPLG berbasis Node.js, Express, Socket.IO, dan MySQL/MariaDB.

## Pembaruan tampilan
- Tampilan UI diperbarui dengan layout yang lebih konsisten, tipografi baru, panel berlapis, kontras dan jarak yang lebih rapi.
- Layout responsif untuk desktop, laptop, tablet, dan ponsel; area jawaban dan panel menyesuaikan ukuran layar.
- CSS dan JavaScript frontend dipisahkan dari HTML agar lebih mudah dirawat.
- Struktur HTML dibuat lebih rapi dan ditambahkan metadata, label aksesibilitas, serta fokus keyboard.

## Fitur game
- Login dan registrasi MySQL; setelah registrasi pemain harus login manual.
- Quick Match dan tantangan 1v1.
- Multiplayer Room: Create Room, Join Room berdasarkan nama, kapasitas 2–12 pemain, lobby, Ready, Host Start, dan klasemen.
- Room battle: 10 soal, 20 detik per soal; jawaban pertama mengunci soal untuk semua pemain.
- Bank soal tingkat dasar kelas 10: Algoritma, Python, AI, dan Flowchart.

## Struktur project
- `server.js` — server Express, API, Socket.IO, dan logika game.
- `public/index.html` — struktur halaman.
- `public/style.css` — seluruh style dan responsive layout.
- `public/app.js` — interaksi frontend dan komunikasi Socket.IO.
- `.env.example` — contoh konfigurasi environment.

## Instalasi
1. Ekstrak ZIP project.
2. Jalankan `npm install`.
3. Salin `.env.example` menjadi `.env`.
4. Isi `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, dan `DB_NAME` sesuai database Anda.
5. Pastikan database memiliki tabel `users` dan `match_history` sesuai file SQL/skema project.
6. Jalankan `npm start`.

## Catatan keamanan dan database
- Jangan membagikan file `.env` yang berisi kredensial. File `.env` lokal tidak disertakan dalam ZIP ini.
- Default port MySQL adalah `3306`; port aplikasi diatur terpisah melalui `PORT`.
- Untuk Pterodactyl + Docker, `DB_HOST` harus menggunakan alamat host/gateway MariaDB yang dapat dijangkau container.
- Jangan gunakan `127.0.0.1` sebagai DB_HOST kecuali MySQL memang berjalan di container/host network yang sama dan alamat tersebut dapat dijangkau dari proses Node.js.

## Aturan Room
- Nama room 3–24 karakter dan unik selama room aktif.
- Kapasitas 2–12 pemain.
- Hanya host yang dapat memulai, minimal dua pemain dan semua pemain harus Ready.
- Pemain pertama yang menjawab mengunci pertanyaan bagi seluruh room.
- Timer room dikelola server, bukan jam browser.

## Pemeriksaan
- Sintaks `server.js` dan `public/app.js` telah diperiksa dengan Node.js.
- Pemeriksaan ini tidak menggantikan uji koneksi MySQL, uji browser, atau pengujian multiplayer dari beberapa perangkat.
