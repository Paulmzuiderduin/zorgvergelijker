import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2, ChevronLeft, ChevronRight, CircleHelp, Copy, Download, FileText,
  LockKeyhole, Plus, Share2, ShieldCheck, ThumbsUp, Trash2, Upload
} from 'lucide-react';
import { berekenKosten, createInsurance, defaultState, formatEuro, getKostenDrivers, normalizeState } from './model.js';
import { trackEvent } from './analytics.js';
import { getSeasonalMessage } from './season.js';

const STORAGE_KEY = 'zorgvergelijker-state-v2';
const LEGACY_STORAGE_KEY = 'zorgvergelijker-state-v1';
const stappen = ['zorggebruik', 'polissen', 'vergelijking'];

const stapMeta = {
  zorggebruik: { nummer: '1', label: 'Zorggebruik' },
  polissen: { nummer: '2', label: 'Polissen' },
  vergelijking: { nummer: '3', label: 'Resultaat' }
};

const zorgGroepen = [
  { id: 'eigen-risico', title: 'Zorg onder eigen risico', velden: [{ key: 'zorgOnderEigenRisico', label: 'Verwachte kosten', hint: 'Bijvoorbeeld ziekenhuis, specialist of medicijnen.' }] },
  { id: 'tandarts', title: 'Tandarts', velden: [{ key: 'tandarts', label: 'Kosten per jaar', hint: 'Controles, mondhygiënist en behandelingen.' }] },
  { id: 'fysio', title: 'Fysiotherapie', velden: [{ key: 'fysioSessies', label: 'Behandelingen', hint: 'Aantal per jaar', step: '1' }, { key: 'fysioKostenPerSessie', label: 'Kosten per behandeling', hint: 'Gemiddelde prijs' }] },
  { id: 'bril', title: 'Bril en lenzen', velden: [{ key: 'bril', label: 'Kosten', hint: 'Wat je komend jaar verwacht uit te geven.' }] },
  { id: 'alternatief', title: 'Alternatieve zorg', velden: [{ key: 'alternatiefSessies', label: 'Behandelingen', hint: 'Aantal per jaar', step: '1' }, { key: 'alternatiefKostenPerSessie', label: 'Kosten per behandeling', hint: 'Gemiddelde prijs' }] },
  { id: 'overig', title: 'Overige eigen kosten', velden: [{ key: 'overigeEigenKosten', label: 'Kosten zonder vergoeding', hint: 'Alleen kosten die geen polis vergoedt.' }] }
];

const specialeZorgGroepen = [
  { id: 'orthodontie', title: 'Orthodontie', key: 'orthodontie', hint: 'Verwachte kosten in het vergelijkingsjaar.' },
  { id: 'zwangerschap', title: 'Zwangerschap en kraamzorg', key: 'zwangerschap', hint: 'Bijvoorbeeld eigen bijdragen voor kraamzorg of bevalling.' },
  { id: 'wettelijke-bijdragen', title: 'Medicijnen en hulpmiddelen', key: 'wettelijkeBijdragen', hint: 'Alleen verwachte wettelijke bijdragen of niet-vergoede delen.' }
];

const polisGroepen = [
  {
    id: 'basis', label: 'Premie en basisdekking', active: () => true,
    velden: [
      { key: 'maandpremie', label: 'Totale maandpremie', hint: 'Basis plus aanvullende pakketten.', kind: 'currency' },
      { key: 'eigenRisico', label: 'Gekozen eigen risico', hint: 'Verplicht en vrijwillig samen.', kind: 'currency' },
      { key: 'nietGecontracteerdeBijbetaling', label: 'Verwachte bijbetaling niet-gecontracteerde zorg', hint: 'Alleen invullen als je een concrete bijbetaling verwacht.', kind: 'currency' }
    ]
  },
  { id: 'tandarts', label: 'Tandarts', active: (zorg) => zorg.tandarts > 0, velden: [{ key: 'tandartsVergoeding', label: 'Maximum', kind: 'currency' }, { key: 'tandartsPercentage', label: 'Percentage', kind: 'percentage' }] },
  { id: 'fysio', label: 'Fysiotherapie', active: (zorg) => zorg.fysioSessies > 0, velden: [{ key: 'fysioSessiesVergoed', label: 'Vergoede behandelingen', kind: 'number' }] },
  { id: 'bril', label: 'Bril en lenzen', active: (zorg) => zorg.bril > 0, velden: [{ key: 'brilVergoeding', label: 'Beschikbaar maximum dit jaar', kind: 'currency' }, { key: 'brilPercentage', label: 'Percentage', kind: 'percentage' }] },
  { id: 'alternatief', label: 'Alternatieve zorg', active: (zorg) => zorg.alternatiefSessies > 0, velden: [{ key: 'alternatiefMaxVergoeding', label: 'Maximum per jaar', kind: 'currency' }, { key: 'alternatiefPerSessie', label: 'Per behandeling', kind: 'currency' }] },
  { id: 'orthodontie', label: 'Orthodontie', active: (zorg) => zorg.orthodontie > 0, velden: [{ key: 'orthodontieVergoeding', label: 'Maximum', kind: 'currency' }, { key: 'orthodontiePercentage', label: 'Percentage', kind: 'percentage' }] },
  { id: 'zwangerschap', label: 'Zwangerschap en kraamzorg', active: (zorg) => zorg.zwangerschap > 0, velden: [{ key: 'zwangerschapVergoeding', label: 'Maximum', kind: 'currency' }, { key: 'zwangerschapPercentage', label: 'Percentage', kind: 'percentage' }] },
  { id: 'wettelijke-bijdragen', label: 'Medicijnen en hulpmiddelen', active: (zorg) => zorg.wettelijkeBijdragen > 0, velden: [{ key: 'wettelijkeBijdragenVergoeding', label: 'Maximum', kind: 'currency' }, { key: 'wettelijkeBijdragenPercentage', label: 'Percentage', kind: 'percentage' }] }
];

const checklist = [
  { key: 'zorgverlener', label: 'Zorgverlener gecontracteerd' },
  { key: 'toestemming', label: 'Verwijzing of toestemming geregeld' },
  { key: 'acceptatie', label: 'Acceptatie en wachttijd gecontroleerd' },
  { key: 'eigenBijdrage', label: 'Wettelijke eigen bijdrage gecontroleerd' },
  { key: 'lopendeBehandeling', label: 'Lopende behandeling gecontroleerd' }
];

const breakdownLabels = {
  tandarts: 'Tandarts', fysio: 'Fysiotherapie', bril: 'Bril en lenzen', alternatief: 'Alternatieve zorg',
  orthodontie: 'Orthodontie', zwangerschap: 'Zwangerschap en kraamzorg',
  wettelijkeBijdragen: 'Medicijnen en hulpmiddelen', maatwerk: 'Eigen zorgposten',
  nietGecontracteerd: 'Niet-gecontracteerde zorg', overig: 'Overige eigen kosten'
};

const maakVoorbeeldPolissen = () => [
  { ...createInsurance(1, 'Voorbeeld: huidige polis'), maandpremie: 154 },
  { ...createInsurance(2, 'Voorbeeld: alternatief'), maandpremie: 168, tandartsVergoeding: 250, fysioSessiesVergoed: 9, brilVergoeding: 100, alternatiefMaxVergoeding: 200, alternatiefPerSessie: 40 }
];

const aantalChecks = (verzekering) => Object.values(verzekering.checks || {}).filter(Boolean).length;
const toNumber = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};
const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);

const safeLoadState = () => {
  if (typeof window === 'undefined') return defaultState;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY) || window.localStorage.getItem(LEGACY_STORAGE_KEY);
    return raw ? normalizeState(JSON.parse(raw)) : defaultState;
  } catch {
    return defaultState;
  }
};

const renderPrintHtml = ({ zorggebruik, resultaten, goedkoopste }) => {
  const items = [
    ['Zorg onder eigen risico', zorggebruik.zorgOnderEigenRisico],
    ['Tandarts', zorggebruik.tandarts],
    ['Fysiotherapie', zorggebruik.fysioSessies ? `${zorggebruik.fysioSessies} × ${formatEuro(zorggebruik.fysioKostenPerSessie)}` : 0],
    ['Bril en lenzen', zorggebruik.bril],
    ['Alternatieve zorg', zorggebruik.alternatiefSessies ? `${zorggebruik.alternatiefSessies} × ${formatEuro(zorggebruik.alternatiefKostenPerSessie)}` : 0],
    ['Orthodontie', zorggebruik.orthodontie],
    ['Zwangerschap en kraamzorg', zorggebruik.zwangerschap],
    ['Medicijnen en hulpmiddelen', zorggebruik.wettelijkeBijdragen],
    ...zorggebruik.extraZorgkosten.map((item) => [item.naam, item.kosten]),
    ['Overige eigen kosten', zorggebruik.overigeEigenKosten]
  ].filter(([, value]) => value !== 0).map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${typeof value === 'number' ? formatEuro(value) : escapeHtml(value)}</strong></div>`).join('');
  const rows = resultaten.map(({ verzekering, kosten }, index) => `<section class="plan ${goedkoopste?.verzekering.id === verzekering.id ? 'best' : ''}"><header><div><small>${index === 0 ? 'Laagste jaarlast' : `Optie ${index + 1}`}</small><h2>${escapeHtml(verzekering.naam)}</h2></div><strong>${formatEuro(kosten.totaal)}</strong></header><div class="grid"><div><span>Premie</span><b>${formatEuro(kosten.jaarPremie)}</b></div><div><span>Eigen risico</span><b>${formatEuro(kosten.eigenRisicoGebruikt)}</b></div><div><span>Overige eigen kosten</span><b>${formatEuro(kosten.eigenKostenAanvullend)}</b></div></div></section>`).join('');
  return `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>Zorgvergelijker</title><style>body{font-family:Arial,sans-serif;margin:0;padding:36px;color:#1d2b26}h1,h2{margin:0}.intro{padding-bottom:20px;border-bottom:2px solid #315c4d}.usage{display:grid;grid-template-columns:repeat(2,1fr);gap:0;margin:24px 0;border:1px solid #cbd5d1}.usage div,.grid div{padding:12px;border-right:1px solid #cbd5d1;border-bottom:1px solid #cbd5d1}.usage span,.grid span{display:block;color:#63736c;font-size:12px;margin-bottom:5px}.plan{padding:20px;margin-bottom:14px;border:1px solid #cbd5d1}.plan.best{border-left:5px solid #315c4d}.plan header{display:flex;justify-content:space-between;gap:20px}.plan header>strong{font-size:28px;color:#315c4d}.plan small{text-transform:uppercase;letter-spacing:.08em}.grid{display:grid;grid-template-columns:repeat(3,1fr);margin-top:16px;border:1px solid #cbd5d1}.notice{padding:14px;background:#eef4ef;border-left:4px solid #315c4d;line-height:1.5}@media print{body{padding:16px}}</style></head><body><div class="intro"><h1>Zorgvergelijker</h1><p>Verwachte jaarlasten op basis van eigen invoer.</p></div><p class="notice"><strong>Let op:</strong> controleer contracten, voorwaarden, acceptatie en wachttijden altijd bij de verzekeraar.</p><div class="usage">${items || '<div><span>Geen zorgkosten ingevuld</span><strong>€ 0</strong></div>'}</div>${rows}</body></html>`;
};

function SeasonalNotice() {
  const message = getSeasonalMessage();
  return <aside className="seasonal-notice" aria-label="Informatie over het overstapseizoen">
    <span className="section-kicker">{message.eyebrow}</span>
    <strong>{message.title}</strong>
    <a href={message.action === 'Zo werkt het' ? '/zo-werkt-het.html#overstappen' : '#workflow'}>{message.action}<ChevronRight size={15} /></a>
  </aside>;
}

function NumberField({ label, value, onChange, hint, step = '0.01' }) {
  return <label className="field"><span>{label}</span><input type="number" min="0" step={step} value={value} onChange={onChange} />{hint ? <small>{hint}</small> : null}</label>;
}

export default function CalculatorPage() {
  const [storedState] = useState(safeLoadState);
  const [zorggebruik, setZorggebruik] = useState(storedState.zorggebruik);
  const [verzekeringen, setVerzekeringen] = useState(storedState.verzekeringen);
  const [actieveStap, setActieveStap] = useState('zorggebruik');
  const [openPolissen, setOpenPolissen] = useState(() => [storedState.verzekeringen[0]?.id].filter(Boolean));
  const [shareStatus, setShareStatus] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState('');
  const fileInputRef = useRef(null);
  const stappenRef = useRef(null);
  const comparisonCompletedRef = useRef(false);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ versie: 3, zorggebruik, verzekeringen }));
  }, [zorggebruik, verzekeringen]);

  useEffect(() => {
    if (actieveStap !== 'vergelijking' || verzekeringen.length < 2 || comparisonCompletedRef.current) return;
    comparisonCompletedRef.current = true;
    trackEvent('comparison_completed', { policy_count: verzekeringen.length });
  }, [actieveStap, verzekeringen.length]);

  const resultaten = verzekeringen.map((verzekering) => ({ verzekering, kosten: berekenKosten(verzekering, zorggebruik) })).sort((a, b) => a.kosten.totaal - b.kosten.totaal);
  const goedkoopste = resultaten[0] ?? null;
  const actievePolisGroepen = polisGroepen.filter((groep) => groep.active(zorggebruik));
  const heeftSpecialeKosten = zorggebruik.orthodontie > 0 || zorggebruik.zwangerschap > 0 || zorggebruik.wettelijkeBijdragen > 0 || zorggebruik.extraZorgkosten.length > 0;
  const actieveStapIndex = stappen.indexOf(actieveStap);

  const updateZorggebruik = (key, value) => setZorggebruik((current) => ({ ...current, [key]: toNumber(value) }));
  const updateVerzekering = (id, key, value) => setVerzekeringen((current) => current.map((verzekering) => verzekering.id === id ? { ...verzekering, [key]: key === 'naam' || key === 'notitie' ? value : toNumber(value) } : verzekering));
  const updateCheck = (id, key, checked) => setVerzekeringen((current) => current.map((verzekering) => verzekering.id === id ? { ...verzekering, checks: { ...verzekering.checks, [key]: checked } } : verzekering));
  const updateExtraVergoeding = (verzekeringId, itemId, key, value) => setVerzekeringen((current) => current.map((verzekering) => verzekering.id === verzekeringId ? {
    ...verzekering,
    extraVergoedingen: {
      ...verzekering.extraVergoedingen,
      [itemId]: { maximum: 0, percentage: 0, ...verzekering.extraVergoedingen?.[itemId], [key]: toNumber(value) }
    }
  } : verzekering));
  const voegExtraZorgpostToe = () => {
    const nextNumber = Math.max(0, ...zorggebruik.extraZorgkosten.map((item) => Number.parseInt(item.id.replace('extra-', ''), 10) || 0)) + 1;
    setZorggebruik((current) => ({ ...current, extraZorgkosten: [...current.extraZorgkosten, { id: `extra-${nextNumber}`, naam: 'Eigen zorgpost', kosten: 0 }] }));
  };
  const updateExtraZorgpost = (id, key, value) => setZorggebruik((current) => ({
    ...current,
    extraZorgkosten: current.extraZorgkosten.map((item) => item.id === id ? { ...item, [key]: key === 'naam' ? value : toNumber(value) } : item)
  }));
  const verwijderExtraZorgpost = (id) => {
    setZorggebruik((current) => ({ ...current, extraZorgkosten: current.extraZorgkosten.filter((item) => item.id !== id) }));
    setVerzekeringen((current) => current.map((verzekering) => {
      const extraVergoedingen = { ...verzekering.extraVergoedingen };
      delete extraVergoedingen[id];
      return { ...verzekering, extraVergoedingen };
    }));
  };
  const voegVerzekeringToe = () => {
    const nextId = Math.max(0, ...verzekeringen.map((verzekering) => verzekering.id)) + 1;
    trackEvent('policy_added', { policy_count: verzekeringen.length + 1 });
    setVerzekeringen((current) => [...current, createInsurance(nextId, `Nieuwe polis ${nextId}`)]);
    setOpenPolissen([nextId]);
  };
  const startMetHuidigePolis = () => {
    const polis = createInsurance(1, 'Mijn huidige polis');
    trackEvent('comparison_started', { method: 'current_policy' });
    setVerzekeringen([polis]);
    setOpenPolissen([polis.id]);
    gaNaarStap('polissen');
  };
  const laadVoorbeeld = () => {
    const polissen = maakVoorbeeldPolissen();
    trackEvent('comparison_started', { method: 'example_data' });
    setVerzekeringen(polissen);
    setOpenPolissen([polissen[0].id]);
    gaNaarStap('polissen');
  };
  const verwijderVerzekering = (id) => {
    if (verzekeringen.length === 1) return;
    const next = verzekeringen.filter((verzekering) => verzekering.id !== id);
    trackEvent('policy_deleted', { policy_count: next.length });
    setVerzekeringen(next);
    setOpenPolissen([next[0]?.id].filter(Boolean));
  };
  const dupliceerVerzekering = (id) => {
    const bron = verzekeringen.find((verzekering) => verzekering.id === id);
    if (!bron) return;
    const nextId = Math.max(0, ...verzekeringen.map((verzekering) => verzekering.id)) + 1;
    const kopie = { ...bron, id: nextId, naam: `${bron.naam} kopie`, checks: { ...bron.checks }, extraVergoedingen: structuredClone(bron.extraVergoedingen) };
    trackEvent('policy_duplicated', { policy_count: verzekeringen.length + 1 });
    setVerzekeringen((current) => {
      const index = current.findIndex((verzekering) => verzekering.id === id);
      return [...current.slice(0, index + 1), kopie, ...current.slice(index + 1)];
    });
    setOpenPolissen([nextId]);
  };
  const exporteerJson = () => {
    const blob = new Blob([JSON.stringify({ versie: 3, datum: new Date().toISOString(), zorggebruik, verzekeringen }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `zorgvergelijker-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    trackEvent('comparison_exported', { format: 'json', policy_count: verzekeringen.length });
  };
  const importeerJson = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const next = normalizeState(JSON.parse(await file.text()));
      setZorggebruik(next.zorggebruik);
      setVerzekeringen(next.verzekeringen);
      setOpenPolissen([next.verzekeringen[0]?.id].filter(Boolean));
      trackEvent('comparison_imported', { policy_count: next.verzekeringen.length });
      window.alert('Bestand geïmporteerd.');
    } catch {
      window.alert('Dit bestand kon niet worden geïmporteerd.');
    } finally {
      event.target.value = '';
    }
  };
  const exporteerPrint = () => {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(frame);
    const printWindow = frame.contentWindow;
    if (!printWindow) { frame.remove(); return; }
    frame.addEventListener('load', () => { printWindow.focus(); printWindow.print(); window.setTimeout(() => frame.remove(), 1200); }, { once: true });
    printWindow.document.open();
    printWindow.document.write(renderPrintHtml({ zorggebruik, resultaten, goedkoopste }));
    printWindow.document.close();
    trackEvent('comparison_exported', { format: 'print_or_pdf', policy_count: verzekeringen.length });
  };
  const deelRekenhulp = async () => {
    const url = new URL('/vergelijker.html', window.location.origin);
    url.search = new URLSearchParams({ utm_source: 'zorgvergelijker', utm_medium: 'referral', utm_campaign: 'overstapseizoen-2027', utm_content: 'resultaat-delen' });
    const shareData = { title: 'Zorgvergelijker', text: 'Bereken zelf de verwachte jaarlasten van zorgpolissen.', url: url.toString() };
    const method = typeof navigator.share === 'function' ? 'native' : 'clipboard';
    trackEvent('share_clicked', { location: 'comparison_results', method });
    setShareStatus('');
    try {
      if (method === 'native') {
        await navigator.share(shareData);
        setShareStatus('Deelvenster geopend.');
      } else {
        await navigator.clipboard.writeText(shareData.url);
        setShareStatus('Link gekopieerd.');
      }
    } catch (error) {
      if (error?.name !== 'AbortError') {
        setShareStatus('Delen lukte niet.');
        trackEvent('share_failed', { location: 'comparison_results', method });
      }
    }
  };
  const geefFeedback = (answer) => {
    if (feedbackStatus) return;
    setFeedbackStatus(answer);
    trackEvent('comparison_feedback', { answer, policy_count: verzekeringen.length });
  };
  const gaNaarStap = (stap) => {
    trackEvent('step_opened', { step: stap });
    setActieveStap(stap);
    window.requestAnimationFrame(() => stappenRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  return <main className="page-shell">
    <SeasonalNotice />
    <header className="app-header">
      <div className="app-heading">
        <a className="brand-link" href="/">Zorgvergelijker</a>
        <p className="eyebrow"><ShieldCheck size={15} />Persoonlijke rekenhulp</p>
        <h1>Vergelijk je verwachte jaarlasten</h1>
        <p>Premie, eigen risico en zorgkosten in één berekening.</p>
      </div>
      <div className="app-summary">
        <span>{goedkoopste ? 'Laagste berekening' : 'Begin bij stap 1'}</span>
        <strong>{goedkoopste ? formatEuro(goedkoopste.kosten.totaal) : '3 stappen'}</strong>
        <small>{goedkoopste ? goedkoopste.verzekering.naam : 'Je invoer blijft in deze browser.'}</small>
      </div>
      <div className="app-toolbar">
        {verzekeringen.length > 0 ? <><button type="button" className="secondary-button" onClick={exporteerJson}><Download size={17} />JSON</button><button type="button" className="secondary-button" onClick={exporteerPrint}><FileText size={17} />Print/PDF</button></> : null}
        <button type="button" className="secondary-button" onClick={() => fileInputRef.current?.click()}><Upload size={17} />Importeer</button>
        <input ref={fileInputRef} type="file" accept=".json,application/json" hidden onChange={importeerJson} />
      </div>
    </header>
    <div className="privacy-line"><LockKeyhole size={16} /><span>Polisnamen en bedragen blijven op je apparaat.</span><a href="/zo-werkt-het.html#privacy">Privacy</a></div>

    <nav className="workspace-tabs" id="workflow" aria-label="Stappen" ref={stappenRef}>
      {stappen.map((stap) => <button key={stap} type="button" className={`workflow-tab ${actieveStap === stap ? 'is-active' : ''}`} onClick={() => gaNaarStap(stap)}><span>{stapMeta[stap].nummer}</span><strong>{stapMeta[stap].label}</strong></button>)}
    </nav>

    <section className="tab-shell">
      {actieveStap === 'zorggebruik' ? <section className="tab-panel" id="step-zorggebruik">
        <div className="step-intro"><span className="section-kicker">Stap 1</span><h2>Wat verwacht je te gebruiken?</h2></div>
        <div className="care-grid">{zorgGroepen.map((groep) => <section key={groep.id} className="care-card"><h3>{groep.title}</h3><div className={`field-grid ${groep.velden.length > 1 ? 'field-grid-paired' : ''}`}>{groep.velden.map((veld) => <NumberField key={veld.key} label={veld.label} value={zorggebruik[veld.key]} step={veld.step} hint={veld.hint} onChange={(event) => updateZorggebruik(veld.key, event.target.value)} />)}</div></section>)}</div>
        <details className="special-costs" open={heeftSpecialeKosten || undefined}>
          <summary><span>Speciale situaties</span><small>Orthodontie, zwangerschap, eigen bijdragen of een eigen zorgpost</small></summary>
          <div className="special-costs-content">
            <div className="care-grid special-grid">{specialeZorgGroepen.map((groep) => <section key={groep.id} className="care-card"><h3>{groep.title}</h3><NumberField label="Verwachte kosten" value={zorggebruik[groep.key]} hint={groep.hint} onChange={(event) => updateZorggebruik(groep.key, event.target.value)} /></section>)}</div>
            <div className="custom-costs">
              {zorggebruik.extraZorgkosten.map((item) => <div key={item.id} className="custom-cost-row"><label className="field"><span>Naam zorgpost</span><input type="text" value={item.naam} onChange={(event) => updateExtraZorgpost(item.id, 'naam', event.target.value)} /></label><NumberField label="Verwachte kosten" value={item.kosten} onChange={(event) => updateExtraZorgpost(item.id, 'kosten', event.target.value)} /><button type="button" className="icon-button" onClick={() => verwijderExtraZorgpost(item.id)} aria-label={`Verwijder ${item.naam}`}><Trash2 size={17} /></button></div>)}
              <button type="button" className="secondary-button compact-button" onClick={voegExtraZorgpostToe}><Plus size={16} />Eigen zorgpost toevoegen</button>
            </div>
          </div>
        </details>
      </section> : null}

      {actieveStap === 'polissen' ? <section className="tab-panel" id="step-polissen">
        <div className="step-intro step-intro-with-action"><div><span className="section-kicker">Stap 2</span><h2>Welke polissen vergelijk je?</h2></div>{verzekeringen.length > 0 ? <button type="button" className="primary-button" onClick={voegVerzekeringToe}><Plus size={17} />Polis toevoegen</button> : null}</div>
        {verzekeringen.length === 0 ? <div className="empty-policy-state"><h3>Begin met je huidige polis</h3><p>Daarna voeg je één of meer alternatieven toe.</p><div><button type="button" className="primary-button" onClick={startMetHuidigePolis}><Plus size={17} />Huidige polis toevoegen</button><button type="button" className="secondary-button" onClick={laadVoorbeeld}><Copy size={17} />Voorbeeld gebruiken</button></div></div> : null}
        <div className="insurance-stack">{verzekeringen.map((verzekering, index) => {
          const polisOpen = openPolissen.includes(verzekering.id);
          return <article key={verzekering.id} className="insurance-card">
            <header className="insurance-header"><div><span className="policy-number">Polis {index + 1}</span><input className="policy-name" aria-label="Naam van de polis" type="text" value={verzekering.naam} onChange={(event) => updateVerzekering(verzekering.id, 'naam', event.target.value)} /></div><div className="policy-actions"><button type="button" className="mini-button" onClick={() => dupliceerVerzekering(verzekering.id)}><Copy size={15} />Dupliceer</button><button type="button" className="mini-button" onClick={() => setOpenPolissen(polisOpen ? [] : [verzekering.id])}>{polisOpen ? 'Sluit' : 'Open'}</button><button type="button" className="icon-button" onClick={() => verwijderVerzekering(verzekering.id)} disabled={verzekeringen.length === 1} aria-label={`Verwijder ${verzekering.naam}`}><Trash2 size={17} /></button></div></header>
            {!polisOpen ? <div className="policy-collapsed-summary"><span>{formatEuro(verzekering.maandpremie)} / maand</span><span>Eigen risico {formatEuro(verzekering.eigenRisico)}</span><span>{aantalChecks(verzekering)}/5 checks</span></div> : <div className="policy-sections">
              {actievePolisGroepen.map((groep) => <section key={groep.id} className="policy-section"><h3>{groep.label}</h3><div className="field-grid policy-grid">{groep.velden.map((veld) => <NumberField key={veld.key} label={veld.label} value={verzekering[veld.key]} hint={veld.hint} step={veld.kind === 'number' || veld.kind === 'percentage' ? '1' : '0.01'} onChange={(event) => updateVerzekering(verzekering.id, veld.key, event.target.value)} />)}</div></section>)}
              {zorggebruik.extraZorgkosten.length > 0 ? <section className="policy-section"><h3>Eigen zorgposten</h3><div className="custom-reimbursements">{zorggebruik.extraZorgkosten.map((item) => { const vergoeding = verzekering.extraVergoedingen?.[item.id] || {}; return <div key={item.id} className="custom-reimbursement-row"><strong>{item.naam}</strong><NumberField label="Maximum" value={vergoeding.maximum || 0} onChange={(event) => updateExtraVergoeding(verzekering.id, item.id, 'maximum', event.target.value)} /><NumberField label="Percentage" step="1" value={vergoeding.percentage || 0} onChange={(event) => updateExtraVergoeding(verzekering.id, item.id, 'percentage', event.target.value)} /></div>; })}</div></section> : null}
              <details className="policy-disclosure"><summary>Controlepunten <span>{aantalChecks(verzekering)}/5</span></summary><div className="policy-checks">{checklist.map((item) => <label key={item.key} className="policy-check"><input type="checkbox" checked={Boolean(verzekering.checks?.[item.key])} onChange={(event) => updateCheck(verzekering.id, item.key, event.target.checked)} /><span>{item.label}</span></label>)}</div></details>
              <details className="policy-disclosure"><summary>Notitie</summary><label className="field disclosure-field"><textarea rows="3" value={verzekering.notitie} onChange={(event) => updateVerzekering(verzekering.id, 'notitie', event.target.value)} placeholder="Voorwaarde of aandachtspunt bij deze polis" /></label></details>
            </div>}
          </article>;
        })}</div>
        {verzekeringen.length > 0 ? <div className="policy-add-footer"><button type="button" className="secondary-button" onClick={voegVerzekeringToe}><Plus size={17} />Polis toevoegen</button></div> : null}
      </section> : null}

      {actieveStap === 'vergelijking' ? <section className="tab-panel" id="step-vergelijking">
        <div className="step-intro"><span className="section-kicker">Stap 3</span><h2>Verwachte jaarlasten</h2></div>
        {resultaten.length === 0 ? <div className="empty-policy-state"><h3>Nog geen resultaat</h3><p>Voeg eerst een polis toe.</p><button type="button" className="primary-button" onClick={startMetHuidigePolis}><Plus size={17} />Huidige polis toevoegen</button></div> : <div className="results-layout"><aside className="result-summary"><span>Laagste berekening</span><strong>{goedkoopste?.verzekering.naam}</strong><b>{formatEuro(goedkoopste?.kosten.totaal)}</b><small>Controleer voorwaarden altijd bij de verzekeraar.</small></aside><div className="results-grid">{resultaten.map((resultaat, index) => <article key={resultaat.verzekering.id} className={`result-card ${index === 0 ? 'is-best' : ''}`} data-testid="result-card"><header><div><span>{index === 0 ? 'Laagste jaarlast' : `Plaats ${index + 1}`}</span><h3>{resultaat.verzekering.naam}</h3></div><strong>{formatEuro(resultaat.kosten.totaal)}</strong></header><div className="metric-row"><div><span>Jaarpremie</span><strong>{formatEuro(resultaat.kosten.jaarPremie)}</strong></div><div><span>Eigen risico</span><strong>{formatEuro(resultaat.kosten.eigenRisicoGebruikt)}</strong></div><div><span>Overige eigen kosten</span><strong>{formatEuro(resultaat.kosten.eigenKostenAanvullend)}</strong></div></div><div className="result-drivers">{getKostenDrivers(resultaat.kosten).map((driver) => <span key={driver.key}>{driver.label} <strong>{formatEuro(driver.value)}</strong></span>)}</div><div className="result-meta"><span>{aantalChecks(resultaat.verzekering)}/5 checks</span><span>{index === 0 ? 'Referentie' : `${formatEuro(resultaat.kosten.totaal - goedkoopste.kosten.totaal)} hoger`}</span></div><details className="breakdown"><summary>Specificatie eigen kosten</summary><div>{Object.entries(resultaat.kosten.breakdown).filter(([, value]) => value > 0).map(([key, value]) => <p key={key}><span>{breakdownLabels[key]}</span><strong>{formatEuro(value)}</strong></p>)}</div></details></article>)}</div></div>}
      </section> : null}

      {actieveStap === 'vergelijking' && resultaten.length > 1 ? <section className="result-followup" aria-label="Delen en feedback"><div><span className="section-kicker">Delen</span><h3>Stuur de lege rekenhulp door</h3><button type="button" className="primary-button" onClick={deelRekenhulp}><Share2 size={17} />Deel link</button>{shareStatus ? <p role="status">{shareStatus}</p> : null}</div><div><span className="section-kicker">Feedback</span><h3>Was het duidelijk?</h3>{feedbackStatus ? <p className="feedback-thanks" role="status"><CheckCircle2 size={18} />Bedankt.</p> : <div className="feedback-actions"><button type="button" className="mini-button" onClick={() => geefFeedback('clear')}><ThumbsUp size={16} />Ja</button><button type="button" className="mini-button" onClick={() => geefFeedback('unclear')}><CircleHelp size={16} />Nog niet</button></div>}</div></section> : null}

      <footer className="tab-footer">{actieveStapIndex > 0 ? <button type="button" className="secondary-button" onClick={() => gaNaarStap(stappen[actieveStapIndex - 1])}><ChevronLeft size={17} />Vorige</button> : <span />}{actieveStapIndex < stappen.length - 1 ? <button type="button" className="primary-button" onClick={() => gaNaarStap(stappen[actieveStapIndex + 1])}>Volgende<ChevronRight size={17} /></button> : <span />}</footer>
    </section>
  </main>;
}
