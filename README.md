# Zorgvergelijker

Nederlandstalige zorgverzekeringvergelijker voor het vergelijken van totale jaarlasten op basis van je eigen zorggebruik.

## MVP

- Verwacht zorggebruik invoeren
- Polissen handmatig toevoegen en aanpassen
- Totale jaarlasten berekenen en sorteren
- JSON export en import
- Printvriendelijke samenvatting voor PDF
- Lokale autosave in de browser

## Lokaal draaien

```bash
npm install
npm run dev
```

## Deploy-doel

- Domein: `zorgvergelijker.paulzuiderduin.com`
- Deploy: GitHub Pages

## Handmatige vervolgstappen

1. Maak een nieuwe GitHub repository `zorgvergelijker`.
2. Push deze map als eigen repository naar GitHub.
3. Zet GitHub Pages aan op de `main` branch via GitHub Actions.
4. Voeg in `mijn.host` het DNS-record voor `zorgvergelijker.paulzuiderduin.com` toe.
5. Stel de custom domain in GitHub Pages in en forceer HTTPS.
6. Voeg vanaf de landing page op `paulzuiderduin.com` een link naar Zorgvergelijker toe.

## Opmerking

Deze tool rekent alleen met de gegevens die je zelf invoert. Controleer polisvoorwaarden en uitzonderingen altijd bij de verzekeraar.
