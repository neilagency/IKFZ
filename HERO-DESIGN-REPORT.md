# 📋 تقرير تصميم الـ Hero Sections — iKFZ Digital Zulassung

> **المشروع:** iKFZ Digital Zulassung  
> **التقنيات:** Next.js 14 + Tailwind CSS + Framer Motion  
> **الخط:** Inter (Google Fonts)  
> **تاريخ التقرير:** أبريل 2026

---

## ⚠️ تنبيه مهم للمطور

**يجب الالتزام الكامل بالهوية البصرية وألوان الموقع المحددة أدناه. أي لون أو تدرج أو shadow لم يُذكر هنا يُعتبر خارج الهوية ولا يجوز استخدامه.**

---

## 1. لوحة الألوان (Color Palette) — الالتزام إجباري

### 1.1 اللون الأساسي — Primary Green

| الدرجة | الكود | الاستخدام |
|--------|-------|----------|
| 50 | `#eafff5` | خلفيات خفيفة جداً |
| 100 | `#c5ffe3` | خلفية badges |
| 200 | `#8effc9` | hover states |
| 300 | `#4dffab` | — |
| 400 | `#16e88a` | أيقونات نشطة، gradient text |
| 500 | `#00c96e` | — |
| **600** | **`#00a85a`** | **⬅ DEFAULT — الأزرار الرئيسية، الروابط** |
| 700 | `#008549` | hover على الزر الرئيسي |
| 800 | `#006b3c` | — |
| 900 | `#005831` | — |

### 1.2 اللون المساعد — Accent Green

| الدرجة | الكود |
|--------|-------|
| 500 | `#22c55e` ← DEFAULT |
| 600 | `#16a34a` |

**يُستخدم في text-gradient مع Primary:**  
`bg-gradient-to-r from-primary-400 to-accent-400`

### 1.3 الألوان الداكنة — Dark Palette

| الدرجة | الكود | الاستخدام |
|--------|-------|----------|
| 50 | `#f8f9fa` | أفتح رمادي |
| 100 | `#f1f3f5` | — |
| 200 | `#e9ecef` | borders خفيفة |
| 400 | `#adb5bd` | placeholder text |
| 500 | `#868e96` | نص ثانوي |
| 800 | `#212529` | نص body |
| 900 | `#16191d` | عناوين |
| **950** | **`#0d0f12`** | **⬅ خلفية كل الـ Hero sections** |

### 1.4 قواعد الألوان في الهيرو

| العنصر | اللون |
|--------|-------|
| خلفية Hero | `bg-dark-950` أو `bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950` |
| النص الرئيسي (H1) | `text-white` |
| الكلمة المميزة في H1 | `text-primary` أو gradient: `from-primary-400 to-accent-400` |
| النص الثانوي (subtitle) | `text-white/70` أو `text-white/50` أو `text-white/55` |
| نص إضافي / badge text | `text-white/40` أو `text-white/70` |
| الأيقونات | `text-primary` أو `text-primary-400` |
| Borders داكنة | `border-white/[0.06]` أو `border-white/[0.08]` أو `border-white/10` أو `border-primary/20` |

---

## 2. أنواع الـ Hero Sections (7 أنماط)

---

### النمط 1: Hero الصفحة الرئيسية (Homepage Hero)

**الملف:** `src/components/Hero.tsx`  
**يُستخدم في:** الصفحة الرئيسية `/`

#### الهيكل:

```
┌─────────────────────────────────────────────────────────────────┐
│  [خلفية: gradient + orbs + grid pattern]                         │
│                                                                   │
│  ┌─ Badge (rounded-full, bg-primary/10, border-primary/20) ──┐  │
│  │ 🛡 KBA Text                                                │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  H1: "Fahrzeug **online** zulassen"                              │
│      (كلمة "online" بـ gradient: from-primary-400 to-accent-400)│
│                                                                   │
│  Subtitle: text-xl md:text-2xl, text-white/70                   │
│                                                                   │
│  Badge text: text-base, text-white/40                            │
│                                                                   │
│  ┌─ CTA Primary ─┐  ┌─ CTA Secondary ─────────┐                │
│  │ Jetzt starten → │  │ Auto online abmelden    │                │
│  └────────────────┘  └─────────────────────────┘                │
│                                                                   │
│  ✓ Trust 1    ✓ Trust 2    ✓ Trust 3                            │
│                                                                   │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐                        │
│  │ Card │  │ Card │  │ Card │  │ Card │  ← Feature Cards       │
│  └──────┘  └──────┘  └──────┘  └──────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

#### المواصفات التقنية:

| الخاصية | القيمة |
|---------|-------|
| الحاوية | `min-h-[100svh]`, `flex items-center`, `overflow-hidden` |
| الخلفية | `bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950` |
| Contain | `contain: layout style paint` (أداء) |
| Grid Pattern | `.hero-grid-pattern` — `opacity-[0.03]` |
| Accent Orbs | كرتان بـ `bg-gradient-radial`: واحدة `from-primary/12` أعلى-يمين، وواحدة `from-primary/8` أسفل-يسار |
| Padding | `py-24 md:py-28` |

#### عناصر الهيرو:

**Badge (شارة أعلى العنوان):**
```
inline-flex items-center gap-2.5 px-4 py-2 
bg-primary/10 rounded-full text-sm font-medium text-primary 
border border-primary/20 mb-8
```
- أيقونة Shield بحجم `w-4 h-4`

**H1 (العنوان الرئيسي):**
```
text-hero-mobile md:text-hero text-white mb-5 text-balance
```
- `text-hero-mobile` = `2.5rem`, weight `800`, line-height `1.1`, tracking `-0.02em`
- `text-hero` (desktop) = `4rem`, weight `800`, line-height `1.05`, tracking `-0.03em`
- كلمة "online" بتأثير gradient: `bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-accent-400`

**Subtitle:**
```
text-xl md:text-2xl text-white/70 font-medium mb-3 tracking-[-0.01em]
```

**Badge Text (تحت الـ subtitle):**
```
text-base text-white/40 font-medium mb-8
```

**الأزرار (CTAs):**
- **Primary CTA:** 
  ```
  px-8 py-4 bg-primary text-white font-bold rounded-2xl 
  shadow-button hover:shadow-button-hover transition-all duration-300 
  hover:-translate-y-0.5 text-[1.05rem] cta-glow
  ```
  - Shadow: `0 4px 14px rgba(0,168,90,0.35), 0 2px 6px rgba(0,168,90,0.2)`
  - Hover Shadow: `0 8px 24px rgba(0,168,90,0.4), 0 4px 12px rgba(0,168,90,0.25)`
  - يحتوي أيقونة ArrowRight بحجم `w-5 h-5` مع `group-hover:translate-x-1`
  
- **Secondary CTA:** `.btn-outline-white`
  ```
  px-8 py-4 bg-transparent text-white font-semibold rounded-2xl 
  border-2 border-white/30 hover:bg-white/10 hover:border-white/60 
  hover:-translate-y-0.5 text-[0.95rem]
  ```

**Trust Indicators:**
```
flex flex-wrap items-center gap-x-6 gap-y-2 mt-8
```
كل عنصر:
```
flex items-center gap-2 text-sm text-white/50
```
- أيقونة CheckCircle2 بلون `text-primary-400`, حجم `w-4 h-4`

**Feature Cards (4 بطاقات في صف):**
```
grid grid-cols-2 md:grid-cols-4 gap-4 pb-12
```
كل بطاقة:
```
bg-white/[0.05] rounded-2xl p-5 text-center 
border border-white/[0.08] 
hover:bg-white/[0.1] hover:border-white/[0.15] hover:-translate-y-1 
transition-all duration-300
```
- أيقونة: `w-12 h-12 bg-primary/10 rounded-xl` → `w-6 h-6 text-primary-400`
- Label: `text-lg font-bold text-white`
- Desc: `text-sm text-white/40 mt-1`

---

### النمط 2: Hero صفحات الخدمات (Service Pages Hero)

**يُستخدم في:** `/auto-verkaufen/`, `/evb/`, `/[slug]/` (service pages), `/kfz-versicherung-berechnen/`

#### الهيكل:

```
┌─────────────────────────────────────────────────────────────┐
│  [خلفية: bg-dark-950 + orbs + grid pattern]                 │
│                                                               │
│  Breadcrumb: Dienstleistungen / اسم الخدمة                   │
│                                                               │
│  (اختياري) Label صغير: text-sm text-white/40                 │
│                                                               │
│  H1: عنوان الخدمة                                            │
│      <span class="text-primary">الجزء المميز</span>         │
│                                                               │
│  Subtitle: text-lg md:text-xl text-white/50                  │
│                                                               │
│  ┌─ CTA Primary ─┐  ┌─ CTA Secondary ─┐                    │
│  │ Jetzt starten → │  │ WhatsApp / أخرى │                    │
│  └────────────────┘  └─────────────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

#### المواصفات:

| الخاصية | القيمة |
|---------|-------|
| الحاوية | `relative overflow-hidden bg-dark-950` |
| Padding | `pt-32 pb-16 md:pt-40 md:pb-20` |
| Orbs | `w-[500px] h-[500px] from-primary/15` + `w-[400px] h-[400px] from-accent/10` |
| Grid Pattern | نفس نمط 64px |

**Breadcrumb:**
```
flex items-center gap-2 text-white/50 text-sm font-medium mb-4
```
- الرابط: `hover:text-primary transition-colors`
- الفاصل: `/` ثابت
- الصفحة الحالية: `text-white/70`

**H1:**
```
text-3xl md:text-5xl lg:text-6xl font-extrabold text-white mb-6 leading-tight
```
- الجزء المميز: `<span className="text-primary">...</span>` أو على سطر جديد بـ `<br />`

**Subtitle:**
```
text-lg md:text-xl text-white/50 max-w-2xl mb-8
```

**الأزرار:**
- Primary: `.btn-primary text-lg` مع أيقونة `ArrowRight`
- Secondary: `.btn-outline-white` (أو WhatsApp)
- الحاوية: `flex flex-wrap gap-4`

---

### النمط 3: Hero صفحة تسجيل السيارة الكاملة (Auto Anmelden Hero)

**الملف:** `src/app/auto-online-anmelden/page.tsx`  
**مميز بـ:** وجود شعار KBA

#### الهيكل:

```
┌─────────────────────────────────────────────────────────────┐
│  [خلفية: bg-dark-950 + orbs + grid pattern]                 │
│                                                               │
│  H1: text-3xl md:text-5xl lg:text-6xl, text-white           │
│                                                               │
│  H2: text-xl md:text-2xl, text-white/80                     │
│      <span class="text-primary">الجزء المميز</span>         │
│                                                               │
│  [صورة شعار KBA — 250×100px, opacity-90, priority loading]  │
│                                                               │
│  ┌─ CTA Primary ──────┐                                     │
│  │ Jetzt online starten │                                     │
│  └─────────────────────┘                                     │
└─────────────────────────────────────────────────────────────┘
```

#### فروقات عن النمط 2:

- يحتوي على `H2` بالإضافة للـ `H1`
- لا يحتوي على breadcrumb
- يحتوي على صورة شعار رسمي (KBA Logo)
- H2 خط: `text-xl md:text-2xl font-bold text-white/80`
- الشعار: `Image` مكون Next.js مع `priority` loading

---

### النمط 4: Hero صفحات المحتوى والقانون (Legal & Info Pages Hero)

**يُستخدم في:** `/agb/`, `/datenschutzerklarung/`, `/impressum/`, `/faq/`

#### الهيكل:

```
┌─────────────────────────────────────────────────────────────┐
│  [خلفية: bg-dark-950 + orbs + grid pattern]                 │
│                                                               │
│       ┌─ Badge (centered) ─────────────────┐                │
│       │ 📄 Geschäftsbedingungen             │                │
│       └────────────────────────────────────┘                │
│                                                               │
│       H1: centered, text-4xl md:text-5xl lg:text-6xl        │
│                                                               │
│       (اختياري) Subtitle: centered, max-w-3xl               │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

#### المواصفات:

| الخاصية | القيمة |
|---------|-------|
| Layout | `text-center` — كل شيء في المنتصف |
| Padding | `pt-32 pb-20 md:pt-40 md:pb-28` — أكبر من صفحات الخدمات |
| Orbs | نفس الحجم `500px + 400px` |

**Badge:**
```
inline-flex items-center gap-2 px-4 py-2 rounded-full 
bg-white/[0.06] border border-white/[0.08] backdrop-blur-sm 
text-sm text-white/70 mb-6
```
- أيقونة بلون `text-primary`, حجم `w-4 h-4`
- **ملاحظة:** هذا النمط مختلف عن badge الصفحة الرئيسية (هنا `bg-white/[0.06]` بدلاً من `bg-primary/10`)

**H1:**
```
text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight
```

**Subtitle (في FAQ):**
```
text-lg md:text-xl text-white/60 max-w-3xl mx-auto
```

---

### النمط 5: Hero صفحات المدن (City Pages Hero)

**الملف:** `src/components/city/CityComponents.tsx` → `CityHero`  
**يُستخدم في:** `/kfz-zulassung-in-deiner-stadt/[city]/`

#### الهيكل:

```
┌─────────────────────────────────────────────────────────────┐
│  [خلفية: gradient + orbs + grid pattern]                     │
│                                                               │
│  ┌─ Badge (rounded-full, bg-primary/10, backdrop-blur) ──┐  │
│  │ 📍 {اسم المدينة}                                      │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  H1: text-4xl md:text-5xl lg:text-[3.5rem]                  │
│      السطر الأول عادي                                        │
│      <span class="text-primary">السطر الثاني</span>         │
│                                                               │
│  Subtitle: text-lg md:text-xl text-white/55, max-w-2xl      │
│                                                               │
│  ┌─ CTA Primary ─┐  ┌─ WhatsApp Support ─┐                 │
│  │ Jetzt starten → │  │ 📞 WhatsApp        │                 │
│  └────────────────┘  └───────────────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

#### المواصفات:

| الخاصية | القيمة |
|---------|-------|
| الخلفية | `bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950` |
| Padding | `pt-32 pb-20 md:pt-44 md:pb-28` |
| Max Width | `max-w-3xl` |

**Badge:**
```
inline-flex items-center gap-2.5 px-4 py-2 bg-primary/10 backdrop-blur-sm 
rounded-full text-sm font-medium text-primary border border-primary/20 mb-8
```
- أيقونة MapPin بحجم `w-4 h-4`

**H1:**
```
text-4xl md:text-5xl lg:text-[3.5rem] font-extrabold text-white mb-6 
leading-[1.08] tracking-tight
```
- يُقسم لسطرين: `h1Parts[0]<br />h1Parts[1]`
- السطر الثاني بلون primary: `<span className="text-primary">`

**CTAs:**
- Primary: `.btn-primary text-lg` + ArrowRight icon
- Secondary: `.btn-outline-white` + Phone icon (WhatsApp)

---

### النمط 6: Hero صفحة المدونة (Blog/Insiderwissen Hero)

**الملف:** `src/app/insiderwissen/page.tsx`

#### الهيكل:

```
┌─────────────────────────────────────────────────────────────┐
│  [خلفية فريدة: from-dark via-primary-900 to-dark]           │
│                                                               │
│       📖 INSIDERWISSEN (uppercase, tracking-wider)           │
│                                                               │
│       H1: centered, text-3xl md:text-5xl                     │
│                                                               │
│       Subtitle: centered, text-lg text-white/50              │
│                                                               │
└─────────────────────────────────────────────────────────────┘
┌─ Category Filter Bar ──────────────────────────────────────┐
│  [Alle] [Zulassung] [Abmeldung] [Versicherung] ...        │
│  bg-dark-950, border-b border-white/[0.06], py-4           │
└────────────────────────────────────────────────────────────┘
```

#### الفروقات عن الأنماط الأخرى:

| الخاصية | القيمة |
|---------|-------|
| **الخلفية** | `bg-gradient-to-b from-dark via-primary-900 to-dark` — **فريدة!** |
| Section Label | `text-primary text-sm font-semibold uppercase tracking-wider` مع أيقونة BookOpen |
| H1 | `text-3xl md:text-5xl font-extrabold text-white` — **أصغر من الصفحات الأخرى** |
| Subtitle | `text-lg text-white/50 max-w-2xl mx-auto` |
| بدون CTAs | لا يحتوي على أزرار |

**Category Filter Pills (تحت الهيرو مباشرة):**
```
bg-dark-950 border-b border-white/[0.06] py-4
```
كل pill:
- Active: `bg-primary text-white`
- Inactive: `bg-dark-900/60 text-white/50 hover:text-white hover:bg-dark-800 border border-white/[0.06]`
- Shape: `px-4 py-2 rounded-full text-sm font-medium`

---

### النمط 7: Dark Hero Band (شريط داكن بدون نص)

**يُستخدم في:** `/product/fahrzeugabmeldung/`, `/bestellung-erfolgreich/`, `/zahlung-fehlgeschlagen/`

#### الهيكل:

```
┌─────────────────────────────────────────────────────────────┐
│  [خلفية: bg-dark-950 مع orbs فقط — بدون نص أو عناصر]       │
│  pt-24 pb-8 md:pt-32 md:pb-12                                │
└─────────────────────────────────────────────────────────────┘
│  [المحتوى تحت الشريط مباشرة — في خلفية بيضاء]               │
```

#### المواصفات:

```html
<div class="bg-dark-950 pt-24 pb-8 md:pt-32 md:pb-12 relative overflow-hidden">
  <!-- Orb 1 -->
  <div class="absolute top-0 left-1/4 w-[400px] h-[400px] bg-gradient-radial from-primary/12 to-transparent rounded-full pointer-events-none" />
  <!-- Orb 2 -->
  <div class="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-gradient-radial from-accent/8 to-transparent rounded-full pointer-events-none" />
  <!-- اختياري: Grid Pattern -->
</div>
```

- يُستخدم كـ visual bridge بين الـ Navbar والمحتوى
- الـ Orbs أصغر من Hero sections الكاملة

---

## 3. العناصر المشتركة بين كل الأنماط

### 3.1 الخلفية الداكنة (Dark Background)

كل hero يحتوي على 3 طبقات:

```
Layer 1: الخلفية الأساسية
  bg-dark-950 أو bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950

Layer 2: Ambient Orbs (كرات إضاءة ناعمة)
  - Orb عليا: w-[500px] h-[500px] bg-gradient-radial from-primary/12–15 to-transparent
  - Orb سفلى: w-[400px] h-[400px] bg-gradient-radial from-accent/8–10 to-transparent
  - المواضع: absolute, positioned at edges (top/right, bottom/left)
  - دائماً: pointer-events-none, rounded-full

Layer 3: Grid/Dot Pattern
  - الصفحة الرئيسية: .hero-grid-pattern (60px grid, opacity 0.03)
  - باقي الصفحات: inline CSS grid pattern (64px, rgba(255,255,255,.02))
```

**CSS الـ Grid Pattern:**
```css
/* Homepage */
.hero-grid-pattern {
  background-image:
    linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px);
  background-size: 60px 60px;
  contain: strict;
}

/* Other pages (inline) */
bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)]
bg-[size:64px_64px]
```

### 3.2 الـ Container

```
.container-main {
  max-width: 80rem (1280px);
  margin: 0 auto;
  padding: 0 1rem; /* px-4 */
  /* Responsive: sm:px-6, lg:px-8 */
}
```

### 3.3 الأنيميشن

- كل محتوى الهيرو ملفوف في `<ScrollReveal>` component
- الصفحة الرئيسية تستخدم CSS بدون ScrollReveal (لأداء LCP)
- Easing curve: `cubic-bezier(0.16, 1, 0.3, 1)`
- Duration: `0.7s` للظهور

### 3.4 Typography Rules

| العنوان | الخصائص |
|---------|--------|
| Hero H1 (الرئيسية) | 4rem desktop / 2.5rem mobile, weight 800, tracking -0.03em/-0.02em |
| Page H1 | 3xl→5xl→6xl responsive, font-extrabold, text-white, leading-tight |
| City H1 | 4xl→5xl→3.5rem responsive, font-extrabold, leading-[1.08], tracking-tight |
| Subtitle | lg→xl responsive, text-white/50–70, max-w-2xl |

---

## 4. الأزرار — CSS Classes

### `.btn-primary`

```css
inline-flex items-center justify-center gap-2.5 px-8 py-4 
bg-primary (#00a85a) text-white font-semibold rounded-2xl (1rem)
shadow: 0 4px 14px rgba(0,168,90,0.35), 0 2px 6px rgba(0,168,90,0.2)
text-[0.95rem] tracking-[-0.01em]

Hover:
  bg-primary-700 (#008549)
  shadow: 0 8px 24px rgba(0,168,90,0.4), 0 4px 12px rgba(0,168,90,0.25)
  transform: translateY(-0.5px)

Focus:
  outline: none
  ring: 4px ring-primary/25
```

### `.btn-outline-white`

```css
inline-flex items-center justify-center gap-2.5 px-8 py-4
bg-transparent text-white font-semibold rounded-2xl
border: 2px border-white/30
text-[0.95rem]

Hover:
  bg-white/10
  border-white/60
  transform: translateY(-0.5px)

Focus:
  ring: 4px ring-white/20
```

### `.cta-glow` (فقط في Hero الصفحة الرئيسية)

```css
/* Glow effect behind the button */
::after {
  position: absolute;
  inset: -2px;
  border-radius: inherit;
  background: linear-gradient(135deg, rgba(0,168,90,0.4), rgba(34,197,94,0.2));
  opacity: 0;
  z-index: -1;
  filter: blur(12px);
  transition: opacity 0.4s ease;
}
:hover::after {
  opacity: 1;
}
```

---

## 5. Shadows المستخدمة

```css
shadow-button:       0 4px 14px rgba(0,168,90,0.35), 0 2px 6px rgba(0,168,90,0.2)
shadow-button-hover: 0 8px 24px rgba(0,168,90,0.4), 0 4px 12px rgba(0,168,90,0.25)
shadow-card:         0 1px 3px rgba(0,0,0,0.04), 0 4px 20px rgba(0,0,0,0.06)
shadow-card-hover:   0 4px 12px rgba(0,0,0,0.06), 0 12px 40px rgba(0,0,0,0.1)
```

**قاعدة:** الأزرار تستخدم shadow بلون الـ primary (أخضر). الكروت تستخدم shadow أسود.

---

## 6. Responsive Breakpoints

| Breakpoint | Tailwind | العرض |
|------------|----------|-------|
| Mobile | default | < 768px |
| Tablet | `md:` | ≥ 768px |
| Desktop | `lg:` | ≥ 1024px |

### تغييرات الهيرو حسب الحجم:

| العنصر | Mobile | Tablet | Desktop |
|--------|--------|--------|---------|
| H1 Homepage | 2.5rem (40px) | — | 4rem (64px) |
| H1 Pages | text-3xl (1.875rem) | text-5xl (3rem) | text-6xl (3.75rem) |
| Subtitle | text-lg (1.125rem) | text-xl (1.25rem) | — |
| Padding top | pt-32 (128px) | pt-40 (160px) | — |
| Feature Cards | 2 columns | — | 4 columns |
| CTAs | flex-col | flex-row | — |
| Text Alignment | center (homepage) | — | left (homepage on lg) |

---

## 7. الأيقونات المستخدمة (Lucide React)

| الأيقونة | الاستخدام |
|----------|----------|
| `Shield` | Badge الصفحة الرئيسية + Trust |
| `ArrowRight` | داخل الأزرار |
| `CheckCircle2` | Trust Indicators |
| `MapPin` | Badge صفحات المدن |
| `Phone` | CTA WhatsApp |
| `HelpCircle` | Badge صفحة FAQ |
| `FileText` | Badge صفحة AGB |
| `BookOpen` | Label صفحة المدونة |
| `FileCheck`, `Clock`, `Zap`, `Euro` | Feature Cards |

- **حجم الأيقونة في البادج:** `w-4 h-4`
- **حجم الأيقونة في الزر:** `w-5 h-5`
- **حجم الأيقونة في Feature Card:** `w-6 h-6` (داخل حاوية `w-12 h-12`)

---

## 8. ملاحظات الأداء (Performance Notes)

1. **Homepage Hero** يستخدم `contain: layout style paint` للأداء
2. **Grid Pattern** يستخدم `contain: strict`
3. **الصفحة الرئيسية** لا تستخدم ScrollReveal — المحتوى server-rendered لـ LCP أسرع
4. **صور KBA Logo** تستخدم `priority` loading
5. كل الـ Orbs عليها `pointer-events-none` لمنع اعتراض الكلكات
6. `below-fold` class يُستخدم للـ sections تحت الهيرو: `content-visibility: auto`

---

## 9. جدول مقارنة سريع لكل الأنماط

| النمط | الخلفية | Badge | H1 Size | Breadcrumb | CTAs | Feature Cards | Centered |
|-------|---------|-------|---------|------------|------|---------------|----------|
| 1. Homepage | gradient | ✅ primary/10 | hero (4rem) | ❌ | 2 | ✅ 4 columns | lg:left |
| 2. Service | solid dark | ❌ | 3xl→6xl | ✅ | 1–2 | ❌ | left |
| 3. Auto Anmelden | solid dark | ❌ | 3xl→6xl | ❌ | 1 | ❌ | left |
| 4. Legal/Info | solid dark | ✅ white/[0.06] | 4xl→6xl | ❌ | ❌ | ❌ | center |
| 5. City | gradient | ✅ primary/10 | 4xl→3.5rem | ❌ | 2 | ❌ | left |
| 6. Blog | **unique gradient** | ❌ (label) | 3xl→5xl | ❌ | ❌ | ❌ | center |
| 7. Band Only | solid dark | ❌ | ❌ | ❌ | ❌ | ❌ | — |

---

## 10. ملفات المرجع

| الملف | الوصف |
|-------|-------|
| `src/components/Hero.tsx` | Hero الصفحة الرئيسية |
| `src/components/city/CityComponents.tsx` | CityHero component |
| `src/app/auto-online-anmelden/page.tsx` | Hero تسجيل السيارة |
| `src/app/auto-verkaufen/page.tsx` | Hero بيع السيارة |
| `src/app/evb/page.tsx` | Hero صفحة eVB |
| `src/app/kfz-services/page.tsx` | Hero صفحة الخدمات |
| `src/app/agb/page.tsx` | Hero الصفحات القانونية |
| `src/app/faq/page.tsx` | Hero صفحة FAQ |
| `src/app/insiderwissen/page.tsx` | Hero المدونة |
| `src/app/[slug]/page.tsx` | Hero Dynamic pages (Generic + Service) |
| `src/app/product/fahrzeugabmeldung/page.tsx` | Hero Band |
| `src/app/bestellung-erfolgreich/page.tsx` | Hero Band |
| `tailwind.config.ts` | تعريف الألوان والخطوط والـ Shadows |
| `src/app/globals.css` | تعريف الأزرار والـ Classes المشتركة |
| `UI-UX-BLUEPRINT.md` | المرجع التنفيذي الكامل للتصميم |

---

## 11. قائمة تحقق للمطور ✅

- [ ] استخدم **فقط** الألوان المحددة في القسم 1 — لا ألوان عشوائية
- [ ] كل Hero خلفيته `bg-dark-950` أو gradient منه
- [ ] الـ Orbs دائماً radial gradient بلون `primary/12-15` و `accent/8-10`
- [ ] الـ Grid Pattern بحجم 64px في كل الصفحات (60px في الصفحة الرئيسية فقط)
- [ ] H1 دائماً `font-extrabold text-white`
- [ ] الكلمة المميزة في H1 بلون `text-primary` (أو gradient في الصفحة الرئيسية)
- [ ] الـ Subtitle دائماً `text-white/50` إلى `text-white/70` — لا أبيض كامل
- [ ] الأزرار تستخدم `.btn-primary` و `.btn-outline-white` فقط — لا Custom buttons
- [ ] `rounded-2xl` (1rem) لكل الأزرار
- [ ] كل عنصر تفاعلي يحتوي `transition-all duration-300`
- [ ] Hover على الأزرار: `-translate-y-0.5` (0.5px فقط — ليس أكثر)
- [ ] الأيقونات من **Lucide React** فقط
- [ ] `pointer-events-none` على كل الـ Orbs والـ Patterns
- [ ] اختبر على Mobile + Tablet + Desktop
- [ ] تأكد من أن النص قابل للقراءة على كل الأحجام
- [ ] لا تستخدم `shadow-lg` أو `shadow-xl` من Tailwind — استخدم الـ Custom shadows فقط
