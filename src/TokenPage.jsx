import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, LoaderCircle, XCircle } from 'lucide-react';
import { submitWaitlistAction } from './waitlist.js';

const copy = {
  confirm: {
    pending: 'We bevestigen je inschrijving…',
    success: 'Je herinnering staat klaar.',
    detail: 'Je ontvangt één e-mail zodra het tijd is om de nieuwe zorgpolissen te vergelijken.'
  },
  unsubscribe: {
    pending: 'We verwerken je uitschrijving…',
    success: 'Je bent uitgeschreven.',
    detail: 'Je ontvangt geen herinnering meer van Zorgvergelijker.'
  }
};

const confirmationCalculatorUrl = '/vergelijker.html?utm_source=zorgvergelijker&utm_medium=email&utm_campaign=inschrijfbevestiging&utm_content=bevestigingspagina';

export default function TokenPage({ action }) {
  const [status, setStatus] = useState('pending');
  const [message, setMessage] = useState('');
  const started = useRef(false);
  const pageCopy = copy[action];

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const url = new URL(window.location.href);
    const token = url.searchParams.get('token') || '';
    window.history.replaceState({}, '', url.pathname);

    submitWaitlistAction({ action, token })
      .then(() => setStatus('success'))
      .catch((error) => { setMessage(error.message); setStatus('error'); });
  }, [action]);

  return <main className="token-shell">
    <a className="brand-link" href="/">Zorgvergelijker</a>
    <section className={`token-card is-${status}`}>
      {status === 'pending' ? <LoaderCircle className="token-icon token-spinner" size={38} /> : null}
      {status === 'success' ? <CheckCircle2 className="token-icon" size={38} /> : null}
      {status === 'error' ? <XCircle className="token-icon" size={38} /> : null}
      <p className="section-kicker">E-mailherinnering</p>
      <h1>{status === 'success' ? pageCopy.success : status === 'error' ? 'Deze link werkt niet.' : pageCopy.pending}</h1>
      <p>{status === 'success' ? pageCopy.detail : status === 'error' ? message : 'Dit duurt meestal maar een moment.'}</p>
      <a className="primary-button" href={status === 'error' ? '/' : confirmationCalculatorUrl}>{status === 'error' ? 'Terug naar de website' : 'Open de rekenhulp'} <ArrowRight size={18} /></a>
    </section>
  </main>;
}
