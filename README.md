# Zorgvergelijker

Nederlandstalige zorgverzekeringvergelijker voor het vergelijken van totale jaarlasten op basis van je eigen zorggebruik.

## MVP

- Verwacht zorggebruik invoeren
- Polissen handmatig toevoegen en aanpassen
- Jaarlasten vergelijken op basis van premie, eigen risico, tandarts, fysio, bril/lenzen, alternatieve zorg en andere voorspelbare eigen kosten
- JSON export en import
- Printvriendelijke samenvatting voor PDF
- Lokale autosave in de browser
- Checklist voor voorwaarden die niet betrouwbaar automatisch te berekenen zijn
- Publieke uitlegpagina op `/zo-werkt-het.html`
- Seizoensmelding die de overstapperiode per datum uitlegt
- Privacyvriendelijke, geaggregeerde Umami-statistieken zonder invoerwaarden

## Lokaal draaien

```bash
npm install
npm run dev
```

## Deploy-doel

- Domein: `zorgvergelijker.paulzuiderduin.com`
- Deploy: GitHub Pages

## Opmerking

Deze tool rekent alleen met de gegevens die je zelf invoert. Hij controleert geen zorgverleners, voorwaarden, toestemming, wettelijke eigen bijdragen, acceptatie of wachttijden. Controleer die altijd bij de verzekeraar. Invoer wordt alleen lokaal in de browser opgeslagen; polisnamen, zorgkosten en notities gaan niet naar Umami.
