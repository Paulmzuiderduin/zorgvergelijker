import { expect, test } from '@playwright/test';

test('smoke: comparator renders and updates ranking', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Zorgvergelijker voor je echte jaarlasten' })).toBeVisible();
  await page.getByRole('button', { name: 'Weigeren' }).click();
  await page.getByRole('button', { name: 'Instellingen' }).click();
  await page.getByRole('checkbox', { name: 'Hulpmiddelen' }).uncheck();
  await expect(page.getByRole('spinbutton', { name: 'Hulpmiddelen' })).toHaveCount(0);

  await page.locator('#step-zorggebruik').getByRole('spinbutton', { name: 'Tandarts en mondzorg per jaar' }).fill('400');
  await page.getByRole('button', { name: 'Voeg je polissen toe' }).click();
  await page.getByRole('button', { name: 'Polis toevoegen' }).click();

  await expect(page.getByLabel('Maandpremie')).toHaveCount(1);

  const naamVelden = page.getByLabel('Naam van de polis');
  await naamVelden.nth(2).fill('Testpolis compact');

  const maandpremieVelden = page.getByLabel('Maandpremie');
  await maandpremieVelden.nth(0).fill('120');

  await page.getByRole('button', { name: 'Vergelijk de jaarlasten' }).click();
  await expect(page.getByText('Meest voordelig voor deze inschatting')).toBeVisible();
  await expect(page.getByTestId('result-card')).toHaveCount(3);
  await expect(page.getByRole('heading', { name: 'Testpolis compact' })).toBeVisible();
});
