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
  await page.waitForTimeout(3000);
  
  // 1. Welcome/Login screen
  console.log('1. Welcome screen');
  await page.screenshot({ path: 'screenshots/final-01-welcome.png' });
  
  // Click "Continue without signing in" - try multiple selectors
  try {
    await page.evaluate(() => {
      const links = document.querySelectorAll('span, p, div');
      for (const link of links) {
        if (link.textContent.includes('Continue without signing in')) {
          link.click();
          return;
        }
      }
    });
    await page.waitForTimeout(2000);
  } catch (e) {
    console.log('Click failed:', e.message);
  }
  
  // 2. Onboarding intro
  console.log('2. Onboarding intro');
  await page.screenshot({ path: 'screenshots/final-02-onboarding-intro.png' });
  
  // Click through onboarding with more robust clicking
  for (let i = 3; i <= 12; i++) {
    // Click any visible button
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('div[role="button"], button');
      for (const btn of buttons) {
        const text = btn.textContent.toLowerCase();
        if (text.includes("let's go") || text.includes('next') || text.includes('continue') || text.includes('start') || text.includes('finish') || text.includes('done')) {
          btn.click();
          return true;
        }
      }
      // Try TouchableOpacity (React Native)
      const touchables = document.querySelectorAll('[data-testid]');
      for (const t of touchables) {
        if (t.textContent.includes("Let's Go") || t.textContent.includes('Next')) {
          t.click();
          return true;
        }
      }
      return false;
    });
    
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `screenshots/final-${String(i).padStart(2, '0')}-step${i-2}.png` });
    console.log(`${i}. Captured step ${i-2}`);
    
    // Check if we reached the main screen (has tabs)
    const hasTabs = await page.evaluate(() => {
      return document.body.innerHTML.includes('Discover') && 
             document.body.innerHTML.includes('Menu') &&
             document.body.innerHTML.includes('tabBarIcon');
    });
    
    if (hasTabs) {
      console.log('Reached main app!');
      break;
    }
  }
  
  await browser.close();
  console.log('Done! Check screenshots folder.');
}

capture().catch(console.error);
