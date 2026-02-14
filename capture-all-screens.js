const { chromium } = require('playwright');

async function captureAllScreens() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
  });
  const page = await context.newPage();
  
  console.log('Loading app...');
  await page.goto('http://localhost:8090', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  // 1. Welcome/Login screen
  console.log('1. Welcome screen');
  await page.screenshot({ path: 'screenshots/01-welcome.png' });
  
  // Click "Continue without signing in"
  try {
    await page.click('text=Continue without signing in', { timeout: 5000 });
    await page.waitForTimeout(2000);
  } catch (e) {
    console.log('Continue click failed:', e.message);
  }
  
  // Capture onboarding steps
  for (let i = 2; i <= 10; i++) {
    console.log(`${i}. Capturing onboarding step...`);
    await page.screenshot({ path: `screenshots/0${i}-onboarding-${i-1}.png` });
    
    // Try to click "Let's Go" or "Next" or "Continue"
    try {
      const nextBtn = page.locator('button:has-text("Let\'s Go"), button:has-text("Next"), button:has-text("Continue"), button:has-text("Start")');
      if (await nextBtn.count() > 0) {
        await nextBtn.first().click({ timeout: 3000 });
        await page.waitForTimeout(1500);
      } else {
        console.log('No next button found');
        break;
      }
    } catch (e) {
      console.log('No more onboarding steps');
      break;
    }
  }
  
  // Main swipe screen
  console.log('Main swipe screen');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'screenshots/main-swipe.png' });
  
  // Check for tabs at bottom
  const tabNames = ['Discover', 'Menu', 'Planner', 'Grocery', 'Profile', 'Home'];
  for (const tab of tabNames) {
    try {
      const tabEl = page.locator(`text=${tab}`).first();
      if (await tabEl.isVisible({ timeout: 1000 })) {
        await tabEl.click();
        await page.waitForTimeout(1500);
        await page.screenshot({ path: `screenshots/tab-${tab.toLowerCase()}.png` });
        console.log(`Captured ${tab} tab`);
      }
    } catch (e) {
      // Tab not found
    }
  }
  
  await browser.close();
  console.log('Done!');
}

captureAllScreens().catch(console.error);
