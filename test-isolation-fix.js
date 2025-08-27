const puppeteer = require('puppeteer');
const path = require('path');

async function testIsolationFix() {
    console.log('🧪 Testing Script Isolation Fix...\n');
    
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1200, height: 800 },
        slowMo: 300
    });
    
    try {
        const page = await browser.newPage();
        
        // Load local file
        const testPath = `file://${path.resolve('/tmp/waitlist/apply.html')}`;
        console.log('📂 Loading local apply.html...');
        await page.goto(testPath);
        
        // Enable console logging
        page.on('console', msg => {
            const text = msg.text();
            if (text.includes('🚀') || text.includes('✅') || text.includes('❌') || 
                text.includes('📋') || text.includes('🎉') || text.includes('⚠️')) {
                console.log(`🌐 Browser: ${text}`);
            }
        });
        
        // Wait for form to load
        await page.waitForSelector('#applicationForm');
        console.log('✅ Form loaded successfully');
        
        // Wait for our script to initialize (it has a 200ms delay)
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Fill out the form
        console.log('📝 Filling out test form...');
        await page.type('input[name="firstName"]', 'Test');
        await page.type('input[name="lastName"]', 'User');
        await page.type('input[name="email"]', 'test@example.com');
        await page.type('input[name="companyName"]', 'Test Company');
        
        await page.select('select[name="stage"]', 'Pre-seed');
        await page.select('select[name="role"]', 'Founder/CEO');
        await page.select('select[name="industry"]', 'Technology');
        await page.select('select[name="timeline"]', '3-6 months');
        await page.select('select[name="source"]', 'Social Media');
        
        console.log('✅ Form filled successfully');
        
        // Submit the form
        console.log('🎯 Submitting form...');
        await page.click('#submitBtn');
        
        // Wait for success message
        try {
            await page.waitForSelector('.success-message.show', { timeout: 10000 });
            console.log('🎉 SUCCESS MESSAGE APPEARED!');
            
            // Check visual elements
            const successCheck = await page.evaluate(() => {
                const successMsg = document.querySelector('.success-message.show');
                const checkmark = document.querySelector('.success-checkmark');
                
                return {
                    successVisible: !!successMsg,
                    checkmarkVisible: !!checkmark,
                    hasGreenBackground: successMsg ? window.getComputedStyle(successMsg).background.includes('rgb(52, 199, 89)') : false,
                    formHidden: document.querySelector('#applicationForm').style.display === 'none'
                };
            });
            
            console.log('🔍 Visual Check Results:');
            console.log(`  ✓ Success visible: ${successCheck.successVisible}`);
            console.log(`  ✓ Checkmark visible: ${successCheck.checkmarkVisible}`);
            console.log(`  ✓ Green background: ${successCheck.hasGreenBackground}`);
            console.log(`  ✓ Form hidden: ${successCheck.formHidden}`);
            
            if (successCheck.successVisible && successCheck.hasGreenBackground) {
                console.log('\n🎉 SCRIPT ISOLATION FIX SUCCESSFUL!');
                console.log('✅ Green checkmark is working with error handling');
                console.log('🚀 Ready to deploy to live site');
            }
            
            // Take screenshot
            await page.screenshot({ 
                path: '/tmp/waitlist/isolation-fix-success.png',
                fullPage: true 
            });
            console.log('📸 Success screenshot saved');
            
        } catch (error) {
            console.log('❌ Success message did not appear:', error.message);
            
            // Take screenshot for debugging
            await page.screenshot({ 
                path: '/tmp/waitlist/isolation-fix-failed.png',
                fullPage: true 
            });
            console.log('📸 Debug screenshot saved');
        }
        
        // Keep browser open for inspection
        console.log('\n⏳ Keeping browser open for 5 seconds...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await browser.close();
    }
}

testIsolationFix().catch(console.error);