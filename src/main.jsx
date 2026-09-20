import React from 'react';
import { createRoot } from 'react-dom/client';
import CalculatorPage from './CalculatorPage.jsx';
import LandingPage from './LandingPage.jsx';
import TokenPage from './TokenPage.jsx';
import './minimal.css';

const pathname = window.location.pathname;
let page = <LandingPage />;

if (pathname.endsWith('/vergelijker.html')) page = <CalculatorPage />;
if (pathname.endsWith('/bevestigen.html')) page = <TokenPage action="confirm" />;
if (pathname.endsWith('/uitschrijven.html')) page = <TokenPage action="unsubscribe" />;

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {page}
  </React.StrictMode>
);
