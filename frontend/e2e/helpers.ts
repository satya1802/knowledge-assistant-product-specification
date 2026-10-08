import type { Page } from "@playwright/test";

/**
 * Registers a brand-new user through the UI (self-registration is enabled by
 * default per backend/.env.example) and leaves the browser signed in on
 * /chat. Each call uses a unique email so parallel specs never collide.
 */
export async function registerAndSignIn(page: Page): Promise<{ email: string; name: string }> {
  const unique = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const name = `QA Tester ${unique}`;
  const email = `qa.${unique}@northwind.example`;
  const password = "a-very-secure-password-123";

  await page.goto("/sign-in");

  const registerTab = page.getByRole("tab", { name: "Create account" });
  if (await registerTab.isVisible().catch(() => false)) {
    await registerTab.click();
  }

  await page.getByLabel("Full name").fill(name);
  await page.getByLabel("Work email address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();

  await page.waitForURL(/\/chat$/);

  return { email, name };
}
