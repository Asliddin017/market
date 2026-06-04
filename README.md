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
- **🧾 Buyurtma (order) tizimi** — *yetkazib berish yo'q, faqat olib ketish*:
  - Mijoz savatchadan **"Buyurtma berish"** bosadi → buyurtma yaratiladi (holat:
    **"Buyurtma berildi"**) — narx va mahsulotlar **o'sha ondagi holatda** saqlanadi
    (snapshot).
  - Sotuvchi/admin **"Buyurtmalar"** bo'limida barcha buyurtmalarni ko'radi, ichini
    ochadi, tayyorlaydi va holatni **"Buyurtmangiz tayyor"** ga o'tkazadi
    (ixtiyoriy oraliq: *Tayyorlanmoqda*). Har bir holat **rangli belgi** + vaqt bilan.
  - **Mahsulot yo'q bo'lsa** sotuvchi o'sha qatorni **"yo'q"** deb belgilaydi → u
    umumiy summadan chiqariladi va **realtime** orqali ikkala tomonda ham qayta
    hisoblanadi; mijoz aniq ogohlantirish ko'radi.
  - **Narx vs son tahrirlash (o'lcham birligiga qarab)**:
    - **kg** mahsulotlar (tarozida tortiladigan — kazi, kolbasa): **narx** ham, **son**
      ham o'zgartiriladi (mijoz savatchada, sotuvchi buyurtmada). Masalan 35000 → 40000.
    - **dona** mahsulotlar (butun qadoq — muzqaymoq, butulka): **narx qat'iy**, hech kim
      o'zgartira olmaydi (42000 lik qadoqni 38000 ga sotib bo'lmaydi); faqat **son**
      o'zgartiriladi.
    - **Son** har doim (kg ham, dona ham) o'zgartiriladi — masalan sotuvchi "Flash ×3"
      ni ×1 ga tushiradi, jami ikkala tomonda jonli qayta hisoblanadi.
  - **🚬 Sigaretlar — pachka yoki dona**: sigaretni **pachka** (joriy narx) yoki **dona**
    sotish mumkin. Dona narxi: dastlabki 3 tasi (Палмалл простой, Милано, Кемал) —
    **1000 so'm/dona**; qolganlari — **2000 so'm/dona**, lekin **har 3 ta = 5000 so'm**.
    Xaridor pachka/dona ni mahsulot kartasi yoki savatchada tanlaydi.
  - **Chek (receipt)** — buyurtma tayyor bo'lganda mijoz chop etsa bo'ladigan chekni
    ko'radi (do'kon nomi **ASL ZIYO**, sana, mahsulotlar, yo'q mahsulotlar alohida,
    yakuniy summa).
  - Barcha narx hisob-kitobi **bitta manbadan** (`src/lib/pricing.js`) — savatcha, buyurtma,
    chek va server triggeri bir xil qoidani ishlatadi, shuning uchun mijoz va sotuvchi
    summasi **doim mos keladi**.

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
Har ikki yo'l bir xil natijani beradi. Keyin **4.1-bosqich**ga o'ting.

### 4.1) Buyurtma (order) tizimini yarating
`supabase/orders.sql` ni **`schema.sql` dan keyin** ishga tushiring — u `orders` +
`order_items` jadvallari, RLS siyosatlari, triggerlar (jami summani avtomatik qayta
hisoblash, `ready_at` belgisi) va realtime publication'ni qo'shadi. Shuningdek
`cart_items` ga `custom_price` (maxsus narx) ustunini qo'shadi. To'liq idempotent —
qayta ishga tushirsa ham xatosiz.

1. Supabase Dashboard → **SQL** → **New query**.
2. `supabase/orders.sql` ning butun mazmunini nusxalab joylashtiring.
3. **Run** bosing (`Success. No rows returned`).

```bash
# Yoki CLI bilan:
supabase db execute --file supabase/orders.sql
```

### 4.2) Narx qoidalari + sigaret dona narxini qo'shing
`supabase/piece_pricing.sql` ni **`orders.sql` dan keyin** ishga tushiring. U:
- `products` va `order_items` ga dona-narx ustunlarini qo'shadi (`sold_by_piece`,
  `piece_price`, `piece_bundle_qty`, `piece_bundle_price`) + `sell_mode` (pachka/dona);
- **'Sigaretlar'** kategoriyasini sozlaydi (3 ta maxsus = 1000; qolganlari = 2000, 3 ta
  = 5000) — **194 mahsulotni qayta seed qilish shart emas**, faqat sigaretlar yangilanadi;
- jami summa triggerini yangilaydi: **dona** mahsulotlarda maxsus narx e'tiborga
  olinmaydi (faqat **kg** da), sigaret dona narxi esa bundle bilan hisoblanadi.

To'liq idempotent. Maxsus uchlik nomi (Палмалл простой, Милано, Кемал) **katta-kichik
harfdan qat'i nazar** moslashtiriladi.

1. Supabase Dashboard → **SQL** → **New query**.
2. `supabase/piece_pricing.sql` ni nusxalab joylashtiring.
3. **Run** bosing.

```bash
# Yoki CLI bilan:
supabase db execute --file supabase/piece_pricing.sql
```

### 5) Email tasdiqlashni o'chiring
Username → sintetik email (`username@asl-ziyo.app`) sxemasi ishlatilgani uchun,
**Authentication → Providers → Email → "Confirm email"** ni **o'chiring**. Aks holda
yangi hisoblar tasdiqlanmagan holda qoladi.

### 6) 194 mahsulotni import qiling (seed)
```bash
npm run seed
```
Skript `src/data/products.json` dan 14 kategoriya + 194 mahsulotni Supabase ga
**upsert** qiladi (qayta ishga tushirsa — dublikat bo'lmaydi). U `.env.local` dagi
`SUPABASE_SERVICE_ROLE_KEY` ni o'qiydi (RLS ni chetlab o'tadi — shuning uchun faqat
lokalda/CI da ishlating, frontendga chiqarmang).

#### Toza qayta seed (clean re-seed)
```bash
npm run reseed
```
`npm run seed` faqat **qo'shadi/yangilaydi** — JSON dan olib tashlangan eski
qatorlarni (masalan, qayta nomlangan yoki bo'lingan kategoriyalarni) **o'chirmaydi**.
Agar kategoriyalar o'zgargan bo'lsa (masalan ichimliklar idish turi bo'yicha
`Ichimliklar — Banka`, `Ichimliklar — Butulka`, `Energetik — Banka` … ga bo'lingan
bo'lsa), `npm run reseed` ishlating. U:

1. mavjud `categories` + `products` ni (va ularga bog'liq `cart_items` /
   `price_history` qatorlarini, **FK-xavfsiz tartibda**) o'chiradi — savatchada
   o'chirilgan mahsulotga ishora qiluvchi qatorlar tozalanadi (ilova xato bermaydi),
2. so'ng `products.json` dagi **aynan** kategoriya va mahsulotlarni qaytadan
   kiritadi — dublikat ham, eski qoldiq ham qolmaydi.

Idempotent: bir necha marta ishga tushirsa ham natija bir xil. Xuddi `seed` kabi
`.env.local` dagi `SUPABASE_SERVICE_ROLE_KEY` ni ishlatadi (RLS ni chetlab o'tadi —
frontendga / Vercel ga **qo'shmang**).

> ⚠️ `reseed` **barcha savatchalarni ham tozalaydi** (cart_items butunlay
> o'chiriladi), chunki barcha mahsulot ID'lari yangidan yaratiladi.

#### Qo'shimcha mahsulotlarni MERGE qilish (`npm run import-extra`)
Mavjud mahsulotlarga **tegmasdan** yangi mahsulot/kategoriya partiyasini qo'shish
uchun `src/data/products_extra.json` faylini joylashtiring (struktura
`products.json` bilan **bir xil**: `{ "categories": [...], "products": [...] }`),
so'ng:
```bash
npm run import-extra
```
Bu skript **faqat qo'shadi** (`scripts/import-extra.js`) — `seed`/`reseed` dan
farqli o'laroq hech narsani **o'chirmaydi, qayta yozmaydi yoki qayta seed
qilmaydi**:

- **Kategoriyalar**: fayldagi **mavjud bo'lmagan** kategoriyalarnigina yaratadi
  (nom bo'yicha solishtiradi). Mavjud kategoriyalar (emoji/slug) **o'zgarmaydi**.
  Yangi kategoriya emoji'si avtomatik `categoryIcons.js` resolveridan olinadi.
- **Mahsulotlar**: faqat **mavjud bo'lmagan** `(kategoriya + nom)` juftliklarini
  qo'shadi. Nomlar Title Case (yozishdagi normalizatsiya) bilan solishtiriladi.
- **Idempotent**: ikkinchi marta ishga tushirsangiz hech narsa qo'shilmaydi.
  Oxirida nechta **qo'shildi** va nechta **o'tkazib yuborildi** (mavjud) hisobini
  chiqaradi, hamda biror kategoriya standart 🛒 ikonkaga tushsa **ogohlantiradi**.
- Yangi mahsulotlar **bir xil narx qoidasiga** bo'ysunadi: `kg` mahsulotlarda
  narx tahrirlanadi, `dona` da narx qat'iy (mantiq `src/lib/pricing.js` + UI da,
  `unit` ustuniga bog'liq). Bu kategoriyalar **sigaret emas**, shuning uchun
  mijozlarga ko'rinadi (maxsus belgilar qo'yilmaydi).

Xuddi `seed` kabi `.env.local` dagi `SUPABASE_SERVICE_ROLE_KEY` ni o'qiydi (RLS ni
chetlab o'tadi — frontendga / Vercel ga **qo'shmang**).

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
- Buyurtma RLS siyosatlari (`supabase/orders.sql`):
  - Mijoz **faqat o'z** buyurtmalarini yaratadi va ko'radi; **holatni o'zgartira olmaydi**.
  - **Admin + sotuvchi** — **barcha** buyurtmalarni ko'radi, holatni o'zgartiradi va
    qatorni "yo'q" deb belgilaydi.
  - **Faqat admin** — buyurtmani **o'chiradi**.
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
├── schema.sql              # Jadvallar + RLS siyosatlari + triggerlar (SQL editorda ishga tushiring)
├── orders.sql              # Buyurtma tizimi: orders + order_items + RLS + triggerlar (schema.sql dan keyin)
└── piece_pricing.sql       # Narx qoidalari (kg/dona) + sigaret dona narxi (orders.sql dan keyin)
scripts/
├── seed.js                 # 194 mahsulotni Supabase ga import (service_role, idempotent; --clean = reseed)
└── import-extra.js         # products_extra.json ni MERGE (additive, idempotent; mavjudga tegmaydi)
.env.example                # Env o'zgaruvchilar shabloni
vercel.json                 # SPA rewrite (F5 da 404 bo'lmasligi uchun)
src/
├── App.jsx                 # Sessiya bootstrap, rolga asoslangan routing
├── main.jsx                # React + Router + ErrorBoundary
├── data/products.json      # 194 mahsulot / 14 kategoriya (seed manbasi)
├── data/products_extra.json # Qo'shimcha mahsulotlar (import-extra MERGE manbasi)
├── store/
│   ├── authStore.js        # Supabase Auth (login / register / sessiya / rol)
│   ├── cartStore.js        # Savatcha — Supabase cart_items (+ maxsus narx)
│   └── uiStore.js          # Faol fon mavzusi
├── lib/
│   ├── supabase.js         # Supabase klient (env vars)
│   ├── account.js          # username ↔ sintetik email
│   ├── constants.js        # UNITS, kategoriya emoji xaritasi
│   ├── roles.js            # Rollar + ruxsatlar matritsasi (can())
│   ├── search.js           # Aqlli fuzzy qidiruv + normalize()
│   ├── pricing.js          # YAGONA narx manbai: kg/dona narx, sigaret dona/bundle (pure)
│   ├── orders.js           # Buyurtma mantiqi: holatlar (+ pricing'ga delegatsiya)
│   ├── categoryThemes.js   # Yengil CSS fon mavzulari
│   └── utils.js            # Format, slugify, toTitleCase, rasm yuklash
├── hooks/
│   ├── useData.js          # Supabase reads (realtime) + mutatsiyalar + buyurtmalar + eksport/import
│   └── useThemeKey.js
├── components/
│   ├── ErrorBoundary.jsx   # Runtime xatoda bo'sh ekran o'rniga xabar
│   ├── BackupControls.jsx  # Admin: eksport / import
│   ├── PriceHistory.jsx    # "Narx tarixi" ro'yxati
│   ├── OrderStatusBadge.jsx, Receipt.jsx  # Buyurtma holati belgisi + chop etiladigan chek
│   ├── Layout.jsx, Navbar.jsx, CategoryBackground.jsx
│   ├── ProductCard.jsx, ProductForm.jsx, QuickAddProducts.jsx
│   └── ProductImage.jsx, SearchBar.jsx, ConfirmDialog.jsx
└── pages/
    ├── Login.jsx
    ├── Home.jsx, Products.jsx, Categories.jsx, CartPage.jsx
    ├── Orders.jsx, OrderDetail.jsx   # Buyurtmalar ro'yxati + tafsilot/chek
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
| Savatcha (xarid) + buyurtma berish       |  ❌   |    ❌    |  ✅   |
| O'z buyurtmalarini ko'rish + chek        |  ❌   |    ❌    |  ✅   |
| Barcha buyurtmalar + holat + "yo'q"      |  ✅   |    ✅    |  ❌   |
| Buyurtmani o'chirish                     |  ✅   |    ❌    |  ❌   |

---

## 💡 Eslatmalar

- **Bo'sh sahifa yo'q**: har bir ro'yxat sahifasi *loading → spinner*, *xato → xabar*,
  *bo'sh → "Hech narsa topilmadi"*, *ma'lumot → ro'yxat* holatlarini aniq ko'rsatadi.
  Yuqorida `ErrorBoundary` runtime xatoda oq ekran o'rniga xabar chiqaradi.
- **Title Case**: mahsulot va kategoriya nomlari saqlashda normallashtiriladi
  (`"KATTA"`/`"katta"` → `"Katta"`, `"katta suv"` → `"Katta Suv"`; lotin va kirill).
- **Narxlar** butun son (so'm) sifatida saqlanadi; har bir o'zgarish `price_history` ga
  yoziladi.
- **Realtime** uchun `products` va `categories` (schema.sql), shuningdek `orders` va
  `order_items` (orders.sql) jadvallari `supabase_realtime` publication ga qo'shilgan —
  yangi buyurtma va holat/"yo'q" o'zgarishlari barcha qurilmalarda jonli ko'rinadi.
- **Buyurtma jami summasi** server tomonida hisoblanadi: `order_items` o'zgarsa, DB
  trigger (`supabase/piece_pricing.sql`) `orders.total` ni faqat **mavjud** qatorlardan
  qayta hisoblaydi. Trigger `src/lib/pricing.js` bilan **bir xil qoidani** ishlatadi:
  maxsus narx faqat **kg** da, **dona** narxi qat'iy, sigaret dona narxi bundle bilan.
  Shuning uchun mijoz va sotuvchi summasi doim mos keladi. ⚠️ `pricing.js` qoidasini
  o'zgartirsangiz, SQL triggerni ham yangilang.
- **Chek (chop etish)**: chek tayyor bo'lganda `window.print()` faqat chekni chop etadi
  (navbar/tugmalar yashiriladi — `@media print` `src/index.css` da).
- Ma'lumotni noldan tiklash: `npm run reseed` ishga tushiring — u eski
  kategoriya/mahsulotlarni (va bog'liq cart_items / price_history qatorlarini)
  o'chirib, `products.json` dan toza holda qaytadan to'ldiradi.
