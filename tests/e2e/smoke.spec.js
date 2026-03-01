import { expect, test } from '@playwright/test';

test('smoke: comparator renders and updates ranking', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Zorgvergelijker voor je echte jaarlasten' })).toBeVisible();
  await expect(page.getByText('Meest voordelig voor deze inschatting')).toBeVisible();

  await page.getByLabel('Tandartskosten per jaar').fill('400');
  await page.getByRole('button', { name: 'Polis toevoegen' }).click();
  await expect(page.getByTestId('result-card')).toHaveCount(3);

  const naamVelden = page.getByLabel('Naam van de polis');
  await naamVelden.nth(2).fill('Testpolis compact');

  const maandpremieVelden = page.getByLabel('Maandpremie');
  await maandpremieVelden.nth(2).fill('120');

  await expect(page.getByRole('heading', { name: 'Testpolis compact' })).toBeVisible();
});
