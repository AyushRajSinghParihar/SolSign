// [File Begins] tests/signing-flow.spec.ts
import { test, expect } from "@playwright/test";

// Note: This test is a placeholder and will not pass without a mock wallet setup.
// It demonstrates the structure of a Playwright test.
// A full implementation requires a more complex setup to handle wallet interactions.

test.describe("End-to-end Signing Flow", () => {
  test("User can create a document from a template and view it", async ({
    page,
  }) => {
    // This test assumes the user is already logged in.
    // A real test suite would have a separate `auth.setup.ts` to handle login.
    await page.goto("http://127.0.0.1:5173/");

    // Wait for the dashboard to load by looking for the main heading.
    await expect(
      page.getByRole("heading", { name: "Dashboard" })
    ).toBeVisible();

    // Find the "Use Template" button for the first template in the list.
    const useTemplateButton = page
      .locator("table > tbody > tr")
      .first()
      .getByRole("button", { name: "Use Template" });
    await expect(useTemplateButton).toBeVisible();
    await useTemplateButton.click();

    // The dialog for naming the document should appear.
    await expect(
      page.getByRole("heading", { name: "Name Your Document" })
    ).toBeVisible();

    // Fill in the name and create the document.
    const documentNameInput = page.getByLabel("Name");
    const documentName = `My E2E Test Document ${Date.now()}`;
    await documentNameInput.fill(documentName);
    await page.getByRole("button", { name: "Create" }).click();

    // After creation, we should be navigated to the document page.
    // Verify by checking the URL and the document's title.
    await expect(page).toHaveURL(/\/documents\/.*/);
    await expect(
      page.getByRole("heading", { name: documentName })
    ).toBeVisible();

    // Verify that the PDF viewer is trying to load.
    await expect(page.getByText("Loading document preview...")).toBeVisible();
  });
});
// [File Ends] tests/signing-flow.spec.ts
