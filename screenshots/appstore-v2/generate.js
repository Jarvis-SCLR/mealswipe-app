const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const screenshots = [
  {
    id: '01',
    image: 'store-01-discover.png',
    tagline: 'Swipe Right<br>on Dinner',
    description: 'Discover recipes you\'ll love with a simple swipe'
  },
  {
    id: '02',
    image: 'store-02-saved.png',
    tagline: 'Build Your<br>Menu',
    description: 'Save favorites and organize by meal type'
  },
  {
    id: '03',
    image: 'store-03-plan.png',
    tagline: 'Plan<br>Together',
    description: 'Create a household and vote on recipes together'
  },
  {
    id: '04',
    image: 'store-04-shop.png',
    tagline: 'Shopping<br>Made Easy',
    description: 'Auto-generated grocery lists from your meal plan'
  },
  {
    id: '05',
    image: 'store-01b-discover-card2.png',
    tagline: 'Say Goodbye to<br>"What\'s for Dinner?"',
    description: 'Personalized recipes based on your preferences'
  }
];

const html = (screenshot, imageBase64) => `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      width: 1284px;
      height: 2778px;
      background: linear-gradient(180deg, #FF6B5B 0%, #FF8A65 50%, #FFAB76 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 80px 60px;
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif;
    }
    
    .tagline {
      color: white;
      font-size: 110px;
      font-weight: 700;
      text-align: center;
      text-shadow: 0 4px 8px rgba(0,0,0,0.15);
      line-height: 1.1;
      max-width: 1200px;
    }
    
    .phone-container {
      position: relative;
      width: 760px;
      height: 1640px;
    }
    
    .phone-frame {
      width: 100%;
      height: 100%;
      background: #1A1A1A;
      border-radius: 85px;
      padding: 16px;
      box-shadow: 0 60px 120px rgba(0,0,0,0.35), 0 25px 50px rgba(0,0,0,0.25);
    }
    
    .phone-screen {
      width: 100%;
      height: 100%;
      background: white;
      border-radius: 70px;
      overflow: hidden;
      position: relative;
    }
    
    .phone-screen img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: top;
    }
    
    .notch {
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 220px;
      height: 44px;
      background: #1A1A1A;
      border-radius: 0 0 24px 24px;
      z-index: 10;
    }
    
    .description {
      color: white;
      font-size: 72px;
      font-weight: 500;
      text-align: center;
      line-height: 1.3;
      max-width: 1200px;
      opacity: 0.95;
    }
  </style>
</head>
<body>
  <div class="tagline">${screenshot.tagline}</div>
  
  <div class="phone-container">
    <div class="phone-frame">
      <div class="phone-screen">
        <div class="notch"></div>
        <img src="data:image/png;base64,${imageBase64}" alt="App Screenshot">
      </div>
    </div>
  </div>
  
  <div class="description">${screenshot.description}</div>
</body>
</html>`;

async function generate() {
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1284, height: 2778, deviceScaleFactor: 1 });
  
  const screenshotsDir = path.resolve(__dirname, '..');
  const outputDir = path.resolve(__dirname);
  
  for (const screenshot of screenshots) {
    console.log(`Generating ${screenshot.id}...`);
    
    // Read image and convert to base64
    const imagePath = path.join(screenshotsDir, screenshot.image);
    const imageBuffer = fs.readFileSync(imagePath);
    const imageBase64 = imageBuffer.toString('base64');
    
    const htmlContent = html(screenshot, imageBase64);
    await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });
    
    // Wait for image to render
    await new Promise(r => setTimeout(r, 500));
    
    const filename = `${screenshot.id}-${screenshot.tagline.replace(/<br>/g, '-').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase()}.png`;
    await page.screenshot({
      path: path.join(outputDir, filename),
      type: 'png'
    });
    
    console.log(`  ✓ Saved ${filename}`);
  }
  
  await browser.close();
  console.log('\\nDone! Generated 5 App Store screenshots at 1284x2778px');
}

generate().catch(console.error);
