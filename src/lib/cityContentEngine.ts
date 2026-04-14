/**
 * City Content Engine — generates unique, SEO-optimized content per city.
 *
 * 5 layers of uniqueness:
 *   1. Semantic variation — genuinely different template pools per section
 *   2. Structural variation — section order & combination varies per city
 *   3. Data injection — city name, authority, address, phone, region, nearby
 *   4. Dynamic blocks — local insights, nearby links, city-specific FAQ
 *   5. Content weight — long/medium/short based on city hash
 */

import { getCityBySlug, getAuthority, getNearbyCities, type CityEntry, type AuthorityData } from '@/data/cities';

// ── Types ────────────────────────────────────────────────────────

export interface CityPageContent {
  title: string;
  metaTitle: string;
  metaDescription: string;
  canonicalSlug: string;
  sections: CitySection[];
  schema: CitySchema;
  cityName: string;
  authority: AuthorityData | undefined;
  nearbyCities: CityEntry[];
  contentWeight: 'long' | 'medium' | 'short';
}

export interface CitySection {
  type: 'hero' | 'intro' | 'process' | 'documents' | 'benefits' | 'faq' | 'local' | 'cta' | 'authority' | 'nearby';
  data: Record<string, unknown>;
}

export interface CitySchema {
  service: object;
  localBusiness: object;
  faq: object;
  breadcrumb: object;
}

// ── Hashing & Seed Utilities ─────────────────────────────────────

function hashSeed(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0x7fffffff;
  }
  return hash;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function seededPick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

function seededPickN<T>(arr: T[], seed: number, n: number): T[] {
  const rand = seededRandom(seed);
  const copy = [...arr];
  const result: T[] = [];
  for (let i = 0; i < Math.min(n, copy.length); i++) {
    const idx = Math.floor(rand() * copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const rand = seededRandom(seed);
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ── Token Replacement ────────────────────────────────────────────

interface TokenData {
  city: string;
  state: string;
  region: string;
  authorityName: string;
  authorityAddress: string;
  authorityPhone: string;
  authorityEmail: string;
  authorityHours: string;
  nearbyCitiesList: string;
}

function replaceTokens(text: string, data: TokenData): string {
  return text
    .replace(/\{city\}/g, data.city)
    .replace(/\{state\}/g, data.state)
    .replace(/\{region\}/g, data.region)
    .replace(/\{authorityName\}/g, data.authorityName)
    .replace(/\{authorityAddress\}/g, data.authorityAddress)
    .replace(/\{authorityPhone\}/g, data.authorityPhone)
    .replace(/\{authorityEmail\}/g, data.authorityEmail)
    .replace(/\{authorityHours\}/g, data.authorityHours)
    .replace(/\{nearbyCities\}/g, data.nearbyCitiesList);
}


// ═══════════════════════════════════════════════════════════════════
//  LAYER 1 — SEMANTIC VARIATION (Template Pools)
// ═══════════════════════════════════════════════════════════════════

// ── Hero Templates ───────────────────────────────────────────────

const HERO_TEMPLATES = [
  {
    badge: 'KFZ Zulassung in {city}',
    h1: ['KFZ online zulassen', 'in {city}'],
    subtitle: 'Kein Besuch bei der Zulassungsstelle {city} nötig. Alle Fahrzeugtypen – PKW, Motorrad, Anhänger. Offiziell beim KBA registriert.',
  },
  {
    badge: 'Online-Zulassung {city}',
    h1: ['Fahrzeug anmelden', 'in {city} – ganz digital'],
    subtitle: 'Vergessen Sie lange Wartezeiten bei der {authorityName}. Melden Sie Ihr Auto bequem von zu Hause an – 24 Stunden am Tag.',
  },
  {
    badge: 'Zulassungsservice {city}',
    h1: ['Schluss mit Warteschlangen', '– Zulassung in {city} online'],
    subtitle: 'Nutzen Sie unseren offiziellen i-Kfz-Service für {city} und Umgebung. Schnell, sicher und komplett digital.',
  },
  {
    badge: '{city} – Digital & Einfach',
    h1: ['Auto anmelden', 'ohne Behördengang in {city}'],
    subtitle: 'PKW, Motorrad oder Anhänger: Erledigen Sie Ihre Kfz-Zulassung für {city} und {region} in wenigen Minuten online.',
  },
  {
    badge: 'Digitaler Zulassungsservice',
    h1: ['Kfz-Zulassung {city}', '– 100 % online'],
    subtitle: 'Von der Neuzulassung bis zur Ummeldung: Unser digitaler Service für {city} spart Ihnen den Weg zur Behörde.',
  },
  {
    badge: 'i-Kfz für {city}',
    h1: ['Ihr Fahrzeug', 'in {city} online zulassen'],
    subtitle: 'Offiziell beim KBA registriert. Gültig für alle Fahrzeugarten. Ihre Zulassungsbestätigung erhalten Sie per E-Mail.',
  },
  {
    badge: 'Online-Service {city}',
    h1: ['Keine Wartezeit mehr', '– Kfz-Zulassung {city}'],
    subtitle: 'Statt stundenlang bei der Zulassungsstelle in {city} zu warten, erledigen Sie alles in wenigen Klicks – auch abends und am Wochenende.',
  },
  {
    badge: '{city} & {region}',
    h1: ['Auto zulassen in {city}', '– digital und unkompliziert'],
    subtitle: 'Unser Service deckt {city} und die gesamte Region {region} ab. Sparen Sie Zeit und Nerven mit der Online-Zulassung.',
  },
  {
    badge: 'Sofort-Zulassung',
    h1: ['KFZ-Zulassung für {city}', 'direkt online erledigen'],
    subtitle: 'Ihr Auto wartet, nicht Sie. Starten Sie die Online-Zulassung für {city} und erhalten Sie innerhalb kürzester Zeit Ihre Bestätigung.',
  },
  {
    badge: 'Digitaler Service für {city}',
    h1: ['Online zum Kennzeichen', 'in {city}'],
    subtitle: 'Modernste i-Kfz-Technik macht es möglich: Zulassungen, Ummeldungen und Abmeldungen für {city} komplett ohne Papierkram.',
  },
  {
    badge: 'KBA-registriert',
    h1: ['Fahrzeugzulassung {city}', '– sicher und schnell'],
    subtitle: 'Offizieller i-Kfz-Dienstleister für {city}, {state}. Anmeldung, Ummeldung oder Abmeldung – alles online möglich.',
  },
  {
    badge: 'Zulassung in {state}',
    h1: ['Kfz online anmelden', 'in {city} und Umgebung'],
    subtitle: 'Sparen Sie sich den Gang zur Zulassungsstelle. Unser Service ist rund um die Uhr für Fahrzeughalter in {city} verfügbar.',
  },
  {
    badge: '{city} Online',
    h1: ['Endlich: Zulassung', 'ohne Zulassungsstelle {city}'],
    subtitle: 'Dank i-Kfz müssen Sie nicht mehr persönlich bei der {authorityName} erscheinen. Wir übernehmen den gesamten Prozess digital.',
  },
  {
    badge: 'Einfach digital',
    h1: ['KFZ-Service {city}', '– jetzt online nutzen'],
    subtitle: 'Egal ob Neuzulassung, Ummeldung oder Abmeldung: Für Fahrzeughalter in {city} und {region} ist jetzt alles online möglich.',
  },
  {
    badge: 'Zugelassen in Minuten',
    h1: ['Fahrzeug in {city} anmelden', '– ohne Termin, ohne Warten'],
    subtitle: 'In drei einfachen Schritten zum Kennzeichen. Unser digitaler Zulassungsservice für {city} ist schnell, sicher und offiziell.',
  },
  {
    badge: 'Ihr lokaler Online-Service',
    h1: ['KFZ-Zulassung', 'für {city} und {region}'],
    subtitle: 'Ob PKW, Motorrad, Wohnmobil oder Anhänger – lassen Sie Ihr Fahrzeug in {city} ganz bequem online zu.',
  },
  {
    badge: 'Alles online',
    h1: ['{city}: Auto anmelden', 'war noch nie so einfach'],
    subtitle: 'Die Zulassungsstelle {city} hat begrenzte Öffnungszeiten? Unser Online-Service ist 24/7 für Sie da.',
  },
  {
    badge: 'Schnell & Sicher',
    h1: ['Digitale KFZ-Zulassung', 'für {city}, {state}'],
    subtitle: 'Tausende Fahrzeughalter aus {city} nutzen bereits unseren Online-Zulassungsservice. Werden Sie einer von ihnen.',
  },
  {
    badge: 'Jetzt online zulassen',
    h1: ['Kfz-Zulassung in {city}', '– bequemer geht\'s nicht'],
    subtitle: 'Von zu Hause, vom Büro oder unterwegs: Melden Sie Ihr Fahrzeug für den Bezirk {city} an – komplett papierlos.',
  },
  {
    badge: 'Online-Zulassung',
    h1: ['Fahrzeugzulassung', 'in {city} leicht gemacht'],
    subtitle: 'Unser zertifizierter i-Kfz-Service ermöglicht es Ihnen, Ihr Fahrzeug in {city} und ganz {state} digital zuzulassen.',
  },
];

// ── Intro Templates ──────────────────────────────────────────────

const INTRO_TEMPLATES = [
  {
    title: 'Willkommen beim Online-Zulassungsservice für {city}',
    paragraphs: [
      'Sie möchten ein Fahrzeug in {city} zulassen, ummelden oder abmelden? Mit unserem digitalen Zulassungsservice sparen Sie sich den Gang zur Zulassungsstelle in {city}. Der gesamte Prozess läuft online ab – schnell, sicher und offiziell beim Kraftfahrt-Bundesamt (KBA) registriert.',
      'Unser Service steht Ihnen in {city} und der gesamten Region {region} zur Verfügung. Egal ob PKW, Motorrad, Anhänger oder Wohnmobil – wir bearbeiten alle Fahrzeugtypen zuverlässig und zeitnah.',
    ],
  },
  {
    title: 'Kfz-Zulassung {city}: Der einfache Weg',
    paragraphs: [
      'Die Zeiten langer Warteschlangen bei der {authorityName} sind vorbei. Als offiziell registrierter i-Kfz-Dienstleister bieten wir Ihnen eine vollständig digitale Alternative zur klassischen Fahrzeugzulassung in {city}.',
      'Ob Sie ein neues Auto anmelden, ein gebrauchtes Fahrzeug ummelden oder Ihr Kfz stilllegen möchten – über unsere Plattform erledigen Sie alles in wenigen Minuten. Die Bestätigung erhalten Sie direkt per E-Mail.',
    ],
  },
  {
    title: 'So funktioniert die Online-Zulassung in {city}',
    paragraphs: [
      'Die Stadt {city} in {state} bietet über das i-Kfz-Verfahren die Möglichkeit, Fahrzeuge digital zuzulassen. Als akkreditierter Partner des KBA übernehmen wir diesen Prozess für Sie – komplett online und ohne persönliches Erscheinen bei der Behörde.',
      'Besonders praktisch: Unser Service kennt keine Öffnungszeiten. Sie können Ihren Antrag jederzeit stellen – auch abends, am Wochenende oder an Feiertagen. Die Bearbeitung erfolgt schnell und zuverlässig.',
    ],
  },
  {
    title: 'Ihr digitaler Zulassungspartner in {city}',
    paragraphs: [
      'Wer kennt es nicht: Man braucht einen Termin bei der Zulassungsstelle in {city}, aber die nächsten freien Termine sind erst in Wochen verfügbar. Genau hier setzen wir an. Unser Online-Zulassungsservice macht Termine und Wartezeiten überflüssig.',
      'Als Bewohner von {city} oder der umliegenden Region {region} können Sie unseren Service rund um die Uhr nutzen. Alle gängigen Zulassungsvorgänge – von der Neuanmeldung über die Ummeldung bis zur Abmeldung – sind vollständig digital abwickelbar.',
    ],
  },
  {
    title: 'Online-Fahrzeugzulassung für {city} und {region}',
    paragraphs: [
      'Sie leben in {city} oder Umgebung und möchten ein Fahrzeug anmelden? Dann sind Sie bei uns genau richtig. Unser digitaler Zulassungsdienst verbindet Sie direkt mit dem Kraftfahrt-Bundesamt – ohne den Umweg über die lokale Zulassungsstelle.',
      'In {state} nutzen immer mehr Fahrzeughalter die digitale Alternative. Profitieren Sie von kurzen Bearbeitungszeiten, transparenten Abläufen und einem Service, der genau dann verfügbar ist, wenn Sie ihn brauchen.',
    ],
  },
  {
    title: '{city}: Fahrzeug online anmelden statt Schlange stehen',
    paragraphs: [
      'Stellen Sie sich vor, Sie könnten Ihr neues Auto direkt vom Sofa aus anmelden – ohne Wartenummer, ohne Papierkram, ohne Stress. Für Fahrzeughalter in {city} ist genau das jetzt möglich.',
      'Unser online-basierter Service ist beim KBA registriert und deckt sämtliche Zulassungsvorgänge ab. Egal, ob Sie in der Innenstadt von {city} wohnen oder in der Region {region} – unser Service funktioniert überall gleich reibungslos.',
    ],
  },
  {
    title: 'Digitale Kfz-Zulassung in {city}, {state}',
    paragraphs: [
      'Die digitale Transformation macht auch vor der Fahrzeugzulassung nicht halt. In {city} können Sie dank des i-Kfz-Verfahrens Ihr Fahrzeug vollständig online zulassen – über unseren zertifizierten Service.',
      'Was früher einen halben Tag bei der {authorityName} in Anspruch nahm, erledigen Sie heute in wenigen Minuten. Sie füllen den Online-Antrag aus, laden Ihre Dokumente hoch und erhalten die Bestätigung per E-Mail. So einfach kann Bürokratie sein.',
    ],
  },
  {
    title: 'Warum die Online-Zulassung in {city} die bessere Wahl ist',
    paragraphs: [
      'Viele Fahrzeughalter in {city} fragen sich: Lohnt sich die Online-Zulassung wirklich? Die Antwort ist eindeutig: Ja. Kein Termin nötig, keine Wartezeit, kein Papierkram – und die Bearbeitung ist oft schneller als beim persönlichen Besuch.',
      'Unser Service ist speziell auf die Bedürfnisse von Fahrzeughaltern in {city} und {region} zugeschnitten. Wir kennen die lokalen Anforderungen und sorgen dafür, dass Ihr Antrag reibungslos bearbeitet wird.',
    ],
  },
  {
    title: 'Kfz-Zulassung {city}: Schnell, digital, zuverlässig',
    paragraphs: [
      'Ob Neuzulassung, Wiederzulassung, Ummeldung oder Außerbetriebsetzung – als Fahrzeughalter in {city} haben Sie jetzt die Möglichkeit, all das online zu erledigen. Unser Service erspart Ihnen den zeitaufwändigen Behördengang.',
      'Alle Anträge werden über die offizielle i-Kfz-Schnittstelle des KBA verarbeitet. Das bedeutet für Sie: maximale Sicherheit, offizielle Gültigkeit und schnelle Bearbeitung. Auch für Halter in der Region {region} selbstverständlich nutzbar.',
    ],
  },
  {
    title: 'Ihr Weg zur Kfz-Zulassung in {city}',
    paragraphs: [
      'Die Zulassungsstelle in {city} hat nur begrenzte Öffnungszeiten und lange Wartezeiten sind keine Seltenheit. Unser Online-Zulassungsservice bietet Ihnen eine moderne Alternative: Fahrzeug anmelden, ummelden oder abmelden – wann und wo Sie möchten.',
      'Als offizieller i-Kfz-Dienstleister sorgen wir dafür, dass Ihr Zulassungsvorgang für {city}, {state}, korrekt und schnell abgewickelt wird. Tausende zufriedene Kunden vertrauen bereits auf unseren Service.',
    ],
  },
  {
    title: '{city}: Nie wieder zur Zulassungsstelle',
    paragraphs: [
      'Für viele Einwohner von {city} gehört der Besuch bei der Kfz-Zulassungsstelle zu den lästigsten Behördengängen. Das muss nicht sein. Mit unserem Online-Service erledigen Sie die Zulassung, Ummeldung oder Abmeldung Ihres Fahrzeugs komplett digital.',
      'Wir arbeiten direkt mit dem KBA zusammen und sind für die Region {region} sowie ganz {state} zugelassen. Starten Sie jetzt und erleben Sie, wie einfach eine Kfz-Zulassung in {city} sein kann.',
    ],
  },
  {
    title: 'Online-Service für Fahrzeughalter in {city}',
    paragraphs: [
      'Im Herzen von {state} gelegen, ist {city} eine Stadt, die auf Fortschritt setzt. Passend dazu können Sie als Fahrzeughalter in {city} nun alle Zulassungsvorgänge digital abwickeln – über unseren KBA-registrierten Online-Service.',
      'Der Vorteil: Sie benötigen keinen Termin und sind nicht an die Öffnungszeiten der {authorityName} gebunden. Ihr Antrag wird elektronisch übermittelt und schnell bearbeitet. Die Bestätigung kommt per E-Mail.',
    ],
  },
  {
    title: 'Fahrzeugzulassung in {city} – jetzt ohne Wartezeit',
    paragraphs: [
      'Wussten Sie, dass der durchschnittliche Besuch bei einer Kfz-Zulassungsstelle über zwei Stunden dauert? In {city} können Sie sich diese Zeit sparen. Unser digitaler Zulassungsservice ermöglicht es Ihnen, Ihr Fahrzeug in wenigen Minuten online anzumelden.',
      'Dabei ist unser Service nicht nur schneller, sondern auch flexibler. Egal ob früh morgens oder spätabends – Ihre Fahrzeugzulassung für {city} und den Großraum {region} ist jederzeit möglich.',
    ],
  },
  {
    title: 'Kfz-Zulassung einfach online – auch in {city}',
    paragraphs: [
      'Deutschland wird digitaler – und die Kfz-Zulassung macht da keine Ausnahme. Für Bürger in {city} bedeutet das: Kein Schlangestehen mehr, keine umständliche Terminvergabe. Einfach online anmelden und fertig.',
      'Unser zertifizierter Service deckt alle Zulassungsarten ab. Neuanmeldung, Halterwechsel, Wiederzulassung, Außerbetriebsetzung – in {city} und der gesamten Region {region} verfügbar.',
    ],
  },
  {
    title: 'Alles rund um die Kfz-Zulassung in {city}',
    paragraphs: [
      'Sie haben ein neues Fahrzeug gekauft und wohnen in {city}? Herzlichen Glückwunsch! Damit Sie schnell auf die Straße kommen, bieten wir Ihnen einen Express-Zulassungsservice an – vollständig online, ohne Behördengang.',
      'Unser Team kennt die spezifischen Anforderungen für Zulassungen in {state} und sorgt dafür, dass alles korrekt abläuft. Von der Dateneingabe bis zur Bestätigung vergehen in der Regel nur wenige Stunden.',
    ],
  },
];

// ── Process Steps Templates ──────────────────────────────────────

const PROCESS_TEMPLATES = [
  {
    title: 'Online-Zulassung in {city} – in 3 Schritten',
    subtitle: 'In nur wenigen Minuten zur Zulassung – ganz ohne Wartezeit.',
    steps: [
      { num: '1', title: 'Antrag online ausfüllen', desc: 'Geben Sie Ihre Fahrzeug- und Halterdaten in unser Formular ein – dauert nur wenige Minuten.' },
      { num: '2', title: 'Dokumente hochladen', desc: 'Laden Sie Fahrzeugschein, Personalausweis und ggf. eVB-Nummer bequem hoch.' },
      { num: '3', title: 'Bestätigung erhalten', desc: 'Nach Prüfung erhalten Sie Ihre Zulassungsbestätigung direkt per E-Mail.' },
    ],
  },
  {
    title: 'Ihr Weg zur Zulassung in {city}',
    subtitle: 'Drei einfache Schritte – und Ihr Fahrzeug ist zugelassen.',
    steps: [
      { num: '1', title: 'Daten eingeben', desc: 'Füllen Sie das Online-Formular mit Ihren persönlichen Daten und den Fahrzeugdaten aus.' },
      { num: '2', title: 'Unterlagen hochladen', desc: 'Fotografieren oder scannen Sie Ihre Dokumente und laden Sie sie sicher hoch.' },
      { num: '3', title: 'Fertig – Bestätigung per E-Mail', desc: 'Wir prüfen Ihren Antrag und senden Ihnen die offizielle Bestätigung elektronisch zu.' },
    ],
  },
  {
    title: 'So läuft die Online-Zulassung ab',
    subtitle: 'Schnell, einfach und von überall aus – auch aus {city}.',
    steps: [
      { num: '1', title: 'Service auswählen', desc: 'Wählen Sie die gewünschte Leistung: Neuanmeldung, Ummeldung oder Abmeldung.' },
      { num: '2', title: 'Antrag ausfüllen & hochladen', desc: 'Tragen Sie Ihre Daten ein und übermitteln Sie die erforderlichen Dokumente digital.' },
      { num: '3', title: 'Schnelle Bearbeitung', desc: 'Ihr Antrag wird geprüft und bearbeitet. Die Bestätigung erhalten Sie per E-Mail.' },
    ],
  },
  {
    title: 'Kfz-Zulassung {city}: Der Ablauf',
    subtitle: 'Alles, was Sie für die Online-Zulassung benötigen, auf einen Blick.',
    steps: [
      { num: '1', title: 'Online registrieren', desc: 'Erstellen Sie einen Antrag über unsere Plattform – kostenlos und unverbindlich.' },
      { num: '2', title: 'Dokumente übermitteln', desc: 'Laden Sie alle relevanten Unterlagen hoch. Unser System prüft automatisch die Vollständigkeit.' },
      { num: '3', title: 'Zulassung erhalten', desc: 'Nach erfolgreicher Prüfung erhalten Sie eine 10 Tage gültige Zulassungsbestätigung.' },
    ],
  },
  {
    title: 'In 3 Schritten zum Kennzeichen',
    subtitle: 'Kein Termin, kein Warten – so geht Zulassung in {city} heute.',
    steps: [
      { num: '1', title: 'Formular starten', desc: 'Klicken Sie auf "Jetzt starten" und geben Sie die Basisdaten Ihres Fahrzeugs ein.' },
      { num: '2', title: 'Nachweise einreichen', desc: 'Laden Sie Ihren Personalausweis, die Zulassungsbescheinigung und die eVB-Nummer hoch.' },
      { num: '3', title: 'Digital bestätigt', desc: 'Wir leiten alles an das KBA weiter. Ihre Bestätigung kommt schnell per E-Mail zu Ihnen.' },
    ],
  },
  {
    title: 'So funktioniert unser Service',
    subtitle: 'Einfacher als jeder Behördenbesuch in {city}.',
    steps: [
      { num: '1', title: 'Allgemeine Angaben machen', desc: 'Fahrzeugtyp, Halterdaten und gewünschte Leistung – alles in einem übersichtlichen Formular.' },
      { num: '2', title: 'Unterlagen digital einreichen', desc: 'Fotos oder Scans Ihrer Dokumente hochladen – einfach mit dem Smartphone.' },
      { num: '3', title: 'Bestätigung & Kennzeichen', desc: 'Nach Prüfung und Freigabe durch das KBA erhalten Sie Ihre Zulassungsbestätigung.' },
    ],
  },
  {
    title: 'Fahrzeug in {city} anmelden: Der digitale Weg',
    subtitle: 'Von der Antragstellung bis zur Bestätigung – alles online.',
    steps: [
      { num: '1', title: 'Leistung wählen', desc: 'Neuzulassung, Ummeldung bei Halterwechsel oder Abmeldung – wählen Sie Ihren Service.' },
      { num: '2', title: 'Daten & Dokumente einreichen', desc: 'Füllen Sie das Formular aus und laden Sie die benötigten Nachweise hoch.' },
      { num: '3', title: 'Bestätigung in Ihrem Postfach', desc: 'Ihr Vorgang wird bearbeitet und Sie erhalten die offizielle Bestätigung per E-Mail.' },
    ],
  },
  {
    title: 'Ihr 3-Schritte-Plan für die Zulassung in {city}',
    subtitle: 'Wenig Aufwand, schnelles Ergebnis – garantiert.',
    steps: [
      { num: '1', title: 'Antrag anlegen', desc: 'Starten Sie den Prozess mit wenigen Klicks. Unser Assistent führt Sie durch alle nötigen Angaben.' },
      { num: '2', title: 'Alle Dokumente hochladen', desc: 'Fahrzeugschein Teil I und II, Ausweisdokument und Versicherungsnachweis (eVB).' },
      { num: '3', title: 'Elektronische Bestätigung', desc: 'Nach Bearbeitung senden wir Ihnen die Zulassungsbestätigung – Sie können sofort fahren!' },
    ],
  },
];

// ── Documents Templates ──────────────────────────────────────────

const DOCUMENTS_TEMPLATES = [
  {
    title: 'Benötigte Unterlagen für die Zulassung in {city}',
    intro: 'Für die Online-Zulassung in {city} benötigen Sie folgende Dokumente:',
    items: [
      'Zulassungsbescheinigung Teil I (Fahrzeugschein)',
      'Zulassungsbescheinigung Teil II (Fahrzeugbrief)',
      'Gültiger Personalausweis oder Reisepass',
      'eVB-Nummer (elektronische Versicherungsbestätigung)',
      'SEPA-Mandat für die Kfz-Steuer',
      'Ggf. Vollmacht bei Vertretung',
    ],
  },
  {
    title: 'Welche Dokumente brauche ich in {city}?',
    intro: 'Halten Sie die folgenden Unterlagen bereit, bevor Sie den Antrag starten:',
    items: [
      'Fahrzeugschein (ZB Teil I)',
      'Fahrzeugbrief (ZB Teil II)',
      'Personalausweis (Vorder- und Rückseite)',
      'eVB-Nummer Ihrer Versicherung',
      'Bankverbindung für die Kfz-Steuer',
      'Bei Ummeldung: bisheriges Kennzeichen',
      'Bei Halterwechsel: Kaufvertrag',
    ],
  },
  {
    title: 'Checkliste: Unterlagen für Ihre Zulassung',
    intro: 'Eine vollständige Dokumentenliste für Fahrzeugzulassungen in {city} und {state}:',
    items: [
      'Zulassungsbescheinigung Teil I und Teil II',
      'Gültiges Ausweisdokument (Personalausweis oder Reisepass)',
      'Elektronische Versicherungsbestätigung (eVB-Nummer)',
      'Einzugsermächtigung für die Kfz-Steuer (IBAN)',
      'Nachweis der Hauptuntersuchung (HU/TÜV), falls erforderlich',
      'Vollmacht und Ausweis des Vertretenen (bei Beauftragung Dritter)',
    ],
  },
  {
    title: 'Diese Unterlagen benötigen Sie',
    intro: 'Für einen reibungslosen Ablauf sollten alle Dokumente als Scan oder Foto vorliegen:',
    items: [
      'Fahrzeugschein und Fahrzeugbrief im Original (als Foto/Scan)',
      'Personalausweis – beide Seiten',
      'eVB-Nummer (erhalten Sie von Ihrer Kfz-Versicherung)',
      'IBAN für den Kfz-Steuereinzug',
      'TÜV-Bericht bei Wiederzulassung',
      'Abmeldebescheinigung bei Wiederzulassung eines stillgelegten Fahrzeugs',
    ],
  },
  {
    title: 'Dokumente für die Kfz-Zulassung in {city}',
    intro: 'Bevor Sie Ihren Online-Antrag stellen, sollten folgende Dokumente griffbereit sein:',
    items: [
      'ZB I (Fahrzeugschein) – vorne und hinten',
      'ZB II (Fahrzeugbrief)',
      'Personalausweis oder Reisepass + Meldebescheinigung',
      'eVB-Nummer (elektronische Versicherungsbestätigung)',
      'Kontodaten für die Kraftfahrzeugsteuer',
      'Bei Firmenzulassung: Handelsregisterauszug + Gewerbeanmeldung',
    ],
  },
];

// ── Benefits Templates ───────────────────────────────────────────

const BENEFITS_TEMPLATES = [
  {
    title: 'Ihre Vorteile in {city}',
    items: [
      { icon: 'Globe', title: 'Überall nutzbar', desc: 'Von zu Hause, vom Büro oder unterwegs – unser Service funktioniert überall in {city}.' },
      { icon: 'Zap', title: 'Blitzschnell', desc: 'In wenigen Minuten erledigt, statt Stunden bei der Behörde zu warten.' },
      { icon: 'Shield', title: 'Offiziell & sicher', desc: 'Beim KBA registrierter Dienstleister mit verschlüsselter Datenübertragung.' },
      { icon: 'Headphones', title: 'Persönliche Hilfe', desc: 'Bei Fragen stehen wir per WhatsApp und Telefon zur Verfügung.' },
    ],
  },
  {
    title: 'Darum Online-Zulassung in {city}',
    items: [
      { icon: 'Clock', title: 'Rund um die Uhr', desc: 'Stellen Sie Ihren Antrag, wann es Ihnen passt – auch abends und am Wochenende.' },
      { icon: 'FileCheck', title: 'Sofort-Bestätigung', desc: 'Ihre 10 Tage gültige Zulassungsbestätigung kommt per E-Mail.' },
      { icon: 'Shield', title: 'KBA-registriert', desc: 'Offizieller i-Kfz-Dienstleister – Ihre Daten sind sicher.' },
      { icon: 'MapPin', title: 'Lokal für {city}', desc: 'Speziell für Fahrzeughalter in {city} und {region} optimiert.' },
    ],
  },
  {
    title: 'Was unseren Service auszeichnet',
    items: [
      { icon: 'Zap', title: 'Schnelle Bearbeitung', desc: 'Kein Termin nötig – Ihr Antrag wird in der Regel innerhalb eines Werktags bearbeitet.' },
      { icon: 'Globe', title: 'Deutschlandweit', desc: 'Gültig für alle Zulassungsbezirke in {state} und darüber hinaus.' },
      { icon: 'CheckCircle2', title: 'Alle Fahrzeugtypen', desc: 'PKW, Motorrad, Anhänger, Wohnmobil – wir decken alles ab.' },
      { icon: 'Headphones', title: 'Support per WhatsApp', desc: 'Schnelle Hilfe bei Fragen zum Zulassungsprozess in {city}.' },
    ],
  },
  {
    title: 'Die Vorteile auf einen Blick',
    items: [
      { icon: 'Clock', title: 'Keine Wartezeit', desc: 'Vergessen Sie Wartenummern und volle Wartezimmer bei der Zulassungsstelle {city}.' },
      { icon: 'FileCheck', title: 'Digital dokumentiert', desc: 'Alle Dokumente und Bestätigungen werden Ihnen elektronisch zugestellt.' },
      { icon: 'Shield', title: 'Datenschutz garantiert', desc: 'SSL-verschlüsselt und DSGVO-konform. Ihre Daten sind bei uns sicher.' },
      { icon: 'Zap', title: 'Express-Service', desc: 'Die meisten Anträge aus {city} werden noch am gleichen Tag bearbeitet.' },
    ],
  },
  {
    title: 'Warum Sie sich für uns entscheiden sollten',
    items: [
      { icon: 'Globe', title: 'Einfacher Zugang', desc: 'Zwei Klicks zur Antragstellung – kein Download, keine Installation, kein Bürgerbüro.' },
      { icon: 'Shield', title: 'Vertrauenswürdig', desc: 'Beim KBA registriert – Ihr Auftrag läuft über offizielle Kanäle.' },
      { icon: 'MapPin', title: '{city} & Umgebung', desc: 'Optimiert für Fahrzeughalter in {city}, {region} und ganz {state}.' },
      { icon: 'CheckCircle2', title: 'Hohe Erfolgsquote', desc: 'Über 98 % aller Anträge werden beim ersten Mal erfolgreich bearbeitet.' },
    ],
  },
];

// ── FAQ Templates ────────────────────────────────────────────────

const FAQ_TEMPLATES = [
  [
    { q: 'Ist die Online-Zulassung in {city} offiziell anerkannt?', a: 'Ja, wir sind ein offiziell beim KBA registrierter i-Kfz-Dienstleister. Die über uns durchgeführte Zulassung hat die gleiche Gültigkeit wie beim persönlichen Besuch der Zulassungsstelle in {city}.' },
    { q: 'Welche Fahrzeuge kann ich in {city} online zulassen?', a: 'Alle Fahrzeugarten: PKW, Motorrad, Anhänger, Wohnmobil und Nutzfahrzeuge. Der Service gilt für Neuzulassungen, Ummeldungen und Abmeldungen.' },
    { q: 'Wie lange dauert die Bearbeitung?', a: 'In der Regel erhalten Sie Ihre Zulassungsbestätigung innerhalb eines Werktags. Bei vollständigen Unterlagen kann es sogar schneller gehen.' },
    { q: 'Muss ich trotzdem zur Zulassungsstelle {city}?', a: 'Nein, der gesamte Prozess läuft online ab. Sie müssen nicht persönlich bei der {authorityName} erscheinen.' },
    { q: 'Was kostet die Online-Zulassung?', a: 'Die Servicegebühr ist transparent und wird Ihnen vor Antragstellung angezeigt. Zusätzlich fallen die üblichen behördlichen Gebühren an.' },
  ],
  [
    { q: 'Brauche ich einen Termin für die Online-Zulassung in {city}?', a: 'Nein, ein Termin ist nicht erforderlich. Sie können Ihren Antrag jederzeit stellen – rund um die Uhr, an 7 Tagen die Woche.' },
    { q: 'Welche Dokumente muss ich hochladen?', a: 'Fahrzeugschein (ZB I), Fahrzeugbrief (ZB II), Personalausweis und eVB-Nummer. Bei einer Abmeldung reichen Fahrzeugschein und Ausweis.' },
    { q: 'Kann ich mein Auto auch ummelden lassen?', a: 'Ja, Ummeldungen bei Halterwechsel oder Adressänderung gehören zu unserem Standardangebot für {city} und ganz {state}.' },
    { q: 'Wie erhalte ich meine Bestätigung?', a: 'Die Zulassungsbestätigung wird Ihnen per E-Mail zugesandt. Sie ist 10 Tage gültig und berechtigt Sie zum Führen des Fahrzeugs.' },
    { q: 'Funktioniert der Service auch für Firmenwagen?', a: 'Ja, auch gewerbliche Zulassungen sind möglich. Zusätzlich benötigen wir einen Handelsregisterauszug und die Gewerbeanmeldung.' },
  ],
  [
    { q: 'Wie funktioniert die Online-Zulassung für {city}?', a: 'Sie füllen unser Online-Formular aus, laden die benötigten Dokumente hoch und erhalten nach Prüfung eine offizielle Zulassungsbestätigung per E-Mail. Der gesamte Prozess dauert nur wenige Minuten.' },
    { q: 'Ist der Service in {city} und Umgebung verfügbar?', a: 'Ja, unser Service ist für {city}, die Region {region} und ganz {state} verfügbar. Auch bundesweit können Sie unseren Service nutzen.' },
    { q: 'Was passiert, wenn Unterlagen fehlen?', a: 'Unser System prüft die Vollständigkeit automatisch. Sollte etwas fehlen, werden Sie sofort benachrichtigt und können die Unterlagen nachreichen.' },
    { q: 'Kann ich auch ein Wunschkennzeichen reservieren?', a: 'Ja, die Reservierung eines Wunschkennzeichens ist als Zusatzleistung verfügbar. Prüfen Sie die Verfügbarkeit direkt in unserem System.' },
    { q: 'Sind meine Daten bei Ihnen sicher?', a: 'Absolut. Alle Daten werden über SSL-verschlüsselte Verbindungen übertragen und DSGVO-konform verarbeitet. Wir geben keine Daten an Dritte weiter.' },
  ],
  [
    { q: 'Muss ich persönlich zur {authorityName} gehen?', a: 'Nein, unser Online-Service ersetzt den persönlichen Besuch. Alles wird digital abgewickelt, auch die Übermittlung an das KBA.' },
    { q: 'Welche Zahlungsmethoden werden akzeptiert?', a: 'Wir akzeptieren Kreditkarte, PayPal, Apple Pay, Klarna und SEPA-Lastschrift. Wählen Sie bei der Bezahlung Ihre bevorzugte Methode.' },
    { q: 'Kann ich mein Fahrzeug in {city} auch abmelden?', a: 'Ja, die Außerbetriebsetzung (Abmeldung) ist ebenfalls über unseren Online-Service möglich. Sie benötigen dafür nur den Fahrzeugschein und Ihren Ausweis.' },
    { q: 'Wie schnell wird mein Antrag bearbeitet?', a: 'Die meisten Anträge werden innerhalb von 24 Stunden bearbeitet. Bei hohem Aufkommen kann es bis zu 48 Stunden dauern.' },
    { q: 'Erhalte ich auch die Kennzeichen zugeschickt?', a: 'Die physischen Kennzeichen bestellen Sie separat oder erhalten sie bei einer Schilderprägestelle in {city}. Wir senden Ihnen die Zulassungsbestätigung.' },
  ],
  [
    { q: 'Warum sollte ich die Online-Zulassung statt der Behörde in {city} nutzen?', a: 'Kein Termin, keine Wartezeit, keine Anfahrt. Sie sparen bis zu 3 Stunden und können Ihr Fahrzeug auch außerhalb der Behörden-Öffnungszeiten anmelden.' },
    { q: 'Gilt die Zulassungsbestätigung sofort?', a: 'Ja, die elektronische Bestätigung ist sofort gültig und berechtigt Sie für 10 Tage zum Führen des Fahrzeugs im Straßenverkehr.' },
    { q: 'Was brauche ich für eine Ummeldung in {city}?', a: 'Für die Ummeldung benötigen Sie: Fahrzeugschein und -brief, Personalausweis, eVB-Nummer sowie ggf. den Kaufvertrag bei Halterwechsel.' },
    { q: 'Kann ich den Antrag auch am Smartphone ausfüllen?', a: 'Ja, unser Service ist vollständig mobil-optimiert. Sie können Dokumente direkt mit dem Smartphone fotografieren und hochladen.' },
    { q: 'Bieten Sie auch Beratung an?', a: 'Ja, bei Fragen zur Zulassung in {city} erreichen Sie uns per WhatsApp, Telefon oder E-Mail. Wir helfen Ihnen gerne weiter.' },
  ],
];

// ── Local Insight Templates ──────────────────────────────────────

const LOCAL_TEMPLATES = [
  {
    title: 'Lokale Informationen: Zulassungsstelle {city}',
    text: 'Die {authorityName} befindet sich in der {authorityAddress}. Die regulären Öffnungszeiten sind: {authorityHours}. Beachten Sie, dass es zu Stoßzeiten zu erheblichen Wartezeiten kommen kann. Mit unserem Online-Service umgehen Sie diese Einschränkungen komplett.',
  },
  {
    title: 'Zulassungsstelle {city}: Was Sie wissen sollten',
    text: 'Die zuständige Behörde für Kfz-Zulassungen in {city} ist die {authorityName} ({authorityAddress}). Telefonisch erreichbar unter {authorityPhone}. Öffnungszeiten: {authorityHours}. Tipp: Nutzen Sie unseren Online-Service und sparen Sie sich die Anfahrt und Wartezeit.',
  },
  {
    title: 'Vor Ort in {city}: Die Zulassungsbehörde',
    text: 'Falls Sie doch einen persönlichen Besuch bevorzugen: Die {authorityName} finden Sie unter {authorityAddress}. Kontakt: {authorityPhone}. Öffnungszeiten: {authorityHours}. Alternativ können Sie alle Zulassungsvorgänge über unseren Online-Service erledigen – ohne Wartezeit.',
  },
  {
    title: '{city}: Ihre Zulassungsstelle im Überblick',
    text: 'Die Kfz-Zulassungsstelle in {city} ({authorityAddress}) ist Ihre lokale Anlaufstelle für alle Fahrzeugzulassungen. Öffnungszeiten: {authorityHours}. Unser Tipp: Sparen Sie sich den Besuch und nutzen Sie unseren digitalen Service – rund um die Uhr verfügbar.',
  },
  {
    title: 'Kfz-Behörde {city} – Kontakt & Öffnungszeiten',
    text: 'Die {authorityName} in {city} befindet sich an der Adresse: {authorityAddress}. Telefonisch erreichbar: {authorityPhone}. Geöffnet: {authorityHours}. Für einen schnelleren und bequemeren Weg empfehlen wir unseren Online-Zulassungsservice – jederzeit und von überall.',
  },
];

// ── CTA Templates ────────────────────────────────────────────────

const CTA_TEMPLATES = [
  {
    title: 'Bereit für Ihre Online-Zulassung in',
    highlight: '{city}?',
    subtitle: 'Starten Sie jetzt und sparen Sie sich den Weg zur Zulassungsstelle.',
  },
  {
    title: 'Jetzt Fahrzeug in',
    highlight: '{city} anmelden!',
    subtitle: 'In wenigen Minuten erledigt – ohne Behördengang, ohne Wartezeit.',
  },
  {
    title: 'Online-Zulassung für',
    highlight: '{city} starten',
    subtitle: 'Tausende Fahrzeughalter in {city} vertrauen bereits auf unseren Service.',
  },
  {
    title: 'Worauf warten Sie?',
    highlight: 'Jetzt in {city} anmelden!',
    subtitle: 'Der schnellste Weg zum Kennzeichen – offiziell und sicher.',
  },
  {
    title: 'Ihr Auto wartet – nicht Sie.',
    highlight: 'Jetzt loslegen in {city}!',
    subtitle: 'Starten Sie die Online-Zulassung und erhalten Sie Ihre Bestätigung per E-Mail.',
  },
  {
    title: 'Schluss mit Warten – ',
    highlight: 'online zulassen in {city}',
    subtitle: 'Nutzen Sie jetzt die einfachste Art, ein Fahrzeug in {city} zuzulassen.',
  },
  {
    title: 'Ihre Zulassung in',
    highlight: '{city} wartet auf Sie',
    subtitle: 'Drei Schritte. Ein paar Minuten. Kein Stress. Starten Sie jetzt!',
  },
  {
    title: '{city}: Fahrzeug anmelden',
    highlight: 'war noch nie so einfach',
    subtitle: 'Probieren Sie unseren Online-Service aus – Sie werden begeistert sein.',
  },
];


// ═══════════════════════════════════════════════════════════════════
//  LAYER 2 — STRUCTURAL VARIATION
// ═══════════════════════════════════════════════════════════════════

// Base section order — will be shuffled per city
const BASE_SECTIONS: CitySection['type'][] = [
  'hero', 'intro', 'process', 'documents', 'benefits', 'faq', 'local', 'authority', 'nearby', 'cta',
];

// Hero is always first, CTA always last. Middle sections get shuffled.
function getSectionOrder(seed: number, weight: 'long' | 'medium' | 'short'): CitySection['type'][] {
  const middle = BASE_SECTIONS.filter(s => s !== 'hero' && s !== 'cta');
  const shuffled = seededShuffle(middle, seed);

  // Content weight: long=all, medium=drop 1-2, short=drop 2-3
  let count: number;
  switch (weight) {
    case 'long': count = shuffled.length; break;
    case 'medium': count = shuffled.length - 1 - (seed % 2); break;
    case 'short': count = shuffled.length - 2 - (seed % 2); break;
  }

  return ['hero', ...shuffled.slice(0, count), 'cta'];
}


// ═══════════════════════════════════════════════════════════════════
//  LAYER 5 — CONTENT WEIGHT VARIATION
// ═══════════════════════════════════════════════════════════════════

function getContentWeight(seed: number): 'long' | 'medium' | 'short' {
  const weights: Array<'long' | 'medium' | 'short'> = ['long', 'long', 'long', 'medium', 'medium', 'medium', 'medium', 'short', 'short', 'short'];
  return seededPick(weights, seed);
}


// ═══════════════════════════════════════════════════════════════════
//  MAIN BUILD FUNCTION
// ═══════════════════════════════════════════════════════════════════

export function buildCityPage(citySlug: string): CityPageContent | null {
  const city = getCityBySlug(citySlug);
  if (!city) return null;

  const authority = getAuthority(citySlug);
  const nearbyCities = getNearbyCities(citySlug, 6);
  const seed = hashSeed(citySlug);

  // Token data for template replacements
  const tokens: TokenData = {
    city: city.name,
    state: city.state,
    region: city.region,
    authorityName: authority?.name || `Kfz-Zulassungsstelle ${city.name}`,
    authorityAddress: authority ? `${authority.street}, ${authority.zip} ${authority.city}` : city.name,
    authorityPhone: authority?.phone || '',
    authorityEmail: authority?.email || '',
    authorityHours: authority?.hours || '',
    nearbyCitiesList: nearbyCities.map(c => c.name).join(', '),
  };

  // Layer 5: Content weight
  const contentWeight = getContentWeight(seed);

  // Layer 2: Section order (structural variation)
  const sectionOrder = getSectionOrder(seed + 7, contentWeight);

  // Layer 1+3+4: Build each section with template selection and data injection
  const sections: CitySection[] = sectionOrder.map(sectionType => {
    const sectionSeed = hashSeed(`${citySlug}-${sectionType}`);
    return buildSection(sectionType, sectionSeed, tokens, city, authority, nearbyCities);
  });

  // SEO metadata (unique per city)
  const metaSeed = hashSeed(`meta-${citySlug}`);
  const metaTitle = buildMetaTitle(city, metaSeed);
  const metaDescription = buildMetaDescription(city, authority, metaSeed);

  // Schema.org data
  const schema = buildSchema(city, authority, nearbyCities);

  return {
    title: `KFZ-Zulassung in ${city.name} – Online & Ohne Wartezeit`,
    metaTitle,
    metaDescription,
    canonicalSlug: citySlug,
    sections,
    schema,
    cityName: city.name,
    authority,
    nearbyCities,
    contentWeight,
  };
}


// ── Section Builders ─────────────────────────────────────────────

function buildSection(
  type: CitySection['type'],
  seed: number,
  tokens: TokenData,
  city: CityEntry,
  authority: AuthorityData | undefined,
  nearbyCities: CityEntry[],
): CitySection {
  switch (type) {
    case 'hero': {
      const tpl = seededPick(HERO_TEMPLATES, seed);
      return {
        type: 'hero',
        data: {
          badge: replaceTokens(tpl.badge, tokens),
          h1Parts: tpl.h1.map(p => replaceTokens(p, tokens)),
          subtitle: replaceTokens(tpl.subtitle, tokens),
        },
      };
    }

    case 'intro': {
      const tpl = seededPick(INTRO_TEMPLATES, seed);
      return {
        type: 'intro',
        data: {
          title: replaceTokens(tpl.title, tokens),
          paragraphs: tpl.paragraphs.map(p => replaceTokens(p, tokens)),
        },
      };
    }

    case 'process': {
      const tpl = seededPick(PROCESS_TEMPLATES, seed);
      return {
        type: 'process',
        data: {
          title: replaceTokens(tpl.title, tokens),
          subtitle: replaceTokens(tpl.subtitle, tokens),
          steps: tpl.steps.map(s => ({
            num: s.num,
            title: replaceTokens(s.title, tokens),
            desc: replaceTokens(s.desc, tokens),
          })),
        },
      };
    }

    case 'documents': {
      const tpl = seededPick(DOCUMENTS_TEMPLATES, seed);
      return {
        type: 'documents',
        data: {
          title: replaceTokens(tpl.title, tokens),
          intro: replaceTokens(tpl.intro, tokens),
          items: tpl.items.map(i => replaceTokens(i, tokens)),
        },
      };
    }

    case 'benefits': {
      const tpl = seededPick(BENEFITS_TEMPLATES, seed);
      return {
        type: 'benefits',
        data: {
          title: replaceTokens(tpl.title, tokens),
          items: tpl.items.map(i => ({
            icon: i.icon,
            title: replaceTokens(i.title, tokens),
            desc: replaceTokens(i.desc, tokens),
          })),
        },
      };
    }

    case 'faq': {
      const tpl = seededPick(FAQ_TEMPLATES, seed);
      return {
        type: 'faq',
        data: {
          title: `Häufige Fragen zur Kfz-Zulassung in ${city.name}`,
          items: tpl.map(faq => ({
            question: replaceTokens(faq.q, tokens),
            answer: replaceTokens(faq.a, tokens),
          })),
        },
      };
    }

    case 'local': {
      const tpl = seededPick(LOCAL_TEMPLATES, seed);
      return {
        type: 'local',
        data: {
          title: replaceTokens(tpl.title, tokens),
          text: replaceTokens(tpl.text, tokens),
          authority: authority ? {
            name: authority.name,
            address: `${authority.street}, ${authority.zip} ${authority.city}`,
            phone: authority.phone,
            hours: authority.hours,
            website: authority.website,
          } : null,
        },
      };
    }

    case 'authority': {
      return {
        type: 'authority',
        data: {
          authority: authority ? {
            name: authority.name,
            street: authority.street,
            zip: authority.zip,
            city: authority.city,
            phone: authority.phone,
            email: authority.email,
            hours: authority.hours,
            website: authority.website,
          } : null,
          cityName: city.name,
        },
      };
    }

    case 'nearby': {
      return {
        type: 'nearby',
        data: {
          title: `Online-Zulassung auch in der Nähe von ${city.name}`,
          cities: nearbyCities.map(c => ({
            name: c.name,
            slug: c.slug,
            href: `/kfz-zulassung-in-deiner-stadt/${c.slug}/`,
          })),
        },
      };
    }

    case 'cta': {
      const tpl = seededPick(CTA_TEMPLATES, seed);
      return {
        type: 'cta',
        data: {
          title: replaceTokens(tpl.title, tokens),
          highlight: replaceTokens(tpl.highlight, tokens),
          subtitle: replaceTokens(tpl.subtitle, tokens),
        },
      };
    }
  }
}


// ── Meta Generators ──────────────────────────────────────────────

const META_TITLE_TEMPLATES = [
  'KFZ-Zulassung {city} – Online anmelden ohne Wartezeit',
  'Auto online anmelden in {city} | i-Kfz Zulassungsservice',
  'Online-Zulassung {city} – Schnell, sicher & offiziell',
  'Fahrzeug zulassen in {city} – 100% digital | IKFZ',
  'KFZ-Zulassung in {city} online – Kein Behördengang nötig',
  'Kfz anmelden {city} – Digitaler Zulassungsservice',
  '{city}: Fahrzeug online zulassen – KBA-registriert',
  'Online-Fahrzeugzulassung {city} | IKFZ Digital',
  'Kfz-Zulassung {city} – Jetzt online & ohne Termin',
  'Auto anmelden {city} – Einfach, schnell & online',
];

const META_DESC_TEMPLATES = [
  'Kfz-Zulassung in {city} online erledigen. Neuzulassung, Ummeldung & Abmeldung ohne Wartezeit. Offiziell beim KBA registriert. Jetzt starten!',
  'Fahrzeug in {city} online anmelden – ohne Termin bei der Zulassungsstelle. PKW, Motorrad & Anhänger. Schnelle Bearbeitung, Bestätigung per E-Mail.',
  'Online-Zulassungsservice für {city} und {region}. Kein Behördengang, keine Wartezeit. Alle Fahrzeugtypen. KBA-registrierter i-Kfz-Dienstleister.',
  'Jetzt Kfz in {city} online zulassen! Neuzulassung, Ummeldung oder Abmeldung – komplett digital. 24/7 verfügbar, schnelle Bearbeitung.',
  'Sparen Sie sich den Weg zur Zulassungsstelle {city}. Online-Zulassung für PKW, Motorrad & mehr. Offiziell, sicher und in wenigen Minuten erledigt.',
  'Digitale Kfz-Zulassung für {city}, {state}. Anmeldung, Ummeldung, Abmeldung – alles online. Keine Wartezeit, keine Terminvergabe nötig.',
  'KFZ online zulassen in {city} – offizieller i-Kfz-Service. Schnell, bequem und sicher. Bestätigung per E-Mail. Jetzt Antrag starten!',
  'In {city} Fahrzeug anmelden ohne Behördengang? Mit unserem Online-Service kein Problem. KBA-registriert, SSL-verschlüsselt, DSGVO-konform.',
];

function buildMetaTitle(city: CityEntry, seed: number): string {
  const tpl = seededPick(META_TITLE_TEMPLATES, seed);
  return tpl.replace(/\{city\}/g, city.name);
}

function buildMetaDescription(city: CityEntry, authority: AuthorityData | undefined, seed: number): string {
  const tpl = seededPick(META_DESC_TEMPLATES, seed);
  return tpl
    .replace(/\{city\}/g, city.name)
    .replace(/\{state\}/g, city.state)
    .replace(/\{region\}/g, city.region);
}


// ── Schema.org Builder ───────────────────────────────────────────

const SITE_URL = 'https://ikfzdigitalzulassung.de';

function buildSchema(city: CityEntry, authority: AuthorityData | undefined, nearbyCities: CityEntry[]): CitySchema {
  const service = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: `KFZ-Zulassung in ${city.name}`,
    description: `Digitaler Kfz-Zulassungsservice für ${city.name}, ${city.state}. Neuzulassung, Ummeldung und Abmeldung – komplett online.`,
    provider: {
      '@type': 'Organization',
      name: 'iKFZ Digital Zulassung UG (haftungsbeschränkt)',
      url: SITE_URL,
    },
    areaServed: {
      '@type': 'City',
      name: city.name,
      containedInPlace: {
        '@type': 'State',
        name: city.state,
      },
    },
    serviceArea: [
      { '@type': 'City', name: city.name },
      ...nearbyCities.slice(0, 3).map(nc => ({ '@type': 'City' as const, name: nc.name })),
    ],
    ...(authority ? {
      serviceLocation: {
        '@type': 'GovernmentOffice',
        name: authority.name,
        address: {
          '@type': 'PostalAddress',
          streetAddress: authority.street,
          postalCode: authority.zip,
          addressLocality: authority.city,
          addressRegion: authority.bundesland,
          addressCountry: 'DE',
        },
        telephone: authority.phone,
        ...(authority.email ? { email: authority.email } : {}),
        ...(authority.website ? { url: authority.website } : {}),
        ...(authority.hours ? {
          openingHoursSpecification: {
            '@type': 'OpeningHoursSpecification',
            description: authority.hours,
          },
        } : {}),
      },
    } : {}),
  };

  // LocalBusiness schema for the iKFZ service in this city
  const localBusiness = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: `iKFZ Digital Zulassung – ${city.name}`,
    description: `Online Kfz-Zulassungsservice in ${city.name}. Fahrzeug bequem von zu Hause anmelden, ummelden oder abmelden.`,
    url: `${SITE_URL}/kfz-zulassung-in-deiner-stadt/${city.slug}/`,
    ...(authority ? {
      address: {
        '@type': 'PostalAddress',
        addressLocality: city.name,
        addressRegion: city.state,
        addressCountry: 'DE',
      },
    } : {}),
    areaServed: {
      '@type': 'City',
      name: city.name,
    },
    priceRange: '€€',
  };

  // FAQ schema pulled from the first available FAQ set
  const faqSeed = hashSeed(`${city.slug}-faq`);
  const faqTpl = seededPick(FAQ_TEMPLATES, faqSeed);
  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqTpl.map(f => ({
      '@type': 'Question',
      name: f.q.replace(/\{city\}/g, city.name).replace(/\{authorityName\}/g, authority?.name || `Kfz-Zulassungsstelle ${city.name}`).replace(/\{state\}/g, city.state).replace(/\{region\}/g, city.region),
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.a.replace(/\{city\}/g, city.name).replace(/\{authorityName\}/g, authority?.name || `Kfz-Zulassungsstelle ${city.name}`).replace(/\{state\}/g, city.state).replace(/\{region\}/g, city.region),
      },
    })),
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Start', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'KFZ Zulassung in deiner Stadt', item: `${SITE_URL}/kfz-zulassung-in-deiner-stadt/` },
      { '@type': 'ListItem', position: 3, name: `KFZ-Zulassung ${city.name}` },
    ],
  };

  return { service, localBusiness, faq, breadcrumb };
}
