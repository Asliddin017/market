# 🛍️ ASL_ZIYO — Do'kon boshqaruvi

Oziq-ovqat do'koni uchun **mahsulotlarni boshqarish va xarid qilish** tizimi.
Uchta rol, aqlli (xato-bardosh) qidiruv, **tezkor & yengil** zamonaviy dizayn va
**Supabase** (Postgres + Auth + Realtime) backend — barcha qurilmalar **bitta umumiy
ma'lumotlar bazasini** ko'radi.

> **Tezlik — birinchi o'rinda.** Og'ir Three.js / WebGL fonlar olib tashlandi.
> Fonlar endi faqat **yengil CSS** (gradient + GPU-friendly transform animatsiya)
> orqali quriladi — eski/sust telefonlarda ham silliq ishlaydi (~60fps).

> Project name: **ASL_ZIYO** · UI tili: **O'zbekcha** · Backend: **Supabase**.

---

## ✨ Asosiy imkoniyatlar

- **Haqiqiy autentifikatsiya (Supabase Auth)** — login (username) + parol bilan kirish
  va **ro'yxatdan o'tish**. Parollarni Supabase xavfsiz boshqaradi (bcrypt). Eski
  IndexedDB/SHA-256 auth olib tashlandi.
  - Ro'yxatdan o'tgan har bir foydalanuvchi **mijoz (client)** sifatida yaratiladi
    (DB trigger profil yozuvini ochadi).
  - Sessiya saqlanadi (refresh va boshqa qurilmalarda ham).
- **3 ta rol** (`src/lib/roles.js` + DB ichidagi RLS):
  - 🛡️ **Administrator** — to'liq nazorat (qo'shish / tahrirlash / **o'chirish** +
    **foydalanuvchilarni boshqarish** + eksport/import).
  - 🧑‍💼 **Sotuvchi** — qo'shish va tahrirlash; **o'chirish mumkin emas**.
  - 🛒 **Mijoz** — ko'rish, qidirish va **savatcha** bilan xarid.
- **Realtime sinxronizatsiya** — admin/sotuvchi bir qurilmada mahsulot qo'shsa/tahrirlasa,
  boshqa qurilmalarda ro'yxat **avtomatik** yangilanadi (Supabase Realtime).
- **Eksport / Import (zaxira)** — admin barcha mahsulot + kategoriyalarni **JSON** ga
  yuklab oladi va JSON dan tiklaydi (idempotent upsert; importdan oldin sonlar
  tasdiqlanadi).
- **📈 Narx tarixi** — mahsulot narxi o'zgarganda DB trigger `price_history` ga yozadi;
  tahrirlash oynasida "Narx tarixi" ro'yxati ko'rsatiladi.
- **Mahsulotlar**: nomi (**Title Case**ga normallashtiriladi), kategoriya, **narx**
  (so'm, butun son), o'lcham birligi (dona / kg / litr), **ixtiyoriy rasm**. Soni
  cheksiz; diqqat **narxlarda**.
- **🕒 Vaqt belgilari** hamma joyda (`DD.MM.YYYY HH:MM`).
- **Kategoriyalar**: qo'shish / tahrirlash / o'chirish (o'chirish faqat admin), filtr.
- **Tezkor mahsulot qo'shish** (admin / sotuvchi): kategoriya qulflanadi, ketma-ket
  qo'shish.
- **Aqlli qidiruv** (Fuse.js + O'zbek/kirill normalizatsiya, xato-bardosh, real-time,
  muhimlik bo'yicha saralash).
- **Savatcha** — Supabase `cart_items` da har bir mijoz uchun saqlanadi; admin
  mijozning savatchasini ko'ra oladi (RLS bilan himoyalangan).

---

## 🚀 O'rnatish (to'liq)

Talab: **Node.js 18+** (ishlab chiqilgan: Node 22) + bepul **Supabase** loyihasi.

### 1) Bog'liqliklar
```bash
npm install
```

### 2) Supabase loyihasini yarating
1. <https://supabase.com> da yangi **project** oching.
2. **Project Settings → API** bo'limidan oling:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** kalit → `VITE_SUPABASE_ANON_KEY`
   - **service_role** kalit → `SUPABASE_SERVICE_ROLE_KEY` (faqat seed uchun!)

### 3) `.env.local` yarating
`.env.example` dan nusxa oling:
```bash
cp .env.example .env.local   # Windows: copy .env.example .env.local
```
va qiymatlarni to'ldiring:
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...   # faqat seed; Vercel ga QO'SHMANG
```

### 4) Sxema + RLS ni yarating
`supabase/schema.sql` jadvallar, helper funksiyalar, triggerlar va RLS
siyosatlarini **to'g'ri tartibda** (jadvallar birinchi) yaratadi. To'liq
idempotent — bir necha marta ishga tushirsa ham xatosiz. Ikki yo'l bor:

**Option A — qo'lda (SQL Editor):**
1. Supabase Dashboard → **SQL** → **New query**.
2. `supabase/schema.sql` ning butun mazmunini nusxalab joylashtiring.
3. **Run** bosing. Xato bo'lmasligi kerak (`Success. No rows returned`).

**Option B — Supabase CLI (mashinangizdan push):**
```bash
# 1. CLI o'rnatish (npm orqali; yoki: scoop install supabase / brew install supabase/tap/supabase)
npm install -g supabase

# 2. Hisobga kirish (brauzer ochiladi)
supabase login

# 3. Loyihaga ulanish (PROJECT_REF ni Dashboard URL'idan oling: app.supabase.com/project/<PROJECT_REF>)
supabase link --project-ref <PROJECT_REF>

# 4a. SQL faylni to'g'ridan-to'g'ri bazaga yuborish (eng oddiy):
supabase db execute --file supabase/schema.sql

#   (Eslatma: ba'zi CLI versiyalarida buyruq `supabase db query --file ...` yoki
#    psql orqali bo'lishi mumkin:)
#   psql "$(supabase db connection-string)" -f supabase/schema.sql

# 4b. Yoki migration sifatida boshqarish:
#   mkdir -p supabase/migrations
#   cp supabase/schema.sql "supabase/migrations/$(date +%Y%m%d%H%M%S)_init.sql"
#   supabase db push
```
Har ikki yo'l bir xil natijani beradi. Keyin **5-bosqich**ga o'ting.

### 5) Email tasdiqlashni o'chiring
Username → sintetik email (`username@asl-ziyo.app`) sxemasi ishlatilgani uchun,
**Authentication → Providers → Email → "Confirm email"** ni **o'chiring**. Aks holda
yangi hisoblar tasdiqlanmagan holda qoladi.

### 6) 194 mahsulotni import qiling (seed)
```bash
npm run seed
```
Skript `src/data/products.json` dan 11 kategoriya + 194 mahsulotni Supabase ga
**upsert** qiladi (qayta ishga tushirsa — dublikat bo'lmaydi). U `.env.local` dagi
`SUPABASE_SERVICE_ROLE_KEY` ni o'qiydi (RLS ni chetlab o'tadi — shuning uchun faqat
lokalda/CI da ishlating, frontendga chiqarmang).

### 7) Birinchi adminni yarating
1. Ilovani oching (`npm run dev`) va **`Asliddin017`** username bilan ro'yxatdan o'ting
   (parolni o'zingiz tanlaysiz — Supabase saqlaydi).
2. Supabase SQL Editor da rolni admin qiling:
   ```sql
   update public.profiles set role = 'admin' where username = 'Asliddin017';
   ```
3. Tizimga qayta kiring — endi siz adminsiz.

### 8) Ishga tushirish
```bash
npm run dev       # http://localhost:5173
npm run build     # production build
npm run preview   # build natijasini ko'rish
```

---

## ☁️ Vercel ga deploy

1. Repozitoriyani Vercel ga ulang (framework: **Vite**).
2. **Settings → Environment Variables** ga **faqat** quyidagilarni qo'shing:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - ⚠️ `SUPABASE_SERVICE_ROLE_KEY` ni **QO'SHMANG** (u faqat seed skript uchun).
3. `vercel.json` SPA rewrite (`/(.*) → /index.html`) saqlanadi — shuning uchun
   `/products`, `/categories`, `/users` da **F5** bossangiz ham sahifa to'liq ochiladi.

---

## 🔐 Xavfsizlik eslatmalari

- **anon kalit** frontendda ko'rsatilishi **xavfsiz** — ma'lumotni **Row Level
  Security (RLS)** himoya qiladi, kalit emas. Barcha jadvallarda RLS yoqilgan.
- **service_role kalitini HECH QACHON** frontend kodiga yoki Vercel ga qo'ymang. U
  RLS ni chetlab o'tadi va faqat lokal seed skript uchun (`.env.local`, git'dan
  chiqarilgan).
- RLS siyosatlari (`supabase/schema.sql`):
  - Hamma autentifikatsiyalangan foydalanuvchi mahsulot/kategoriyalarni **o'qiy** oladi.
  - **Admin + sotuvchi** — mahsulot/kategoriya **qo'shish/tahrirlash**.
  - **Faqat admin** — **o'chirish** va rollarni boshqarish.
  - Mijoz **faqat o'z** savatchasini o'qiydi/yozadi; admin har qanday savatchani o'qiy
    oladi.
- `.gitignore` `.env*` (lekin `.env.example` emas) fayllarini chiqarib tashlaydi.

---

## 🧱 Texnologiyalar

| Soha          | Texnologiya                                       |
| ------------- | ------------------------------------------------- |
| UI            | React 18 + Vite + Tailwind CSS                    |
| Backend       | **Supabase** — Postgres + Auth + Realtime + RLS   |
| Fon / dizayn  | Yengil CSS gradientlar (WebGL emas)               |
| Animatsiya    | Framer Motion (yengil saqlangan)                  |
| Qidiruv       | Fuse.js + maxsus O'zbek/kirill normalizatsiya     |
| Holat (state) | Zustand                                           |

---

## 📁 Loyiha tuzilishi

```
supabase/
└── schema.sql              # Jadvallar + RLS siyosatlari + triggerlar (SQL editorda ishga tushiring)
scripts/
└── seed.js                 # 194 mahsulotni Supabase ga import (service_role, idempotent)
.env.example                # Env o'zgaruvchilar shabloni
vercel.json                 # SPA rewrite (F5 da 404 bo'lmasligi uchun)
src/
├── App.jsx                 # Sessiya bootstrap, rolga asoslangan routing
├── main.jsx                # React + Router + ErrorBoundary
├── data/products.json      # 194 mahsulot / 11 kategoriya (seed manbasi)
├── store/
│   ├── authStore.js        # Supabase Auth (login / register / sessiya / rol)
│   ├── cartStore.js        # Savatcha — Supabase cart_items
│   └── uiStore.js          # Faol fon mavzusi
├── lib/
│   ├── supabase.js         # Supabase klient (env vars)
│   ├── account.js          # username ↔ sintetik email
│   ├── constants.js        # UNITS, kategoriya emoji xaritasi
│   ├── roles.js            # Rollar + ruxsatlar matritsasi (can())
│   ├── search.js           # Aqlli fuzzy qidiruv + normalize()
│   ├── categoryThemes.js   # Yengil CSS fon mavzulari
│   └── utils.js            # Format, slugify, toTitleCase, rasm yuklash
├── hooks/
│   ├── useData.js          # Supabase reads (realtime) + mutatsiyalar + eksport/import + narx tarixi
│   └── useThemeKey.js
├── components/
│   ├── ErrorBoundary.jsx   # Runtime xatoda bo'sh ekran o'rniga xabar
│   ├── BackupControls.jsx  # Admin: eksport / import
│   ├── PriceHistory.jsx    # "Narx tarixi" ro'yxati
│   ├── Layout.jsx, Navbar.jsx, CategoryBackground.jsx
│   ├── ProductCard.jsx, ProductForm.jsx, QuickAddProducts.jsx
│   └── ProductImage.jsx, SearchBar.jsx, ConfirmDialog.jsx
└── pages/
    ├── Login.jsx
    ├── Home.jsx, Products.jsx, Categories.jsx, CartPage.jsx
    └── Users.jsx
```

---

## 🔐 Ruxsatlar (rolga asoslangan)

Frontendda `src/lib/roles.js` (`can(role, capability)`), backendda esa **RLS** —
ikkala qatlamda ham bir xil qoidalar:

| Imkoniyat                                | Admin | Sotuvchi | Mijoz |
| ---------------------------------------- | :---: | :------: | :---: |
| Mahsulot/kategoriya qo'shish/tahrir      |  ✅   |    ✅    |  ❌   |
| Mahsulot/kategoriya o'chirish            |  ✅   |    ❌    |  ❌   |
| Foydalanuvchilarni boshqarish (`/users`) |  ✅   |    ❌    |  ❌   |
| Eksport / Import                         |  ✅   |    ❌    |  ❌   |
| Savatcha (xarid)                         |  ❌   |    ❌    |  ✅   |

---

## 💡 Eslatmalar

- **Bo'sh sahifa yo'q**: har bir ro'yxat sahifasi *loading → spinner*, *xato → xabar*,
  *bo'sh → "Hech narsa topilmadi"*, *ma'lumot → ro'yxat* holatlarini aniq ko'rsatadi.
  Yuqorida `ErrorBoundary` runtime xatoda oq ekran o'rniga xabar chiqaradi.
- **Title Case**: mahsulot va kategoriya nomlari saqlashda normallashtiriladi
  (`"KATTA"`/`"katta"` → `"Katta"`, `"katta suv"` → `"Katta Suv"`; lotin va kirill).
- **Narxlar** butun son (so'm) sifatida saqlanadi; har bir o'zgarish `price_history` ga
  yoziladi.
- **Realtime** uchun `products` va `categories` jadvallari `supabase_realtime`
  publication ga qo'shilgan (schema.sql da).
- Ma'lumotni noldan tiklash: Supabase'da jadval qatorlarini tozalang va `npm run seed`
  ni qayta ishga tushiring.
