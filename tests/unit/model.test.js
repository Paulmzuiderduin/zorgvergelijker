import assert from 'node:assert/strict';
import test from 'node:test';
import { berekenKosten, createInsurance, defaultState, normalizeState, formatEuro } from '../../src/model.js';

test('starts new visitors without policies or example comparison data', () => {
  assert.equal(defaultState.verzekeringen.length, 0);
});

test('zero percent means no reimbursement, while legacy caps preserve their totals', () => {
  const insurance = { ...createInsurance(1, 'Legacy'), tandartsVergoeding: 250, extraVergoedingen: { custom: { maximum: 100, percentage: 0 } } };
  const usage = { ...defaultState.zorggebruik, tandarts: 400, extraZorgkosten: [{ id: 'custom', naam: 'Voetzorg', kosten: 200 }] };
  const old = normalizeState({ versie: 3, zorggebruik: usage, verzekeringen: [insurance] });
  assert.equal(old.verzekeringen[0].tandartsPercentage, 100);
  assert.equal(old.verzekeringen[0].extraVergoedingen.custom.percentage, 100);
  assert.equal(berekenKosten(old.verzekeringen[0], usage).breakdown.tandarts, 150);
  const current = normalizeState({ versie: 4, zorggebruik: usage, verzekeringen: [insurance] });
  assert.equal(berekenKosten(current.verzekeringen[0], usage).breakdown.tandarts, 400);
  assert.equal(berekenKosten(current.verzekeringen[0], usage).breakdown.maatwerk, 200);
  assert.equal(berekenKosten({ ...insurance, tandartsVergoeding: 0, tandartsPercentage: 75 }, usage).breakdown.tandarts, 100);
  assert.equal(formatEuro(3462.5), '€\u00a03.462,50');
});

test('caps expected deductible care at the selected deductible', () => {
  const verzekering = { ...createInsurance(1, 'Test'), maandpremie: 100, eigenRisico: 885 };
  const kosten = berekenKosten(verzekering, {
    zorgOnderEigenRisico: 1200,
    tandarts: 0,
    fysioSessies: 0,
    fysioKostenPerSessie: 40,
    bril: 0,
    alternatiefSessies: 0,
    alternatiefKostenPerSessie: 60,
    overigeEigenKosten: 0
  });

  assert.equal(kosten.jaarPremie, 1200);
  assert.equal(kosten.eigenRisicoGebruikt, 885);
  assert.equal(kosten.totaal, 2085);
});

test('calculates supplementary reimbursements and predictable personal costs', () => {
  const verzekering = {
    ...createInsurance(1, 'Test'),
    maandpremie: 150,
    tandartsVergoeding: 250,
    tandartsPercentage: 75,
    fysioSessiesVergoed: 4,
    brilVergoeding: 100,
    brilPercentage: 100,
    alternatiefMaxVergoeding: 120,
    alternatiefPerSessie: 30
  };
  const kosten = berekenKosten(verzekering, {
    zorgOnderEigenRisico: 0,
    tandarts: 400,
    fysioSessies: 6,
    fysioKostenPerSessie: 40,
    bril: 160,
    alternatiefSessies: 5,
    alternatiefKostenPerSessie: 50,
    overigeEigenKosten: 75
  });

  assert.deepEqual(kosten.breakdown, {
    tandarts: 150,
    fysio: 80,
    bril: 60,
    alternatief: 130,
    orthodontie: 0,
    zwangerschap: 0,
    wettelijkeBijdragen: 0,
    maatwerk: 0,
    nietGecontracteerd: 0,
    overig: 75
  });
  assert.equal(kosten.eigenKostenAanvullend, 495);
  assert.equal(kosten.totaal, 2295);
});

test('keeps a zero-cost scenario to premium only', () => {
  const kosten = berekenKosten({ ...createInsurance(1, 'Test'), maandpremie: 99 }, {
    zorgOnderEigenRisico: 0,
    tandarts: 0,
    fysioSessies: 0,
    fysioKostenPerSessie: 40,
    bril: 0,
    alternatiefSessies: 0,
    alternatiefKostenPerSessie: 60,
    overigeEigenKosten: 0
  });

  assert.equal(kosten.totaal, 1188);
  assert.equal(kosten.eigenKostenAanvullend, 0);
});

test('calculates special situations, custom reimbursements, and non-contracted care', () => {
  const verzekering = {
    ...createInsurance(1, 'Test'),
    maandpremie: 100,
    orthodontieVergoeding: 1000,
    orthodontiePercentage: 75,
    zwangerschapVergoeding: 200,
    zwangerschapPercentage: 100,
    wettelijkeBijdragenVergoeding: 100,
    wettelijkeBijdragenPercentage: 100,
    nietGecontracteerdeBijbetaling: 125,
    extraVergoedingen: { 'extra-1': { maximum: 150, percentage: 50 } }
  };
  const kosten = berekenKosten(verzekering, {
    ...defaultState.zorggebruik,
    orthodontie: 1600,
    zwangerschap: 250,
    wettelijkeBijdragen: 180,
    extraZorgkosten: [{ id: 'extra-1', naam: 'Podotherapie', kosten: 400 }]
  });

  assert.equal(kosten.breakdown.orthodontie, 600);
  assert.equal(kosten.breakdown.zwangerschap, 50);
  assert.equal(kosten.breakdown.wettelijkeBijdragen, 80);
  assert.equal(kosten.breakdown.maatwerk, 250);
  assert.equal(kosten.breakdown.nietGecontracteerd, 125);
  assert.equal(kosten.totaal, 2305);
});

test('migrates a version-one export to the simplified model', () => {
  const migrated = normalizeState({
    versie: 1,
    zorggebruik: {
      overigOnderEigenRisico: 420,
      tandarts: 100,
      fysioSessies: 2,
      fysioKostenPerSessie: 45,
      hulpmiddelen: 300
    },
    verzekeringen: [{ id: 42, naam: 'Oude polis', maandpremie: 135, eigenRisico: 385, hulpmiddelenVergoeding: 120 }]
  });

  assert.equal(migrated.zorggebruik.zorgOnderEigenRisico, 420);
  assert.equal(migrated.zorggebruik.overigeEigenKosten, 0);
  assert.equal(migrated.verzekeringen[0].id, 1);
  assert.equal(migrated.verzekeringen[0].naam, 'Oude polis');
  assert.equal(migrated.verzekeringen[0].maandpremie, 135);
  assert.equal(migrated.zorggebruik.orthodontie, 0);
  assert.deepEqual(migrated.zorggebruik.extraZorgkosten, []);
  assert.deepEqual(migrated.verzekeringen[0].extraVergoedingen, {});
  assert.deepEqual(migrated.verzekeringen[0].checks, { zorgverlener: false, toestemming: false, acceptatie: false, eigenBijdrage: false, lopendeBehandeling: false });
  assert.equal('hulpmiddelenVergoeding' in migrated.verzekeringen[0], false);
});
