import { test, expect } from "@playwright/test";
test("synthetic evidence, import, GBrain recall, and accessible controls", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/priors");
  await expect(
    page.getByText("Synthetic demo data", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Jordan Taylor", { exact: true })).toHaveCount(1);
  await page.getByRole("button", { name: "Reset Demo", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Initial priors restored",
  );
  await page.getByRole("button", { name: "Labs", exact: true }).click();
  await expect(page.locator(".event")).toHaveCount(6);
  await page.getByLabel("Search priors").fill("156");
  await expect(page.locator(".event")).toHaveCount(1);
  await page.getByLabel("Search priors").fill("");
  await page.getByRole("button", { name: "All", exact: true }).click();
  await expect(page.locator(".event")).toHaveCount(26);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "test-results/priors-1440.png" });
  await page.getByRole("button", { name: "Prepare My Visit" }).click();
  await expect(page.locator(".finding-card")).toHaveCount(3);
  await expect(page.locator(".memory-banner")).toContainText(
    "Memory read from GBrain",
  );
  await page.screenshot({ path: "test-results/brief-1440.png" });
  await page.getByRole("link", { name: "View 2 sources" }).click();
  await expect(page.locator(".evidence-card")).toHaveCount(2);
  await page.getByText("Inspect original FHIR resource").first().click();
  await expect(page.locator(".raw-fhir pre").first()).toContainText(
    "DiagnosticReport",
  );
  await page.getByRole("link", { name: "Your priors", exact: true }).click();
  await page.getByRole("button", { name: "Import follow-up report" }).click();
  await expect(page.getByRole("status")).toContainText("verified in GBrain");
  await page.getByRole("link", { name: "Memory", exact: true }).click();
  await expect(
    page
      .locator(".memory-card")
      .filter({ hasText: "Follow-up documentation received" }),
  ).toContainText("resolved");
  await page.getByRole("button", { name: "Fresh Session" }).click();
  await expect(page.getByRole("status")).toContainText("notes from GBrain");
  await page.getByRole("button", { name: "Prepare My Visit" }).click();
  await expect(page.locator(".finding-card")).toHaveCount(2);
  await page.getByRole("link", { name: "Data access", exact: true }).click();
  await page.getByRole("button", { name: "Test research access" }).click();
  await expect(page.getByRole("status")).toContainText("denied");
  expect(errors).toEqual([]);
});
