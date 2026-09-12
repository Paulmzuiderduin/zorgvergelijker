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

## E-mailherinnering

De landingspagina gebruikt `supabase/functions/waitlist` voor een double-opt-in inschrijving. De calculator blijft beschikbaar op `/vergelijker.html` en stuurt geen polisnamen, zorgkosten of notities naar Supabase.

De backend bevat:

- Een afgeschermde `waitlist_subscribers`-tabel met RLS en zonder toegang voor browserrollen.
- SHA-256-hashes in plaats van leesbare bevestigings- en uitschrijftokens.
- Een resend-cooldown en dagelijkse verzendlimiet.
- Verplichte Cloudflare Turnstile-validatie voor iedere publieke inschrijving.
- Bevestigings- en uitschrijfpagina's die het token direct uit de adresbalk verwijderen.

Stel deze waarden in via **Supabase Dashboard > Edge Functions > Secrets**:

- `SMTP_HOST`: `h25.mijn.host`
- `SMTP_USER`: `zorgvergelijker@paulzuiderduin.com`
- `SMTP_PASSWORD`: het wachtwoord van de mailbox
- `SMTP_TEST_TOKEN`: een willekeurige lange testwaarde
- `TURNSTILE_SECRET_KEY`: de geheime Cloudflare Turnstile-sleutel

Zet echte geheimen nooit in `.env`, `.env.example`, Git of chat.

De functies gebruiken versleutelde SMTP op poort `465`, omdat Supabase uitgaande verbindingen naar SMTP-poorten `25` en `587` blokkeert. `supabase/functions/smtp-test` verstuurt alleen een testbericht van en naar `zorgvergelijker@paulzuiderduin.com`.

E-maillinks gebruiken consistente UTM-waarden voor attributie in Umami. De bevestigingsroute naar de rekenhulp gebruikt `utm_source=zorgvergelijker`, `utm_medium=email` en `utm_campaign=inschrijfbevestiging`. De seizoensherinnering krijgt een eigen campagne, bijvoorbeeld `overstapseizoen-2027`.

## Geplande seizoensherinnering

`supabase/functions/send-reminder` bevat zowel de HTML-e-mail met knop als de platte-tekstfallback. Supabase Cron roept deze functie vanaf 13 november 2026 om 10:00 Nederlandse tijd in kleine batches aan. Alleen adressen die voor dat moment bevestigd zijn, komen in aanmerking en ieder adres ontvangt de herinnering maximaal één keer.

De Cron-configuratie leest `zorgvergelijker_project_url` en `zorgvergelijker_publishable_key` uit Supabase Vault. De reminderfunctie vereist daarnaast de bestaande SMTP-secrets en wordt met JWT-verificatie gedeployed.
