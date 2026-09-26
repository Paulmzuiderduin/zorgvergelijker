import { expect, test } from '@playwright/test';

test('smoke: first-use flow, policy checks, and comparison work together', async ({ page }) => {
  await page.route('https://cloud.umami.is/**', (route) => route.abort());
  await page.addInitScript(() => {
    window.__trackedEvents = [];
    window.umami = {
      track: (name, data) => window.__trackedEvents.push({ name, data })
    };
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (data) => { window.__sharedData = data; }
    });
  });
  await page.goto('/vergelijker.html');

  await expect(page.getByRole('heading', { name: 'Vergelijk je verwachte jaarlasten' })).toBeVisible();
  await expect(page.getByText('Polisnamen en bedragen blijven op je apparaat.')).toBeVisible();
  await expect(page.getByLabel('Informatie over het overstapseizoen')).toBeVisible();

  const tandarts = page.locator('.care-card').filter({ has: page.getByRole('heading', { name: 'Tandarts', exact: true }) });
  await tandarts.getByRole('spinbutton', { name: 'Kosten per jaar' }).fill('400');
  await page.getByText('Speciale situaties', { exact: true }).click();
  const orthodontie = page.locator('.care-card').filter({ has: page.getByRole('heading', { name: 'Orthodontie', exact: true }) });
  await orthodontie.getByRole('spinbutton', { name: 'Verwachte kosten' }).fill('900');
  await page.getByRole('button', { name: 'Eigen zorgpost toevoegen' }).click();
  await page.getByLabel('Naam zorgpost').fill('Podotherapie');
  await page.locator('.custom-cost-row').getByRole('spinbutton', { name: 'Verwachte kosten' }).fill('180');

  await page.getByRole('button', { name: 'Volgende' }).click();
  await page.getByRole('button', { name: 'Huidige polis toevoegen' }).first().click();
  await expect(page.getByRole('heading', { name: 'Welke polissen vergelijk je?' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Orthodontie', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Eigen zorgposten' })).toBeVisible();
  await page.locator('.policy-disclosure > summary').filter({ hasText: 'Controlepunten' }).click();
  await page.getByRole('checkbox', { name: 'Zorgverlener gecontracteerd' }).check();
  await page.getByRole('button', { name: 'Polis toevoegen' }).first().click();

  await expect(page.getByLabel('Totale maandpremie')).toHaveCount(1);

  const naamVelden = page.getByLabel('Naam van de polis');
  await naamVelden.nth(1).fill('Testpolis compact');

  const maandpremieVelden = page.getByLabel('Totale maandpremie');
  await maandpremieVelden.nth(0).fill('120');

  await page.getByRole('button', { name: /Resultaat/ }).click();
  await expect(page.getByText('Laagste jaarlast').first()).toBeVisible();
  await expect(page.getByTestId('result-card')).toHaveCount(2);
  await expect(page.getByRole('heading', { name: 'Testpolis compact' })).toBeVisible();
  await expect(page.getByText('1/5 checks')).toBeVisible();
  await expect(page.getByText('Controleer voorwaarden altijd bij de verzekeraar.')).toBeVisible();

  await expect.poll(() => page.evaluate(() => window.__trackedEvents.filter(({ name }) => name === 'comparison_completed').length)).toBe(1);
  await page.getByRole('button', { name: /Zorggebruik/ }).click();
  await page.getByRole('button', { name: /Resultaat/ }).click();
  await expect.poll(() => page.evaluate(() => window.__trackedEvents.filter(({ name }) => name === 'comparison_completed').length)).toBe(1);

  await page.getByRole('button', { name: 'Deel link' }).click();
  await expect(page.getByRole('status')).toContainText('Deelvenster geopend.');
  const sharedUrl = await page.evaluate(() => window.__sharedData.url);
  expect(sharedUrl).toContain('/vergelijker.html?');
  expect(sharedUrl).toContain('utm_medium=referral');
  expect(sharedUrl).not.toContain('Testpolis');
  await expect.poll(() => page.evaluate(() => window.__trackedEvents.filter(({ name }) => name === 'share_clicked').length)).toBe(1);

  await page.getByRole('button', { name: 'Ja', exact: true }).click();
  await expect(page.getByText('Bedankt.')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__trackedEvents.filter(({ name }) => name === 'comparison_feedback').length)).toBe(1);

  await page.getByRole('button', { name: 'Print/PDF' }).click();
  await expect(page.locator('iframe[aria-hidden="true"]')).toHaveCount(1);
});

test('landing page explains the product and submits a double opt-in request', async ({ page }) => {
  await page.route('https://challenges.cloudflare.com/**', (route) => route.abort());
  await page.addInitScript(() => {
    window.turnstile = {
      render: (_container, options) => {
        window.setTimeout(() => options.callback('test-turnstile-token'), 0);
        return 'test-widget';
      },
      remove: () => {},
      reset: () => {}
    };
  });
  await page.route('**/functions/v1/waitlist', async (route) => {
    const payload = route.request().postDataJSON();
    expect(payload).toMatchObject({
      action: 'signup',
      email: 'test@example.nl',
      consent: true,
      website: '',
      turnstileToken: 'test-turnstile-token'
    });
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, message: 'Controleer je inbox om je inschrijving te bevestigen.' })
    });
  });

  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Weet wat een zorgpolis je echt per jaar kost.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Begin wanneer de nieuwe polissen bekend zijn.' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Start vergelijking/ })).toHaveAttribute('href', '/vergelijker.html');
  await page.getByLabel('E-mailadres').fill('test@example.nl');
  await page.getByRole('checkbox').check();
  await expect(page.getByRole('button', { name: 'Stuur mij een seintje' })).toBeEnabled();
  await page.getByRole('button', { name: /Stuur mij een seintje/ }).click();
  await expect(page.getByRole('heading', { name: 'Controleer nu je inbox.' })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('test@example.nl');
  await expect(page.getByRole('status')).toContainText('Bevestig het adres');
});

test('result sharing and feedback stay usable on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('https://cloud.umami.is/**', (route) => route.abort());
  await page.goto('/vergelijker.html');

  await page.getByRole('button', { name: 'Volgende' }).click();
  await page.getByRole('button', { name: 'Voorbeeld gebruiken' }).first().click();
  await page.getByRole('button', { name: /Resultaat/ }).click();

  const followup = page.getByRole('region', { name: 'Delen en feedback' });
  await expect(followup).toBeVisible();
  await expect(page.getByRole('button', { name: 'Deel link' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ja', exact: true })).toBeVisible();

  const bounds = await followup.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
});

test('confirmation page consumes its token and removes it from the address bar', async ({ page }) => {
  await page.route('**/functions/v1/waitlist', async (route) => {
    expect(route.request().postDataJSON()).toEqual({ action: 'confirm', token: 'a'.repeat(43) });
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, status: 'confirmed' }) });
  });

  await page.goto(`/bevestigen.html?token=${'a'.repeat(43)}`);

  await expect(page).toHaveURL(/\/bevestigen\.html$/);
  await expect(page.getByRole('heading', { name: 'Je herinnering staat klaar.' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open de rekenhulp' })).toHaveAttribute(
    'href',
    '/vergelijker.html?utm_source=zorgvergelijker&utm_medium=email&utm_campaign=inschrijfbevestiging&utm_content=bevestigingspagina'
  );
});

test('how it works page explains privacy and the switching season', async ({ page }) => {
  await page.goto('/zo-werkt-het.html');

  await expect(page.getByRole('heading', { name: 'Zo werkt Zorgvergelijker' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Je gegevens zijn van jou' })).toBeVisible();
  await expect(page.getByText('Polisnamen, zorgkosten en notities worden nooit meegestuurd.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Wanneer vergelijken en overstappen?' })).toBeVisible();
});
