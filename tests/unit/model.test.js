import assert from 'node:assert/strict';
import test from 'node:test';
import { berekenKosten, createInsurance, defaultState, normalizeState } from '../../src/model.js';

test('starts new visitors without policies or example comparison data', () => {
  assert.equal(defaultState.verzekeringen.length, 0);
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

  assert.deepEqual(kosten.breakdown, { tandarts: 150, fysio: 80, bril: 60, alternatief: 130, overig: 75 });
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
  assert.deepEqual(migrated.verzekeringen[0].checks, { zorgverlener: false, toestemming: false, acceptatie: false, eigenBijdrage: false, lopendeBehandeling: false });
  assert.equal('hulpmiddelenVergoeding' in migrated.verzekeringen[0], false);
});
