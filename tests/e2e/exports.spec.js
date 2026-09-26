import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('downloads a complete JSON file, imports it, and renders the print document to PDF', async ({ page, context }, testInfo) => {
  await page.route('https://cloud.umami.is/**', route => route.abort());
  await page.addInitScript(() => {
    window.print = () => {
      window.parent.__printedHtml = document.documentElement.outerHTML;
    };
  });
  await page.goto('/vergelijker.html');
  await page.getByRole('button', { name: 'Volgende' }).click();
  await page.getByRole('button', { name: 'Voorbeeld gebruiken' }).click();
  await page.getByLabel('Totale maandpremie').fill('123.45');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'JSON', exact: true }).click();
  const download = await downloadPromise;
  const jsonPath = testInfo.outputPath('comparison.json');
  await download.saveAs(jsonPath);
  const data = JSON.parse(await readFile(jsonPath, 'utf8'));
  expect(data.versie).toBe(4);
  expect(data.verzekeringen).toHaveLength(2);
  expect(data.verzekeringen[0].maandpremie).toBe(123.45);
  await page.getByLabel('Totale maandpremie').fill('999');
  page.once('dialog', dialog => dialog.dismiss());
  await page.locator('input[type=file]').setInputFiles(jsonPath);
  await expect(page.getByLabel('Totale maandpremie')).toHaveValue('123.45');
  await page.getByRole('button', { name: 'Print/PDF' }).click();
  await expect.poll(() => page.evaluate(() => window.__printedHtml || '')).toContain('1.481,40');
  const html = await page.evaluate(() => window.__printedHtml);
  const printPage = await context.newPage();
  await printPage.setContent(html);
  await expect(printPage.locator('.plan')).toHaveCount(2);
  await expect(printPage.locator('.notice')).toContainText('voorwaarden');
  const pdf = await printPage.pdf({ path: testInfo.outputPath('comparison.pdf'), format: 'A4', printBackground: true });
  expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  expect(pdf.length).toBeGreaterThan(5000);
  await printPage.screenshot({ path: testInfo.outputPath('print-preview.png'), fullPage: true });
});

test('mobile header leaves the first care field within the initial viewport', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/vergelijker.html');
  const firstInput = page.locator('.care-card input').first();
  const bounds = await firstInput.boundingBox();
  expect(bounds.y + bounds.height).toBeLessThan(844);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.screenshot({ path: testInfo.outputPath('mobile.png'), fullPage: false });
});
