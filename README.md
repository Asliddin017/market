# 🛍️ ASL_ZIYO — Do'kon boshqaruvi

Oziq-ovqat do'koni uchun **mahsulotlarni boshqarish va xarid qilish** tizimi.
Uchta rol, aqlli (xato-bardosh) qidiruv, **tezkor & yengil** zamonaviy dizayn va
to'liq offline ishlaydigan ma'lumotlar bazasi (IndexedDB).

> **Tezlik — birinchi o'rinda.** Og'ir Three.js / WebGL fonlar olib tashlandi.
> Fonlar endi faqat **yengil CSS** (gradient + GPU-friendly transform animatsiya)
> orqali quriladi — eski/sust telefonlarda ham silliq ishlaydi (~60fps).

> Project name: **ASL_ZIYO** · UI tili: **O'zbekcha** · Backend talab qilinmaydi.

---

## ✨ Asosiy imkoniyatlar

- **Hisob (akkaunt) tizimi** — login + parol bilan kirish va **ro'yxatdan o'tish**:
  - Ro'yxatdan o'tgan har bir foydalanuvchi **mijoz (client)** sifatida yaratiladi.
  - Rol hisobdan o'qiladi (endi "rol tanlash" tugmalari yo'q). Sessiya saqlanadi.
  - Parollar **SHA-256** bilan xeshlanib saqlanadi (xom parol saqlanmaydi).
- **3 ta rol** (ruxsatlar matritsasi `src/lib/roles.js` da):
  - 🛡️ **Administrator** — to'liq nazorat (qo'shish / tahrirlash / **o'chirish** +
    **foydalanuvchilarni boshqarish**).
  - 🧑‍💼 **Sotuvchi** — qo'shish va tahrirlash mumkin, lekin **o'chirish mumkin emas**;
    foydalanuvchilarni boshqara olmaydi.
  - 🛒 **Mijoz** — faqat ko'rish, qidirish va **savatcha** (cart) bilan xarid qilish.
- **Admin: Foydalanuvchilar sahifasi** (`/users`, faqat admin):
  - Barcha hisoblar ro'yxati: login, rol va **ro'yxatdan o'tgan sana/vaqt**.
  - Har bir foydalanuvchi **rolini o'zgartirish** (mijoz ↔ sotuvchi ↔ admin).
    (Admin o'z rolini o'zgartira olmaydi — tizimdan qulflanib qolmaslik uchun.)
  - Har bir **mijozning savatchasini ko'rish**: mahsulotlar, miqdor va umumiy summa.
- **Mahsulotlar**: nomi, kategoriya, **narx**, o'lcham birligi (dona / kg / litr),
  **ixtiyoriy rasm** (rasmsiz ham saqlanadi → toza placeholder ko'rsatiladi).
  Mahsulotlar soni cheksiz; zaxira/miqdor hisobi yo'q — diqqat **narxlarda**.
- **🕒 Vaqt belgilari (timestamps)** hamma joyda ko'rsatiladi (`DD.MM.YYYY HH:MM`):
  foydalanuvchi ro'yxatdan o'tgan vaqti, mahsulot qo'shilgan/tahrirlangan vaqti,
  kategoriya yaratilgan vaqti, savatcha oxirgi yangilangan vaqti. ISO formatda
  saqlanadi, ko'rsatishda formatlanadi.
- **Kategoriyalar**: qo'shish / tahrirlash / o'chirish (o'chirish faqat admin),
  kategoriya bo'yicha filtr.
- **Tezkor mahsulot qo'shish** (admin / sotuvchi): Kategoriyalar sahifasida kategoriya
  kartasini bosing → kategoriya **avtomatik tanlanadi va qulflanadi**. Mahsulot
  saqlangach forma tozalanadi, **ochiq qoladi** va kursor nom maydoniga qaytadi —
  shu kategoriyaga **ketma-ket** ko'p mahsulot qo'shasiz, har safar kategoriyani
  qayta tanlamasdan. Sessiyada qo'shilganlar ro'yxati va hisoblagich ("Qo'shildi:
  N ta") ko'rsatiladi; "Tugatish" tugmasi rejimni yopadi.
- **Aqlli qidiruv** (eng muhim):
  - mahsulot nomi **va** kategoriya bo'yicha qidiradi,
  - **xato-bardosh** (fuzzy): `energtik`, `energetic`, `energtic` → `energetik` topadi,
  - kategoriya nomi yozilsa — o'sha kategoriyadagi **barcha** mahsulotlar chiqadi,
  - **real vaqtda** (yozayotganda yangilanadi),
  - O'zbek harflariga moslashuvchan (`o'`, `g'`, `sh`, `ch`, kirill `ў/ғ/қ/ҳ`),
  - **kirill (rus) matnida ham ishlaydi** — masalan lotincha `energetik` yozsangiz
    ham kirillcha nomlangan energetik ichimliklar chiqadi; kirillcha xato `горила`
    → `Горилла` topadi (normalizatsiya kirillni o'chirmaydi, lotinga moslaydi),
  - natijalar **muhimligi bo'yicha** saralanadi.
- **Savatcha**: qo'shish, miqdorni o'zgartirish, o'chirish, umumiy summa,
  refresh-dan keyin ham saqlanadi. Savatcha **har bir foydalanuvchi uchun alohida**
  IndexedDB'da saqlanadi (shu sababli admin mijoz savatchasini ko'ra oladi).
- **Haqiqiy ma'lumotlar importi**: birinchi ishga tushirishda eski demo ma'lumotlar
  **o'chiriladi** va `src/data/products.json` dan **194 ta mahsulot / 11 kategoriya**
  IndexedDB'ga import qilinadi. Import **faqat bir marta** bajariladi (localStorage
  flag + StrictMode'ga bardoshli) — keyin sizning o'zgarishlaringiz saqlanadi.

### ⚡ Tezlik va yengil dizayn (eng muhimi)

- **WebGL / Three.js fonlar yo'q** — ular sust qurilmalarni qotirardi. O'rniga:
  - CSS gradient fonlar + soft radial-gradient "blob"lar (`filter: blur` ishlatilmaydi),
  - faqat **transform/opacity** animatsiyasi (GPU-friendly, reflow yo'q),
  - kategoriyalararo **silliq crossfade** (faqat opacity).
- **Kategoriyaga qarab o'zgaruvchi fon**: ichimliklar → salqin ko'k/cyan,
  energetik → yorqin binafsha/lime, oziq-ovqat/non → iliq oltin va h.k. Har bir
  kategoriya o'z mavzusiga ega.
- **Avtomatik DEFAULT fon**: mavzusi belgilanmagan **yangi** kategoriya qo'shilsa,
  toza default fon ishlatiladi — ilova hech qachon buzilmaydi.
- Mavzu xaritasi (`src/lib/categoryThemes.js`) **oson kengaytiriladi** — slug bo'yicha
  yangi mavzu qo'shing.
- **`prefers-reduced-motion`** hurmat qilinadi (animatsiyalar deyarli o'chiriladi).
- Qidiruv `useDeferredValue` bilan **bloklamasdan** ishlaydi; mahsulotlar ro'yxati
  **sahifalanadi** (PAGE_SIZE=24, "Ko'proq" tugmasi) — minglab mahsulotda ham DOM yengil.
- Og'ir narsalar lazy-load; umumiy bundle kichik (WebGL chunk butunlay olib tashlandi).

---

## 🔑 Kirish hisoblari

Tizimda **2 ta hisob oldindan yaratilgan** (seed):

| Rol            | Login         | Parol        |
| -------------- | ------------- | ------------ |
| 🛡️ Administrator | `Asliddin017` | `root123`    |
| 🧑‍💼 Sotuvchi    | `seller`      | `seller123`  |

- **Mijoz** hisobini login ekranidagi **"Ro'yxatdan o'tish"** orqali o'zingiz
  yarating — yangi foydalanuvchilar avtomatik **mijoz** roli bilan ochiladi.
- Admin keyin `/users` sahifasida istalgan foydalanuvchining rolini o'zgartira oladi.
- Demo parollar endi ekranda **ko'rsatilmaydi**.

> 🔒 **Xavfsizlik eslatmasi:** bu bitta do'kon uchun, backend'siz, lokal ilova.
> Parollar IndexedDB'da **SHA-256 xesh** ko'rinishida saqlanadi (xom holda emas),
> lekin bu production darajasidagi autentifikatsiya emas (per-user salt yo'q,
> sekin KDF yo'q, salt bundle ichida). Lokal, bitta qurilmali do'kon uchun
> yetarli — internetga chiqariladigan ilova uchun real backend + auth kerak.

---

## 🚀 O'rnatish va ishga tushirish

Talab: **Node.js 18+** (ishlab chiqilgan: Node 22, npm 10).

```bash
# 1. Bog'liqliklarni o'rnatish
npm install

# 2. Dasturni ishga tushirish (http://localhost:5173)
npm run dev

# 3. Production uchun build
npm run build

# 4. Build natijasini ko'rish
npm run preview
```

---

## 🧱 Texnologiyalar

| Soha          | Texnologiya                                      |
| ------------- | ------------------------------------------------ |
| UI            | React 18 + Vite + Tailwind CSS                   |
| Fon / dizayn  | Yengil CSS gradientlar (WebGL emas)              |
| Animatsiya    | Framer Motion (yengil saqlangan)                 |
| Qidiruv       | Fuse.js + maxsus O'zbek/kirill normalizatsiya    |
| Ma'lumotlar   | IndexedDB (Dexie.js) — users / categories / products / carts |
| Auth          | Hisoblar `users` jadvalida, parollar SHA-256 xesh |
| Holat (state) | Zustand (sessiya localStorage'da persist)        |

---

## 📁 Loyiha tuzilishi

```
src/
├── App.jsx                 # Routing, init, rolga asoslangan kirish nazorati
├── main.jsx                # React + Router kirish nuqtasi
├── index.css               # Tailwind + glassmorphism uslublari
├── data/
│   └── products.json       # 194 ta haqiqiy mahsulot / 11 kategoriya (import)
├── db/
│   └── db.js               # Dexie sxema (v3) + import + hisob seed + slugify
├── store/
│   ├── authStore.js        # Login / register / sessiya (persist)
│   ├── cartStore.js        # Foydalanuvchi savatchasi (IndexedDB'da)
│   └── uiStore.js          # Faol fon mavzusi (themeKey)
├── lib/
│   ├── auth.js             # Parol xeshlash (SHA-256)
│   ├── roles.js            # Rollar + ruxsatlar matritsasi (can(), manageUsers)
│   ├── search.js           # Aqlli fuzzy qidiruv + O'zbek/kirill normalize()
│   ├── categoryThemes.js   # Yengil CSS fon mavzulari + resolveThemeKey()
│   └── utils.js            # Format (som, sana/vaqt), rasm yuklash
├── hooks/
│   ├── useData.js          # Dexie live query'lar + mutatsiyalar (+ users)
│   └── useThemeKey.js      # Sahifa bo'yicha fon mavzusini o'rnatish
├── components/
│   ├── Layout.jsx, Navbar.jsx
│   ├── CategoryBackground.jsx  # App-wide yengil CSS fon (crossfade)
│   ├── ProductCard.jsx     # Kursorga ergashuvchi tilt karta + vaqt belgisi
│   ├── ProductForm.jsx, QuickAddProducts.jsx
│   ├── ProductImage.jsx, SearchBar.jsx, ConfirmDialog.jsx
└── pages/
    ├── Login.jsx           # Kirish + ro'yxatdan o'tish (bitta ekran)
    ├── Home.jsx, Products.jsx, Categories.jsx, CartPage.jsx
    └── Users.jsx           # Admin: foydalanuvchilar + rollar + mijoz savatchasi
```

### 🎨 Yangi kategoriya foni qo'shish

`src/lib/categoryThemes.js` ichida kategoriya **slug**i bo'yicha yangi mavzu qo'shing:

```js
export const CATEGORY_THEMES = {
  // ...
  'muzqaymoqlar': {
    base: 'radial-gradient(120% 120% at 70% -10%, #0a2f4a 0%, #04101c 60%)',
    blobs: [
      glow('rgba(56,189,248,0.40)', '68%', '-12%', '42rem'),
      glow('rgba(167,243,208,0.24)', '-10%', '60%', '36rem', '6s'),
    ],
  },
}
```

Slug topilmasa, avtomatik `default` ishlatiladi — qo'shish ixtiyoriy, hech narsa
buzilmaydi.

---

## 🔐 Ruxsatlar (rolga asoslangan)

Ruxsatlar `src/lib/roles.js` dagi yagona matritsada (`can(role, capability)`)
saqlanadi. Komponentlar rol nomini emas, balki shu bayroqlarni tekshiradi:

| Imkoniyat          | Admin | Sotuvchi | Mijoz |
| ------------------ | :---: | :------: | :---: |
| Mahsulot qo'shish/tahrir | ✅ | ✅ | ❌ |
| Mahsulot o'chirish | ✅ | ❌ | ❌ |
| Kategoriya qo'shish/tahrir | ✅ | ✅ | ❌ |
| Kategoriya o'chirish | ✅ | ❌ | ❌ |
| Tezkor qo'shish (kategoriyaga) | ✅ | ✅ | ❌ |
| Foydalanuvchilarni boshqarish (`/users`) | ✅ | ❌ | ❌ |
| Savatcha (xarid)   | ❌ | ❌ | ✅ |

---

## 💡 Eslatmalar

- **Backend yo'q**, lekin kod toza qatlamlarga ajratilgan (db / store / lib /
  hooks) — keyinchalik real API qo'shish oson.
- **Import faqat BIR marta**: `initDb()` umumiy promise bilan himoyalangan
  (StrictMode'ga bardoshli). `importRealDataOnce()` `localStorage` flag
  (`asl_ziyo_data_v3`) yordamida bir marta eski demo ma'lumotlarni o'chirib,
  `products.json` ni import qiladi; keyin sizning o'zgarishlaringiz saqlanadi.
  Seed hisoblar (`Asliddin017`, `seller`) faqat mavjud bo'lmasa qo'shiladi.
- Ma'lumotlarni (va hisoblarni) noldan tiklash uchun brauzer DevTools →
  Application → IndexedDB → `asl_ziyo` ni o'chiring **va** shu domen uchun
  localStorage'ni tozalang (qayta import + seed bo'ladi).
- Rasmlar yuklanganda 600px gacha kichraytiriladi va base64 sifatida saqlanadi.
