import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, BellRing, Calculator, Check, CheckCircle2, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { trackEvent } from './analytics.js';
import { submitWaitlistAction } from './waitlist.js';

const stappen = [
  ['01', 'Schat je zorggebruik', 'Vul alleen zorgkosten in die je voor komend jaar redelijk kunt voorspellen.'],
  ['02', 'Neem polissen over', 'Voeg premie, eigen risico en een beperkt aantal aanvullende vergoedingen toe.'],
  ['03', 'Vergelijk jaarlasten', 'Bekijk premie, gebruikt eigen risico en resterende eigen kosten in één overzicht.']
];

export default function LandingPage() {
  const turnstileContainerRef = useRef(null);
  const turnstileWidgetIdRef = useRef(null);
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileStatus, setTurnstileStatus] = useState('loading');

  useEffect(() => {
    let cancelled = false;
    let retryTimer;
    const deadline = Date.now() + 12_000;

    const renderTurnstile = () => {
      if (cancelled) return;
      if (!window.turnstile || !turnstileContainerRef.current) {
        if (Date.now() < deadline) {
          retryTimer = window.setTimeout(renderTurnstile, 100);
        } else {
          setTurnstileStatus('error');
        }
        return;
      }

      try {
        turnstileWidgetIdRef.current = window.turnstile.render(turnstileContainerRef.current, {
          sitekey: '0x4AAAAAAExodXdqjXBXy7JA',
          action: 'waitlist_signup',
          theme: 'light',
          size: 'flexible',
          language: 'nl',
          callback: (token) => {
            setTurnstileToken(token);
            setTurnstileStatus('ready');
          },
          'expired-callback': () => {
            setTurnstileToken('');
            setTurnstileStatus('checking');
          },
          'timeout-callback': () => {
            setTurnstileToken('');
            setTurnstileStatus('checking');
          },
          'error-callback': () => {
            setTurnstileToken('');
            setTurnstileStatus('error');
          }
        });
        setTurnstileStatus('checking');
      } catch {
        setTurnstileStatus('error');
      }
    };

    renderTurnstile();
    return () => {
      cancelled = true;
      window.clearTimeout(retryTimer);
      if (turnstileWidgetIdRef.current !== null) {
        window.turnstile?.remove(turnstileWidgetIdRef.current);
      }
    };
  }, []);

  const resetTurnstile = () => {
    setTurnstileToken('');
    setTurnstileStatus('checking');
    if (turnstileWidgetIdRef.current !== null) {
      window.turnstile?.reset(turnstileWidgetIdRef.current);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!turnstileToken) {
      setStatus('error');
      setMessage('De beveiligingscontrole is nog niet gereed. Probeer het opnieuw.');
      return;
    }
    setStatus('loading');
    setMessage('');
    trackEvent('waitlist_signup_started');

    try {
      const result = await submitWaitlistAction({ action: 'signup', email, consent, website, turnstileToken });
      setSubmittedEmail(email);
      setStatus('success');
      setMessage(result.message);
      setEmail('');
      setConsent(false);
      resetTurnstile();
      trackEvent('waitlist_signup_submitted');
    } catch (error) {
      setStatus('error');
      setMessage(error.message);
      resetTurnstile();
      trackEvent('waitlist_signup_failed');
    }
  };

  const trackCalculatorOpen = (location) => trackEvent('calculator_opened', { location });

  return <main className="landing-shell">
    <nav className="landing-nav" aria-label="Hoofdnavigatie">
      <a className="brand-link" href="/">Zorgvergelijker</a>
      <div>
        <a href="/zo-werkt-het.html">Zo werkt het</a>
        <a className="secondary-button" href="/vergelijker.html" onClick={() => trackCalculatorOpen('navigation')}>Open de rekenhulp</a>
      </div>
    </nav>

    <section className="landing-hero">
      <div className="landing-hero-copy">
        <p className="eyebrow"><ShieldCheck size={16} />Persoonlijke rekenhulp voor Nederlandse zorgpolissen</p>
        <h1>Weet wat een zorgpolis je echt per jaar kost.</h1>
        <p className="landing-lead">Geen ranglijst van verzekeraars, maar een helder kostenplaatje voor jouw verwachte zorggebruik. Handmatig, onafhankelijk en zonder dat je zorggegevens naar een server gaan.</p>
        <div className="landing-actions">
          <a className="primary-button" href="/vergelijker.html" onClick={() => trackCalculatorOpen('hero')}><Calculator size={18} />Start de vergelijking</a>
          <a className="text-link" href="#herinnering">Of ontvang eerst een herinnering <ArrowRight size={16} /></a>
        </div>
      </div>

      <aside className="signup-card" id="herinnering">
        <p className="section-kicker"><BellRing size={15} />Eenmalige herinnering</p>
        <h2>Begin wanneer de nieuwe polissen bekend zijn.</h2>
        <p>Laat je e-mailadres achter. Je krijgt één bericht zodra vergelijken voor het nieuwe jaar zinvol is. Geen nieuwsbrief.</p>
        {status === 'success' ? <div className="signup-success" role="status" aria-live="polite">
          <CheckCircle2 size={34} />
          <div>
            <p className="section-kicker">Aanmelding ontvangen</p>
            <h3>Controleer nu je inbox.</h3>
            <p>We hebben een bevestigingsmail gestuurd naar <strong>{submittedEmail}</strong>. Klik op de knop in die e-mail om je herinnering definitief te activeren.</p>
            <p className="signup-success-note">Geen e-mail gezien? Controleer ook je spamfolder. De afzender is zorgvergelijker@paulzuiderduin.com.</p>
          </div>
        </div> : <form onSubmit={submit} className="signup-form">
          <label className="field">
            <span>E-mailadres</span>
            <div className="email-input"><Mail size={18} /><input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="jij@voorbeeld.nl" /></div>
          </label>
          <label className="honeypot" aria-hidden="true">Website<input type="text" tabIndex="-1" autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} /></label>
          <label className="consent-row"><input type="checkbox" required checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>Ik geef toestemming om mij één herinnering over het overstapseizoen te sturen. Ik kan mij altijd uitschrijven.</span></label>
          <div className="turnstile-container" ref={turnstileContainerRef}></div>
          {turnstileStatus === 'error' ? <p className="turnstile-error" role="status">De beveiligingscontrole kon niet laden. Herlaad de pagina of schakel een inhoudsblokker tijdelijk uit.</p> : null}
          <button className="signup-button" type="submit" disabled={status === 'loading' || turnstileStatus !== 'ready'}>{status === 'loading' ? 'Bezig met inschrijven…' : turnstileStatus === 'ready' ? 'Stuur mij een seintje' : 'Beveiliging controleren…'}<ArrowRight size={18} /></button>
        </form>}
        {message && status === 'error' ? <p className="form-message is-error" role="status" aria-live="polite">{message}</p> : null}
        <p className="signup-fineprint"><LockKeyhole size={14} />We bewaren alleen je e-mailadres en toestemming. Je inschrijving is pas actief na bevestiging per e-mail.</p>
      </aside>
    </section>

    <section className="origin-strip">
      <p className="section-kicker">Waarom dit bestaat</p>
      <blockquote>“Mijn vriendin wilde misschien overstappen, maar nergens werd duidelijk wat een polis voor haar situatie over een heel jaar zou kosten.”</blockquote>
      <p>Zorgvergelijker begon als een eenvoudige oplossing voor precies dat probleem. Geen compleet verzekeringsadvies, wel één berekening die premie en verwachte eigen kosten samenbrengt.</p>
    </section>

    <section className="landing-section" aria-labelledby="werking-heading">
      <div className="landing-section-heading"><p className="section-kicker">In drie stappen</p><h2 id="werking-heading">Van polisblad naar jaarbedrag</h2><p>Je houdt zelf controle over de invoer. De rekenhulp doet alleen de optelsom.</p></div>
      <div className="landing-steps">{stappen.map(([nummer, titel, tekst]) => <article key={nummer}><span>{nummer}</span><h3>{titel}</h3><p>{tekst}</p></article>)}</div>
    </section>

    <section className="landing-section landing-proof" aria-labelledby="duidelijk-heading">
      <div><p className="section-kicker">Bewust eenvoudig</p><h2 id="duidelijk-heading">Wel rekenen. Niet doen alsof alles vergelijkbaar is.</h2></div>
      <div className="proof-list">
        <div><Check size={20} /><span>Premie en gekozen eigen risico</span></div>
        <div><Check size={20} /><span>Tandarts, fysiotherapie, brillen en alternatieve zorg</span></div>
        <div><Check size={20} /><span>Checklist voor contracten, toestemming en wachttijden</span></div>
        <div><Check size={20} /><span>Geen account en geen koppeling met verzekeraars</span></div>
      </div>
    </section>

    <section className="landing-section privacy-section" id="privacy" aria-labelledby="privacy-heading">
      <div><p className="section-kicker">Privacy</p><h2 id="privacy-heading">Je vergelijking blijft van jou.</h2></div>
      <div><p>Polisnamen, zorgkosten en notities blijven uitsluitend in je browser. Als je de herinnering aanvraagt, bewaren we apart alleen je e-mailadres, je toestemming en de status van je inschrijving.</p><p>Na bevestiging ontvang je één herinnering. Iedere e-mail bevat een uitschrijflink. Je gegevens worden niet verkocht en niet gekoppeld aan je vergelijking.</p></div>
    </section>

    <section className="landing-final">
      <div><p className="section-kicker">Nu al proberen</p><h2>De rekenhulp is gratis en direct te gebruiken.</h2></div>
      <a className="primary-button" href="/vergelijker.html" onClick={() => trackCalculatorOpen('footer')}>Open Zorgvergelijker <ArrowRight size={18} /></a>
    </section>

    <footer className="landing-footer"><span>Zorgvergelijker is een persoonlijke rekenhulp, geen verzekeringsadvies.</span><div><a href="/zo-werkt-het.html">Zo werkt het</a><a href="mailto:zorgvergelijker@paulzuiderduin.com">Contact</a></div></footer>
  </main>;
}
