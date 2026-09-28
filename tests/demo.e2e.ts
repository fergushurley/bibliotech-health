import { test, expect } from "@playwright/test";
test("the entire evidence, import and fresh-session demo works", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const reset = await request.post("/health/api/demo", {
    headers: { Origin: "http://127.0.0.1:3102" },
    data: { action: "reset", resetGBrain: false },
  });
  expect(reset.status()).toBe(200);
  const denied = await request.post("/health/api/demo", {
    headers: { Origin: "https://unrelated.example" },
    data: { action: "prepare" },
  });
  expect(denied.status()).toBe(403);
  await page.goto("/health/priors");
  await expect(
    page.getByRole("heading", { name: "Your Priors" }),
  ).toBeVisible();
  await expect(page.getByText("Jordan Taylor", { exact: true })).toHaveCount(1);
  await expect(page.getByText("25 records", { exact: true })).toBeVisible();
  await page.screenshot({
    animations: "disabled",
    path: "docs/screenshots/01-priors.png",
  });
  await page.getByRole("tab", { name: "Imaging", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /Diagnostic Mammogram/ }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "All", exact: true }).click();
  await page.getByRole("button", { name: "Prepare My Visit" }).first().click();
  await expect(page).toHaveURL(/\/brief$/);
  await expect(
    page.getByRole("heading", {
      name: "Breast imaging follow-up",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Confirm current atorvastatin dose" }),
  ).toBeVisible();
  await page.screenshot({
    animations: "disabled",
    fullPage: true,
    path: "docs/screenshots/02-visit-brief.png",
  });
  await page
    .locator(".finding-card")
    .filter({
      has: page.getByRole("heading", {
        name: "Potential cardiovascular context",
      }),
    })
    .getByRole("button", { name: "View Evidence" })
    .click();
  await expect(page).toHaveURL(/cross-specialty-cardiovascular$/);
  await expect(
    page.getByText("Evidence check passed", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    animations: "disabled",
    fullPage: true,
    path: "docs/screenshots/03-evidence.png",
  });
  await page.getByRole("button", { name: "Open 2025 lipid result" }).click();
  await expect(page.getByRole("dialog")).toContainText("LDL: 152 mg/dL");
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: "Agents", exact: true }).click();
  await expect(
    page.getByText("Patient has cardiovascular disease.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByText("Complete", { exact: true })).toHaveCount(5);
  await page.screenshot({
    animations: "disabled",
    fullPage: true,
    path: "docs/screenshots/04-agents.png",
  });
  await page.getByRole("link", { name: "Memory", exact: true }).click();
  await expect(
    page.getByText("GBrain Not Connected", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Import New Record" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Import Record", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Follow-up matched in your records" }),
  ).toBeVisible();
  await expect(
    page.getByText("This is local record reconciliation.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Dismiss notification" }).click();
  await page.screenshot({
    animations: "disabled",
    fullPage: true,
    path: "docs/screenshots/05-gbrain-memory.png",
  });
  await page
    .getByRole("button", { name: "Start Fresh Session", exact: true })
    .click();
  await expect(page).toHaveURL(/\/priors$/);
  await page.reload();
  await expect(page.getByText("26 records", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Prepare My Visit" }).first().click();
  await expect(page).toHaveURL(/\/brief$/);
  await expect(
    page.getByText("It no longer appears as an open question.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Breast imaging follow-up",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Access", exact: true }).click();
  await expect(page.getByText("Denied", { exact: true }).first()).toBeVisible();
  await page.screenshot({
    animations: "disabled",
    fullPage: true,
    path: "docs/screenshots/06-access-ledger.png",
  });
  await page
    .getByRole("button", { name: "Open Research Agent access event" })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Research agents may access de-identified metadata only.",
  );
  await expect(
    page.getByRole("dialog").locator("dd").filter({ hasText: /^0$/ }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("phone layout has no horizontal overflow and can open a source", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/health/priors");
  await expect(page.getByText("Jordan Taylor", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByPlaceholder("Search your medical history...").fill("2024");
  await page.locator(".record-row").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.screenshot({
    animations: "disabled",
    path: "docs/screenshots/07-mobile-source.png",
  });
});
