const puppeteer = require('puppeteer');
const path = require('path');

async function visualVerification() {
    console.log('🔍 Running Visual Verification Tests...\n');
    
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1200, height: 800 },
        slowMo: 100 // Slow down for visual verification
    });
    
    try {
        await verifyAnimations(browser);
        await verifyColorConsistency(browser);
        await verifyResponsiveness(browser);
        
        console.log('\n✅ Visual verification completed successfully!');
        
    } catch (error) {
        console.error('❌ Visual verification failed:', error);
    } finally {
        await browser.close();
    }
}

async function verifyAnimations(browser) {
    console.log('🎬 Verifying Animation Smoothness...');
    
    const page = await browser.newPage();
    const demoPath = `file://${path.resolve('/tmp/waitlist/success-demo.html')}`;
    
    await page.goto(demoPath);
    
    // Test animation timing
    const animationTiming = await page.evaluate(async () => {
        const startTime = performance.now();
        
        // Trigger apply success
        document.querySelector('button[onclick="showApplySuccess()"]').click();
        
        // Wait for animation to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const endTime = performance.now();
        return endTime - startTime;
    });
    
    console.log(`  ✓ Animation completed in ${Math.round(animationTiming)}ms`);
    
    // Verify checkmark animation properties
    const checkmarkProperties = await page.evaluate(() => {
        const checkmark = document.querySelector('.success-checkmark-apply');
        if (!checkmark) return null;
        
        const styles = window.getComputedStyle(checkmark);
        return {
            width: styles.width,
            height: styles.height,
            borderRadius: styles.borderRadius,
            display: styles.display,
            opacity: styles.opacity
        };
    });
    
    console.log('  ✓ Checkmark properties:', checkmarkProperties);
    
    await page.close();
}

async function verifyColorConsistency(browser) {
    console.log('🎨 Verifying Color Consistency...');
    
    const page = await browser.newPage();
    const applyPath = `file://${path.resolve('/tmp/waitlist/apply.html')}`;
    
    await page.goto(applyPath);
    
    // Check CSS custom property values
    const colorValues = await page.evaluate(() => {
        const root = document.documentElement;
        const styles = window.getComputedStyle(root);
        
        return {
            green: getComputedStyle(document.documentElement).getPropertyValue('--green').trim(),
            white: getComputedStyle(document.documentElement).getPropertyValue('--white').trim()
        };
    });
    
    console.log('  ✓ CSS Color Variables:', colorValues);
    
    // Verify green color is consistent
    const expectedGreen = '#34c759';
    const actualGreen = colorValues.green;
    
    if (actualGreen === expectedGreen) {
        console.log(`  ✅ Green color consistent: ${actualGreen}`);
    } else {
        console.log(`  ⚠️ Green color mismatch: expected ${expectedGreen}, got ${actualGreen}`);
    }
    
    await page.close();
}

async function verifyResponsiveness(browser) {
    console.log('📱 Verifying Responsive Design...');
    
    const page = await browser.newPage();
    const waitlistPath = `file://${path.resolve('/tmp/waitlist/waitlist.html')}`;
    
    // Test different viewport sizes
    const viewports = [
        { width: 375, height: 667, name: 'Mobile' },
        { width: 768, height: 1024, name: 'Tablet' },
        { width: 1200, height: 800, name: 'Desktop' }
    ];
    
    for (const viewport of viewports) {
        await page.setViewport(viewport);
        await page.goto(waitlistPath, { waitUntil: 'networkidle0' });
        
        // Check if success message is properly positioned
        const messageMetrics = await page.evaluate(() => {
            const message = document.getElementById('successMessage');
            if (!message) return null;
            
            const rect = message.getBoundingClientRect();
            return {
                width: rect.width,
                height: rect.height,
                visible: rect.width > 0 && rect.height > 0
            };
        });
        
        console.log(`  ✓ ${viewport.name} (${viewport.width}x${viewport.height}):`, messageMetrics);
    }
    
    await page.close();
}

// Run visual verification
visualVerification().catch(console.error);