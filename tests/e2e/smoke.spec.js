import { expect, test } from '@playwright/test';

test('smoke: first-use flow, policy checks, and comparison work together', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Zorgvergelijker voor je verwachte jaarlasten' })).toBeVisible();
  await page.getByRole('button', { name: 'Weigeren' }).click();
  await expect(page.getByRole('button', { name: 'Start met je huidige polis' }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Instellingen' }).click();
  await expect(page.getByRole('heading', { name: 'Wat deze rekenhulp wel en niet berekent' })).toBeVisible();
  await expect(page.getByText('Is jouw vaste ziekenhuis, therapeut, kliniek of andere zorgverlener gecontracteerd?')).toBeVisible();

  await page.locator('#step-zorggebruik').getByRole('spinbutton', { name: 'Tandartskosten per jaar' }).fill('400');
  await page.getByRole('button', { name: 'Start met je huidige polis' }).first().click();
  await expect(page.getByRole('heading', { name: 'Polissen invoeren' })).toBeVisible();
  await page.getByRole('checkbox', { name: /Zorgverlener gecontroleerd/ }).check();
  await page.getByRole('button', { name: 'Polis toevoegen' }).first().click();

  await expect(page.getByLabel('Totale maandpremie')).toHaveCount(1);

  const naamVelden = page.getByLabel('Naam van de polis');
  await naamVelden.nth(1).fill('Testpolis compact');

  const maandpremieVelden = page.getByLabel('Totale maandpremie');
  await maandpremieVelden.nth(0).fill('120');

  await page.getByRole('button', { name: 'Vergelijk de jaarlasten' }).click();
  await expect(page.getByText('Laagste berekende jaarlast').first()).toBeVisible();
  await expect(page.getByTestId('result-card')).toHaveCount(2);
  await expect(page.getByRole('heading', { name: 'Testpolis compact' })).toBeVisible();
  await expect(page.getByText('1/5 overstapchecks gecontroleerd')).toBeVisible();
  await expect(page.getByText('Deze tool controleert geen zorgverleners, toestemming, wettelijke eigen bijdragen, acceptatie of wachttijden.')).toBeVisible();

  await page.getByRole('button', { name: 'Print of PDF' }).click();
  await expect(page.locator('iframe[aria-hidden="true"]')).toHaveCount(1);
});
