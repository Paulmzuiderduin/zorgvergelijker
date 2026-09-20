import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, BellRing, Calculator, CheckCircle2, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
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
      <div><a href="/zo-werkt-het.html">Uitleg</a><a className="secondary-button" href="/vergelijker.html" onClick={() => trackCalculatorOpen('navigation')}>Open rekenhulp</a></div>
    </nav>

    <section className="landing-hero">
      <div className="landing-hero-copy">
        <p className="eyebrow"><ShieldCheck size={15} />Onafhankelijke rekenhulp</p>
        <h1>Weet wat een zorgpolis je echt per jaar kost.</h1>
        <p className="landing-lead">Vul je verwachte zorgkosten en polissen in. Zorgvergelijker rekent de totale jaarlasten uit.</p>
        <div className="landing-actions"><a className="primary-button" href="/vergelijker.html" onClick={() => trackCalculatorOpen('hero')}><Calculator size={17} />Start vergelijking</a></div>
        <div className="landing-features" aria-label="Belangrijkste eigenschappen">
          <div><Calculator size={18} /><p><strong>Totale jaarlasten</strong><span>Premie, eigen risico en resterende zorgkosten.</span></p></div>
          <div><ShieldCheck size={18} /><p><strong>Je eigen polissen</strong><span>Geen ranglijst of gesponsorde uitkomst.</span></p></div>
          <div><LockKeyhole size={18} /><p><strong>Lokaal opgeslagen</strong><span>Bedragen en polisnamen blijven in je browser.</span></p></div>
        </div>
      </div>

      <aside className="signup-card" id="herinnering">
        <p className="section-kicker"><BellRing size={15} />Eenmalige herinnering</p>
        <h2>Begin wanneer de nieuwe polissen bekend zijn.</h2>
        <p>Ontvang één bericht zodra vergelijken zinvol is.</p>
        {status === 'success' ? <div className="signup-success" role="status" aria-live="polite"><CheckCircle2 size={30} /><div><p className="section-kicker">Aanmelding ontvangen</p><h3>Controleer nu je inbox.</h3><p>Bevestig het adres <strong>{submittedEmail}</strong> via de e-mail die we zojuist stuurden.</p><p className="signup-success-note">Kijk ook in je spamfolder. De afzender is zorgvergelijker@paulzuiderduin.com.</p></div></div> : <form onSubmit={submit} className="signup-form">
          <label className="field"><span>E-mailadres</span><div className="email-input"><Mail size={17} /><input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="jij@voorbeeld.nl" /></div></label>
          <label className="honeypot" aria-hidden="true">Website<input type="text" tabIndex="-1" autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} /></label>
          <label className="consent-row"><input type="checkbox" required checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>Ik geef toestemming voor één herinnering en kan mij altijd uitschrijven.</span></label>
          <div className="turnstile-container" ref={turnstileContainerRef}></div>
          {turnstileStatus === 'error' ? <p className="turnstile-error" role="status">De beveiligingscontrole kon niet laden. Herlaad de pagina.</p> : null}
          <button className="signup-button" type="submit" disabled={status === 'loading' || turnstileStatus !== 'ready'}>{status === 'loading' ? 'Bezig…' : turnstileStatus === 'ready' ? 'Stuur mij een seintje' : 'Beveiliging controleren…'}<ArrowRight size={17} /></button>
        </form>}
        {message && status === 'error' ? <p className="form-message is-error" role="status" aria-live="polite">{message}</p> : null}
        <p className="signup-fineprint"><LockKeyhole size={14} />Alleen je e-mailadres en toestemming worden bewaard.</p>
      </aside>
    </section>

    <section className="landing-steps" aria-label="Werkwijze">{stappen.map(([nummer, titel, tekst]) => <article key={nummer}><span>{nummer}</span><div><h3>{titel}</h3><p>{tekst}</p></div></article>)}</section>

    <footer className="landing-footer"><span>Persoonlijke rekenhulp, geen verzekeringsadvies.</span><div><a href="/zo-werkt-het.html">Uitleg en privacy</a><a href="mailto:zorgvergelijker@paulzuiderduin.com">Contact</a></div></footer>
  </main>;
}
