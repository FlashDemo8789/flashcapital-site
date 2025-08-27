const puppeteer = require('puppeteer');
const path = require('path');

async function quickTest() {
    console.log('🧪 Testing FLASH Success UI...\n');
    
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1200, height: 800 },
        slowMo: 300
    });
    
    try {
        const page = await browser.newPage();
        
        // Test the success-test.html file
        const testPath = `file://${path.resolve('/tmp/waitlist/success-test.html')}`;
        console.log('📂 Loading test file...');
        await page.goto(testPath);
        
        // Wait for page to load
        await page.waitForSelector('.test-button');
        console.log('✅ Page loaded successfully');
        
        // Click the test button
        console.log('🎯 Clicking test button...');
        await page.click('button[onclick="showSuccess()"]');
        
        // Wait for success animation
        await page.waitForSelector('.success-message.show', { timeout: 3000 });
        console.log('✅ Success message appeared');
        
        // Check if checkmark is visible
        const checkmarkInfo = await page.evaluate(() => {
            const checkmark = document.querySelector('.success-checkmark');
            const beforeContent = window.getComputedStyle(checkmark, '::before').content;
            const backgroundColor = window.getComputedStyle(document.querySelector('.success-message')).background;
            
            return {
                checkmarkVisible: checkmark && window.getComputedStyle(checkmark).opacity !== '0',
                checkmarkSymbol: beforeContent,
                successBackground: backgroundColor.includes('rgb(52, 199, 89)') || backgroundColor.includes('#34c759'),
                checkmarkSize: checkmark ? window.getComputedStyle(checkmark).width : null
            };
        });
        
        console.log('🔍 Checkmark Details:');
        console.log(`  ✓ Checkmark visible: ${checkmarkInfo.checkmarkVisible}`);
        console.log(`  ✓ Checkmark symbol: ${checkmarkInfo.checkmarkSymbol}`);
        console.log(`  ✓ Green background: ${checkmarkInfo.successBackground}`);
        console.log(`  ✓ Checkmark size: ${checkmarkInfo.checkmarkSize}`);
        
        // Take screenshot
        await page.screenshot({ 
            path: '/tmp/waitlist/success-ui-test.png',
            fullPage: true 
        });
        console.log('📸 Screenshot saved: success-ui-test.png');
        
        // Keep browser open for 3 seconds to see the result
        console.log('⏳ Displaying result for 3 seconds...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Test the reset functionality
        console.log('🔄 Testing reset...');
        await page.click('button[onclick="hideSuccess()"]');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('✅ Test completed successfully!');
        
        if (checkmarkInfo.checkmarkVisible && checkmarkInfo.successBackground) {
            console.log('\n🎉 SUCCESS: Green checkmark UI is working perfectly!');
            console.log('📋 Ready for deployment to flash.onl');
        } else {
            console.log('\n❌ ISSUE: Something is not working correctly');
            console.log('🔧 Check the screenshot for details');
        }
        
        await page.close();
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await browser.close();
    }
}

quickTest().catch(console.error);