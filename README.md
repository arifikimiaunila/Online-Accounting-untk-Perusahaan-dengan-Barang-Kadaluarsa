# 🧾 Akuntansi Toko Online

Aplikasi akuntansi/penjualan untuk toko dengan **barang yang memiliki tanggal kadaluarsa** dan **barang tanpa kadaluarsa**.

- **Backend**: Django + Django REST Framework + MySQL
- **Frontend**: React + TypeScript + Vite + Tailwind CSS

## ✨ Fitur

- Kelola **Barang** (dengan penanda `has_expiry`) dan **Kategori**
- Kelola **Batch** untuk barang kadaluarsa (kode batch, tanggal kadaluarsa, tanggal masuk)
- **Stok** per barang & per batch, termasuk laporan barang menipis
- **Penjualan** dengan pengurangan stok otomatis **FEFO** (First Expired, First Out)
- **Pembelian** dari supplier dengan penambahan stok otomatis (buat batch baru)
- **Pelanggan** dan **Pemasok**
- **Akuntansi**: jurnal otomatis (debit/kredit), jurnal manual, neraca saldo, laporan laba/rugi, daftar akun
- **Dashboard** dengan ringkasan penjualan, nilai inventori, dan peringatan kadaluarsa — **menyesuaikan role** yang login
- **Role pengguna** (admin/kasir/gudang/akuntan) dengan kontrol akses per fitur
- **Ekspor laporan** ke CSV & PDF (penjualan, pembelian, laba/rugi, neraca saldo, kartu stok)

## 👥 Role Pengguna

| Role | Akses |
| --- | --- |
| **Admin** | Akses penuh ke semua fitur |
| **Kasir** | Penjualan & pelanggan penuh; barang/kategori/stok/laporan hanya baca |
| **Gudang** | Barang, kategori, batch, pembelian & pemasok penuh; lainnya baca |
| **Akuntan** | Akuntansi (jurnal, akun, laporan) penuh; transaksi & master data baca |

Superuser (`createsuperuser`) otomatis menjadi **Admin**.

Admin dapat mengelola role pengguna lewat menu **Pengguna** di sidebar (khusus admin).

## 📁 Struktur

```
backend/          Proyek Django (REST API)
  config/         Settings, URLs
  apps/
    catalog/      Category, Product, ProductBatch, Inventory + logika stok
    parties/      Customer, Supplier
    sales/        Sale, SaleItem
    purchases/    Purchase, PurchaseItem
    accounting/   ChartOfAccount, JournalEntry + laporan
frontend/         React + TypeScript + Tailwind (Vite)
```

## 🗄️ Skema Database

Sesuai spesifikasi: `Products`, `Product_Batch`, `Categories`, `Inventory`,
`Sales`, `Sale_Items`, `Purchases`, `Purchase_Items`, `Suppliers`, `Customers`,
ditambah `ChartOfAccount` dan `JournalEntry` untuk akuntansi formal.

- Barang **tanpa kadaluarsa** → `expiry_date` bernilai `NULL`
- Barang **dengan kadaluarsa** → stok dipantau per batch

## 🚀 Menjalankan Sekali Jalan (Windows)

Dari PowerShell di folder proyek, cukup jalankan:

```powershell
.\start.ps1
```

Skrip ini otomatis: membuat venv & install dependensi backend, membuat `.env`,
membuat database MySQL (jika `mysql` tersedia di PATH), menjalankan migrasi,
mengisi data demo, menginstall dependensi frontend, lalu menjalankan backend
(`http://127.0.0.1:8000`) dan frontend (`http://localhost:5173`).

> Syarat: Python 3.10+, Node.js, dan MySQL berjalan. Sebelumnya sesuaikan
> `backend/.env` untuk kredensial database bila perlu.

## 🚀 Menjalankan Backend

### 1. Buat database MySQL

```sql
CREATE DATABASE akuntansi_toko CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Konfigurasi environment

```bash
cd backend
copy .env.example .env   # lalu sesuaikan DB_USER, DB_PASSWORD, dst.
```

### 3. Buat virtual environment & install

```bash
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
```

### 4. Migrasi & seed data demo

```bash
python manage.py migrate
python manage.py seed_demo   # opsional: data contoh
```

Buat akun pengguna (superuser) untuk login:

```bash
python manage.py createsuperuser
```

Anda juga bisa mendaftar langsung dari halaman **Daftar** di frontend.

### 5. Jalankan server

```bash
python manage.py runserver
```

API tersedia di `http://127.0.0.1:8000/api/` dan admin di
`http://127.0.0.1:8000/admin/`.

## 🎨 Menjalankan Frontend

```bash
cd frontend
npm install
npm run dev
```

Buka `http://localhost:5173`. Vite sudah di-proxy ke backend di port 8000.

## 🔌 Endpoint API Utama

> **Autentikasi JWT**: semua endpoint dilindungi. Login dulu untuk mendapat token,
> lalu kirim header `Authorization: Bearer <access>`.

| Endpoint | Deskripsi |
| --- | --- |
| `/api/auth/register/` | Daftar pengguna baru |
| `/api/auth/token/` | Login (mendapat `access` & `refresh`) |
| `/api/auth/token/refresh/` | Perpanjang access token |
| `/api/auth/me/` | Profil pengguna login |
| `/api/users/` | Daftar pengguna + ubah role (khusus **Admin**) |
| `/api/products/` | CRUD barang |
| `/api/categories/` | CRUD kategori |
| `/api/batches/` | Batch barang |
| `/api/batches/expiring/?days=30` | Batch mendekati kadaluarsa |
| `/api/inventory/` | Posisi stok |
| `/api/stock-movements/` | Riwayat mutasi stok (keluar/masuk) |
| `/api/stock-movements/stock_card/?product=ID&start=&end=` | Kartu stok per barang + saldo berjalan |
| `/api/sales/` | Penjualan (FEFO otomatis) |
| `/api/purchases/` | Pembelian (tambah stok otomatis) |
| `/api/customers/` | Pelanggan |
| `/api/suppliers/` | Pemasok |
| `/api/journal-entries/` | Jurnal (CRUD) |
| `/api/journal-entries/trial_balance/` | Neraca saldo |
| `/api/journal-entries/profit_loss/` | Laba/rugi |
| `/api/dashboard/summary/` | Ringkasan dashboard |

## 📤 Ekspor Laporan (CSV & PDF)

Tambahkan `?format=csv` atau `?format=pdf` (default CSV):

| Endpoint | Laporan |
| --- | --- |
| `/api/reports/sales/` | Penjualan (mendukung `date_after`/`date_before`) |
| `/api/reports/purchases/` | Pembelian (mendukung `date_after`/`date_before`) |
| `/api/reports/profit-loss/` | Laba / Rugi (Admin/Akuntan) |
| `/api/reports/trial-balance/` | Neraca Saldo (Admin/Akuntan) |
| `/api/reports/stock-card/?product=ID` | Kartu Stok (mendukung `start`/`end`/`format`) |

> **Filter tanggal**: endpoint `sales`, `purchases`, `journal-entries`, dan
> `stock-movements` mendukung `?date_after=YYYY-MM-DD&date_before=YYYY-MM-DD`
> untuk rentang tanggal.

## ⚙️ Teknologi

- Django 5.2, Django REST Framework, PyMySQL, django-filter, django-cors-headers
- React 18, TypeScript 5, Vite 5, Tailwind CSS 3, React Router 6, Axios
