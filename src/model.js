const euro = new Intl.NumberFormat('nl-NL', {
  style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2
});

export const formatEuro = (value) => euro.format(value || 0);

const defaultChecks = {
  zorgverlener: false, toestemming: false, acceptatie: false, eigenBijdrage: false, lopendeBehandeling: false
};

export const createInsurance = (id, naam) => ({
  id, naam, maandpremie: 154, eigenRisico: 385, nietGecontracteerdeBijbetaling: 0,
  tandartsVergoeding: 0, tandartsPercentage: 0, fysioSessiesVergoed: 0,
  brilVergoeding: 0, brilPercentage: 0, alternatiefMaxVergoeding: 0, alternatiefPerSessie: 0,
  orthodontieVergoeding: 0, orthodontiePercentage: 0,
  zwangerschapVergoeding: 0, zwangerschapPercentage: 0,
  wettelijkeBijdragenVergoeding: 0, wettelijkeBijdragenPercentage: 0,
  extraVergoedingen: {}, checks: { ...defaultChecks }, notitie: ''
});

export const defaultState = {
  zorggebruik: {
    zorgOnderEigenRisico: 0, tandarts: 0, fysioSessies: 0, fysioKostenPerSessie: 39,
    bril: 0, alternatiefSessies: 0, alternatiefKostenPerSessie: 65, overigeEigenKosten: 0,
    orthodontie: 0, zwangerschap: 0, wettelijkeBijdragen: 0, extraZorgkosten: []
  },
  verzekeringen: []
};

const numberOr = (value, fallback = 0) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
};

const normalizeExtraZorgkosten = (items) => Array.isArray(items) ? items.map((item, index) => ({
  id: typeof item?.id === 'string' ? item.id : `extra-${index + 1}`,
  naam: typeof item?.naam === 'string' && item.naam.trim() ? item.naam : `Extra zorgpost ${index + 1}`,
  kosten: numberOr(item?.kosten)
})) : [];

const normalizeExtraVergoedingen = (input) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  return Object.fromEntries(Object.entries(input).map(([id, value]) => [id, {
    maximum: numberOr(value?.maximum), percentage: numberOr(value?.percentage)
  }]));
};

const normalizeInsurance = (verzekering, index) => {
  const fallback = createInsurance(index + 1, `Polis ${index + 1}`);
  if (!verzekering || typeof verzekering !== 'object') return fallback;
  return {
    ...fallback,
    ...Object.fromEntries(Object.keys(fallback)
      .filter((key) => !['checks', 'extraVergoedingen'].includes(key))
      .map((key) => {
        if (key === 'id') return [key, index + 1];
        if (key === 'naam' || key === 'notitie') return [key, typeof verzekering[key] === 'string' ? verzekering[key] : fallback[key]];
        return [key, numberOr(verzekering[key], fallback[key])];
      })),
    extraVergoedingen: normalizeExtraVergoedingen(verzekering.extraVergoedingen),
    checks: Object.fromEntries(Object.keys(defaultChecks).map((key) => [key, Boolean(verzekering.checks?.[key])]))
  };
};

export const normalizeState = (input) => {
  if (!input || typeof input !== 'object' || !Array.isArray(input.verzekeringen) || typeof input.zorggebruik !== 'object') throw new Error('Ongeldig bestandsformaat');
  const legacy = input.zorggebruik;
  return {
    zorggebruik: {
      ...defaultState.zorggebruik,
      zorgOnderEigenRisico: numberOr(legacy.zorgOnderEigenRisico ?? legacy.overigOnderEigenRisico),
      tandarts: numberOr(legacy.tandarts),
      fysioSessies: numberOr(legacy.fysioSessies),
      fysioKostenPerSessie: numberOr(legacy.fysioKostenPerSessie, defaultState.zorggebruik.fysioKostenPerSessie),
      bril: numberOr(legacy.bril),
      alternatiefSessies: numberOr(legacy.alternatiefSessies),
      alternatiefKostenPerSessie: numberOr(legacy.alternatiefKostenPerSessie, defaultState.zorggebruik.alternatiefKostenPerSessie),
      overigeEigenKosten: numberOr(legacy.overigeEigenKosten),
      orthodontie: numberOr(legacy.orthodontie),
      zwangerschap: numberOr(legacy.zwangerschap),
      wettelijkeBijdragen: numberOr(legacy.wettelijkeBijdragen),
      extraZorgkosten: normalizeExtraZorgkosten(legacy.extraZorgkosten)
    },
    verzekeringen: input.verzekeringen.map((item, index) => {
      const policy = normalizeInsurance(item, index);
      // Older files used 0% with a positive maximum to mean 100% up to the cap.
      if (numberOr(input.versie) < 4) {
        for (const category of ['tandarts', 'bril', 'orthodontie', 'zwangerschap', 'wettelijkeBijdragen']) {
          if (policy[`${category}Vergoeding`] > 0 && policy[`${category}Percentage`] === 0) policy[`${category}Percentage`] = 100;
        }
        for (const reimbursement of Object.values(policy.extraVergoedingen)) {
          if (reimbursement.maximum > 0 && reimbursement.percentage === 0) reimbursement.percentage = 100;
        }
      }
      return policy;
    })
  };
};

const clampPercentage = (value) => Math.min(100, Math.max(0, numberOr(value)));

const berekenCategorieVergoeding = (kosten, maximum, percentage) => {
  if (kosten <= 0) return 0;
  const hasMaximum = maximum > 0;
  const hasPercentage = clampPercentage(percentage) > 0;
  if (!hasPercentage) return 0;
  const opPercentage = kosten * (clampPercentage(percentage) / 100);
  return Math.min(kosten, hasMaximum ? Math.min(opPercentage, maximum) : opPercentage);
};

export const berekenKosten = (verzekering, zorggebruik) => {
  const tandarts = numberOr(zorggebruik.tandarts);
  const fysioSessies = numberOr(zorggebruik.fysioSessies);
  const fysioKostenPerSessie = numberOr(zorggebruik.fysioKostenPerSessie);
  const bril = numberOr(zorggebruik.bril);
  const alternatiefSessies = numberOr(zorggebruik.alternatiefSessies);
  const alternatiefKostenPerSessie = numberOr(zorggebruik.alternatiefKostenPerSessie);
  const orthodontie = numberOr(zorggebruik.orthodontie);
  const zwangerschap = numberOr(zorggebruik.zwangerschap);
  const wettelijkeBijdragen = numberOr(zorggebruik.wettelijkeBijdragen);
  const jaarPremie = numberOr(verzekering.maandpremie) * 12;
  const fysioTotaal = fysioSessies * fysioKostenPerSessie;
  const alternatiefTotaal = alternatiefSessies * alternatiefKostenPerSessie;
  const alternatiefVergoeding = Math.min(alternatiefTotaal, alternatiefSessies * Math.min(alternatiefKostenPerSessie, numberOr(verzekering.alternatiefPerSessie)), numberOr(verzekering.alternatiefMaxVergoeding));
  const maatwerk = (zorggebruik.extraZorgkosten || []).reduce((total, item) => {
    const vergoeding = verzekering.extraVergoedingen?.[item.id] || {};
    const kosten = numberOr(item.kosten);
    return total + Math.max(0, kosten - berekenCategorieVergoeding(kosten, vergoeding.maximum, vergoeding.percentage));
  }, 0);
  const breakdown = {
    tandarts: Math.max(0, tandarts - berekenCategorieVergoeding(tandarts, verzekering.tandartsVergoeding, verzekering.tandartsPercentage)),
    fysio: Math.max(0, fysioTotaal - Math.min(fysioSessies, numberOr(verzekering.fysioSessiesVergoed)) * fysioKostenPerSessie),
    bril: Math.max(0, bril - berekenCategorieVergoeding(bril, verzekering.brilVergoeding, verzekering.brilPercentage)),
    alternatief: Math.max(0, alternatiefTotaal - alternatiefVergoeding),
    orthodontie: Math.max(0, orthodontie - berekenCategorieVergoeding(orthodontie, verzekering.orthodontieVergoeding, verzekering.orthodontiePercentage)),
    zwangerschap: Math.max(0, zwangerschap - berekenCategorieVergoeding(zwangerschap, verzekering.zwangerschapVergoeding, verzekering.zwangerschapPercentage)),
    wettelijkeBijdragen: Math.max(0, wettelijkeBijdragen - berekenCategorieVergoeding(wettelijkeBijdragen, verzekering.wettelijkeBijdragenVergoeding, verzekering.wettelijkeBijdragenPercentage)),
    maatwerk,
    nietGecontracteerd: numberOr(verzekering.nietGecontracteerdeBijbetaling),
    overig: numberOr(zorggebruik.overigeEigenKosten)
  };
  const eigenRisicoGebruikt = Math.min(numberOr(zorggebruik.zorgOnderEigenRisico), numberOr(verzekering.eigenRisico));
  const eigenKostenAanvullend = Object.values(breakdown).reduce((total, value) => total + value, 0);
  return { totaal: jaarPremie + eigenRisicoGebruikt + eigenKostenAanvullend, jaarPremie, eigenRisicoGebruikt, eigenKostenAanvullend, breakdown };
};

const driverLabels = {
  premie: 'Jaarpremie', eigenRisico: 'Eigen risico', tandarts: 'Tandarts', fysio: 'Fysiotherapie',
  bril: 'Bril en lenzen', alternatief: 'Alternatieve zorg', orthodontie: 'Orthodontie',
  zwangerschap: 'Zwangerschap en kraamzorg', wettelijkeBijdragen: 'Wettelijke bijdragen',
  maatwerk: 'Eigen zorgposten', nietGecontracteerd: 'Niet-gecontracteerde zorg', overig: 'Overige eigen kosten'
};

export const getKostenDrivers = (kosten) => [
  { key: 'premie', value: kosten.jaarPremie },
  { key: 'eigenRisico', value: kosten.eigenRisicoGebruikt },
  ...Object.entries(kosten.breakdown).map(([key, value]) => ({ key, value }))
].filter((item) => item.value > 0).sort((a, b) => b.value - a.value).slice(0, 3).map((item) => ({ ...item, label: driverLabels[item.key] }));
