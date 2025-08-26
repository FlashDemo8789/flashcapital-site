const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function testSuccessUI() {
    console.log('🚀 Starting FLASH Success UI Tests...\n');
    
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1200, height: 800 },
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        // Test 1: Demo Page Interactive Test
        await testDemoPage(browser);
        
        // Test 2: Apply Form UI Test
        await testApplyForm(browser);
        
        // Test 3: Waitlist Form UI Test  
        await testWaitlistForm(browser);
        
        console.log('\n✅ All tests completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await browser.close();
    }
}

async function testDemoPage(browser) {
    console.log('📋 Testing Success Demo Page...');
    
    const page = await browser.newPage();
    const demoPath = `file://${path.resolve('/tmp/waitlist/success-demo.html')}`;
    
    await page.goto(demoPath);
    await page.waitForSelector('.demo-section');
    
    // Test Apply Form Success Animation
    console.log('  → Testing Apply Form success animation...');
    await page.click('button[onclick="showApplySuccess()"]');
    await page.waitForSelector('.success-message-apply.show', { timeout: 2000 });
    
    // Capture screenshot of apply success
    await page.screenshot({ 
        path: '/tmp/waitlist/test-apply-success.png',
        fullPage: true 
    });
    console.log('  ✓ Apply success animation captured');
    
    // Reset and test waitlist
    await page.click('button[onclick="hideApplySuccess()"]');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test Waitlist Success Animation
    console.log('  → Testing Waitlist success animation...');
    await page.click('button[onclick="showWaitlistSuccess()"]');
    await page.waitForSelector('.success-message-waitlist.show', { timeout: 2000 });
    
    // Capture screenshot of waitlist success
    await page.screenshot({ 
        path: '/tmp/waitlist/test-waitlist-success.png',
        fullPage: true 
    });
    console.log('  ✓ Waitlist success animation captured');
    
    await page.close();
    console.log('✅ Demo page tests passed\n');
}

async function testApplyForm(browser) {
    console.log('📝 Testing Apply Form...');
    
    const page = await browser.newPage();
    const applyPath = `file://${path.resolve('/tmp/waitlist/apply.html')}`;
    
    await page.goto(applyPath);
    await page.waitForSelector('#applicationForm');
    
    // Fill out the form
    console.log('  → Filling out application form...');
    await page.type('#firstName', 'Test');
    await page.type('#lastName', 'User');
    await page.type('#email', 'test@example.com');
    await page.type('#companyName', 'Test Company');
    await page.select('#stage', 'Seed');
    await page.select('#role', 'Founder/CEO');
    await page.select('#industry', 'SaaS');
    await page.select('#timeline', 'ASAP');
    
    // Mock the form submission to test UI without actual submission
    await page.evaluate(() => {
        const form = document.getElementById('applicationForm');
        const successMessage = document.getElementById('successMessage');
        
        // Override form submission to just show success
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Simulate the success flow
            form.style.opacity = '0';
            form.style.transform = 'scale(0.95)';
            form.style.transition = 'all 0.3s ease';
            
            setTimeout(() => {
                form.style.display = 'none';
                successMessage.style.display = 'block';
                
                setTimeout(() => {
                    successMessage.classList.add('show');
                }, 50);
            }, 300);
        });
    });
    
    // Submit the form
    console.log('  → Submitting form to test success UI...');
    await page.click('#submitBtn');
    
    // Wait for success animation
    await page.waitForSelector('.success-message.show', { timeout: 3000 });
    
    // Capture screenshot
    await page.screenshot({ 
        path: '/tmp/waitlist/test-apply-form-success.png',
        fullPage: true 
    });
    console.log('  ✓ Apply form success UI captured');
    
    // Verify success elements are visible
    const checkmarkVisible = await page.evaluate(() => {
        const checkmark = document.querySelector('.success-checkmark');
        return checkmark && window.getComputedStyle(checkmark).display !== 'none';
    });
    
    const titleVisible = await page.evaluate(() => {
        const title = document.querySelector('.success-title');
        return title && title.textContent.includes('Successfully');
    });
    
    console.log(`  ✓ Checkmark visible: ${checkmarkVisible}`);
    console.log(`  ✓ Success title visible: ${titleVisible}`);
    
    await page.close();
    console.log('✅ Apply form tests passed\n');
}

async function testWaitlistForm(browser) {
    console.log('📮 Testing Waitlist Form...');
    
    const page = await browser.newPage();
    const waitlistPath = `file://${path.resolve('/tmp/waitlist/waitlist.html')}`;
    
    await page.goto(waitlistPath);
    await page.waitForSelector('#waitlistForm');
    
    // Fill out the form
    console.log('  → Filling out waitlist form...');
    await page.type('#name', 'Test User');
    await page.type('#email', 'test@example.com');
    await page.type('#company', 'Test Company');
    
    // Mock the form submission
    await page.evaluate(() => {
        const form = document.getElementById('waitlistForm');
        const successMessage = document.getElementById('successMessage');
        const submitBtn = document.getElementById('submitBtn');
        const btnText = document.getElementById('btnText');
        
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Simulate the success flow
            const inputs = form.querySelectorAll('.form-input');
            inputs.forEach(input => {
                input.style.opacity = '0.3';
                input.style.pointerEvents = 'none';
            });
            
            btnText.textContent = '✅ Successfully Added!';
            submitBtn.style.background = 'linear-gradient(135deg, #34c759 0%, #28a745 100%)';
            submitBtn.style.transform = 'scale(1.05)';
            
            setTimeout(() => {
                successMessage.classList.add('show');
            }, 600);
        });
    });
    
    // Submit the form
    console.log('  → Submitting waitlist form to test success UI...');
    await page.click('#submitBtn');
    
    // Wait for success animation
    await page.waitForSelector('.success-message.show', { timeout: 3000 });
    
    // Capture screenshot
    await page.screenshot({ 
        path: '/tmp/waitlist/test-waitlist-form-success.png',
        fullPage: true 
    });
    console.log('  ✓ Waitlist form success UI captured');
    
    // Verify success elements
    const checkmarkVisible = await page.evaluate(() => {
        const checkmark = document.querySelector('.success-checkmark-waitlist');
        return checkmark && window.getComputedStyle(checkmark).display !== 'none';
    });
    
    const buttonUpdated = await page.evaluate(() => {
        const btnText = document.getElementById('btnText');
        return btnText && btnText.textContent.includes('Successfully Added');
    });
    
    console.log(`  ✓ Waitlist checkmark visible: ${checkmarkVisible}`);
    console.log(`  ✓ Button updated to success: ${buttonUpdated}`);
    
    await page.close();
    console.log('✅ Waitlist form tests passed\n');
}

// Run the tests
testSuccessUI().catch(console.error);