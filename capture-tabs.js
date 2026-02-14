const { chromium } = require('playwright');

async function capture() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
  });
  const page = await context.newPage();
  
  console.log('Loading app...');
  await page.goto('http://localhost:8090', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  // Set localStorage to skip login
  await page.evaluate(() => {
    localStorage.setItem('signInSkipped', 'true');
    localStorage.setItem('onboardingComplete', 'true');
    const prefs = {
      onboardingComplete: true,
      dietary: ['vegetarian'],
      allergies: ['peanuts'],
      appliances: ['oven', 'stovetop', 'airFryer'],
      cuisine: ['italian', 'mexican', 'asian'],
      householdSize: 2
    };
    localStorage.setItem('userPreferences', JSON.stringify(prefs));
  });
  
  // Click through login
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  try {
    await page.click('text=Continue without signing in', { timeout: 3000 });
    await page.waitForTimeout(2000);
  } catch (e) {}
  
  // Main swipe screen - Discover tab
  console.log('Capturing Discover tab...');
  await page.screenshot({ path: 'screenshots/store-01-discover.png' });
  
  // Try to get a few different recipe cards by swiping
  for (let i = 0; i < 3; i++) {
    try {
      // Click the heart button to like the recipe
      await page.click('circle:near(:text("❌"))', { timeout: 1000 });
      await page.waitForTimeout(1500);
    } catch (e) {
      // Try clicking X button instead
      try {
        const xBtn = page.locator('div').filter({ has: page.locator('text=×') }).first();
        await xBtn.click({ timeout: 1000 });
        await page.waitForTimeout(1500);
      } catch (e2) {}
    }
  }
  
  await page.screenshot({ path: 'screenshots/store-01b-discover-card2.png' });
  
  // Navigate to each tab
  const tabs = [
    { name: 'Saved', file: 'store-02-saved' },
    { name: 'Plan', file: 'store-03-plan' },
    { name: 'Shop', file: 'store-04-shop' },
    { name: 'Create', file: 'store-05-create' },
    { name: 'Me', file: 'store-06-profile' },
  ];
  
  for (const tab of tabs) {
    try {
      console.log(`Capturing ${tab.name} tab...`);
      await page.click(`text=${tab.name}`, { timeout: 3000 });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: `screenshots/${tab.file}.png` });
    } catch (e) {
      console.log(`Could not capture ${tab.name}: ${e.message}`);
    }
  }
  
  // Go back to Discover to show swiping
  await page.click('text=Discover', { timeout: 3000 });
  await page.waitForTimeout(1000);
  
  await browser.close();
  console.log('Done!');
}

capture().catch(console.error);
