import { expect, test } from "@playwright/test";
import type { Locator, Page, TestInfo } from "@playwright/test";

const EQUIPMENT = [
  ["ev", "Electric car"],
  ["solar", "Solar PV"],
  ["battery", "Home battery"],
  ["heatPump", "Heat pump"],
  ["waterHeater", "Electric water heater"],
  ["appliances", "Home appliances"],
  ["lighting", "Lighting"],
] as const;

async function openStory(page: Page) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Start my story", exact: true })
    .click();
  return page.getByRole("dialog", { name: "Energy Momentum", exact: true });
}

async function chapter(dialog: Locator, name: string) {
  await dialog
    .getByRole("button", { name: `Go to ${name}`, exact: true })
    .click();
}

async function capture(dialog: Locator, testInfo: TestInfo, name: string) {
  await expect
    .poll(() =>
      dialog
        .locator(".momentum-content")
        .evaluate((element) => element.scrollWidth - element.clientWidth),
    )
    .toBeLessThanOrEqual(1);
  await dialog.screenshot({
    path: `test-results/screens/energy-momentum-${name}-${testInfo.project.name}.png`,
    animations: "disabled",
  });
}

async function configureEquipment(page: Page, status: "confirmed" | "absent") {
  await page.goto("/");
  await page.getByRole("button", { name: "My household", exact: true }).click();
  for (const [, name] of EQUIPMENT)
    await page
      .getByLabel(`${name} status`, { exact: true })
      .selectOption(status);
  await page
    .getByRole("button", { name: "Apply household changes", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Open Energy Momentum", exact: true })
    .click();
  return page.getByRole("dialog", { name: "Energy Momentum", exact: true });
}

test("Energy Momentum connects the five screens, exact rewards and completed equipment", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const dialog = await openStory(page);
  await expect(
    dialog
      .getByRole("navigation", { name: "Story chapters" })
      .getByRole("button"),
  ).toHaveCount(5);
  await expect(
    dialog.getByRole("heading", { name: "Your home, in motion.", exact: true }),
  ).toBeVisible();
  await expect(dialog.getByTestId("home-ev")).toHaveCount(0);
  await expect(dialog.getByTestId("home-solar")).toHaveCount(0);
  await expect(dialog.getByTestId("home-heatPump")).toHaveClass(/is-complete/);
  await expect(dialog.getByTestId("home-lighting")).not.toHaveClass(
    /is-complete/,
  );
  await expect(dialog.getByTestId("story-coins")).toHaveText("1.43");
  await capture(dialog, testInfo, "home");
  await dialog
    .getByRole("button", { name: "See my timing", exact: true })
    .click();
  await expect(
    dialog.getByRole("heading", {
      name: "Same day. Better timing.",
      exact: true,
    }),
  ).toBeFocused();
  await expect(
    dialog.getByTestId("momentum-power-chart").locator(".recharts-line-curve"),
  ).toHaveCount(2);
  await expect(
    dialog.getByTestId("momentum-power-chart").locator(".recharts-area-area"),
  ).toHaveCount(2);
  await expect(
    dialog.getByTestId("momentum-tariff-chart").locator(".recharts-area-area"),
  ).toHaveCount(1);
  await expect(
    dialog.getByText("CHF 0.55 less per demo action", { exact: true }),
  ).toBeVisible();
  await capture(dialog, testInfo, "timing");
  await dialog
    .getByRole("button", { name: "Choose an action", exact: true })
    .click();
  const lighting = dialog
    .getByTestId("action-lighting")
    .getByRole("button", { name: /Switch off the lights/ });
  await expect(lighting).toHaveAccessibleName(/save CHF 0.13, earn 0.13 coins/);
  await lighting.click();
  await expect(dialog.getByTestId("story-coins")).toHaveText("1.56");
  await expect(dialog.locator(".momentum-speech")).toContainText("safely lit");
  await expect(dialog.locator(".momentum-action-note")).toBeInViewport({
    ratio: 1,
  });
  await capture(dialog, testInfo, "actions");
  await lighting.click();
  await expect(dialog.getByTestId("story-coins")).toHaveText("1.69");
  await dialog
    .getByRole("button", { name: "See the ranking", exact: true })
    .click();
  for (const metal of ["gold", "silver", "bronze"])
    await expect(dialog.locator(`.rank-${metal} .lucide-medal`)).toHaveCount(1);
  await expect(
    dialog.locator("tbody tr:nth-child(n+4) .lucide-medal"),
  ).toHaveCount(0);
  await expect(dialog.getByTestId("your-rank").locator("td").last()).toHaveText(
    "1.69",
  );
  await capture(dialog, testInfo, "ranking");
  await dialog
    .getByRole("button", { name: "Unwrap my progress", exact: true })
    .click();
  await expect(dialog.getByTestId("recap-coins")).toHaveText("1.69");
  await expect(dialog.getByTestId("history-lighting")).toContainText(
    "2 times completed",
  );
  await expect(dialog.getByTestId("history-lighting")).toContainText("0.26");
  await expect(dialog.locator(".momentum-history > li")).toHaveCount(7);
  await expect(dialog.locator(".momentum-history > li").first()).toHaveClass(
    "is-done",
  );
  await expect(dialog.locator(".momentum-history .is-locked")).toHaveCount(4);
  expect(
    await dialog
      .getByTestId("history-solar")
      .evaluate((element) => getComputedStyle(element).backgroundImage),
  ).toContain("repeating-linear-gradient");
  await capture(dialog, testInfo, "wrap-up");
  await dialog
    .getByRole("button", { name: "Back to my home", exact: true })
    .click();
  await expect(dialog.getByTestId("home-lighting")).toHaveClass(/is-complete/);
  await expect(dialog.locator('[data-equipment="lighting"]')).toHaveAttribute(
    "data-complete",
    "true",
  );
  await expect(
    dialog.getByTestId("home-lighting").locator(".lucide-check"),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Start my story", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Start my story", exact: true })
    .click();
  await expect(dialog.getByTestId("story-coins")).toHaveText("1.69");
  expect(
    await page.evaluate(() =>
      localStorage.getItem("ekz-flexibility-demo-plan-v1"),
    ),
  ).toBeNull();
  expect(errors).toEqual([]);
});

test("confirmed equipment matches single-family and multi-family homes", async ({
  page,
}, testInfo) => {
  const dialog = await configureEquipment(page, "confirmed");
  await expect(dialog.getByTestId("momentum-home")).toHaveAttribute(
    "data-building",
    "single",
  );
  await expect(dialog.locator("[data-equipment]")).toHaveCount(7);
  for (const [id, name] of EQUIPMENT) {
    await dialog.getByTestId(`home-${id}`).click();
    await expect(dialog.getByRole("tooltip")).toContainText(name);
    await dialog
      .getByRole("button", { name: "Close equipment tip", exact: true })
      .click();
  }
  await capture(dialog, testInfo, "all-equipment-single");
  await dialog
    .getByRole("button", { name: "My household", exact: true })
    .click();
  await page.getByLabel("Building type", { exact: true }).selectOption("multi");
  await page
    .getByLabel("Meter covers", { exact: true })
    .selectOption("building");
  await page.getByLabel("Your role", { exact: true }).selectOption("manager");
  await page
    .getByRole("button", { name: "Apply household changes", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Open Energy Momentum", exact: true })
    .click();
  await expect(dialog.getByTestId("momentum-home")).toHaveAttribute(
    "data-building",
    "multi",
  );
  await expect(
    dialog.getByRole("img", { name: /^Multi-family building with/ }),
  ).toBeVisible();
  await capture(dialog, testInfo, "all-equipment-multi");
});

test("every installed flexibility awards its displayed CHF saving and updates the recap", async ({
  page,
}) => {
  const dialog = await configureEquipment(page, "confirmed");
  let expectedCents = Math.round(
    Number(await dialog.getByTestId("story-coins").textContent()) * 100,
  );
  await chapter(dialog, "Actions");
  for (const [id] of EQUIPMENT) {
    const row = dialog.getByTestId(`action-${id}`);
    const reward = Number(
      (await row.locator(".momentum-action-reward b").textContent())!.replace(
        "+",
        "",
      ),
    );
    expect(reward).toBeGreaterThan(0);
    await expect(row.locator(".momentum-action-reward small")).toContainText(
      `CHF ${reward.toFixed(2)}`,
    );
    await row.locator(".momentum-action-button").click();
    expectedCents += Math.round(reward * 100);
    await expect(dialog.getByTestId("story-coins")).toHaveText(
      (expectedCents / 100).toFixed(2),
    );
  }
  await chapter(dialog, "Wrap-up");
  await expect(dialog.getByTestId("recap-coins")).toHaveText(
    (expectedCents / 100).toFixed(2),
  );
  await expect(dialog.locator(".momentum-history .is-locked")).toHaveCount(0);
  const amounts = await dialog
    .locator(".momentum-history-coins b")
    .allTextContents();
  expect(
    amounts.reduce(
      (total, value) => total + Math.round(Number(value) * 100),
      0,
    ),
  ).toBe(expectedCents);
  await chapter(dialog, "Home");
  await expect(dialog.locator(".home-complete-check")).toHaveCount(7);
});

test("shared equipment needs permission before it can earn coins", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "My household", exact: true }).click();
  await page.getByLabel("Building type", { exact: true }).selectOption("multi");
  await page.getByLabel("Your role", { exact: true }).selectOption("resident");
  await page
    .locator(".asset-editor-row")
    .filter({ has: page.getByLabel("Heat pump status", { exact: true }) })
    .getByRole("checkbox", { name: "Shared equipment", exact: true })
    .check();
  await page
    .getByRole("button", { name: "Apply household changes", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Open Energy Momentum", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Energy Momentum",
    exact: true,
  });
  await chapter(dialog, "Actions");
  await expect(
    dialog.getByTestId("action-heatPump").getByRole("button"),
  ).toBeDisabled();
  await expect(dialog.getByTestId("action-heatPump")).toContainText(
    "building manager",
  );
  const balance = await dialog.getByTestId("story-coins").textContent();
  await chapter(dialog, "Timing");
  await expect(
    dialog
      .getByLabel("Chart flexibility", { exact: true })
      .locator('option[value="heatPump"]'),
  ).toHaveCount(0);
  await chapter(dialog, "Wrap-up");
  await expect(dialog.getByTestId("history-heatPump")).toHaveClass(/is-locked/);
  await expect(dialog.getByTestId("recap-coins")).toHaveText(balance!);
});

test("building-level residents cannot earn rewards without approval", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "My household", exact: true }).click();
  await page.getByLabel("Building type", { exact: true }).selectOption("multi");
  await page
    .getByLabel("Meter covers", { exact: true })
    .selectOption("building");
  await page.getByLabel("Your role", { exact: true }).selectOption("resident");
  await page
    .getByRole("button", { name: "Apply household changes", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Open Energy Momentum", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Energy Momentum",
    exact: true,
  });
  await expect(dialog.getByTestId("story-coins")).toHaveText("0.00");
  await chapter(dialog, "Actions");
  await expect(dialog.locator(".momentum-action-button:disabled")).toHaveCount(
    3,
  );
  await chapter(dialog, "Wrap-up");
  await expect(dialog.locator(".momentum-history .is-locked")).toHaveCount(7);
  await expect(dialog.getByTestId("recap-coins")).toHaveText("0.00");
});

test("a home without confirmed equipment has honest empty states", async ({
  page,
}) => {
  const dialog = await configureEquipment(page, "absent");
  await expect(dialog.locator("[data-equipment]")).toHaveCount(0);
  await expect(dialog.getByTestId("story-coins")).toHaveText("0.00");
  await chapter(dialog, "Timing");
  await expect(
    dialog.getByText(
      "No flexible equipment is confirmed for you to control yet.",
      { exact: true },
    ),
  ).toBeVisible();
  await chapter(dialog, "Actions");
  await expect(dialog.locator(".momentum-action-button")).toHaveCount(0);
  await chapter(dialog, "Wrap-up");
  await expect(dialog.getByTestId("recap-coins")).toHaveText("0.00");
  await expect(dialog.locator(".momentum-history .is-locked")).toHaveCount(7);
});

test("equipment and Lumi tips work with keyboard and dismiss without closing the story", async ({
  page,
}) => {
  const dialog = await openStory(page);
  await dialog.getByTestId("home-lighting").focus();
  await expect(dialog.getByRole("tooltip")).toContainText("Lighting");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("tooltip")).toHaveCount(0);
  for (const name of ["Home", "Timing", "Actions", "Ranking", "Wrap-up"]) {
    await chapter(dialog, name);
    const guide = dialog.getByRole("button", {
      name: `Ask Lumi about ${name.toLowerCase()}`,
      exact: true,
    });
    await guide.focus();
    await expect(dialog.getByRole("tooltip")).toContainText(
      "A little spark from Lumi",
    );
    await page.keyboard.press("Escape");
    await expect(dialog).toBeVisible();
    await expect(guide).toHaveAttribute("aria-expanded", "false");
  }
});

test("all five screens fit narrow and wide viewports and respect reduced motion", async ({
  page,
}) => {
  const dialog = await openStory(page);
  await expect(
    dialog.getByRole("button", {
      name: "Reduced motion is enabled",
      exact: true,
    }),
  ).toBeDisabled();
  await expect(dialog.locator(".momentum-energy-flow").first()).toHaveCSS(
    "animation-name",
    "none",
  );
  for (const width of [320, 768, 1920]) {
    await page.setViewportSize({ width, height: 950 });
    for (const name of ["Home", "Timing", "Actions", "Ranking", "Wrap-up"]) {
      await chapter(dialog, name);
      await expect
        .poll(() =>
          dialog.evaluate(
            (element) => element.scrollWidth - element.clientWidth,
          ),
        )
        .toBeLessThanOrEqual(1);
      await expect
        .poll(() =>
          dialog
            .locator(".momentum-content")
            .evaluate((element) => element.scrollWidth - element.clientWidth),
        )
        .toBeLessThanOrEqual(1);
      await expect(
        dialog.locator(".momentum-footer .momentum-primary"),
      ).toBeInViewport();
      expect(
        await dialog
          .locator(".momentum-footer .momentum-primary")
          .evaluate(
            (element) => element.scrollWidth <= element.clientWidth + 1,
          ),
      ).toBe(true);
      const guide = dialog.getByRole("button", {
        name: `Ask Lumi about ${name.toLowerCase()}`,
        exact: true,
      });
      await guide.focus();
      const tooltip = await dialog.getByRole("tooltip").boundingBox();
      expect(tooltip!.x).toBeGreaterThanOrEqual(0);
      expect(tooltip!.x + tooltip!.width).toBeLessThanOrEqual(width);
    }
  }
  await dialog.locator("h3").focus();
  await expect(dialog.getByTestId("momentum-celebration")).toBeHidden();
  for (let step = 0; step < 10; step += 1) {
    await page.keyboard.press("Tab");
    expect(
      await dialog.evaluate((element) =>
        element.contains(document.activeElement),
      ),
    ).toBe(true);
  }
});

test("energy dots and wrap-up coins animate, pause and reach the exact total", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const dialog = await openStory(page);
  const flow = dialog.locator(".momentum-energy-flow").first();
  await expect(dialog.locator(".flow-heatPump")).toHaveAttribute(
    "d",
    "M552 437V248",
  );
  const initialOffset = await flow.evaluate(
    (element) => getComputedStyle(element).strokeDashoffset,
  );
  await expect
    .poll(() =>
      flow.evaluate((element) => getComputedStyle(element).strokeDashoffset),
    )
    .not.toBe(initialOffset);
  await dialog
    .getByRole("button", { name: "Pause story animations", exact: true })
    .click();
  await expect(flow).toHaveCSS("animation-play-state", "paused");
  const total = await dialog.getByTestId("story-coins").textContent();
  await chapter(dialog, "Wrap-up");
  await expect(dialog.getByTestId("recap-coins")).toHaveText("0.00");
  await expect(dialog.locator(".momentum-flying-coin")).toHaveCount(12);
  await expect(dialog.locator(".momentum-firework i")).toHaveCount(36);
  await dialog
    .getByRole("button", { name: "Play story animations", exact: true })
    .click();
  await expect
    .poll(async () =>
      Number(await dialog.getByTestId("recap-coins").textContent()),
    )
    .toBeGreaterThan(0);
  expect(
    Number(await dialog.getByTestId("recap-coins").textContent()),
  ).toBeLessThan(Number(total));
  await expect
    .poll(() =>
      dialog
        .locator(".momentum-firework i")
        .evaluateAll((elements) =>
          elements.some(
            (element) => Number(getComputedStyle(element).opacity) > 0,
          ),
        ),
    )
    .toBe(true);
  await dialog.screenshot({
    path: `test-results/screens/energy-momentum-celebration-${testInfo.project.name}.png`,
    animations: "allow",
  });
  await dialog
    .getByRole("button", { name: "Pause story animations", exact: true })
    .click();
  await expect(dialog.locator(".momentum-flying-coin").first()).toHaveCSS(
    "animation-play-state",
    "paused",
  );
  const pausedValue = await dialog.getByTestId("recap-coins").textContent();
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await expect(dialog.getByTestId("recap-coins")).toHaveText(pausedValue!);
  await dialog
    .getByRole("button", { name: "Play story animations", exact: true })
    .click();
  await expect(dialog.getByTestId("recap-coins")).toHaveText(total!);
});

test("the downloaded recap contains only the demo action history", async ({
  page,
}, testInfo) => {
  const dialog = await openStory(page);
  await chapter(dialog, "Wrap-up");
  const downloadPromise = page.waitForEvent("download");
  await dialog
    .getByRole("button", { name: "Download my recap", exact: true })
    .click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("my-energy-momentum-recap.md");
  await download.saveAs(testInfo.outputPath("recap.md"));
  let text = "";
  for await (const chunk of await download.createReadStream())
    text += chunk.toString("utf8");
  expect(text).toContain("1.43 coins = CHF 1.43");
  expect(text).toContain("Bring a little warmth forward: 2 time(s)");
  expect(text).toContain("not verified savings");
  expect(text).not.toContain("SolarSophie");
  expect(text).not.toContain("observed");
  await expect(
    dialog.getByText("Recap downloaded. Nothing shared.", { exact: true }),
  ).toBeVisible();
});

test("your first-place ranking keeps its gold medal and row colour", async ({ page }) => {
  const dialog = await configureEquipment(page, "confirmed");
  await chapter(dialog, "Actions");
  const action = dialog.getByTestId("action-ev").locator(".momentum-action-button");
  for (let occurrence = 0; occurrence < 70; occurrence += 1) await action.click();
  await expect(dialog.getByTestId("story-coins")).toHaveText("130.11");
  await chapter(dialog, "Ranking");
  const yourRank = dialog.getByTestId("your-rank");
  await expect(yourRank).toHaveClass(/rank-gold/);
  await expect(yourRank).toHaveCSS("background-color", "rgb(252, 245, 222)");
  await expect(yourRank.locator(".lucide-medal")).toBeVisible();
  await expect(dialog.locator("tbody tr").first()).toContainText("You");
});
