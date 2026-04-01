# UI/UX Design System Blueprint

> **المشروع:** iKFZ Digital Zulassung  
> **الإطار:** Next.js 14 + Tailwind CSS + Framer Motion  
> **الخط:** Inter (Google Fonts)  
> **آخر تحديث:** أبريل 2026

هذا الملف هو مرجع تنفيذي كامل — ليس شرحاً نظرياً.  
أي مطور يقرأ هذا الملف يستطيع بناء موقع بنفس المستوى الاحترافي بدون شرح إضافي.

---

## فهرس المحتويات

1. [لماذا يبدو هذا التصميم احترافياً؟](#1-لماذا-يبدو-هذا-التصميم-احترافياً)
2. [Color Palette](#2-color-palette)
3. [Typography System](#3-typography-system)
4. [Spacing System](#4-spacing-system)
5. [Border Radius & Shadows](#5-border-radius--shadows)
6. [Layout & Structure](#6-layout--structure)
7. [Header (Navbar)](#7-header-navbar)
8. [Footer](#8-footer)
9. [Hero Section](#9-hero-section)
10. [Buttons](#10-buttons)
11. [Cards](#11-cards)
12. [Form Elements](#12-form-elements)
13. [Badges & Labels](#13-badges--labels)
14. [Animations & Effects](#14-animations--effects)
15. [Responsive Strategy](#15-responsive-strategy)
16. [UI Components Library](#16-ui-components-library)
17. [UX Principles](#17-ux-principles)
18. [Implementation Guide](#18-implementation-guide)

---

## 1. لماذا يبدو هذا التصميم احترافياً؟

### ما يميّزه عن تصميم عادي:

| القاعدة | التطبيق |
|---------|---------|
| **Tight typography** | عناوين بـ negative letter-spacing (-0.03em) + line-height ضيق (1.05) |
| **Consistent spacing** | كل section يستخدم `py-14 md:py-20` — لا spacing عشوائي |
| **Layered shadows** | كل shadow مكوّن من طبقتين (ambient + directional) |
| **Subtle interactions** | hover يرفع العنصر -0.5px فقط مع shadow يتمدد |
| **Color restraint** | لون واحد فقط (أخضر) مع تدرجات — بدون ألوان عشوائية |
| **White space** | مساحات بيضاء كبيرة بين العناصر — الصفحة تتنفس |
| **Visual hierarchy** | 3 مستويات فقط: عنوان (bold/كبير) → وصف (متوسط/رمادي) → تفاصيل (صغير/فاتح) |
| **Easing curves** | كل animation تستخدم `cubic-bezier(0.16, 1, 0.3, 1)` — حركة طبيعية |
| **Backdrop blur** | Header + Dropdowns + Glass cards تستخدم blur للعمق |
| **Performance** | `contain: strict` على patterns، animations محدودة بـ `once: true` |

---

## 2. Color Palette

### Primary — Green

```
50:  #eafff5    (خلفيات خفيفة جداً)
100: #c5ffe3    (badges خلفية)
200: #8effc9    (hover states)
300: #4dffab
400: #16e88a    (icons نشطة)
500: #00c96e
600: #00a85a    ← DEFAULT — الزر الرئيسي، الروابط
700: #008549    (hover على الزر)
800: #006b3c
900: #005831
```

**قاعدة:** اللون الأساسي يُستخدم فقط في:
- الأزرار الرئيسية (CTA)
- الأيقونات النشطة
- الروابط
- الـ badges
- accents خفيفة (borders: primary/15, backgrounds: primary/10)

### Accent — Green (Lighter)

```
500: #22c55e    ← DEFAULT
600: #16a34a
```

يُستخدم في text-gradient مع Primary:  
`bg-gradient-to-r from-primary-600 to-accent-500`

### Dark Palette

```
50:  #f8f9fa    (أفتح رمادي — خلفيات بديلة)
100: #f1f3f5
200: #e9ecef    (borders خفيفة)
300: #dee2e6
400: #adb5bd    (placeholder text)
500: #868e96
600: #495057
700: #343a40
800: #212529    (نص body)
900: #16191d    (عناوين)
950: #0d0f12    ← DEFAULT — خلفية الـ Hero + Footer
```

### Semantic Colors (ثابتة — لا تتغير)

```
WhatsApp:   #25D366 (button) / #1da851 (hover)
Error:      red-500/10 bg + red-400 text
Warning:    yellow-500/10 bg + yellow-400 text
Success:    green-500/10 bg + green-400 text
Info:       blue-500/10 bg + blue-400 text
```

### قواعد الاستخدام

| السياق | اللون |
|--------|-------|
| خلفية Body | `bg-white` |
| نص Body | `text-dark-800` (#212529) |
| عناوين | `text-dark-900` (#16191d) |
| نص ثانوي | `text-dark-500` أو `text-dark-400` |
| خلفية Hero/Footer | `bg-dark-950` (#0d0f12) |
| نص على خلفية داكنة | `text-white` + `text-white/70` + `text-white/40` |
| Hover links | `text-primary` (#00a85a) |
| Borders (فاتحة) | `border-dark-100/60` أو `border-dark-200` |
| Borders (داكنة) | `border-white/[0.06]` أو `border-white/10` |

---

## 3. Typography System

### Font Family

```css
--font-inter: 'Inter', system-ui, -apple-system, sans-serif
```

يُستخدم لكل شيء (body + headings). **لا يوجد خط ثانٍ.**

### Font Size Scale

| الاسم | الحجم | الخصائص | الاستخدام |
|-------|-------|---------|----------|
| `hero` | 4rem (64px) | weight: 800, line-height: 1.05, tracking: -0.03em | عنوان الـ Hero (desktop) |
| `hero-mobile` | 2.5rem (40px) | weight: 800, line-height: 1.1, tracking: -0.02em | عنوان الـ Hero (mobile) |
| `section` | 2.75rem (44px) | weight: 700, line-height: 1.15, tracking: -0.02em | عناوين الأقسام (desktop) |
| `section-mobile` | 2rem (32px) | weight: 700, line-height: 1.2, tracking: -0.015em | عناوين الأقسام (mobile) |
| `subsection` | 1.5rem (24px) | weight: 600, line-height: 1.3 | عناوين فرعية |
| `xl` | 1.25rem (20px) | — | وصف Hero |
| `lg` | 1.125rem (18px) | — | وصف الأقسام |
| `base` | 1rem (16px) | — | نص Body |
| `sm` | 0.875rem (14px) | — | نصوص ثانوية |
| `xs` | 0.75rem (12px) | — | labels, بيانات وصفية |
| `[10px]` | 0.625rem | — | أصغر النصوص (section labels) |

### القواعد الذهبية للتايبوغرافي

1. **العناوين الكبيرة دائماً بـ negative letter-spacing** (-0.02em أو -0.03em) — هذا يجعلها تبدو محترفة
2. **line-height ضيق للعناوين** (1.05–1.2) وعادي للنصوص (1.6–1.8)
3. **3 مستويات فقط في أي section:**
   - عنوان: `text-section font-bold text-dark-900`
   - وصف: `text-lg text-dark-500 max-w-2xl`
   - تفاصيل: `text-sm text-dark-400`
4. **max-width على الوصف** دائماً `max-w-2xl mx-auto` لسهولة القراءة
5. **حجم الزر:** `text-[0.95rem]` — أصغر بقليل من base لأناقة أكثر

---

## 4. Spacing System

### Section Spacing (عمودي)

| النوع | القيمة | الاستخدام |
|-------|-------|----------|
| Standard | `py-14 md:py-20` (56px → 80px) | معظم الأقسام + `.section-padding` |
| Large | `py-16 md:py-24` (64px → 96px) | أقسام مميّزة |
| Small | `py-10 md:py-14` (40px → 56px) | IntroSection, أقسام فرعية |
| Hero | `min-h-[100svh]` (100% viewport) | — |

### Container Width

```css
.container-main {
  max-width: 80rem;        /* 1280px — max-w-7xl */
  margin: 0 auto;
  padding: 0 1rem;         /* 16px — px-4 */
}

/* Responsive padding: */
/* sm: px-6 (24px) → lg: px-8 (32px) */
```

### Component Spacing

| المكون | الـ padding الداخلي |
|--------|-------------------|
| Card صغير | `p-5` (20px) |
| Card متوسط | `p-6` (24px) |
| Card قياسي | `p-7` (28px) |
| Card كبير / Pricing | `p-8` (32px) |
| Hero section | `pt-20 pb-12` |

### Gap Patterns

| السياق | القيمة |
|--------|-------|
| Grid cards | `gap-4` (16px) أو `gap-6` (24px) |
| أقسام رئيسية | `gap-8` (32px) أو `gap-10` (40px) |
| Footer columns | `gap-12` (48px) |
| Trust indicators | `gap-x-6 gap-y-2` |
| أزرار بجانب بعض | `gap-4` (16px) |

### Margin Rules

| من → إلى | القيمة |
|----------|-------|
| Section label → عنوان | `mb-4` (16px) |
| عنوان → وصف | `mb-4` أو `mb-5` |
| وصف → محتوى | `mb-8` أو `mb-10` |
| عنصر → عنصر في قائمة | `space-y-3` أو `space-y-4` |

### Extended Spacing Values

```
18: 4.5rem (72px)
22: 5.5rem (88px)
26: 6.5rem (104px)
30: 7.5rem (120px)
```

---

## 5. Border Radius & Shadows

### Border Radius Scale

| القيمة | الاستخدام |
|--------|----------|
| `rounded-lg` (0.5rem) | عناصر صغيرة (badges, tags) |
| `rounded-xl` (0.75rem) | أزرار nav, dropdown items |
| `rounded-2xl` (1rem) | أزرار CTA, inputs, cards صغيرة |
| `rounded-3xl` (1.5rem) | cards, panels, containers |
| `rounded-4xl` (2rem) | — نادر الاستخدام |
| `rounded-full` | avatars, badges, pills |

**القاعدة:** كلما كبر المكون، زاد الـ border-radius.

### Shadow Scale

```css
/* Card — الحالة العادية */
shadow-card: 0 1px 3px rgba(0,0,0,0.04), 0 4px 20px rgba(0,0,0,0.06);

/* Card — Hover */
shadow-card-hover: 0 4px 12px rgba(0,0,0,0.06), 0 12px 40px rgba(0,0,0,0.1);

/* Card — كبير (elevated) */
shadow-card-lg: 0 8px 30px rgba(0,0,0,0.08), 0 20px 60px rgba(0,0,0,0.06);

/* Button Primary */
shadow-button: 0 4px 14px rgba(0,168,90,0.35), 0 2px 6px rgba(0,168,90,0.2);

/* Button Primary — Hover */
shadow-button-hover: 0 8px 24px rgba(0,168,90,0.4), 0 4px 12px rgba(0,168,90,0.25);

/* Glass effect */
shadow-glass: 0 8px 32px rgba(0,0,0,0.08), inset 0 0 0 1px rgba(255,255,255,0.1);

/* Maximum elevation (dropdowns, modals) */
shadow-elevated: 0 20px 60px rgba(0,0,0,0.1), 0 8px 20px rgba(0,0,0,0.06);
```

**القواعد:**
1. كل shadow مكوّن من **طبقتين**: ambient (منتشر) + directional (محدد الاتجاه)
2. الـ button shadows تستخدم لون الـ primary (أخضر) وليس أسود
3. الـ hover يزيد الـ shadow spread و blur — لا يغيّر اللون
4. لا تستخدم `shadow-lg` أو `shadow-xl` من Tailwind — استخدم custom shadows فقط

---

## 6. Layout & Structure

### هيكل الصفحة

```
┌────────────────────────────────────────┐
│ PromoBanner (fixed top, يمكن إخفاؤه)    │
├────────────────────────────────────────┤
│ Navbar (fixed, backdrop-blur)           │
├────────────────────────────────────────┤
│ Hero (100vh, dark bg)                   │
├────────────────────────────────────────┤
│ Section 1: IntroSection (light bg)      │
│   py-10 md:py-14                        │
├────────────────────────────────────────┤
│ Section 2: Steps (light bg)             │
│   py-14 md:py-20                        │
├────────────────────────────────────────┤
│ Section 3: PricingBox (light bg)        │
│   py-14 md:py-20                        │
├────────────────────────────────────────┤
│ Section 4: Trust Badges (dark bg)       │
│   py-14 md:py-20                        │
├────────────────────────────────────────┤
│ Section 5: FAQ (light bg)               │
│   py-14 md:py-20                        │
├────────────────────────────────────────┤
│ Footer (dark bg)                        │
│   py-20                                 │
└────────────────────────────────────────┘
```

### Visual Balance Rules

1. **تبادل Light/Dark:** الأقسام تتناوب بين خلفية فاتحة وداكنة لكسر الرتابة
2. **Container ثابت:** كل المحتوى داخل `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
3. **Content width:** العناوين والأوصاف `max-w-2xl mx-auto text-center`
4. **Grid system:** `grid-cols-1 md:grid-cols-2` أو `grid-cols-1 md:grid-cols-3` أو `grid-cols-2 md:grid-cols-4`
5. **No full-bleed:** لا عنصر يصل لحافة الشاشة (ما عدا backgrounds)

### Hierarchy Pattern (كل section)

```
1. Section Label (badge)     — text-xs uppercase tracking-wide
2. Main Heading             — text-section font-bold
3. Subtitle/Description     — text-lg text-muted max-w-2xl
4. Content (cards/grid)     — mt-8 أو mt-10
5. Optional CTA             — mt-8
```

---

## 7. Header (Navbar)

### Structure

```
┌──────────────────────────────────────────────────────────┐
│ [Logo]    [Nav Links + Dropdowns]    [Account] [CTA]     │
└──────────────────────────────────────────────────────────┘
```

### Behavior

| الحالة | الخلفية | النصوص | الـ Logo |
|--------|---------|--------|---------|
| أعلى الصفحة (no scroll) | `bg-transparent` | `text-white/80` | `brightness-0 invert` (أبيض) |
| بعد scroll | `bg-white/90 backdrop-blur-2xl` | `text-dark-600` | ألوان طبيعية |

### Shadow عند الـ scroll

```css
shadow: 0 1px 3px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.04)
```

### لماذا يبدو احترافياً؟

1. **Backdrop blur** (`backdrop-blur-2xl`) — الخلفية شبه شفافة مع blur = عمق
2. **Transition سلس** بين الحالتين (transparent → white) يحدث فقط بعد scroll
3. **الروابط صغيرة** (`text-[13px] font-semibold`) — لا تزاحم
4. **Gap ضيق** (`gap-1`) بين الروابط — مدمجة لكن مريحة
5. **Hover on links:** `hover:bg-primary/5 hover:text-primary` — تغيير لطيف
6. **CTA button** أصغر من الأزرار العادية (`py-2.5 text-sm`) — يناسب الـ header
7. **الـ dropdown:** يظهر بـ animation (opacity + y + scale) من `motion.div` — ليس فقط display/hide

### Dropdown Menu

```css
Width: w-72 (288px)
Background: bg-white/95 backdrop-blur-2xl
Border: border-dark-100/50
Border-radius: rounded-2xl
Shadow: shadow-elevated
Animation: opacity 0→1, y 8→0, scale 0.96→1 (0.2s)
```

### Mobile Menu

```css
Width: w-[85%] max-w-sm
Position: fixed right-0, full height
Background: bg-white
Animation: x 100% → 0 (0.35s ease)
Overlay: bg-black/20 backdrop-blur-sm
```

---

## 8. Footer

### Structure

```
┌──────────────────────────────────────────────────────────┐
│ Decorative line (gradient from transparent to white/10)   │
├──────────────────────────────────────────────────────────┤
│ CTA Section                                               │
│   [Logo]  [Text]                           [CTA Button]   │
├──────────────────────────────────────────────────────────┤
│ Links Grid (4 columns)                                    │
│ [Services]  [Legal]  [Contact/Social]  [Payments/Trust]   │
├──────────────────────────────────────────────────────────┤
│ Bottom Bar                                                │
│   © 2026         [Legal links]                            │
└──────────────────────────────────────────────────────────┘
```

### Background

```css
bg-dark-950 text-white
```

### Grid

```css
grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12
```

### Typography Hierarchy

| العنصر | الأسلوب |
|--------|---------|
| Section headers | `text-[11px] font-bold text-white/30 uppercase tracking-[0.15em]` |
| Links | `text-white/50 hover:text-white text-sm` |
| Contact icons | `w-8 h-8 rounded-lg bg-white/5` → hover: `bg-white/10` |
| Social icons | `w-10 h-10 rounded-full bg-white/[0.07]` → hover: `bg-white/[0.15]` |
| Payment methods | `px-3 py-1.5 rounded-lg bg-white/[0.07] text-white/60 text-xs` |
| Trust badges | `text-sm font-semibold text-white/80` with `CheckCircle2` icon |
| Copyright | `text-white/30 text-xs` |
| Legal links | `text-white/30 hover:text-white/60 text-xs` + dot dividers |

### لماذا يبدو احترافياً؟

1. **Decorative gradient line** في الأعلى: `from-transparent via-white/10 to-transparent`
2. **Section headers** ultra-small مع tracking واسع — تبدو كـ labels احترافية
3. **Opacity layers**: white/30 → white/50 → white/80 — تدرج واضح
4. **Social icons** في circles مع hover effect — مثل التطبيقات الحديثة
5. **Payment badges** تعطي ثقة بصرية
6. **Dot dividers** (`w-1 h-1 rounded-full bg-white/10`) بين الروابط في الـ bottom bar

---

## 9. Hero Section

### Background Layers (من الأسفل للأعلى)

```
Layer 1: bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950
Layer 2: Green orb (top-right) — w-[60%] h-[60%] bg-primary/15 blur-[40px]
Layer 3: Green orb (bottom-left) — w-[40%] h-[40%] bg-primary/10 blur-[30px]
Layer 4: Grid pattern — .hero-grid-pattern opacity-[0.03]
```

### Grid Pattern CSS

```css
.hero-grid-pattern {
  background-image:
    linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px);
  background-size: 60px 60px;
  contain: strict;     /* performance optimization */
}
```

### Content Structure

```
[Badge: KBA registriert]          — inline-flex bg-primary/10 rounded-full
[H1: Main title]                  — text-hero-mobile md:text-hero text-white
  [Gradient span: "online"]       — text-gradient (primary → accent)
[Subtitle]                        — text-xl md:text-2xl text-white/70
[Badge: checkmarks]               — text-base text-white/40
[CTA: Primary + Secondary]        — .btn-primary.cta-glow + .btn-outline-white
[Trust indicators]                — flex items-center gap-x-6 text-sm text-white/50
```

### KBA Floating Zone (desktop only)

```css
/* Central badge */
w-[180px] h-[180px] bg-white/5 backdrop-blur-sm rounded-3xl border-white/10 animate-glow

/* 4 corner cards positioned absolutely */
bg-white/8 backdrop-blur-sm rounded-xl border-white/10 text-white text-sm
```

### Feature Cards Row

```css
grid grid-cols-2 md:grid-cols-4 gap-4

/* Each card: */
bg-white/[0.05] backdrop-blur-sm rounded-2xl p-5
border border-white/[0.08]
hover:bg-white/[0.1] hover:border-white/[0.15] hover:-translate-y-1
transition-all duration-300

/* Icon wrapper inside: */
w-12 h-12 bg-primary/10 rounded-xl
group-hover:bg-primary/20 transition-colors
```

---

## 10. Buttons

### Primary Button

```css
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.625rem;           /* gap-2.5 */
  padding: 1rem 2rem;      /* py-4 px-8 */
  background: #00a85a;     /* bg-primary */
  color: white;
  font-weight: 600;        /* font-semibold */
  font-size: 0.95rem;
  letter-spacing: -0.01em;
  border-radius: 1rem;     /* rounded-2xl */
  box-shadow: shadow-button;
  transition: all 0.3s ease-out;
}

.btn-primary:hover {
  background: #008549;     /* primary-700 */
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,168,90,0.4), 0 4px 12px rgba(0,168,90,0.25);
}

.btn-primary:active {
  transform: translateY(0);
}

.btn-primary:focus {
  outline: none;
  box-shadow: 0 0 0 4px rgba(0,168,90,0.25);
}
```

### Secondary Button

```css
.btn-secondary {
  /* Same layout as primary */
  padding: 1rem 2rem;
  background: white;
  color: #212529;          /* dark-800 */
  border: 1px solid #e9ecef; /* dark-200 */
  font-weight: 600;
  border-radius: 1rem;
}

.btn-secondary:hover {
  border-color: #00a85a;
  color: #00a85a;
  transform: translateY(-2px);
  box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 20px rgba(0,0,0,0.06);
}
```

### Outline White (على خلفية داكنة)

```css
.btn-outline-white {
  padding: 1rem 2rem;
  background: transparent;
  color: white;
  border: 2px solid rgba(255,255,255,0.3);
  backdrop-filter: blur(4px);
  border-radius: 1rem;
}

.btn-outline-white:hover {
  background: rgba(255,255,255,0.1);
  border-color: rgba(255,255,255,0.6);
  transform: translateY(-2px);
}
```

### WhatsApp Button

```css
.btn-whatsapp {
  padding: 0.875rem 1.5rem;
  background: #25D366;
  color: white;
  font-weight: 600;
  border-radius: 1rem;
}

.btn-whatsapp:hover {
  background: #1da851;
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}
```

### CTA Glow Effect (إضافة على أي زر)

```css
.cta-glow {
  position: relative;
}
.cta-glow::after {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: inherit;
  background: linear-gradient(135deg, rgba(0,168,90,0.4), rgba(34,197,94,0.2));
  opacity: 0;
  z-index: -1;
  filter: blur(12px);
  transition: opacity 0.4s ease;
}
.cta-glow:hover::after {
  opacity: 1;
}
```

### القواعد

1. **لا تنشئ أنماط أزرار جديدة** — استخدم الموجودة فقط
2. **btn-primary** للـ CTA الرئيسي (فعل واحد بارز per section)
3. **btn-secondary** للإجراءات الثانوية بجانب الـ primary
4. **الـ icon** يكون بعد النص مع `group-hover:translate-x-1` للإحساس بالحركة
5. **font-size الزر** أصغر من النص العادي (0.95rem) — أناقة

---

## 11. Cards

### Standard Card (.card)

```css
background: white;
border-radius: 1.5rem;            /* rounded-3xl */
padding: 1.75rem;                 /* p-7 */
border: 1px solid rgba(241, 243, 245, 0.6); /* dark-100/60 */
box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 20px rgba(0,0,0,0.06);
transition: all 0.3s ease-out;

/* Hover: */
box-shadow: 0 4px 12px rgba(0,0,0,0.06), 0 12px 40px rgba(0,0,0,0.1);
transform: translateY(-4px);      /* hover:-translate-y-1 */
```

### Glass Card (على خلفية فاتحة)

```css
background: rgba(255,255,255,0.7);
backdrop-filter: blur(24px);
border: 1px solid rgba(255,255,255,0.4);
border-radius: 1.5rem;
box-shadow: 0 8px 32px rgba(0,0,0,0.08), inset 0 0 0 1px rgba(255,255,255,0.1);
```

### Dark Glass Card (على خلفية داكنة)

```css
background: rgba(255,255,255,0.05);
backdrop-filter: blur(24px);
border: 1px solid rgba(255,255,255,0.1);
border-radius: 1.5rem;
```

### Card Content Structure

```
[Icon wrapper]    — w-16 h-16 bg-primary/10 rounded-2xl centered
[Title]          — text-xl font-bold text-dark-900 mb-3
[Badges/Tags]    — flex gap-2 (optional)
[Description]    — text-dark-400 text-[0.95rem] leading-relaxed
```

---

## 12. Form Elements

### Input Field

```css
.input-field {
  width: 100%;
  padding: 0.875rem 1rem;         /* py-3.5 px-4 */
  border-radius: 1rem;            /* rounded-2xl */
  border: 1px solid #e9ecef;      /* dark-200 */
  background: white;
  color: #212529;                  /* dark-800 */
  transition: all 0.2s;
}

.input-field::placeholder {
  color: #adb5bd;                  /* dark-400 */
}

.input-field:focus {
  outline: none;
  border-color: #00a85a;
  box-shadow: 0 0 0 2px rgba(0,168,90,0.4);
}
```

### Multi-step Form Pattern

```
Step Indicator:  أيقونات في صف أفقي مع خطوط ربط
Navigation:     زر "التالي" (primary) + زر "السابق" (secondary/ghost)
Validation:     React Hook Form + Zod schemas
Progress:       Visual step bar with active state highlight
Success:        CheckCircle icon مع رسالة نجاح
```

---

## 13. Badges & Labels

### Section Label (قبل العناوين)

```css
.section-label {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 9999px;          /* rounded-full */
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #00a85a;
  background: rgba(0,168,90,0.08);
  border: 1px solid rgba(0,168,90,0.15);
}
```

### Badge (عام)

```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 1rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: rgba(0,168,90,0.1);
  color: #00a85a;
  letter-spacing: 0.05em;
}
```

---

## 14. Animations & Effects

### Easing Curve المعيارية

```
cubic-bezier(0.16, 1, 0.3, 1)
```

هذا الـ easing يُستخدم في **كل** animation تقريباً. يعطي:
- بداية سريعة
- نهاية ناعمة (ease-out enhanced)
- إحساس طبيعي

### Scroll Reveal (Framer Motion)

```tsx
// الاستخدام القياسي لأي عنصر يظهر عند scroll:
<motion.div
  initial={{ opacity: 0, y: 24 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true }}          // يتحرك مرة واحدة فقط
  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
>
```

### Staggered Grid (عناصر متتالية)

```tsx
// كل عنصر يظهر بتأخير:
transition={{ delay: index * 0.1, duration: 0.5 }}

// أو أسرع لقوائم كبيرة:
transition={{ delay: index * 0.06, duration: 0.4 }}
```

### Hover Effects

| النوع | الاستخدام | الكود |
|-------|----------|-------|
| Lift (صغير) | أزرار | `hover:-translate-y-0.5` + shadow-expand |
| Lift (كبير) | cards | `hover:-translate-y-1` + shadow-card-hover |
| Color shift | روابط nav | `hover:text-primary hover:bg-primary/5` |
| Glow | CTA | `.cta-glow::after` (blur + opacity) |
| Scale | WhatsApp float | `hover:scale-110` |
| Arrow slide | CTA icons | `group-hover:translate-x-1` |
| Border reveal | cards on dark bg | `hover:border-white/[0.15]` |

### CSS Animations

```css
animate-glow:     /* boxShadow pulse — 2s infinite */
animate-float:    /* translateY + rotate — 6s infinite */
animate-shimmer:  /* backgroundPosition slide — 2.5s linear infinite */
animate-bounce-gentle: /* translateY(0 → -8px) — 3s infinite */
```

### Performance Rules

1. **`viewport={{ once: true }}`** — كل animation تعمل مرة واحدة فقط عند الظهور
2. **`contain: strict`** على الـ grid pattern — يمنع repaint
3. **`contain: layout style paint`** على الـ Hero section
4. **`will-change` لا يُستخدم** — Framer Motion يديرها تلقائياً
5. **الـ blur** يُستخدم على عناصر كبيرة فقط (orbs) بـ blur value منخفض (30-40px لا 100+)
6. **No animations on page load** ما عدا الـ Hero — الأقسام تتحرك فقط عند scroll

---

## 15. Responsive Strategy

### Breakpoints

```
sm:  640px    (tablet صغير)
md:  768px    (tablet)
lg:  1024px   (desktop صغير)
xl:  1280px   (desktop)
```

### Grid Behavior

| المكون | Mobile | Tablet | Desktop |
|--------|--------|--------|---------|
| Stats cards | 2 columns | 2 columns | 4 columns |
| Step cards | 1 column | 3 columns | 3 columns |
| Footer links | 1 column | 2 columns | 4 columns |
| Feature cards | 2 columns | 2 columns | 4 columns |
| Info cards | 1 column | 2 columns | 2 columns |
| Pricing cards | 1 column | 2 columns | 2 columns |

### Typography Responsive

```
H1 (Hero):     text-hero-mobile md:text-hero        (40px → 64px)
H2 (Section):  text-section-mobile md:text-section   (32px → 44px)
Subtitle:      text-xl md:text-2xl                    (20px → 24px)
```

### Section Padding Responsive

```
Standard: py-14 md:py-20    (56px → 80px)
Large:    py-16 md:py-24    (64px → 96px)
```

### Navigation Responsive

```
Desktop (lg+):  روابط أفقية + dropdown + CTA button
Mobile (<lg):   hamburger → drawer من اليمين
```

### قواعد Mobile-First

1. **الـ container** يأخذ `px-4` دائماً على mobile — لا zero padding
2. **الأزرار** تأخذ `w-full` على mobile في أغلب الحالات
3. **النصوص الكبيرة** لها حجم mobile مخصص (hero-mobile, section-mobile)
4. **Hidden elements:** `hidden lg:block` — بعض العناصر التزيينية desktop فقط
5. **لا horizontal scroll** — كل grid ينزل لعمود واحد على mobile

---

## 16. UI Components Library

### Component Registry

| المكون | الملف | الاستخدام | القواعد |
|--------|-------|----------|---------|
| **Section** | `Section.tsx` | Wrapper لأي قسم | 5 variants: `default/light/dark/primary/transparent` + 3 sizes: `default/large/small` |
| **SectionHeader** | `SectionHeader.tsx` | عنوان + وصف + badge | Alignment: center (default) / left. دائماً `max-w-2xl` |
| **ScrollReveal** | `ScrollReveal.tsx` | Animation wrapper | Directions: up/down/left/right. `once: true` دائماً |
| **Hero** | `Hero.tsx` | القسم الرئيسي | Full viewport height, dark bg, green orbs |
| **Steps** | `Steps.tsx` | خطوات مرقمة | 3 columns, numbered badges, icons |
| **PricingBox** | `PricingBox.tsx` | بطاقات الأسعار | 2 columns, live pricing, CTAs |
| **TrustBadges** | `TrustBadges.tsx` | شارات الثقة | 3 columns, dark bg |
| **FAQ** | `FAQ.tsx` | أسئلة وأجوبة | Accordion, AnimatePresence |
| **BlogCard** | `BlogCard.tsx` | بطاقة مقال | Image + title + excerpt + date |
| **ServiceForm** | `ServiceForm.tsx` | نموذج متعدد الخطوات | 6 steps with validation |
| **Navbar** | `Navbar.tsx` | الـ header الثابت | Scroll-aware, backdrop-blur |
| **Footer** | `Footer.tsx` | الـ footer | 4-column grid, dark bg |
| **PromoBanner** | `PromoBanner.tsx` | بانر العروض | Fixed top, dismissible |
| **WhatsAppFloat** | `WhatsAppFloat.tsx` | زر WhatsApp | Fixed bottom-right |

---

## 17. UX Principles

### 1. Clarity (وضوح)

- **3 مستويات hierarchy فقط** في أي section — لا ازدحام
- **Labels واضحة** — لا icons بدون نص
- **max-width على النصوص** — لا سطور طويلة (max 60-70 حرف)

### 2. Hierarchy (تسلسل)

- **Size + Weight + Color** يحددون الأهمية:
  - أهم = كبير + bold + dark
  - ثانوي = متوسط + regular + gray
  - تفاصيل = صغير + regular + light gray
- **CTA واحد بارز per section** — لا تنافس بصري

### 3. Spacing (تنفس)

- **مساحات بيضاء كبيرة** بين الأقسام (80px desktop)
- **Consistent internal padding** — كل card بنفس الـ p-7
- **No tight layouts** — كل عنصر لديه مساحة

### 4. Contrast

- **نص على خلفية فاتحة:** `text-dark-800` (4.5:1+ contrast ratio)
- **نص على خلفية داكنة:** `text-white` أو `text-white/70` (7:1+ ratio)
- **أزرار:** دائماً لون قوي (primary green) مع text white
- **الـ section label:** لون أخضر خافت (`primary/10` bg) — يبرز بدون صخب

### 5. Feedback (ردود فعل)

- **Hover = lift + shadow expand** — المستخدم يعرف ان العنصر قابل للضغط
- **Active = return down** — إحساس بالضغط
- **Focus ring** (4px primary/25) — accessibility
- **Loading states:** skeleton loaders مع `animate-pulse`
- **Toast notifications:** للعمليات الناجحة/الفاشلة

### 6. Performance-Aware UX

- **Animations تعمل مرة واحدة** (`once: true`) — لا re-animation عند scroll up
- **Lazy loading** — TiptapEditor يتم تحميله `dynamic(() => import(...), { ssr: false })`
- **SWR** — caching + revalidation بدون loading spinners متكررة
- **Debounced search** — 300ms delay لتقليل API calls
- **`will-change: auto`** — لا forced GPU layers

---

## 18. Implementation Guide

> **إذا كنت تريد تطبيق نفس مستوى التصميم على مشروع آخر، اتبع هذه الخطوات بالترتيب:**

### الخطوة 1: Setup الأساسي

```bash
# 1. Next.js + Tailwind
npx create-next-app@latest --typescript --tailwind

# 2. Framer Motion
npm install framer-motion

# 3. Lucide Icons
npm install lucide-react

# 4. Inter Font (في layout.tsx)
import { Inter } from 'next/font/google'
const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' })
```

### الخطوة 2: Tailwind Config

انسخ هذه القيم بالضبط في `tailwind.config.ts`:

```ts
theme: {
  extend: {
    colors: {
      primary: {
        // غيّر هذا اللون فقط ليناسب هوية مشروعك الجديد
        // لكن احتفظ بنفس عدد الـ shades (50-900)
        DEFAULT: '#00a85a',
        50: '#eafff5', 100: '#c5ffe3', 200: '#8effc9',
        300: '#4dffab', 400: '#16e88a', 500: '#00c96e',
        600: '#00a85a', 700: '#008549', 800: '#006b3c', 900: '#005831',
      },
      dark: {
        // لا تغيّر هذه — اتركها كما هي
        50: '#f8f9fa', 100: '#f1f3f5', 200: '#e9ecef',
        300: '#dee2e6', 400: '#adb5bd', 500: '#868e96',
        600: '#495057', 700: '#343a40', 800: '#212529',
        900: '#16191d', 950: '#0d0f12', DEFAULT: '#0d0f12',
      },
    },
    fontSize: {
      // انسخ هذه بالضبط — هذا ما يصنع الفرق
      'hero': ['4rem', { lineHeight: '1.05', fontWeight: '800', letterSpacing: '-0.03em' }],
      'hero-mobile': ['2.5rem', { lineHeight: '1.1', fontWeight: '800', letterSpacing: '-0.02em' }],
      'section': ['2.75rem', { lineHeight: '1.15', fontWeight: '700', letterSpacing: '-0.02em' }],
      'section-mobile': ['2rem', { lineHeight: '1.2', fontWeight: '700', letterSpacing: '-0.015em' }],
      'subsection': ['1.5rem', { lineHeight: '1.3', fontWeight: '600' }],
    },
    borderRadius: {
      '2xl': '1rem', '3xl': '1.5rem', '4xl': '2rem',
    },
    boxShadow: {
      // انسخ هذه بالضبط
      'card': '0 1px 3px rgba(0,0,0,0.04), 0 4px 20px rgba(0,0,0,0.06)',
      'card-hover': '0 4px 12px rgba(0,0,0,0.06), 0 12px 40px rgba(0,0,0,0.1)',
      'button': '0 4px 14px rgba(0,168,90,0.35), 0 2px 6px rgba(0,168,90,0.2)',
      'elevated': '0 20px 60px rgba(0,0,0,0.1), 0 8px 20px rgba(0,0,0,0.06)',
    },
    // انسخ الـ animations و keyframes من الملف الأصلي
  },
}
```

### الخطوة 3: Global CSS

أنشئ ملف `globals.css` مع هذه القواعد الأساسية:

```css
@layer base {
  html { scroll-behavior: smooth; -webkit-font-smoothing: antialiased; }
  body { @apply font-sans text-dark-800 bg-white; }
  h1, h2, h3, h4, h5, h6 { @apply font-heading text-dark-900; }
  ::selection { @apply bg-primary/20 text-dark-900; }
}

@layer components {
  /* انسخ btn-primary, btn-secondary, card, container-main, etc. */
}
```

### الخطوة 4: Build Header

```
1. استخدم position: fixed + z-50
2. أضف scroll listener لتغيير الخلفية (transparent → white/90)
3. أضف backdrop-blur-2xl عند الـ scroll
4. الروابط: text-[13px] font-semibold gap-1
5. CTA button أصغر من العادي (py-2.5 text-sm)
6. Mobile: hamburger → drawer (motion.div from right)
```

### الخطوة 5: Build Footer

```
1. bg-dark-950 text-white
2. Decorative gradient line في الأعلى
3. Grid 4 columns (lg) / 2 (md) / 1 (mobile)
4. Section headers: text-[11px] uppercase tracking-[0.15em] text-white/30
5. Links: text-white/50 hover:text-white
6. Bottom bar: border-t + copyright + legal links
```

### الخطوة 6: Sections Pattern

كل section يتبع هذا النمط:

```tsx
<section className="py-14 md:py-20">
  <div className="container-main">
    {/* 1. Section Label */}
    <span className="section-label">Label Text</span>

    {/* 2. Heading */}
    <h2 className="text-section-mobile md:text-section text-dark-900 mt-4">
      Section Title
    </h2>

    {/* 3. Description */}
    <p className="text-lg text-dark-500 mt-4 max-w-2xl mx-auto text-center">
      Brief description here
    </p>

    {/* 4. Content Grid */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
      {items.map((item, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.1, duration: 0.5 }}
          className="card"
        >
          {/* Card content */}
        </motion.div>
      ))}
    </div>
  </div>
</section>
```

### الخطوة 7: Animations

```tsx
// 1. Install framer-motion
// 2. استخدم هذا الـ pattern في كل مكان:
import { motion } from 'framer-motion';

// Scroll reveal:
<motion.div
  initial={{ opacity: 0, y: 24 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true }}
  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
>

// Staggered items:
transition={{ delay: index * 0.1 }}

// Dropdown/accordion:
<AnimatePresence>
  {isOpen && (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    />
  )}
</AnimatePresence>
```

### الخطوة 8: Performance Checklist

```
✅ viewport={{ once: true }} — animations تعمل مرة واحدة
✅ contain: strict على backgrounds/patterns
✅ dynamic import للمكونات الثقيلة (editors)
✅ Inter font مع display: 'swap'
✅ images محسّنة (WebP/AVIF)
✅ لا مكتبات ثقيلة — Lucide icons (tree-shakeable)
✅ SWR للـ data fetching مع caching
✅ debounced search (300ms)
```

---

## ملاحظة ختامية: تطبيق هذا على مشروع مختلف

### ما يمكن تغييره:

- **اللون الأساسي** (`primary`) — غيّره ليناسب هوية المشروع الجديد
- **الشعار والنصوص** — طبعاً
- **المحتوى والأقسام** — حسب الحاجة
- **عدد الأعمدة** في الـ grids — حسب عدد العناصر

### ما يجب الحفاظ عليه:

- **نفس الـ spacing system** (py-14 md:py-20 / p-7 / gap-6)
- **نفس الـ typography** (hero/section sizes + negative tracking)
- **نفس الـ shadow system** (dual-layer shadows)
- **نفس الـ animation easing** (cubic-bezier(0.16, 1, 0.3, 1))
- **نفس الـ border-radius scale** (2xl → 3xl → 4xl)
- **نفس الـ hover pattern** (translate-y + shadow-expand)
- **نفس الـ dark palette** — اتركها كما هي
- **نفس الـ responsive breakpoints** والـ grid behavior
- **نفس الـ container widths** (max-w-7xl px-4 sm:px-6 lg:px-8)

### لماذا؟

هذه القيم ليست عشوائية — هي نظام مترابط:
- الـ shadows مصممة لتتكامل مع الـ border-radius
- الـ spacing مبني على رقم 4px base (متناسق)
- الـ typography scale يعمل مع الـ spacing
- الـ easing curve تعطي نفس الإحساس في كل مكان

غيّر جزء واحد وسيبدو الباقي غير متسق.

---

> **هذا الملف هو Design System كامل. اتبعه حرفياً وستحصل على نفس المستوى الاحترافي.**
