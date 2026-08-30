import { expect, test } from '@playwright/test';

test('smoke: simplified comparator renders, migrates the workflow, and updates ranking', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Zorgvergelijker voor je verwachte jaarlasten' })).toBeVisible();
  await page.getByRole('button', { name: 'Weigeren' }).click();
  await page.getByRole('button', { name: 'Instellingen' }).click();
  await expect(page.getByRole('heading', { name: 'Wat deze rekenhulp wel en niet berekent' })).toBeVisible();
  await expect(page.getByText('Is jouw vaste ziekenhuis, therapeut, kliniek of andere zorgverlener gecontracteerd?')).toBeVisible();

  await page.locator('#step-zorggebruik').getByRole('spinbutton', { name: 'Tandartskosten per jaar' }).fill('400');
  await page.getByRole('button', { name: 'Voeg je polissen toe' }).click();
  await page.getByRole('button', { name: 'Polis toevoegen' }).click();

  await expect(page.getByLabel('Totale maandpremie')).toHaveCount(1);

  const naamVelden = page.getByLabel('Naam van de polis');
  await naamVelden.nth(2).fill('Testpolis compact');

  const maandpremieVelden = page.getByLabel('Totale maandpremie');
  await maandpremieVelden.nth(0).fill('120');

  await page.getByRole('button', { name: 'Vergelijk de jaarlasten' }).click();
  await expect(page.getByText('Laagste berekende jaarlast').first()).toBeVisible();
  await expect(page.getByTestId('result-card')).toHaveCount(3);
  await expect(page.getByRole('heading', { name: 'Testpolis compact' })).toBeVisible();
  await expect(page.getByText('Deze tool controleert geen zorgverleners, toestemming, wettelijke eigen bijdragen, acceptatie of wachttijden.')).toBeVisible();

  await page.getByRole('button', { name: 'Print of PDF' }).click();
  await expect(page.locator('iframe[aria-hidden="true"]')).toHaveCount(1);
});
