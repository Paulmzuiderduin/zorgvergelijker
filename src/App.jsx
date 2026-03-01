import React, { useEffect, useRef, useState } from 'react';
import {
  Calculator,
  Download,
  FileText,
  Plus,
  Settings2,
  ShieldCheck,
  Trash2,
  Upload
} from 'lucide-react';

const STORAGE_KEY = 'zorgvergelijker-state-v1';

const euro = new Intl.NumberFormat('nl-NL', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

const createInsurance = (id, naam) => ({
  id,
  naam,
  maandpremie: 154,
  eigenRisico: 385,
  tandartsVergoeding: 0,
  fysioSessiesVergoed: 0,
  brilVergoeding: 0,
  alternatiefMaxVergoeding: 0,
  alternatiefPerSessie: 0,
  hulpmiddelenVergoeding: 0,
  medicijnenVergoeding: 0,
  psychologischeZorgVergoeding: 0,
  gehoorVergoeding: 0,
  huidVergoeding: 0,
  kraamzorgVergoeding: 0,
  preventieVergoeding: 0,
  buitenlandVergoeding: 0,
  dieetVergoeding: 0,
  notitie: ''
});

const defaultState = {
  zorggebruik: {
    tandarts: 0,
    fysioSessies: 0,
    fysioKostenPerSessie: 39,
    bril: 0,
    alternatiefSessies: 0,
    alternatiefKostenPerSessie: 65,
    hulpmiddelen: 0,
    medicijnen: 0,
    psychologischeZorg: 0,
    gehoor: 0,
    huid: 0,
    kraamzorg: 0,
    preventie: 0,
    buitenland: 0,
    dieet: 0,
    overigOnderEigenRisico: 0
  },
  actieveCategorieen: [
    'tandarts',
    'fysio',
    'bril',
    'alternatief',
    'hulpmiddelen',
    'medicijnen',
    'psychologische-zorg',
    'gehoor',
    'dieet',
    'overig'
  ],
  verzekeringen: [
    createInsurance(1, 'Mijn huidige polis'),
    {
      ...createInsurance(2, 'Alternatieve polis'),
      maandpremie: 168,
      tandartsVergoeding: 250,
      fysioSessiesVergoed: 9,
      alternatiefMaxVergoeding: 200,
      alternatiefPerSessie: 40,
      brilVergoeding: 100,
      hulpmiddelenVergoeding: 150,
      medicijnenVergoeding: 80,
      gehoorVergoeding: 75
    }
  ]
};

const categorieen = [
  {
    id: 'tandarts',
    groep: 'veelgekozen',
    label: 'Tandarts en mondzorg',
    beschrijving: 'Tandartskosten en tandartsvergoeding',
    zorgKeys: ['tandarts'],
    polisKeys: ['tandartsVergoeding'],
    breakdownKey: 'tandarts'
  },
  {
    id: 'fysio',
    groep: 'veelgekozen',
    label: 'Fysiotherapie en beweegzorg',
    beschrijving: 'Sessies, prijs per sessie en aantal vergoede behandelingen',
    zorgKeys: ['fysioSessies', 'fysioKostenPerSessie'],
    polisKeys: ['fysioSessiesVergoed'],
    breakdownKey: 'fysio'
  },
  {
    id: 'bril',
    groep: 'veelgekozen',
    label: 'Brillen en lenzen',
    beschrijving: 'Brillen- en lenzenkosten plus vergoeding',
    zorgKeys: ['bril'],
    polisKeys: ['brilVergoeding'],
    breakdownKey: 'bril'
  },
  {
    id: 'alternatief',
    groep: 'veelgekozen',
    label: 'Alternatieve zorg',
    beschrijving: 'Behandelingen, prijs per behandeling en maxima',
    zorgKeys: ['alternatiefSessies', 'alternatiefKostenPerSessie'],
    polisKeys: ['alternatiefMaxVergoeding', 'alternatiefPerSessie'],
    breakdownKey: 'alternatief'
  },
  {
    id: 'hulpmiddelen',
    groep: 'veelgekozen',
    label: 'Hulpmiddelen',
    beschrijving: 'Hulpmiddelenkosten en vergoeding',
    zorgKeys: ['hulpmiddelen'],
    polisKeys: ['hulpmiddelenVergoeding'],
    breakdownKey: 'hulpmiddelen'
  },
  {
    id: 'medicijnen',
    groep: 'veelgekozen',
    label: 'Medicijnen',
    beschrijving: 'Medicijnkosten en vergoeding',
    zorgKeys: ['medicijnen'],
    polisKeys: ['medicijnenVergoeding'],
    breakdownKey: 'medicijnen'
  },
  {
    id: 'psychologische-zorg',
    groep: 'veelgekozen',
    label: 'Psychologische zorg',
    beschrijving: 'Psychologische zorg en vergoeding',
    zorgKeys: ['psychologischeZorg'],
    polisKeys: ['psychologischeZorgVergoeding'],
    breakdownKey: 'psychologischeZorg'
  },
  {
    id: 'gehoor',
    groep: 'meeropties',
    label: 'Gehoor en oren',
    beschrijving: 'Bijvoorbeeld gehoorapparaten, batterijen of audicienkosten',
    zorgKeys: ['gehoor'],
    polisKeys: ['gehoorVergoeding'],
    breakdownKey: 'gehoor'
  },
  {
    id: 'huid',
    groep: 'meeropties',
    label: 'Huidzorg en acne',
    beschrijving: 'Bijvoorbeeld huidtherapie, camouflage of acnebehandeling',
    zorgKeys: ['huid'],
    polisKeys: ['huidVergoeding'],
    breakdownKey: 'huid'
  },
  {
    id: 'kraamzorg',
    groep: 'meeropties',
    label: 'Zwangerschap en kraamzorg',
    beschrijving: 'Bijvoorbeeld eigen bijdragen of aanvullende vergoedingen rond zwangerschap',
    zorgKeys: ['kraamzorg'],
    polisKeys: ['kraamzorgVergoeding'],
    breakdownKey: 'kraamzorg'
  },
  {
    id: 'preventie',
    groep: 'meeropties',
    label: 'Preventie en cursussen',
    beschrijving: 'Bijvoorbeeld stoppen-met-roken, cursussen of checks',
    zorgKeys: ['preventie'],
    polisKeys: ['preventieVergoeding'],
    breakdownKey: 'preventie'
  },
  {
    id: 'buitenland',
    groep: 'meeropties',
    label: 'Buitenland en vaccinaties',
    beschrijving: 'Bijvoorbeeld reisvaccinaties of zorgkosten rond verblijf in het buitenland',
    zorgKeys: ['buitenland'],
    polisKeys: ['buitenlandVergoeding'],
    breakdownKey: 'buitenland'
  },
  {
    id: 'dieet',
    groep: 'meeropties',
    label: 'Diëtist en voedingsadvies',
    beschrijving: 'Praktische extra categorie voor dieetadvies en voedingsbegeleiding',
    zorgKeys: ['dieet'],
    polisKeys: ['dieetVergoeding'],
    breakdownKey: 'dieet'
  },
  {
    id: 'overig',
    groep: 'extra',
    label: 'Overig onder eigen risico',
    beschrijving: 'Algemene categorie voor zorg die vooral via het eigen risico loopt',
    zorgKeys: ['overigOnderEigenRisico'],
    polisKeys: ['eigenRisico']
  }
];

const alleCategorieIds = categorieen.map((categorie) => categorie.id);

const zorgVelden = [
  { key: 'tandarts', label: 'Tandarts en mondzorg per jaar', hint: 'Bijvoorbeeld controles, mondhygiënist, vullingen', step: '0.01' },
  { key: 'fysioSessies', label: 'Fysiotherapie of beweegzorg per jaar', hint: 'Aantal behandelingen', step: '1' },
  { key: 'fysioKostenPerSessie', label: 'Kosten per fysiobehandeling', hint: 'Gemiddelde prijs per behandeling', step: '0.01' },
  { key: 'bril', label: 'Brillen en lenzen', hint: 'Jaarbedrag dat je verwacht uit te geven', step: '0.01' },
  { key: 'alternatiefSessies', label: 'Alternatieve behandelingen', hint: 'Aantal behandelingen', step: '1' },
  { key: 'alternatiefKostenPerSessie', label: 'Kosten per alternatieve behandeling', hint: 'Bijvoorbeeld acupunctuur of osteopathie', step: '0.01' },
  { key: 'hulpmiddelen', label: 'Hulpmiddelen', hint: 'Bijvoorbeeld steunzolen, braces of andere hulpmiddelen', step: '0.01' },
  { key: 'medicijnen', label: 'Medicijnen', hint: 'Kosten die je verwacht zelf te betalen', step: '0.01' },
  { key: 'psychologischeZorg', label: 'Psychologische zorg', hint: 'Alleen meenemen als je zelf kosten verwacht', step: '0.01' },
  { key: 'gehoor', label: 'Gehoor en oren', hint: 'Bijvoorbeeld audicien, batterijen of eigen kosten voor gehoorapparaat', step: '0.01' },
  { key: 'huid', label: 'Huidzorg en acne', hint: 'Bijvoorbeeld huidtherapie, camouflage of acnebehandeling', step: '0.01' },
  { key: 'kraamzorg', label: 'Zwangerschap en kraamzorg', hint: 'Bijvoorbeeld eigen bijdragen of aanvullende zorg rondom zwangerschap', step: '0.01' },
  { key: 'preventie', label: 'Preventie en cursussen', hint: 'Bijvoorbeeld leefstijlprogramma’s, cursussen of preventieve checks', step: '0.01' },
  { key: 'buitenland', label: 'Buitenland en vaccinaties', hint: 'Bijvoorbeeld reisvaccinaties of zorgkosten in het buitenland', step: '0.01' },
  { key: 'dieet', label: 'Diëtist of voedingsadvies', hint: 'Jaarbedrag dat je verwacht zelf te betalen', step: '0.01' },
  { key: 'overigOnderEigenRisico', label: 'Overige zorg onder eigen risico', hint: 'Bijvoorbeeld ziekenhuis, specialist of andere basiszorg', step: '0.01' }
];

const polisVelden = [
  { key: 'maandpremie', label: 'Maandpremie', kind: 'currency' },
  { key: 'eigenRisico', label: 'Eigen risico', kind: 'currency' },
  { key: 'tandartsVergoeding', label: 'Tandarts en mondzorg per jaar', kind: 'currency' },
  { key: 'fysioSessiesVergoed', label: 'Fysiotherapie of beweegzorg vergoed', kind: 'number' },
  { key: 'brilVergoeding', label: 'Brillen en lenzen per jaar', kind: 'currency' },
  { key: 'alternatiefMaxVergoeding', label: 'Alternatief maximum per jaar', kind: 'currency' },
  { key: 'alternatiefPerSessie', label: 'Alternatief per behandeling', kind: 'currency' },
  { key: 'hulpmiddelenVergoeding', label: 'Hulpmiddelenvergoeding per jaar', kind: 'currency' },
  { key: 'medicijnenVergoeding', label: 'Medicijnenvergoeding per jaar', kind: 'currency' },
  { key: 'psychologischeZorgVergoeding', label: 'Psychologische zorg per jaar', kind: 'currency' },
  { key: 'gehoorVergoeding', label: 'Gehoor en oren per jaar', kind: 'currency' },
  { key: 'huidVergoeding', label: 'Huidzorg en acne per jaar', kind: 'currency' },
  { key: 'kraamzorgVergoeding', label: 'Zwangerschap en kraamzorg per jaar', kind: 'currency' },
  { key: 'preventieVergoeding', label: 'Preventie en cursussen per jaar', kind: 'currency' },
  { key: 'buitenlandVergoeding', label: 'Buitenland en vaccinaties per jaar', kind: 'currency' },
  { key: 'dieetVergoeding', label: 'Diëtistvergoeding per jaar', kind: 'currency' }
];

const toNumber = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeCategorieen = (input) => {
  if (!Array.isArray(input)) return alleCategorieIds;

  const normalized = input.filter((id) => alleCategorieIds.includes(id));
  return normalized.length ? normalized : alleCategorieIds;
};

const safeLoadState = () => {
  if (typeof window === 'undefined') return defaultState;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed?.verzekeringen) || typeof parsed?.zorggebruik !== 'object') {
      return defaultState;
    }

    return {
      zorggebruik: { ...defaultState.zorggebruik, ...parsed.zorggebruik },
      actieveCategorieen: normalizeCategorieen(parsed.actieveCategorieen),
      verzekeringen: parsed.verzekeringen.map((verzekering, index) => ({
        ...createInsurance(index + 1, `Polis ${index + 1}`),
        ...verzekering
      }))
    };
  } catch (error) {
    return defaultState;
  }
};

const berekenKosten = (verzekering, zorggebruik, actieveCategorieen) => {
  const actief = new Set(actieveCategorieen);
  const jaarPremie = verzekering.maandpremie * 12;

  const tandartsEigen = actief.has('tandarts')
    ? Math.max(0, zorggebruik.tandarts - verzekering.tandartsVergoeding)
    : 0;
  const fysioTotaal = actief.has('fysio') ? zorggebruik.fysioSessies * zorggebruik.fysioKostenPerSessie : 0;
  const fysioVergoed = actief.has('fysio')
    ? Math.min(zorggebruik.fysioSessies, verzekering.fysioSessiesVergoed) * zorggebruik.fysioKostenPerSessie
    : 0;
  const fysioEigen = Math.max(0, fysioTotaal - fysioVergoed);
  const brilEigen = actief.has('bril')
    ? Math.max(0, zorggebruik.bril - verzekering.brilVergoeding)
    : 0;
  const alternatiefTotaal = actief.has('alternatief')
    ? zorggebruik.alternatiefSessies * zorggebruik.alternatiefKostenPerSessie
    : 0;
  const alternatiefPerSessie = actief.has('alternatief')
    ? Math.min(zorggebruik.alternatiefKostenPerSessie, verzekering.alternatiefPerSessie) *
      zorggebruik.alternatiefSessies
    : 0;
  const alternatiefVergoed = Math.min(alternatiefPerSessie, verzekering.alternatiefMaxVergoeding);
  const alternatiefEigen = Math.max(0, alternatiefTotaal - alternatiefVergoed);
  const hulpmiddelenEigen = actief.has('hulpmiddelen')
    ? Math.max(0, zorggebruik.hulpmiddelen - verzekering.hulpmiddelenVergoeding)
    : 0;
  const medicijnenEigen = actief.has('medicijnen')
    ? Math.max(0, zorggebruik.medicijnen - verzekering.medicijnenVergoeding)
    : 0;
  const psychologischeZorgEigen = actief.has('psychologische-zorg')
    ? Math.max(0, zorggebruik.psychologischeZorg - verzekering.psychologischeZorgVergoeding)
    : 0;
  const gehoorEigen = actief.has('gehoor')
    ? Math.max(0, zorggebruik.gehoor - verzekering.gehoorVergoeding)
    : 0;
  const huidEigen = actief.has('huid')
    ? Math.max(0, zorggebruik.huid - verzekering.huidVergoeding)
    : 0;
  const kraamzorgEigen = actief.has('kraamzorg')
    ? Math.max(0, zorggebruik.kraamzorg - verzekering.kraamzorgVergoeding)
    : 0;
  const preventieEigen = actief.has('preventie')
    ? Math.max(0, zorggebruik.preventie - verzekering.preventieVergoeding)
    : 0;
  const buitenlandEigen = actief.has('buitenland')
    ? Math.max(0, zorggebruik.buitenland - verzekering.buitenlandVergoeding)
    : 0;
  const dieetEigen = actief.has('dieet') ? Math.max(0, zorggebruik.dieet - verzekering.dieetVergoeding) : 0;
  const eigenRisicoGebruikt = actief.has('overig')
    ? Math.min(zorggebruik.overigOnderEigenRisico, verzekering.eigenRisico)
    : 0;

  const eigenKostenAanvullend =
    tandartsEigen +
    fysioEigen +
    brilEigen +
    alternatiefEigen +
    hulpmiddelenEigen +
    medicijnenEigen +
    psychologischeZorgEigen +
    gehoorEigen +
    huidEigen +
    kraamzorgEigen +
    preventieEigen +
    buitenlandEigen +
    dieetEigen;
  const totaal = jaarPremie + eigenKostenAanvullend + eigenRisicoGebruikt;

  return {
    totaal,
    jaarPremie,
    eigenRisicoGebruikt,
    eigenKostenAanvullend,
    breakdown: {
      tandarts: tandartsEigen,
      fysio: fysioEigen,
      bril: brilEigen,
      alternatief: alternatiefEigen,
      hulpmiddelen: hulpmiddelenEigen,
      medicijnen: medicijnenEigen,
      psychologischeZorg: psychologischeZorgEigen,
      gehoor: gehoorEigen,
      huid: huidEigen,
      kraamzorg: kraamzorgEigen,
      preventie: preventieEigen,
      buitenland: buitenlandEigen,
      dieet: dieetEigen
    }
  };
};

const formatEuro = (value) => euro.format(value || 0);

const renderPrintHtml = ({ zorggebruik, resultaten, goedkoopste, actieveCategorieen }) => {
  const actief = new Set(actieveCategorieen);
  const items = [
    ['Tandarts', actief.has('tandarts') ? zorggebruik.tandarts : 0],
    [
      'Fysiosessies',
      actief.has('fysio') && zorggebruik.fysioSessies
        ? `${zorggebruik.fysioSessies} x ${formatEuro(zorggebruik.fysioKostenPerSessie)}`
        : 0
    ],
    ['Bril of lenzen', actief.has('bril') ? zorggebruik.bril : 0],
    [
      'Alternatieve zorg',
      actief.has('alternatief') && zorggebruik.alternatiefSessies
        ? `${zorggebruik.alternatiefSessies} x ${formatEuro(zorggebruik.alternatiefKostenPerSessie)}`
        : 0
    ],
    ['Hulpmiddelen', actief.has('hulpmiddelen') ? zorggebruik.hulpmiddelen : 0],
    ['Medicijnen', actief.has('medicijnen') ? zorggebruik.medicijnen : 0],
    ['Psychologische zorg', actief.has('psychologische-zorg') ? zorggebruik.psychologischeZorg : 0],
    ['Gehoor en oren', actief.has('gehoor') ? zorggebruik.gehoor : 0],
    ['Huidzorg en acne', actief.has('huid') ? zorggebruik.huid : 0],
    ['Zwangerschap en kraamzorg', actief.has('kraamzorg') ? zorggebruik.kraamzorg : 0],
    ['Preventie en cursussen', actief.has('preventie') ? zorggebruik.preventie : 0],
    ['Buitenland en vaccinaties', actief.has('buitenland') ? zorggebruik.buitenland : 0],
    ['Diëtist', actief.has('dieet') ? zorggebruik.dieet : 0],
    ['Overige zorg onder eigen risico', actief.has('overig') ? zorggebruik.overigOnderEigenRisico : 0]
  ]
    .filter(([, value]) => value !== 0 && value !== '0 x € 0')
    .map(
      ([label, value]) => `
        <div class="usage-item">
          <span>${label}</span>
          <strong>${typeof value === 'number' ? formatEuro(value) : value}</strong>
        </div>
      `
    )
    .join('');

  const rows = resultaten
    .map(
      ({ verzekering, kosten }, index) => `
        <section class="plan ${goedkoopste?.verzekering.id === verzekering.id ? 'best' : ''}">
          <header>
            <div>
              <p class="kicker">${index === 0 ? 'Beste match voor deze inschatting' : `Optie ${index + 1}`}</p>
              <h2>${verzekering.naam}</h2>
            </div>
            <div class="price">${formatEuro(kosten.totaal)}</div>
          </header>
          <div class="grid">
            <div><span>Jaarpremie</span><strong>${formatEuro(kosten.jaarPremie)}</strong></div>
            <div><span>Gebruikt eigen risico</span><strong>${formatEuro(kosten.eigenRisicoGebruikt)}</strong></div>
            <div><span>Eigen kosten aanvullend</span><strong>${formatEuro(kosten.eigenKostenAanvullend)}</strong></div>
          </div>
        </section>
      `
    )
    .join('');

  return `
    <!doctype html>
    <html lang="nl">
      <head>
        <meta charset="utf-8" />
        <title>Zorgvergelijker overzicht</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 40px; color: #102a43; background: #f8fafc; }
          h1, h2 { margin: 0; }
          .hero { padding: 28px; border-radius: 24px; background: linear-gradient(135deg, #0f766e, #164e63); color: white; margin-bottom: 24px; }
          .usage { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 24px 0; }
          .usage-item, .grid > div { background: white; border-radius: 16px; padding: 14px 16px; border: 1px solid #d9e2ec; display: flex; justify-content: space-between; gap: 16px; }
          .plan { background: white; border-radius: 24px; padding: 24px; margin-bottom: 16px; border: 1px solid #d9e2ec; }
          .plan.best { border-color: #0f766e; box-shadow: 0 20px 48px -32px rgba(15, 118, 110, 0.45); }
          .kicker { text-transform: uppercase; letter-spacing: 0.12em; font-size: 12px; margin: 0 0 6px; color: #486581; }
          header { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; margin-bottom: 18px; }
          .price { font-size: 34px; font-weight: 700; color: #0f766e; }
          .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
          .grid span { display: block; color: #627d98; font-size: 12px; margin-bottom: 6px; }
        </style>
      </head>
      <body>
        <div class="hero">
          <h1>Zorgvergelijker</h1>
          <p>Vergelijking op basis van je eigen inschatting van zorggebruik.</p>
        </div>
        <div class="usage">${items || '<div class="usage-item"><span>Geen zorggebruik ingevuld</span><strong>€ 0</strong></div>'}</div>
        ${rows}
      </body>
    </html>
  `;
};

export default function App() {
  const [storedState] = useState(() => safeLoadState());
  const [zorggebruik, setZorggebruik] = useState(storedState.zorggebruik);
  const [actieveCategorieen, setActieveCategorieen] = useState(storedState.actieveCategorieen);
  const [verzekeringen, setVerzekeringen] = useState(storedState.verzekeringen);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          zorggebruik,
          actieveCategorieen,
          verzekeringen
        })
      );
    } catch (error) {
      // Ignore storage issues and let the app keep working in memory.
    }
  }, [zorggebruik, actieveCategorieen, verzekeringen]);

  const actieveCategorieSet = new Set(actieveCategorieen);

  const sortedResultaten = verzekeringen
    .map((verzekering) => ({
      verzekering,
      kosten: berekenKosten(verzekering, zorggebruik, actieveCategorieen)
    }))
    .sort((a, b) => a.kosten.totaal - b.kosten.totaal);

  const goedkoopsteTotaal = sortedResultaten[0]?.kosten.totaal ?? 0;

  const resultaten = sortedResultaten.map((resultaat) => ({
    ...resultaat,
    verschilMetGoedkoopste: resultaat.kosten.totaal - goedkoopsteTotaal
  }));

  const goedkoopste = resultaten[0] ?? null;

  const zichtbareZorgVelden = zorgVelden.filter((veld) =>
    categorieen.some(
      (categorie) => actieveCategorieSet.has(categorie.id) && categorie.zorgKeys.includes(veld.key)
    )
  );

  const zichtbarePolisVelden = polisVelden.filter((veld) => {
    if (veld.key === 'maandpremie') return true;

    return categorieen.some(
      (categorie) => actieveCategorieSet.has(categorie.id) && categorie.polisKeys.includes(veld.key)
    );
  });

  const updateZorggebruik = (key, value) => {
    setZorggebruik((current) => ({
      ...current,
      [key]: toNumber(value)
    }));
  };

  const updateVerzekering = (id, key, value) => {
    setVerzekeringen((current) =>
      current.map((verzekering) =>
        verzekering.id === id
          ? {
              ...verzekering,
              [key]: key === 'naam' || key === 'notitie' ? value : toNumber(value)
            }
          : verzekering
      )
    );
  };

  const voegVerzekeringToe = () => {
    const nextId = Math.max(0, ...verzekeringen.map((verzekering) => verzekering.id)) + 1;
    setVerzekeringen((current) => [...current, createInsurance(nextId, `Nieuwe polis ${nextId}`)]);
  };

  const verwijderVerzekering = (id) => {
    if (verzekeringen.length === 1) return;
    setVerzekeringen((current) => current.filter((verzekering) => verzekering.id !== id));
  };

  const toggleCategorie = (categorieId) => {
    setActieveCategorieen((current) => {
      if (current.includes(categorieId)) {
        if (current.length === 1) return current;
        return current.filter((id) => id !== categorieId);
      }

      return [...current, categorieId];
    });
  };

  const exporteerJson = () => {
    const payload = {
      versie: 1,
      datum: new Date().toISOString(),
      zorggebruik,
      actieveCategorieen,
      verzekeringen
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `zorgvergelijker-${dateStamp}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const importeerJson = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw);

      if (!Array.isArray(parsed?.verzekeringen) || typeof parsed?.zorggebruik !== 'object') {
        throw new Error('Ongeldig bestandsformaat.');
      }

      setZorggebruik({ ...defaultState.zorggebruik, ...parsed.zorggebruik });
      setActieveCategorieen(normalizeCategorieen(parsed.actieveCategorieen));
      setVerzekeringen(
        parsed.verzekeringen.map((verzekering, index) => ({
          ...createInsurance(index + 1, `Polis ${index + 1}`),
          ...verzekering
        }))
      );
      window.alert('Bestand geïmporteerd.');
    } catch (error) {
      window.alert(error.message || 'Importeren is mislukt.');
    } finally {
      event.target.value = '';
    }
  };

  const exporteerPrint = () => {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.position = 'fixed';
    frame.style.right = '0';
    frame.style.bottom = '0';
    frame.style.width = '0';
    frame.style.height = '0';
    frame.style.border = '0';
    document.body.appendChild(frame);

    const printWindow = frame.contentWindow;
    const printDocument = printWindow?.document;

    if (!printWindow || !printDocument) {
      frame.remove();
      window.alert('Printweergave kon niet worden geopend.');
      return;
    }

    const cleanup = () => {
      window.setTimeout(() => frame.remove(), 1200);
    };

    frame.addEventListener(
      'load',
      () => {
        printWindow.focus();
        printWindow.print();
        cleanup();
      },
      { once: true }
    );

    printDocument.open();
        printDocument.write(
      renderPrintHtml({
        zorggebruik,
        resultaten,
        goedkoopste,
        actieveCategorieen
      })
    );
    printDocument.close();
  };

  return (
    <main className="page-shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />

      <section className="hero-card">
        <div className="hero-copy">
          <div className="eyebrow">
            <ShieldCheck size={16} />
            Nederlands, handmatig en privacyvriendelijk
          </div>
          <h1>Zorgvergelijker voor je echte jaarlasten</h1>
          <p>
            Vul in welke zorg je verwacht te gebruiken, zet een paar polissen naast elkaar en zie
            welke optie onderaan de streep het goedkoopst uitpakt.
          </p>
          <div className="hero-actions">
            <button type="button" className="primary-button" onClick={exporteerJson}>
              <Download size={18} />
              Exporteer JSON
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setSettingsOpen((current) => !current)}
              aria-expanded={settingsOpen}
              aria-controls="instellingen-paneel"
            >
              <Settings2 size={18} />
              Instellingen
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={18} />
              Importeer
            </button>
            <button type="button" className="secondary-button" onClick={exporteerPrint}>
              <FileText size={18} />
              Print of PDF
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              hidden
              onChange={importeerJson}
            />
          </div>
        </div>

        <aside className="hero-summary">
          <div className="summary-kicker">
            <Calculator size={16} />
            Huidige samenvatting
          </div>
          <div className="summary-price">
            {goedkoopste ? formatEuro(goedkoopste.kosten.totaal) : formatEuro(0)}
          </div>
          <p>
            {goedkoopste
              ? `${goedkoopste.verzekering.naam} is nu de voordeligste keuze voor jouw inschatting.`
              : 'Voeg minimaal één polis toe om te vergelijken.'}
          </p>
          <ul className="summary-points">
            <li>Autosave staat standaard aan in je browser.</li>
            <li>Je data blijft lokaal tot je zelf exporteert.</li>
            <li>Controleer polisvoorwaarden altijd bij de verzekeraar.</li>
          </ul>
        </aside>
      </section>

      {settingsOpen ? (
        <section className="settings-panel" id="instellingen-paneel">
          <div className="settings-header">
            <div>
              <p className="section-kicker">Instellingen</p>
              <h2>Kies welke zorgkosten je wilt meenemen</h2>
            </div>
            <p>Wat je hier uitzet, verdwijnt uit de invoer, uit de polisvelden en uit de berekening. Zet extra categorieën aan als je specifieker wilt vergelijken.</p>
          </div>
          <div className="settings-groups">
            <div>
              <p className="settings-group-label">Veelgekozen kosten</p>
              <div className="settings-grid">
                {categorieen
                  .filter((categorie) => categorie.groep === 'veelgekozen')
                  .map((categorie) => (
                    <label key={categorie.id} className="toggle-card">
                      <input
                        type="checkbox"
                        checked={actieveCategorieSet.has(categorie.id)}
                        onChange={() => toggleCategorie(categorie.id)}
                      />
                      <div>
                        <strong>{categorie.label}</strong>
                        <p>{categorie.beschrijving}</p>
                      </div>
                    </label>
                  ))}
              </div>
            </div>
            <div>
              <p className="settings-group-label">Meer opties</p>
              <div className="settings-grid">
                {categorieen
                  .filter((categorie) => categorie.groep === 'meeropties' || categorie.groep === 'extra')
                  .map((categorie) => (
                    <label key={categorie.id} className="toggle-card">
                      <input
                        type="checkbox"
                        checked={actieveCategorieSet.has(categorie.id)}
                        onChange={() => toggleCategorie(categorie.id)}
                      />
                      <div>
                        <strong>{categorie.label}</strong>
                        <p>{categorie.beschrijving}</p>
                      </div>
                    </label>
                  ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="workflow-strip" aria-label="Stappen">
        <a href="#step-zorggebruik" className="workflow-card">
          <span className="section-kicker">Stap 1</span>
          <strong>Vul je zorggebruik in</strong>
          <p>Begin met je inschatting van zorgkosten uit de categorieën die je hierboven aanzet.</p>
        </a>
        <a href="#step-polissen" className="workflow-card">
          <span className="section-kicker">Stap 2</span>
          <strong>Voeg je polissen toe</strong>
          <p>Zet je huidige verzekering en alternatieven naast elkaar met premie en vergoedingen.</p>
        </a>
        <a href="#step-vergelijking" className="workflow-card">
          <span className="section-kicker">Stap 3</span>
          <strong>Vergelijk de jaarlasten</strong>
          <p>Bekijk direct welke polis onderaan de streep het voordeligst uitkomt voor jouw situatie.</p>
        </a>
      </section>

      <section className="workspace-grid">
        <section className="step-column" id="step-zorggebruik">
          <div className="step-intro">
            <p className="section-kicker">Stap 1</p>
            <h2>Verwacht zorggebruik</h2>
            <p>Vul eerst in wat je komend jaar denkt te gebruiken. De vergelijking rechts rekent direct mee met de categorieën die je in instellingen hebt aangezet.</p>
          </div>
          <article className="panel">
            <div className="field-grid">
              {zichtbareZorgVelden.map((veld) => (
                <label key={veld.key} className={veld.key === 'overigOnderEigenRisico' ? 'field wide' : 'field'}>
                  <span>{veld.label}</span>
                  <input
                    type="number"
                    min="0"
                    step={veld.step}
                    value={zorggebruik[veld.key]}
                    onChange={(event) => updateZorggebruik(veld.key, event.target.value)}
                  />
                  <small>{veld.hint}</small>
                </label>
              ))}
            </div>
          </article>
        </section>

        <section className="step-column" id="step-polissen">
          <div className="step-intro step-intro-with-action">
            <div>
              <p className="section-kicker">Stap 2</p>
              <h2>Polissen invoeren</h2>
              <p>Voeg je huidige verzekering en alternatieven toe. Je kunt zoveel polissen vergelijken als je wilt.</p>
            </div>
            <button type="button" className="primary-button step-button" onClick={voegVerzekeringToe}>
              <Plus size={18} />
              Polis toevoegen
            </button>
          </div>
          <section className="insurance-stack">
            {verzekeringen.map((verzekering, index) => (
              <article key={verzekering.id} className="insurance-card">
                <div className="insurance-header">
                  <label className="field grow">
                    <span className="polis-label-row">
                      <span>Naam van de polis</span>
                      <span className="polis-badge">Polis {index + 1}</span>
                    </span>
                    <input
                      type="text"
                      value={verzekering.naam}
                      onChange={(event) => updateVerzekering(verzekering.id, 'naam', event.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => verwijderVerzekering(verzekering.id)}
                    disabled={verzekeringen.length === 1}
                    aria-label={`Verwijder ${verzekering.naam}`}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="field-grid policy-grid">
                  {zichtbarePolisVelden.map((veld) => (
                    <label key={veld.key} className="field">
                      <span>{veld.label}</span>
                      <input
                        type="number"
                        min="0"
                        step={veld.kind === 'number' ? '1' : '0.01'}
                        value={verzekering[veld.key]}
                        onChange={(event) => updateVerzekering(verzekering.id, veld.key, event.target.value)}
                      />
                    </label>
                  ))}
                  <label className="field wide">
                    <span>Notitie bij deze polis</span>
                    <textarea
                      rows="3"
                      value={verzekering.notitie}
                      onChange={(event) => updateVerzekering(verzekering.id, 'notitie', event.target.value)}
                      placeholder="Bijvoorbeeld: tandarts alleen na wachttijd, alternatieve zorg alleen bij aangesloten behandelaars."
                    />
                  </label>
                </div>
              </article>
            ))}
          </section>
        </section>

        <section className="step-column" id="step-vergelijking">
          <div className="step-intro">
            <p className="section-kicker">Stap 3</p>
            <h2>Vergelijking</h2>
            <p>Hier zie je meteen welke polis het voordeligst uitpakt op basis van jouw eigen invoer.</p>
          </div>
          <article className="panel insight-panel">
            <div className="insight-stack">
              <div className="insight-card highlight">
                <span>Goedkoopste keuze</span>
                <strong>{goedkoopste ? goedkoopste.verzekering.naam : 'Nog niet beschikbaar'}</strong>
                <p>
                  {goedkoopste
                    ? `Geschatte jaarlast: ${formatEuro(goedkoopste.kosten.totaal)}`
                    : 'Vul een polis in om direct een ranglijst te zien.'}
                </p>
              </div>
              <div className="insight-card">
                <span>Aantal polissen</span>
                <strong>{verzekeringen.length}</strong>
                <p>Je kunt onbeperkt extra polissen toevoegen voor dezelfde zorginschatting.</p>
              </div>
              <div className="insight-card">
                <span>Belangrijk</span>
                <strong>Geen advies, wel rekenhulp</strong>
                <p>Deze tool rekent alleen met wat jij invult en houdt geen rekening met elke polisuitzondering.</p>
              </div>
            </div>
          </article>
          <section className="results-grid">
            {resultaten.map((resultaat, index) => (
              <article
                key={resultaat.verzekering.id}
                className={`result-card ${index === 0 ? 'is-best' : ''}`}
                data-testid="result-card"
              >
                <div className="result-topline">
                  <div>
                    <p className="result-rank">
                      {index === 0 ? 'Meest voordelig voor deze inschatting' : `Plaats ${index + 1}`}
                    </p>
                    <h3>{resultaat.verzekering.naam}</h3>
                  </div>
                  <div className="result-total">{formatEuro(resultaat.kosten.totaal)}</div>
                </div>

                <div className="metric-row">
                  <div className="metric-box">
                    <span>Jaarpremie</span>
                    <strong>{formatEuro(resultaat.kosten.jaarPremie)}</strong>
                  </div>
                  <div className="metric-box">
                    <span>Eigen risico gebruikt</span>
                    <strong>{formatEuro(resultaat.kosten.eigenRisicoGebruikt)}</strong>
                  </div>
                  <div className="metric-box">
                    <span>Eigen kosten aanvullend</span>
                    <strong>{formatEuro(resultaat.kosten.eigenKostenAanvullend)}</strong>
                  </div>
                </div>

                <div className="difference-bar">
                  {index === 0 ? (
                    <span>Referentiepunt voor deze vergelijking</span>
                  ) : (
                    <span>{formatEuro(resultaat.verschilMetGoedkoopste)} duurder dan de goedkoopste optie</span>
                  )}
                </div>

                <details className="breakdown">
                  <summary>Bekijk opbouw van de eigen kosten</summary>
                  <div className="breakdown-grid">
                    {categorieen
                      .filter(
                        (categorie) =>
                          categorie.breakdownKey && actieveCategorieSet.has(categorie.id)
                      )
                      .map((categorie) => (
                        <div key={categorie.id}>
                          {categorie.label}: {formatEuro(resultaat.kosten.breakdown[categorie.breakdownKey])}
                        </div>
                      ))}
                  </div>
                </details>
              </article>
            ))}
          </section>
        </section>
      </section>
    </main>
  );
}
