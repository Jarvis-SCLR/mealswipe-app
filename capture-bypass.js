const { chromium } = require('playwright');

async function capture() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
  });
  const page = await context.newPage();
  
  // Set onboarding completed in localStorage before navigation
  await page.addInitScript(() => {
    localStorage.setItem('onboardingCompleted', 'true');
    localStorage.setItem('hasCompletedOnboarding', 'true');
    localStorage.setItem('onboarding_complete', 'true');
  });
  
  console.log('Loading app (bypassing onboarding)...');
  await page.goto('http://localhost:8090', { waitUntil: 'networkidle' });
  await page.waitForTimeout(4000);
  
  // Capture current screen
  console.log('Capturing main screen...');
  await page.screenshot({ path: 'screenshots/bypass-main.png' });
  
  // Try direct navigation to tabs
  console.log('Trying direct URLs...');
  
  const routes = [
    { url: 'http://localhost:8090/(tabs)', name: 'tabs-index' },
    { url: 'http://localhost:8090/(tabs)/index', name: 'discover' },
    { url: 'http://localhost:8090/(tabs)/menu', name: 'menu' },
    { url: 'http://localhost:8090/(tabs)/planner', name: 'planner' },
    { url: 'http://localhost:8090/(tabs)/groceries', name: 'groceries' },
    { url: 'http://localhost:8090/(tabs)/profile', name: 'profile' },
  ];
  
  for (const route of routes) {
    try {
      await page.goto(route.url, { waitUntil: 'networkidle', timeout: 10000 });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: `screenshots/route-${route.name}.png` });
      console.log(`Captured ${route.name}`);
    } catch (e) {
      console.log(`Failed ${route.name}: ${e.message}`);
    }
  }
  
  await browser.close();
  console.log('Done!');
}

capture().catch(console.error);
