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
  
  // Capture login screen
  await page.screenshot({ path: 'screenshots/app-01-login.png' });
  console.log('1. Login screen captured');
  
  // Set the localStorage values with proper names used by AsyncStorage on web
  await page.evaluate(() => {
    // AsyncStorage on web uses these formats
    localStorage.setItem('signInSkipped', 'true');
    localStorage.setItem('onboardingComplete', 'true');
    
    // Also try prefixed versions that some RN async storage adapters use
    localStorage.setItem('@MealSwipe:signInSkipped', 'true');
    localStorage.setItem('@MealSwipe:onboardingComplete', 'true');
    
    // Try userPreferences with onboardingComplete
    const prefs = {
      onboardingComplete: true,
      dietary: [],
      allergies: [],
      appliances: [],
      cuisine: [],
      householdSize: 2
    };
    localStorage.setItem('userPreferences', JSON.stringify(prefs));
    localStorage.setItem('@MealSwipe:userPreferences', JSON.stringify(prefs));
  });
  
  // Reload to apply
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  
  // Capture current state
  await page.screenshot({ path: 'screenshots/app-02-after-bypass.png' });
  console.log('2. After bypass captured');
  
  // If still on login, click through manually
  try {
    // Click "Continue without signing in"
    const skipLink = page.locator('text=Continue without signing in');
    if (await skipLink.isVisible({ timeout: 2000 })) {
      await skipLink.click();
      await page.waitForTimeout(2000);
      console.log('Clicked skip sign in');
    }
  } catch (e) {}
  
  await page.screenshot({ path: 'screenshots/app-03-after-skip.png' });
  console.log('3. After skip captured');
  
  // Click "Let's Go" button if present (click position at bottom of screen)
  try {
    // Try clicking on the "Let's Go" button area
    await page.click('text=Let\'s Go', { timeout: 3000 });
    await page.waitForTimeout(2000);
    console.log('Clicked Let\'s Go');
  } catch (e) {
    console.log('No Let\'s Go button');
  }
  
  await page.screenshot({ path: 'screenshots/app-04-after-letsgo.png' });
  console.log('4. After Let\'s Go captured');
  
  // Click through any remaining onboarding steps
  for (let i = 5; i <= 15; i++) {
    try {
      // Try to click Next/Continue buttons
      const nextBtn = page.locator('text=Next').or(page.locator('text=Continue')).or(page.locator('text=Finish')).or(page.locator('text=Start Swiping'));
      if (await nextBtn.count() > 0) {
        await nextBtn.first().click({ timeout: 2000 });
        await page.waitForTimeout(1500);
        await page.screenshot({ path: `screenshots/app-${String(i).padStart(2, '0')}-step.png` });
        console.log(`${i}. Step captured`);
      } else {
        break;
      }
    } catch (e) {
      break;
    }
  }
  
  // Final state
  await page.screenshot({ path: 'screenshots/app-final.png' });
  console.log('Final screen captured');
  
  await browser.close();
  console.log('Done!');
}

capture().catch(console.error);
