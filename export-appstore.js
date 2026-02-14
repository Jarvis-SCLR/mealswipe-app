const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function exportScreenshots() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Load the generator HTML
  const htmlPath = `file://${path.join(__dirname, 'appstore-generator.html')}`;
  console.log('Loading generator:', htmlPath);
  await page.goto(htmlPath, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  // Create output directory
  const outputDir = path.join(__dirname, 'screenshots', 'appstore-final');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Screenshot configurations
  const screens = [
    { id: 'screen1', name: '01-swipe-right-on-dinner' },
    { id: 'screen2', name: '02-build-your-menu' },
    { id: 'screen3', name: '03-plan-together' },
    { id: 'screen4', name: '04-shopping-made-easy' },
    { id: 'screen5', name: '05-say-goodbye' },
  ];
  
  for (const screen of screens) {
    console.log(`Exporting ${screen.name}...`);
    const element = await page.$(`#${screen.id}`);
    if (element) {
      // Get the actual size (before scaling)
      const box = await element.boundingBox();
      
      // Take screenshot of the element
      await element.screenshot({
        path: path.join(outputDir, `${screen.name}.png`),
      });
      console.log(`  Saved: ${screen.name}.png`);
    }
  }
  
  await browser.close();
  console.log('Done! Screenshots saved to:', outputDir);
}

exportScreenshots().catch(console.error);
