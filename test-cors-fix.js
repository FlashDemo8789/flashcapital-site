const puppeteer = require('puppeteer');
const path = require('path');

async function testCORSFix() {
    console.log('🔧 Testing CORS Fix for Green Checkmark...\n');
    
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1200, height: 800 },
        slowMo: 300
    });
    
    try {
        const page = await browser.newPage();
        
        // Test the CORS fix file
        const testPath = `file://${path.resolve('/tmp/waitlist/test-cors-fix.html')}`;
        console.log('📂 Loading CORS fix test...');
        await page.goto(testPath);
        
        // Wait for page to load
        await page.waitForSelector('#testForm');
        console.log('✅ Test page loaded');
        
        // Enable console logging from browser
        page.on('console', msg => {
            if (msg.text().includes('Form submitted successfully') || 
                msg.text().includes('ERROR') ||
                msg.text().includes('SUCCESS')) {
                console.log(`🌐 Browser: ${msg.text()}`);
            }
        });
        
        // Submit the test form
        console.log('🎯 Submitting form with CORS fix...');
        await page.click('#submitBtn');
        
        // Wait for either success or error
        try {
            await page.waitForSelector('.success-message.show', { timeout: 10000 });
            console.log('✅ Success message appeared');
            
            // Check if checkmark is visible
            const checkmarkVisible = await page.evaluate(() => {
                const checkmark = document.querySelector('.success-checkmark');
                const successMessage = document.querySelector('.success-message.show');
                
                return {
                    checkmarkExists: !!checkmark,
                    successVisible: !!successMessage,
                    checkmarkOpacity: checkmark ? window.getComputedStyle(checkmark).opacity : 0,
                    backgroundGreen: successMessage ? window.getComputedStyle(successMessage).background.includes('rgb(52, 199, 89)') : false
                };
            });
            
            console.log('🔍 Visual Check:');
            console.log(`  ✓ Checkmark exists: ${checkmarkVisible.checkmarkExists}`);
            console.log(`  ✓ Success visible: ${checkmarkVisible.successVisible}`);
            console.log(`  ✓ Checkmark opacity: ${checkmarkVisible.checkmarkOpacity}`);
            console.log(`  ✓ Green background: ${checkmarkVisible.backgroundGreen}`);
            
            // Take screenshot
            await page.screenshot({ 
                path: '/tmp/waitlist/cors-fix-success.png',
                fullPage: true 
            });
            console.log('📸 Success screenshot saved');
            
            if (checkmarkVisible.successVisible && checkmarkVisible.backgroundGreen) {
                console.log('\n🎉 CORS FIX SUCCESSFUL!');
                console.log('✅ Green checkmark is now working');
                console.log('📋 Ready to deploy to live site');
            } else {
                console.log('\n❌ Issue with success UI display');
            }
            
        } catch (error) {
            // Check if error message appeared instead
            const errorVisible = await page.evaluate(() => {
                return document.querySelector('.error-message').style.display !== 'none';
            });
            
            if (errorVisible) {
                console.log('❌ Error message appeared - CORS fix may not be working');
            } else {
                console.log('⏰ Timeout waiting for response - this is normal with no-cors mode');
                console.log('🔄 Checking if success appeared anyway...');
                
                // Sometimes success appears after timeout
                const lateSuccess = await page.evaluate(() => {
                    return !!document.querySelector('.success-message.show');
                });
                
                if (lateSuccess) {
                    console.log('✅ Success appeared after timeout - CORS fix working!');
                } else {
                    console.log('❌ No success message - fix may need adjustment');
                }
            }
        }
        
        // Keep browser open for inspection
        console.log('\n⏳ Keeping browser open for 5 seconds...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        await page.close();
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await browser.close();
    }
}

testCORSFix().catch(console.error);