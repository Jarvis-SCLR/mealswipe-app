const { chromium } = require('playwright');

async function captureScreenshots() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
  });
  const page = await context.newPage();
  
  // Navigate to the app
  console.log('Loading app...');
  await page.goto('http://localhost:8090', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  // Screenshot 1: Welcome screen
  console.log('Capturing welcome screen...');
  await page.screenshot({ path: 'screenshots/01-welcome.png' });
  
  // Click "Continue without signing in"
  console.log('Clicking continue...');
  try {
    await page.click('text=Continue without signing in', { timeout: 5000 });
    await page.waitForTimeout(3000);
  } catch (e) {
    console.log('Could not click continue:', e.message);
  }
  
  // Screenshot 2: Onboarding or main swipe screen
  console.log('Capturing after click...');
  await page.screenshot({ path: 'screenshots/02-after-login.png' });
  
  // Try to navigate through onboarding if present
  for (let i = 0; i < 5; i++) {
    try {
      const nextButton = await page.$('text=Next, text=Continue, text=Get Started');
      if (nextButton) {
        await nextButton.click();
        await page.waitForTimeout(1500);
        await page.screenshot({ path: `screenshots/0${3+i}-step${i+1}.png` });
      }
    } catch (e) {
      break;
    }
  }
  
  // Screenshot the main swipe screen
  console.log('Capturing swipe screen...');
  await page.screenshot({ path: 'screenshots/swipe-screen.png' });
  
  // Try clicking different tabs
  const tabs = ['menu', 'planner', 'groceries', 'profile'];
  for (const tab of tabs) {
    try {
      const tabElement = await page.$(`[href*="${tab}"], text=${tab}`, { timeout: 2000 });
      if (tabElement) {
        await tabElement.click();
        await page.waitForTimeout(1500);
        await page.screenshot({ path: `screenshots/${tab}.png` });
      }
    } catch (e) {
      console.log(`Could not navigate to ${tab}`);
    }
  }
  
  await browser.close();
  console.log('Done!');
}

captureScreenshots().catch(console.error);
