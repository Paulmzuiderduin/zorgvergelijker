import React, { useEffect, useRef, useState } from 'react';
import {
  Calculator,
  Download,
  FileText,
  Plus,
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
  ggzVergoeding: 0,
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
    ggz: 0,
    dieet: 0,
    overigOnderEigenRisico: 0
  },
  verzekeringen: [
    createInsurance(1, 'Mijn huidige polis'),
    {
      ...createInsurance(2, 'Alternatieve polis'),
      maandpremie: 168,
      tandartsVergoeding: 250,
      fysioSessiesVergoed: 9,
      alternatiefMaxVergoeding: 200,
      alternatiefPerSessie: 40,
      brilVergoeding: 100
    }
  ]
};

const zorgVelden = [
  { key: 'tandarts', label: 'Tandartskosten per jaar', hint: 'Bijvoorbeeld controles, mondhygiënist, vullingen', step: '0.01' },
  { key: 'fysioSessies', label: 'Fysiosessies per jaar', hint: 'Aantal behandelingen', step: '1' },
  { key: 'fysioKostenPerSessie', label: 'Kosten per fysiosessie', hint: 'Gemiddelde prijs per behandeling', step: '0.01' },
  { key: 'bril', label: 'Bril of lenzen', hint: 'Jaarbedrag dat je verwacht uit te geven', step: '0.01' },
  { key: 'alternatiefSessies', label: 'Alternatieve behandelingen', hint: 'Aantal behandelingen', step: '1' },
  { key: 'alternatiefKostenPerSessie', label: 'Kosten per alternatieve behandeling', hint: 'Bijvoorbeeld acupunctuur of osteopathie', step: '0.01' },
  { key: 'ggz', label: 'GGZ of psycholoog buiten basisdekking', hint: 'Alleen meenemen als je zelf kosten verwacht', step: '0.01' },
  { key: 'dieet', label: 'Diëtist of voedingsadvies', hint: 'Jaarbedrag dat je verwacht zelf te betalen', step: '0.01' },
  { key: 'overigOnderEigenRisico', label: 'Overige zorg onder eigen risico', hint: 'Bijvoorbeeld ziekenhuis, specialist of medicijnen', step: '0.01' }
];

const polisVelden = [
  { key: 'maandpremie', label: 'Maandpremie', kind: 'currency' },
  { key: 'eigenRisico', label: 'Eigen risico', kind: 'currency' },
  { key: 'tandartsVergoeding', label: 'Tandartsvergoeding per jaar', kind: 'currency' },
  { key: 'fysioSessiesVergoed', label: 'Fysiosessies vergoed', kind: 'number' },
  { key: 'brilVergoeding', label: 'Brilvergoeding per jaar', kind: 'currency' },
  { key: 'alternatiefMaxVergoeding', label: 'Alternatief maximum per jaar', kind: 'currency' },
  { key: 'alternatiefPerSessie', label: 'Alternatief per behandeling', kind: 'currency' },
  { key: 'ggzVergoeding', label: 'GGZ-vergoeding per jaar', kind: 'currency' },
  { key: 'dieetVergoeding', label: 'Diëtistvergoeding per jaar', kind: 'currency' }
];

const toNumber = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
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
      verzekeringen: parsed.verzekeringen.map((verzekering, index) => ({
        ...createInsurance(index + 1, `Polis ${index + 1}`),
        ...verzekering
      }))
    };
  } catch (error) {
    return defaultState;
  }
};

const berekenKosten = (verzekering, zorggebruik) => {
  const jaarPremie = verzekering.maandpremie * 12;

  const tandartsEigen = Math.max(0, zorggebruik.tandarts - verzekering.tandartsVergoeding);
  const fysioTotaal = zorggebruik.fysioSessies * zorggebruik.fysioKostenPerSessie;
  const fysioVergoed = Math.min(zorggebruik.fysioSessies, verzekering.fysioSessiesVergoed) * zorggebruik.fysioKostenPerSessie;
  const fysioEigen = Math.max(0, fysioTotaal - fysioVergoed);
  const brilEigen = Math.max(0, zorggebruik.bril - verzekering.brilVergoeding);
  const alternatiefTotaal = zorggebruik.alternatiefSessies * zorggebruik.alternatiefKostenPerSessie;
  const alternatiefPerSessie = Math.min(zorggebruik.alternatiefKostenPerSessie, verzekering.alternatiefPerSessie) * zorggebruik.alternatiefSessies;
  const alternatiefVergoed = Math.min(alternatiefPerSessie, verzekering.alternatiefMaxVergoeding);
  const alternatiefEigen = Math.max(0, alternatiefTotaal - alternatiefVergoed);
  const ggzEigen = Math.max(0, zorggebruik.ggz - verzekering.ggzVergoeding);
  const dieetEigen = Math.max(0, zorggebruik.dieet - verzekering.dieetVergoeding);
  const eigenRisicoGebruikt = Math.min(zorggebruik.overigOnderEigenRisico, verzekering.eigenRisico);

  const eigenKostenAanvullend =
    tandartsEigen + fysioEigen + brilEigen + alternatiefEigen + ggzEigen + dieetEigen;
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
      ggz: ggzEigen,
      dieet: dieetEigen
    }
  };
};

const formatEuro = (value) => euro.format(value || 0);

const renderPrintHtml = ({ zorggebruik, resultaten, goedkoopste }) => {
  const items = [
    ['Tandarts', zorggebruik.tandarts],
    ['Fysiosessies', zorggebruik.fysioSessies ? `${zorggebruik.fysioSessies} x ${formatEuro(zorggebruik.fysioKostenPerSessie)}` : 0],
    ['Bril of lenzen', zorggebruik.bril],
    ['Alternatieve zorg', zorggebruik.alternatiefSessies ? `${zorggebruik.alternatiefSessies} x ${formatEuro(zorggebruik.alternatiefKostenPerSessie)}` : 0],
    ['GGZ of psycholoog', zorggebruik.ggz],
    ['Diëtist', zorggebruik.dieet],
    ['Overige zorg onder eigen risico', zorggebruik.overigOnderEigenRisico]
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
  const [verzekeringen, setVerzekeringen] = useState(storedState.verzekeringen);
  const fileInputRef = useRef(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          zorggebruik,
          verzekeringen
        })
      );
    } catch (error) {
      // Ignore storage issues and let the app keep working in memory.
    }
  }, [zorggebruik, verzekeringen]);

  const sortedResultaten = verzekeringen
    .map((verzekering) => ({
      verzekering,
      kosten: berekenKosten(verzekering, zorggebruik)
    }))
    .sort((a, b) => a.kosten.totaal - b.kosten.totaal);

  const goedkoopsteTotaal = sortedResultaten[0]?.kosten.totaal ?? 0;

  const resultaten = sortedResultaten.map((resultaat) => ({
    ...resultaat,
    verschilMetGoedkoopste: resultaat.kosten.totaal - goedkoopsteTotaal
  }));

  const goedkoopste = resultaten[0] ?? null;

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

  const exporteerJson = () => {
    const payload = {
      versie: 1,
      datum: new Date().toISOString(),
      zorggebruik,
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
        goedkoopste
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

      <section className="workflow-strip" aria-label="Stappen">
        <a href="#step-zorggebruik" className="workflow-card">
          <span className="section-kicker">Stap 1</span>
          <strong>Vul je zorggebruik in</strong>
          <p>Begin met je inschatting van tandarts, fysio, bril, GGZ en overige zorg onder eigen risico.</p>
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
            <p>Vul eerst in wat je komend jaar denkt te gebruiken. De vergelijking rechts rekent daar meteen mee mee.</p>
          </div>
          <article className="panel">
            <div className="field-grid">
              {zorgVelden.map((veld) => (
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
            {verzekeringen.map((verzekering) => (
              <article key={verzekering.id} className="insurance-card">
                <div className="insurance-header">
                  <label className="field grow">
                    <span>Naam van de polis</span>
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
                  {polisVelden.map((veld) => (
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
                    <div>Tandarts: {formatEuro(resultaat.kosten.breakdown.tandarts)}</div>
                    <div>Fysio: {formatEuro(resultaat.kosten.breakdown.fysio)}</div>
                    <div>Bril: {formatEuro(resultaat.kosten.breakdown.bril)}</div>
                    <div>Alternatief: {formatEuro(resultaat.kosten.breakdown.alternatief)}</div>
                    <div>GGZ: {formatEuro(resultaat.kosten.breakdown.ggz)}</div>
                    <div>Diëtist: {formatEuro(resultaat.kosten.breakdown.dieet)}</div>
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
