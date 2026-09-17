# AFKSnap API Docs

## Ringkasan

- Local server: `http://localhost:3000`
- REST base URL: `http://localhost:3000/api`
- Socket.IO URL: `http://localhost:3000`
- Content type default: `application/json`
- Upload: `multipart/form-data`
- Authentication private endpoint: `Authorization: Bearer <access_token>`

Postman collection REST tersedia di `postman/AFKSnap.postman_collection.json`. Pengujian event realtime dijelaskan di `docs/POSTMAN_SOCKET_IO_GUIDE.md` karena Postman menyimpan request Socket.IO pada koleksi terpisah dari HTTP.

## Format respons

Respons sukses mengikuti kebutuhan resource, misalnya:

```json
{
  "data": {}
}
```

Error memakai bentuk umum:

```json
{
  "status": 400,
  "error": "ValidationError",
  "message": "Pesan error yang aman ditampilkan"
}
```

Error internal dicatat di console server, tetapi detail stack trace dan pesan internal tidak dikirim ke client.

Kode HTTP utama:

| Status | Arti |
|---:|---|
| 200 | Request berhasil |
| 201 | Resource berhasil dibuat |
| 202 | Generation diterima dan diproses asynchronous |
| 400 | Payload/format tidak valid |
| 401 | Token/login/signature tidak valid |
| 402 | Credit tidak cukup |
| 403 | Tidak mempunyai role/akses resource |
| 404 | Resource/endpoint tidak ditemukan |
| 409 | Konflik seperti room penuh atau photo roll penuh |
| 410 | Room sudah kedaluwarsa |
| 413 | Upload melebihi 8 MB |
| 500 | Error internal |
| 502 | Payment gateway gagal merespons dengan benar |
| 503 | Integrasi belum dikonfigurasi |

## Health

### `GET /health`

Public. Memeriksa server dan konfigurasi AI.

```json
{
  "status": "ok",
  "service": "AFKSnap API",
  "aiMode": "mock",
  "aiConfigured": false,
  "aiImageModel": "gpt-image-1"
}
```

## Authentication

### `POST /api/auth/register`

Public. Membuat user, wallet, starter credit, dan JWT.

```json
{
  "name": "Arief Rizki",
  "email": "arief@example.com",
  "password": "Password123!",
  "passwordConfirmation": "Password123!",
  "birthday": "1998-01-20"
}
```

`birthday` opsional. Password minimal 6 karakter.

Respons `201`:

```json
{
  "access_token": "jwt-token",
  "user": {},
  "credit": 10
}
```

### `POST /api/auth/login`

```json
{
  "email": "demo@afksnap.id",
  "password": "Demo123!"
}
```

Respons menyertakan `access_token`, `user`, dan `credit`. Postman Collection otomatis menyimpan token.

### `POST /api/auth/google`

```json
{
  "credential": "google-id-token"
}
```

Server memverifikasi Google ID token terhadap `GOOGLE_CLIENT_ID`.

### `POST /api/auth/forgot-password`

```json
{
  "email": "arief@example.com"
}
```

Selalu memberi respons netral agar email terdaftar tidak dapat ditebak. Non-production dapat mengembalikan `devResetUrl`.

### `POST /api/auth/reset-password`

```json
{
  "token": "token-dari-reset-url",
  "password": "PasswordBaru123!",
  "passwordConfirmation": "PasswordBaru123!"
}
```

Token berlaku 30 menit dan hanya dapat digunakan satu kali.

## Templates

### `GET /api/templates`

Public. Mengambil template AI database yang aktif.

```json
{
  "data": []
}
```

Catatan: frame photobooth statis 1/2/3/6 slot berada pada frontend `constants/photoTemplates.js`, bukan endpoint ini.

## User profile

Semua endpoint bagian ini memerlukan Bearer JWT.

### `GET /api/users/me`

Mengembalikan user aktif dan wallet.

### `PATCH /api/users/me`

```json
{
  "name": "Arief Rizki Rachman",
  "birthday": "1998-01-20",
  "avatarAnimation": "float"
}
```

Nilai `avatarAnimation`: `none`, `float`, `pulse`, atau `bounce`.

## Credit

### `GET /api/credits/balance`

```json
{
  "balance": 10
}
```

### `GET /api/credits/transactions`

Mengembalikan maksimum 50 transaksi ledger terbaru.

```json
{
  "data": []
}
```

Jenis transaksi: `starter`, `generation`, `refund`, `purchase`, `admin`.

## Rooms

### `GET /api/rooms`

Daftar room yang diikuti user. Room expired akan ditutup sebelum query dikembalikan.

### `POST /api/rooms`

```json
{
  "name": "Reuni Kelas",
  "maxParticipants": 6
}
```

`maxParticipants` harus 2–6. Respons `201` menyertakan owner, memberships, assets, code, dan expiry 24 jam.

### `POST /api/rooms/join`

```json
{
  "code": "A1B2C3D4"
}
```

Idempoten untuk user yang sudah menjadi member. Menolak room penuh/expired.

### `GET /api/rooms/:roomId`

Memerlukan membership room.

### `GET /api/rooms/:roomId/messages`

Memerlukan membership. Mengambil maksimal 100 pesan secara ascending.

### `POST /api/rooms/:roomId/photos`

`multipart/form-data`:

| Field | Tipe | Ketentuan |
|---|---|---|
| `photo` | File | JPG, PNG, WebP; maksimal 8 MB |

Photo roll room maksimum 6 file. Setelah berhasil server broadcast `asset:added`.

### `DELETE /api/rooms/:roomId/photos/:assetId`

Peserta hanya dapat menghapus foto sendiri. Owner room dan admin dapat menghapus seluruh foto. Server menghapus record, file disk, lalu broadcast `asset:removed`.

## AI Generations

### `GET /api/generations`

Maksimum 50 job terbaru milik user beserta assets.

### `GET /api/generations/:id`

Mengambil detail job milik user.

### `POST /api/generations`

Respons `202`; pekerjaan diproses asynchronous dan progres dikirim melalui Socket.IO.

`multipart/form-data`:

| Field | Tipe | Nilai/contoh |
|---|---|---|
| `photos` | File, repeatable | 1–6 JPG/PNG/WebP, kecuali memakai foto room |
| `roomId` | Integer, opsional | ID room; semua source assets room digunakan |
| `generationType` | String | Lihat tabel preset |
| `format` | String | `square`, `card`, `story` |
| `layout` | Integer | `1`, `2`, `3`, `6` |
| `prompt` | String | Arahan tambahan pengguna |
| `mode` | String | Dikirim client untuk kompatibilitas; backend mengambil mode dari preset |
| `style` | String | Dikirim client untuk kompatibilitas; backend mengambil style dari preset |

Preset dan biaya dasar:

| `generationType` | Mode/style | Minimal foto | Credit dasar | Tambahan setelah 2 foto |
|---|---|---:|---:|---:|
| `solo-real` | studio/photorealistic | 1 | 2 | 0 |
| `together-real` | group/photorealistic | 2 | 4 | +1/orang |
| `together-animation` | group/animation | 2 | 5 | +1/orang |
| `together-superhero` | group/superhero | 2 | 7 | +1/orang |
| `together-80s` | group/photorealistic | 2 | 6 | +1/orang |
| `together-simpsons` | group/animation | 2 | 6 | +1/orang |

Formula biaya:

```text
baseCost + max(0, jumlahFoto - 2) × extraPersonCost
```

Respons:

```json
{
  "data": {
    "id": 123,
    "status": "queued",
    "progress": 0,
    "cost": 5
  },
  "balance": 20
}
```

Ketika proses gagal, status menjadi `failed`, `errorMessage` disimpan, dan credit dikembalikan satu kali.

## Payment dan upgrade

### `GET /api/payments/packages`

```json
{
  "packages": [],
  "midtransConfigured": true,
  "midtransEnvironment": "sandbox"
}
```

### `GET /api/payments/orders`

Maksimum 20 order terbaru milik user.

### `POST /api/payments/checkout`

```json
{
  "plan": "max"
}
```

Nilai berbayar: `pro` atau `max`. Respons `201`:

```json
{
  "order": {
    "orderId": "AFKSNAP-...",
    "status": "pending"
  },
  "redirectUrl": "https://app.sandbox.midtrans.com/snap/v4/redirection/..."
}
```

### `POST /api/payments/sync`

Sinkronisasi status dengan Midtrans dan memperbaiki order paid yang belum masuk credit.

Semua order terbaru:

```json
{}
```

Satu order:

```json
{
  "orderId": "AFKSNAP-..."
}
```

### `POST /api/payments/notification`

Public callback khusus server Midtrans. Signature diverifikasi dari `order_id + status_code + gross_amount + serverKey` dengan SHA-512.

Contoh struktur payload:

```json
{
  "order_id": "AFKSNAP-...",
  "status_code": "200",
  "gross_amount": "650000.00",
  "transaction_status": "settlement",
  "fraud_status": "accept",
  "signature_key": "sha512-signature"
}
```

Jangan membuat signature produksi secara manual dari frontend. Endpoint ini untuk Midtrans/server-to-server.

## Admin report

Memerlukan JWT dengan `role: admin`.

### `GET /api/admin/reports?period=daily`

Nilai period: `daily`, `weekly`, `monthly`, `yearly`.

Respons mencakup:

- `summary`: metrik periode aktif.
- `previousSummary`: periode pembanding.
- `comparisons`: current, previous, difference, percent.
- `series`: bucket diagram omzet dan metrik lain.
- total user dan total saldo wallet sistem.

## Socket.IO Docs

Socket client mengirim JWT melalui:

```js
io("http://localhost:3000", {
  auth: { token: accessToken }
});
```

### Client → server

| Event | Payload | Keterangan |
|---|---|---|
| `room:join` | `{ roomId }` | Cek room aktif dan membership, lalu join channel. |
| `room:leave` | `{ roomId }` | Keluar channel dan membersihkan status kamera pada perangkat tersebut. |
| `chat:send` | `{ roomId, content }` | Simpan dan broadcast pesan user. |
| `assistant:ask` | `{ roomId, content }` | Simpan pertanyaan, jalankan AI, simpan dan broadcast jawaban. |
| `typing:start` | `{ roomId }` | Mulai typing indicator. |
| `typing:stop` | `{ roomId }` | Hentikan typing indicator. |
| `camera:state` | `{ roomId, active }` | Status open/close camera peserta; mendukung acknowledgement. |
| `photo:sync:start` | `{ roomId, delaySeconds }` | Owner/admin memulai timer foto serentak. `delaySeconds` harus `3`, `5`, atau `10`; minimal dua peserta harus membuka kamera. |
| `photo:sync:result` | `{ roomId, sessionId, status, assetId?, message? }` | Setiap peserta melaporkan hasil upload `completed` atau `failed`. |
| `time:sync` | acknowledgement | Mengukur offset jam server menggunakan sampel round-trip terendah. |

`room:join`, `chat:send`, `assistant:ask`, `camera:state`, dan `photo:sync:start` mendukung acknowledgement `{ ok, data?, message? }`. Payload kosong atau tidak valid ditolak melalui acknowledgement dan tidak menjatuhkan proses Socket.IO.

### Server → client

| Event | Payload/kegunaan |
|---|---|
| `participant:online` | Peserta online setelah join. |
| `chat:message` | Pesan user/assistant/system. |
| `assistant:typing` | `{ active }`. |
| `typing:update` | `{ userId, name, active }`. |
| `camera:state` | `{ roomId, userId, name, active }`. |
| `camera:error` | Error update status camera. |
| `photo:sync:started` | `{ roomId, sessionId, captureAt, delaySeconds, initiatedBy, participantCount, participantUserIds, localEligible }`. Semua client memakai `captureAt` server sebagai sumber countdown. Hanya browser dengan `localEligible:true` yang menjepret. |
| `photo:sync:participant-result` | Status upload satu peserta beserta jumlah peserta yang selesai. |
| `photo:sync:finished` | `{ roomId, sessionId, reason, results }` setelah semua peserta melapor atau timeout. |
| `asset:added` | Asset foto room baru. |
| `asset:removed` | `{ id }` foto room yang dihapus. |
| `room:expired` | Room ditutup oleh scheduler. |
| `generation:progress` | Job dengan progress 15/45/85/100. |
| `generation:completed` | Job selesai. |
| `generation:failed` | Job gagal dan error message. |
| `wallet:updated` | `{ balance }` setelah generation/payment/refund. |

### Alur foto bersamaan realtime

1. Semua peserta membuka kamera dan mengizinkan akses webcam.
2. Client mengirim `camera:state` dengan `active:true`.
3. Owner mengirim `photo:sync:start`.
4. Server memvalidasi room, owner, pilihan timer, dan minimal dua kamera unik.
5. Server mengirim `photo:sync:started` dengan timestamp absolut `captureAt` dan eligibility khusus untuk setiap socket.
6. Client menghitung offset jam dengan tiga sampel `time:sync`, lalu menghitung sisa waktu dari `captureAt - waktuServerTerkoreksi`.
7. Kamera yang terdaftar membuat JPEG pada waktu tersebut dan mengunggahnya lewat `POST /api/rooms/:roomId/photos`.
8. Setiap client mengirim `photo:sync:result`; server menyiarkan progres peserta dan menutup sesi lebih awal ketika semua hasil sudah diterima.
9. Event `asset:added` memperbarui Redux seluruh peserta tanpa refresh.

Saat Socket.IO reconnect, middleware client otomatis join ulang ke room dan mengirim ulang status kamera aktif. Saat halaman room ditutup, client mengirim `room:leave` agar status kamera tidak tertinggal.

Video webcam tidak dikirim melalui Socket.IO. Hanya status kamera, instruksi waktu, dan hasil JPEG yang disinkronkan sehingga kebutuhan bandwidth tetap rendah.

## Urutan pengujian di Postman

1. Jalankan **Health**.
2. Jalankan **Login Demo**; token otomatis tersimpan ke `accessToken`.
3. Jalankan **Get My Profile** dan **Get Credit Balance**.
4. Jalankan **Create Room**; `roomId` dan `roomCode` otomatis tersimpan.
5. Jalankan **Upload Room Photo** minimal dua kali dengan file berbeda.
6. Jalankan **Create Room Generation**.
7. Pantau **Get Generation Detail** atau halaman Kreasi/Socket.IO.
8. Untuk pembayaran sandbox, jalankan **Checkout Max**, buka `redirectUrl`, selesaikan pembayaran, lalu **Sync Payment Status** dan **Get Credit Balance**.
9. Jalankan folder **08 - Error Handling Tests** untuk memverifikasi respons 400, 401, 403, dan 404.
10. Untuk chat, kamera, dan timer realtime, ikuti `docs/POSTMAN_SOCKET_IO_GUIDE.md` menggunakan dua akun berbeda.
