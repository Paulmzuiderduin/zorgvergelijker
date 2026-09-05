const dutchDate = (date) => new Intl.DateTimeFormat('nl-NL', {
  day: 'numeric',
  month: 'long',
  year: 'numeric'
}).format(date);

export function getSeasonalMessage(now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  // From February onward, visitors are preparing for the next insurance year.
  const switchYear = month === 0 ? year : year + 1;

  if (month === 10 && day >= 12) {
    return {
      eyebrow: `Overstapseizoen ${switchYear}`,
      title: `Premies voor ${switchYear} zijn nu te vergelijken`,
      text: `Sluit uiterlijk 31 december ${year} een nieuwe polis af. Je nieuwe verzekeraar zegt je oude basisverzekering dan meestal voor je op.`,
      action: 'Vergelijk je polissen'
    };
  }

  if (month === 11) {
    return {
      eyebrow: `Overstapseizoen ${switchYear}`,
      title: `Regel je overstap voor 31 december ${year}`,
      text: `Vergelijk premie en voorwaarden voordat je een nieuwe polis afsluit. Controleer bij aanvullende verzekeringen ook acceptatie en wachttijden.`,
      action: 'Start je vergelijking'
    };
  }

  if (month === 0) {
    return {
      eyebrow: `Overstapseizoen ${year}`,
      title: `Heb je zelf voor 31 december opgezegd?`,
      text: `Dan kun je nog tot 1 februari ${year} een nieuwe zorgverzekering afsluiten, met ingang van 1 januari. Controleer dit altijd bij je verzekeraar.`,
      action: 'Controleer je jaarlasten'
    };
  }

  if (month < 10) {
    return {
      eyebrow: `Vooruitblik ${switchYear}`,
      title: `Bereid je overstap rustig voor`,
      text: `Verzekeraars publiceren hun premies en voorwaarden voor ${switchYear} uiterlijk op 12 november ${year}. Bewaar nu alvast de gegevens van je huidige polis.`,
      action: 'Zo werkt het'
    };
  }

  return {
    eyebrow: `Vooruitblik ${switchYear}`,
    title: `Bereid je overstap rustig voor`,
    text: `Verzekeraars publiceren hun premies en voorwaarden voor ${switchYear} uiterlijk op 12 november ${year}. Vergelijk daarna met de actuele polisvoorwaarden erbij.`,
    action: 'Zo werkt het'
  };
}

export { dutchDate };
