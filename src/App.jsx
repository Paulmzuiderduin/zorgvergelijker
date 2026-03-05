import React, { useEffect, useRef, useState } from 'react';
import {
  Calculator,
  ChevronLeft,
  ChevronRight,
  Copy,
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
  tandartsPercentage: 0,
  fysioSessiesVergoed: 0,
  brilVergoeding: 0,
  brilPercentage: 0,
  alternatiefMaxVergoeding: 0,
  alternatiefPerSessie: 0,
  hulpmiddelenVergoeding: 0,
  hulpmiddelenPercentage: 0,
  medicijnenVergoeding: 0,
  medicijnenPercentage: 0,
  psychologischeZorgVergoeding: 0,
  psychologischeZorgPercentage: 0,
  gehoorVergoeding: 0,
  gehoorPercentage: 0,
  huidVergoeding: 0,
  huidPercentage: 0,
  kraamzorgVergoeding: 0,
  kraamzorgPercentage: 0,
  preventieVergoeding: 0,
  preventiePercentage: 0,
  buitenlandVergoeding: 0,
  buitenlandPercentage: 0,
  dieetVergoeding: 0,
  dieetPercentage: 0,
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
    polisKeys: ['tandartsVergoeding', 'tandartsPercentage'],
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
    polisKeys: ['brilVergoeding', 'brilPercentage'],
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
    polisKeys: ['hulpmiddelenVergoeding', 'hulpmiddelenPercentage'],
    breakdownKey: 'hulpmiddelen'
  },
  {
    id: 'medicijnen',
    groep: 'veelgekozen',
    label: 'Medicijnen',
    beschrijving: 'Medicijnkosten en vergoeding',
    zorgKeys: ['medicijnen'],
    polisKeys: ['medicijnenVergoeding', 'medicijnenPercentage'],
    breakdownKey: 'medicijnen'
  },
  {
    id: 'psychologische-zorg',
    groep: 'veelgekozen',
    label: 'Psychologische zorg',
    beschrijving: 'Psychologische zorg en vergoeding',
    zorgKeys: ['psychologischeZorg'],
    polisKeys: ['psychologischeZorgVergoeding', 'psychologischeZorgPercentage'],
    breakdownKey: 'psychologischeZorg'
  },
  {
    id: 'gehoor',
    groep: 'meeropties',
    label: 'Gehoor en oren',
    beschrijving: 'Bijvoorbeeld gehoorapparaten, batterijen of audicienkosten',
    zorgKeys: ['gehoor'],
    polisKeys: ['gehoorVergoeding', 'gehoorPercentage'],
    breakdownKey: 'gehoor'
  },
  {
    id: 'huid',
    groep: 'meeropties',
    label: 'Huidzorg en acne',
    beschrijving: 'Bijvoorbeeld huidtherapie, camouflage of acnebehandeling',
    zorgKeys: ['huid'],
    polisKeys: ['huidVergoeding', 'huidPercentage'],
    breakdownKey: 'huid'
  },
  {
    id: 'kraamzorg',
    groep: 'meeropties',
    label: 'Zwangerschap en kraamzorg',
    beschrijving: 'Bijvoorbeeld eigen bijdragen of aanvullende vergoedingen rond zwangerschap',
    zorgKeys: ['kraamzorg'],
    polisKeys: ['kraamzorgVergoeding', 'kraamzorgPercentage'],
    breakdownKey: 'kraamzorg'
  },
  {
    id: 'preventie',
    groep: 'meeropties',
    label: 'Preventie en cursussen',
    beschrijving: 'Bijvoorbeeld stoppen-met-roken, cursussen of checks',
    zorgKeys: ['preventie'],
    polisKeys: ['preventieVergoeding', 'preventiePercentage'],
    breakdownKey: 'preventie'
  },
  {
    id: 'buitenland',
    groep: 'meeropties',
    label: 'Buitenland en vaccinaties',
    beschrijving: 'Bijvoorbeeld reisvaccinaties of zorgkosten rond verblijf in het buitenland',
    zorgKeys: ['buitenland'],
    polisKeys: ['buitenlandVergoeding', 'buitenlandPercentage'],
    breakdownKey: 'buitenland'
  },
  {
    id: 'dieet',
    groep: 'meeropties',
    label: 'Diëtist en voedingsadvies',
    beschrijving: 'Praktische extra categorie voor dieetadvies en voedingsbegeleiding',
    zorgKeys: ['dieet'],
    polisKeys: ['dieetVergoeding', 'dieetPercentage'],
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
const stappen = ['zorggebruik', 'polissen', 'vergelijking'];
const stapMeta = {
  zorggebruik: {
    label: 'Vul je zorggebruik in',
    stap: 'Stap 1',
    titel: 'Verwacht zorggebruik',
    beschrijving: 'Begin met je inschatting van zorgkosten uit de categorieen die je hierboven aanzet.'
  },
  polissen: {
    label: 'Voeg je polissen toe',
    stap: 'Stap 2',
    titel: 'Polissen invoeren',
    beschrijving: 'Zet je huidige verzekering en alternatieven naast elkaar met premie en vergoedingen.'
  },
  vergelijking: {
    label: 'Vergelijk de jaarlasten',
    stap: 'Stap 3',
    titel: 'Vergelijking',
    beschrijving: 'Bekijk direct welke polis onderaan de streep het voordeligst uitkomt voor jouw situatie.'
  }
};

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

const zorgGroepen = [
  {
    id: 'tandarts',
    title: 'Tandarts en mondzorg',
    description: 'Voer hier je verwachte tandartskosten voor een jaar in.',
    veldKeys: ['tandarts']
  },
  {
    id: 'fysio',
    title: 'Fysiotherapie en beweegzorg',
    description: 'Aantal behandelingen en gemiddelde prijs horen hier samen.',
    veldKeys: ['fysioSessies', 'fysioKostenPerSessie']
  },
  {
    id: 'bril',
    title: 'Brillen en lenzen',
    description: 'Gebruik dit als totaalbedrag voor bril, glazen of lenzen.',
    veldKeys: ['bril']
  },
  {
    id: 'alternatief',
    title: 'Alternatieve zorg',
    description: 'Aantal behandelingen en prijs per behandeling vormen samen je jaarinschatting.',
    veldKeys: ['alternatiefSessies', 'alternatiefKostenPerSessie']
  },
  {
    id: 'hulpmiddelen',
    title: 'Hulpmiddelen',
    description: 'Bijvoorbeeld steunzolen, braces of andere hulpmiddelen.',
    veldKeys: ['hulpmiddelen']
  },
  {
    id: 'medicijnen',
    title: 'Medicijnen',
    description: 'Kosten die je verwacht zelf te betalen.',
    veldKeys: ['medicijnen']
  },
  {
    id: 'psychologische-zorg',
    title: 'Psychologische zorg',
    description: 'Neem dit mee als je verwacht zelf kosten te maken.',
    veldKeys: ['psychologischeZorg']
  },
  {
    id: 'gehoor',
    title: 'Gehoor en oren',
    description: 'Bijvoorbeeld audicien, batterijen of eigen kosten voor gehoorapparaat.',
    veldKeys: ['gehoor']
  },
  {
    id: 'huid',
    title: 'Huidzorg en acne',
    description: 'Bijvoorbeeld huidtherapie, camouflage of acnebehandeling.',
    veldKeys: ['huid']
  },
  {
    id: 'kraamzorg',
    title: 'Zwangerschap en kraamzorg',
    description: 'Bijvoorbeeld eigen bijdragen of aanvullende zorg rondom zwangerschap.',
    veldKeys: ['kraamzorg']
  },
  {
    id: 'preventie',
    title: 'Preventie en cursussen',
    description: 'Bijvoorbeeld leefstijlprogramma’s, cursussen of preventieve checks.',
    veldKeys: ['preventie']
  },
  {
    id: 'buitenland',
    title: 'Buitenland en vaccinaties',
    description: 'Bijvoorbeeld reisvaccinaties of zorgkosten in het buitenland.',
    veldKeys: ['buitenland']
  },
  {
    id: 'dieet',
    title: 'Diëtist en voedingsadvies',
    description: 'Gebruik dit voor dieetadvies of voedingsbegeleiding.',
    veldKeys: ['dieet']
  },
  {
    id: 'overig',
    title: 'Overige zorg onder eigen risico',
    description: 'Bijvoorbeeld ziekenhuis, specialist of andere basiszorg.',
    veldKeys: ['overigOnderEigenRisico']
  }
];

const polisVelden = [
  { key: 'maandpremie', label: 'Maandpremie', kind: 'currency', group: 'basis' },
  { key: 'eigenRisico', label: 'Eigen risico', kind: 'currency', group: 'basis' },
  { key: 'tandartsVergoeding', label: 'Tandarts max per jaar', kind: 'currency', group: 'veelgekozen' },
  { key: 'tandartsPercentage', label: 'Tandarts % vergoeding', kind: 'number', group: 'veelgekozen' },
  { key: 'fysioSessiesVergoed', label: 'Fysiotherapie of beweegzorg vergoed', kind: 'number', group: 'veelgekozen' },
  { key: 'brilVergoeding', label: 'Brillen en lenzen max per jaar', kind: 'currency', group: 'veelgekozen' },
  { key: 'brilPercentage', label: 'Brillen en lenzen % vergoeding', kind: 'number', group: 'veelgekozen' },
  { key: 'alternatiefMaxVergoeding', label: 'Alternatief maximum per jaar', kind: 'currency', group: 'veelgekozen' },
  { key: 'alternatiefPerSessie', label: 'Alternatief per behandeling', kind: 'currency', group: 'veelgekozen' },
  { key: 'hulpmiddelenVergoeding', label: 'Hulpmiddelen max per jaar', kind: 'currency', group: 'veelgekozen' },
  { key: 'hulpmiddelenPercentage', label: 'Hulpmiddelen % vergoeding', kind: 'number', group: 'veelgekozen' },
  { key: 'medicijnenVergoeding', label: 'Medicijnen max per jaar', kind: 'currency', group: 'veelgekozen' },
  { key: 'medicijnenPercentage', label: 'Medicijnen % vergoeding', kind: 'number', group: 'veelgekozen' },
  { key: 'psychologischeZorgVergoeding', label: 'Psychologische zorg max per jaar', kind: 'currency', group: 'veelgekozen' },
  { key: 'psychologischeZorgPercentage', label: 'Psychologische zorg % vergoeding', kind: 'number', group: 'veelgekozen' },
  { key: 'gehoorVergoeding', label: 'Gehoor en oren max per jaar', kind: 'currency', group: 'meeropties' },
  { key: 'gehoorPercentage', label: 'Gehoor en oren % vergoeding', kind: 'number', group: 'meeropties' },
  { key: 'huidVergoeding', label: 'Huidzorg en acne max per jaar', kind: 'currency', group: 'meeropties' },
  { key: 'huidPercentage', label: 'Huidzorg en acne % vergoeding', kind: 'number', group: 'meeropties' },
  { key: 'kraamzorgVergoeding', label: 'Zwangerschap en kraamzorg max per jaar', kind: 'currency', group: 'meeropties' },
  { key: 'kraamzorgPercentage', label: 'Zwangerschap en kraamzorg % vergoeding', kind: 'number', group: 'meeropties' },
  { key: 'preventieVergoeding', label: 'Preventie en cursussen max per jaar', kind: 'currency', group: 'meeropties' },
  { key: 'preventiePercentage', label: 'Preventie en cursussen % vergoeding', kind: 'number', group: 'meeropties' },
  { key: 'buitenlandVergoeding', label: 'Buitenland en vaccinaties max per jaar', kind: 'currency', group: 'meeropties' },
  { key: 'buitenlandPercentage', label: 'Buitenland en vaccinaties % vergoeding', kind: 'number', group: 'meeropties' },
  { key: 'dieetVergoeding', label: 'Diëtistvergoeding max per jaar', kind: 'currency', group: 'meeropties' },
  { key: 'dieetPercentage', label: 'Diëtist % vergoeding', kind: 'number', group: 'meeropties' }
];

const polisGroepen = [
  {
    id: 'basis',
    label: 'Basis',
    beschrijving: 'Premie en eigen risico voor deze polis.'
  },
  {
    id: 'veelgekozen',
    label: 'Veelgekozen vergoedingen',
    beschrijving: 'Vul hier een maximumbedrag, een percentage of allebei in.'
  },
  {
    id: 'meeropties',
    label: 'Meer opties',
    beschrijving: 'Alle extra categorieën die je in instellingen hebt aangezet.'
  }
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

const clampPercentage = (value) => Math.max(0, Math.min(100, value));

const berekenCategorieVergoeding = (kosten, maximum, percentage) => {
  if (kosten <= 0) return 0;

  const cappedPercentage = clampPercentage(percentage);
  const heeftMaximum = maximum > 0;
  const heeftPercentage = cappedPercentage > 0;

  if (!heeftMaximum && !heeftPercentage) return 0;

  const vergoedingOpPercentage = heeftPercentage ? kosten * (cappedPercentage / 100) : kosten;
  const vergoeding = heeftMaximum ? Math.min(vergoedingOpPercentage, maximum) : vergoedingOpPercentage;

  return Math.min(kosten, vergoeding);
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
    ? Math.max(
        0,
        zorggebruik.tandarts -
          berekenCategorieVergoeding(
            zorggebruik.tandarts,
            verzekering.tandartsVergoeding,
            verzekering.tandartsPercentage
          )
      )
    : 0;
  const fysioTotaal = actief.has('fysio') ? zorggebruik.fysioSessies * zorggebruik.fysioKostenPerSessie : 0;
  const fysioVergoed = actief.has('fysio')
    ? Math.min(zorggebruik.fysioSessies, verzekering.fysioSessiesVergoed) * zorggebruik.fysioKostenPerSessie
    : 0;
  const fysioEigen = Math.max(0, fysioTotaal - fysioVergoed);
  const brilEigen = actief.has('bril')
    ? Math.max(
        0,
        zorggebruik.bril -
          berekenCategorieVergoeding(zorggebruik.bril, verzekering.brilVergoeding, verzekering.brilPercentage)
      )
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
    ? Math.max(
        0,
        zorggebruik.hulpmiddelen -
          berekenCategorieVergoeding(
            zorggebruik.hulpmiddelen,
            verzekering.hulpmiddelenVergoeding,
            verzekering.hulpmiddelenPercentage
          )
      )
    : 0;
  const medicijnenEigen = actief.has('medicijnen')
    ? Math.max(
        0,
        zorggebruik.medicijnen -
          berekenCategorieVergoeding(
            zorggebruik.medicijnen,
            verzekering.medicijnenVergoeding,
            verzekering.medicijnenPercentage
          )
      )
    : 0;
  const psychologischeZorgEigen = actief.has('psychologische-zorg')
    ? Math.max(
        0,
        zorggebruik.psychologischeZorg -
          berekenCategorieVergoeding(
            zorggebruik.psychologischeZorg,
            verzekering.psychologischeZorgVergoeding,
            verzekering.psychologischeZorgPercentage
          )
      )
    : 0;
  const gehoorEigen = actief.has('gehoor')
    ? Math.max(
        0,
        zorggebruik.gehoor -
          berekenCategorieVergoeding(zorggebruik.gehoor, verzekering.gehoorVergoeding, verzekering.gehoorPercentage)
      )
    : 0;
  const huidEigen = actief.has('huid')
    ? Math.max(
        0,
        zorggebruik.huid -
          berekenCategorieVergoeding(zorggebruik.huid, verzekering.huidVergoeding, verzekering.huidPercentage)
      )
    : 0;
  const kraamzorgEigen = actief.has('kraamzorg')
    ? Math.max(
        0,
        zorggebruik.kraamzorg -
          berekenCategorieVergoeding(
            zorggebruik.kraamzorg,
            verzekering.kraamzorgVergoeding,
            verzekering.kraamzorgPercentage
          )
      )
    : 0;
  const preventieEigen = actief.has('preventie')
    ? Math.max(
        0,
        zorggebruik.preventie -
          berekenCategorieVergoeding(
            zorggebruik.preventie,
            verzekering.preventieVergoeding,
            verzekering.preventiePercentage
          )
      )
    : 0;
  const buitenlandEigen = actief.has('buitenland')
    ? Math.max(
        0,
        zorggebruik.buitenland -
          berekenCategorieVergoeding(
            zorggebruik.buitenland,
            verzekering.buitenlandVergoeding,
            verzekering.buitenlandPercentage
          )
      )
    : 0;
  const dieetEigen = actief.has('dieet')
    ? Math.max(
        0,
        zorggebruik.dieet -
          berekenCategorieVergoeding(zorggebruik.dieet, verzekering.dieetVergoeding, verzekering.dieetPercentage)
      )
    : 0;
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

const driverLabels = {
  premie: 'Jaarpremie',
  eigenRisico: 'Eigen risico',
  tandarts: 'Tandarts en mondzorg',
  fysio: 'Fysiotherapie en beweegzorg',
  bril: 'Brillen en lenzen',
  alternatief: 'Alternatieve zorg',
  hulpmiddelen: 'Hulpmiddelen',
  medicijnen: 'Medicijnen',
  psychologischeZorg: 'Psychologische zorg',
  gehoor: 'Gehoor en oren',
  huid: 'Huidzorg en acne',
  kraamzorg: 'Zwangerschap en kraamzorg',
  preventie: 'Preventie en cursussen',
  buitenland: 'Buitenland en vaccinaties',
  dieet: 'Dietist en voedingsadvies'
};

const beleidsRegelLabels = {
  tandartsPercentage: 'Tandarts',
  brilPercentage: 'Brillen en lenzen',
  hulpmiddelenPercentage: 'Hulpmiddelen',
  medicijnenPercentage: 'Medicijnen',
  psychologischeZorgPercentage: 'Psychologische zorg',
  gehoorPercentage: 'Gehoor en oren',
  huidPercentage: 'Huidzorg en acne',
  kraamzorgPercentage: 'Zwangerschap en kraamzorg',
  preventiePercentage: 'Preventie en cursussen',
  buitenlandPercentage: 'Buitenland en vaccinaties',
  dieetPercentage: 'Diëtist'
};

const getKostenDrivers = (kosten, actieveCategorieen) => {
  const actieveSet = new Set(actieveCategorieen);
  const categorieMap = {
    tandarts: 'tandarts',
    fysio: 'fysio',
    bril: 'bril',
    alternatief: 'alternatief',
    hulpmiddelen: 'hulpmiddelen',
    medicijnen: 'medicijnen',
    psychologischeZorg: 'psychologische-zorg',
    gehoor: 'gehoor',
    huid: 'huid',
    kraamzorg: 'kraamzorg',
    preventie: 'preventie',
    buitenland: 'buitenland',
    dieet: 'dieet'
  };

  const drivers = [
    { key: 'premie', value: kosten.jaarPremie },
    { key: 'eigenRisico', value: kosten.eigenRisicoGebruikt }
  ];

  Object.entries(kosten.breakdown).forEach(([key, value]) => {
    if (value <= 0) return;
    const categorieId = categorieMap[key];
    if (categorieId && !actieveSet.has(categorieId)) return;
    drivers.push({ key, value });
  });

  return drivers
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)
    .map((item) => ({
      ...item,
      label: driverLabels[item.key] || item.key
    }));
};

const getPolisRegels = (verzekering) =>
  Object.entries(beleidsRegelLabels)
    .filter(([key]) => clampPercentage(verzekering[key]) > 0)
    .map(([key, label]) => `${label}: ${clampPercentage(verzekering[key])}%`)
    .slice(0, 4);

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
  const [actieveStap, setActieveStap] = useState('zorggebruik');
  const [openPolissen, setOpenPolissen] = useState(() =>
    storedState.verzekeringen.length ? [storedState.verzekeringen[0].id] : []
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const fileInputRef = useRef(null);
  const stappenRef = useRef(null);
  const settingsRef = useRef(null);

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

  const zichtbareZorgGroepen = zorgGroepen
    .filter((groep) => actieveCategorieSet.has(groep.id))
    .map((groep) => ({
      ...groep,
      velden: groep.veldKeys
        .map((veldKey) => zichtbareZorgVelden.find((veld) => veld.key === veldKey))
        .filter(Boolean)
    }))
    .filter((groep) => groep.velden.length > 0);

  const zichtbarePolisVelden = polisVelden.filter((veld) => {
    if (veld.key === 'maandpremie') return true;

    return categorieen.some(
      (categorie) => actieveCategorieSet.has(categorie.id) && categorie.polisKeys.includes(veld.key)
    );
  });

  const zichtbarePolisGroepen = polisGroepen
    .map((groep) => ({
      ...groep,
      velden: zichtbarePolisVelden.filter((veld) => veld.group === groep.id)
    }))
    .filter((groep) => groep.velden.length > 0);

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
    setOpenPolissen([nextId]);
  };

  const verwijderVerzekering = (id) => {
    if (verzekeringen.length === 1) return;
    setVerzekeringen((current) => current.filter((verzekering) => verzekering.id !== id));
    setOpenPolissen((current) => {
      const next = current.filter((openId) => openId !== id);
      if (next.length) return next;

      const fallback = verzekeringen.find((verzekering) => verzekering.id !== id);
      return fallback ? [fallback.id] : [];
    });
  };

  const dupliceerVerzekering = (id) => {
    let nieuweId = null;

    setVerzekeringen((current) => {
      const bron = current.find((verzekering) => verzekering.id === id);
      if (!bron) return current;

      nieuweId = Math.max(0, ...current.map((verzekering) => verzekering.id)) + 1;
      const kopie = {
        ...bron,
        id: nieuweId,
        naam: `${bron.naam} kopie`
      };

      const index = current.findIndex((verzekering) => verzekering.id === id);
      const next = [...current];
      next.splice(index + 1, 0, kopie);
      return next;
    });

    if (nieuweId != null) {
      setOpenPolissen([nieuweId]);
    }
  };

  const togglePolisOpen = (id) => {
    setOpenPolissen((current) =>
      current.includes(id) ? [] : [id]
    );
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
      const nextVerzekeringen = parsed.verzekeringen.map((verzekering, index) => ({
        ...createInsurance(index + 1, `Polis ${index + 1}`),
        ...verzekering
      }));
      setVerzekeringen(nextVerzekeringen);
      setOpenPolissen(nextVerzekeringen.length ? [nextVerzekeringen[0].id] : []);
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

  const actieveStapIndex = stappen.indexOf(actieveStap);
  const vorigeStap = actieveStapIndex > 0 ? stappen[actieveStapIndex - 1] : null;
  const volgendeStap = actieveStapIndex < stappen.length - 1 ? stappen[actieveStapIndex + 1] : null;

  const scrollNaarStappen = () => {
    if (stappenRef.current) {
      stappenRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const gaNaarStap = (stap) => {
    setActieveStap(stap);
    window.requestAnimationFrame(() => {
      scrollNaarStappen();
    });
  };

  const toggleInstellingen = () => {
    setSettingsOpen((current) => {
      const next = !current;

      if (next) {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            settingsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
        });
      }

      return next;
    });
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
              onClick={toggleInstellingen}
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
        <section className="settings-panel" id="instellingen-paneel" ref={settingsRef}>
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

      <section className="workspace-tabs" aria-label="Stappen" ref={stappenRef}>
        {stappen.map((stap) => (
          <button
            key={stap}
            type="button"
            className={`workflow-card workflow-tab ${actieveStap === stap ? 'is-active' : ''}`}
            onClick={() => gaNaarStap(stap)}
          >
            <span className="section-kicker">{stapMeta[stap].stap}</span>
            <strong>{stapMeta[stap].label}</strong>
            <p>{stapMeta[stap].beschrijving}</p>
          </button>
        ))}
      </section>

      <section className="tab-shell">
        {actieveStap === 'zorggebruik' ? (
          <section className="tab-panel tab-panel-zorggebruik" id="step-zorggebruik">
            <div className="step-intro tab-intro">
              <p className="section-kicker">{stapMeta.zorggebruik.stap}</p>
              <h2>{stapMeta.zorggebruik.titel}</h2>
              <p>Vul eerst in wat je komend jaar denkt te gebruiken. De vergelijking blijft overal live doorrekenen.</p>
            </div>
            <article className="panel">
              <div className="zorggroepen-grid">
                {zichtbareZorgGroepen.map((groep) => (
                  <section
                    key={groep.id}
                    className={`zorggroep-card ${groep.velden.length > 1 ? 'zorggroep-card-paired' : ''}`}
                  >
                    <div className="zorggroep-header">
                      <h3>{groep.title}</h3>
                      <p>{groep.description}</p>
                    </div>
                    <div className={`field-grid ${groep.velden.length > 1 ? 'field-grid-paired' : ''}`}>
                      {groep.velden.map((veld) => (
                        <label key={veld.key} className="field">
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
                  </section>
                ))}
              </div>
            </article>
          </section>
        ) : null}

        {actieveStap === 'polissen' ? (
          <section className="tab-panel tab-panel-polissen" id="step-polissen">
            <div className="step-intro step-intro-with-action tab-intro">
              <div>
                <p className="section-kicker">{stapMeta.polissen.stap}</p>
                <h2>{stapMeta.polissen.titel}</h2>
                <p>
                  Voeg je huidige verzekering en alternatieven toe. Gebruik dupliceren om snel varianten te maken,
                  en vul per categorie een maximumbedrag, een percentage of allebei in.
                </p>
              </div>
              <button type="button" className="primary-button step-button" onClick={voegVerzekeringToe}>
                <Plus size={18} />
                Polis toevoegen
              </button>
            </div>
            <section className="insurance-stack">
              {verzekeringen.map((verzekering, index) => {
                const polisOpen = openPolissen.includes(verzekering.id);
                const polisRegels = getPolisRegels(verzekering);
                return (
                  <article key={verzekering.id} className="insurance-card">
                    <div className="insurance-card-top">
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
                        <div className="policy-actions">
                          <button
                            type="button"
                            className="mini-button"
                            onClick={() => dupliceerVerzekering(verzekering.id)}
                          >
                            <Copy size={16} />
                            Dupliceer
                          </button>
                          <button
                            type="button"
                            className="mini-button"
                            onClick={() => togglePolisOpen(verzekering.id)}
                          >
                            {polisOpen ? 'Inklappen' : 'Uitklappen'}
                          </button>
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
                      </div>

                      {!polisOpen ? (
                        <div className="policy-collapsed-summary">
                          <span>{formatEuro(verzekering.maandpremie)} per maand</span>
                          <span>{Math.max(0, zichtbarePolisVelden.length - 1)} vergoedingsvelden actief</span>
                          {polisRegels.length ? <span>{polisRegels.length} procentregels actief</span> : null}
                          {verzekering.notitie ? <span>Notitie toegevoegd</span> : null}
                        </div>
                      ) : null}
                    </div>

                    {polisOpen ? (
                      <div className="policy-sections">
                        {zichtbarePolisGroepen.map((groep) => (
                          <section key={groep.id} className="policy-section">
                            <div className="policy-section-header">
                              <h3>{groep.label}</h3>
                              <p>{groep.beschrijving}</p>
                            </div>
                            <div className="field-grid policy-grid">
                              {groep.velden.map((veld) => (
                                <label key={veld.key} className="field">
                                  <span>{veld.label}</span>
                                  <input
                                    type="number"
                                    min="0"
                                    max={veld.key.endsWith('Percentage') ? '100' : undefined}
                                    step={veld.kind === 'number' ? '1' : '0.01'}
                                    value={verzekering[veld.key]}
                                    onChange={(event) => updateVerzekering(verzekering.id, veld.key, event.target.value)}
                                  />
                                </label>
                              ))}
                            </div>
                          </section>
                        ))}

                        <section className="policy-section policy-note-section">
                          <div className="policy-section-header">
                            <h3>Toelichting en voorwaarden</h3>
                            <p>
                              Gebruik dit voor wachttijd, gecontracteerde zorg, speciale voorwaarden of zaken die niet
                              in de berekening passen.
                            </p>
                          </div>
                          <label className="field">
                            <span>Notitie bij deze polis</span>
                            <textarea
                              rows="3"
                              value={verzekering.notitie}
                              onChange={(event) => updateVerzekering(verzekering.id, 'notitie', event.target.value)}
                              placeholder="Bijvoorbeeld: tandarts alleen na wachttijd, alternatieve zorg alleen bij aangesloten behandelaars."
                            />
                          </label>
                        </section>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </section>
          </section>
        ) : null}

        {actieveStap === 'vergelijking' ? (
          <section className="tab-panel tab-panel-vergelijking" id="step-vergelijking">
            <div className="step-intro tab-intro">
              <p className="section-kicker">{stapMeta.vergelijking.stap}</p>
              <h2>{stapMeta.vergelijking.titel}</h2>
              <p>Hier zie je meteen welke polis het voordeligst uitpakt op basis van jouw eigen invoer.</p>
            </div>
            <div className="results-layout">
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
                {resultaten.map((resultaat, index) => {
                  const topDrivers = getKostenDrivers(resultaat.kosten, actieveCategorieen);
                  const polisRegels = getPolisRegels(resultaat.verzekering);
                  return (
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

                      {topDrivers.length ? (
                        <div className="result-highlights">
                          <span className="result-highlights-label">Belangrijkste kostenposten</span>
                          <div className="result-highlights-list">
                            {topDrivers.map((driver) => (
                              <div key={driver.key} className="highlight-pill">
                                <span>{driver.label}</span>
                                <strong>{formatEuro(driver.value)}</strong>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {polisRegels.length ? (
                        <div className="result-rules">
                          <span className="result-highlights-label">Actieve polisregels</span>
                          <div className="result-highlights-list">
                            {polisRegels.map((regel) => (
                              <div key={regel} className="highlight-pill highlight-pill-soft">
                                <strong>{regel}</strong>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

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

                      {resultaat.verzekering.notitie ? (
                        <div className="policy-note-box">
                          <span className="result-highlights-label">Opmerking bij deze polis</span>
                          <p>{resultaat.verzekering.notitie}</p>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </section>
            </div>
          </section>
        ) : null}

        <div className="tab-footer">
          {vorigeStap ? (
            <button type="button" className="secondary-button" onClick={() => gaNaarStap(vorigeStap)}>
              <ChevronLeft size={18} />
              Vorige
            </button>
          ) : (
            <span />
          )}
          {volgendeStap ? (
            <button type="button" className="primary-button" onClick={() => gaNaarStap(volgendeStap)}>
              Volgende
              <ChevronRight size={18} />
            </button>
          ) : (
            <span />
          )}
        </div>
      </section>
    </main>
  );
}
