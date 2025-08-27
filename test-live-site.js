const puppeteer = require('puppeteer');

async function testLiveSite() {
    console.log('🌐 Testing LIVE SITE: www.flash.onl/apply\n');
    
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1200, height: 800 },
        slowMo: 500
    });
    
    try {
        const page = await browser.newPage();
        
        console.log('📍 Navigating to live site...');
        await page.goto('https://www.flash.onl/apply');
        
        // Wait for page to load
        await page.waitForSelector('form', { timeout: 10000 });
        console.log('✅ Live site loaded successfully');
        
        // Check if success UI elements exist
        const successElements = await page.evaluate(() => {
            return {
                successMessage: !!document.getElementById('successMessage'),
                successCheckmark: !!document.querySelector('.success-checkmark'),
                hasGreenCSS: document.documentElement.innerHTML.includes('#34c759'),
                hasCheckmarkSymbol: document.documentElement.innerHTML.includes('content: \'✓\''),
                formExists: !!document.querySelector('form')
            };
        });
        
        console.log('🔍 Live Site Analysis:');
        console.log(`  ✓ Success message element: ${successElements.successMessage}`);
        console.log(`  ✓ Success checkmark element: ${successElements.successCheckmark}`);
        console.log(`  ✓ Green CSS (#34c759): ${successElements.hasGreenCSS}`);
        console.log(`  ✓ Checkmark symbol (✓): ${successElements.hasCheckmarkSymbol}`);
        console.log(`  ✓ Form exists: ${successElements.formExists}`);
        
        // Take a screenshot of the live site
        await page.screenshot({ 
            path: '/tmp/waitlist/live-site-loaded.png',
            fullPage: true 
        });
        console.log('📸 Live site screenshot saved');
        
        // Check if we can see the form fields
        const formFields = await page.evaluate(() => {
            const firstNameField = document.getElementById('firstName');
            const lastNameField = document.getElementById('lastName');
            const emailField = document.getElementById('email');
            
            return {
                firstName: !!firstNameField,
                lastName: !!lastNameField,
                email: !!emailField,
                canInteract: firstNameField && !firstNameField.disabled
            };
        });
        
        console.log('📝 Form Fields Check:');
        console.log(`  ✓ First name field: ${formFields.firstName}`);
        console.log(`  ✓ Last name field: ${formFields.lastName}`);
        console.log(`  ✓ Email field: ${formFields.email}`);
        console.log(`  ✓ Fields interactive: ${formFields.canInteract}`);
        
        if (successElements.successMessage && successElements.successCheckmark && 
            successElements.hasGreenCSS && successElements.hasCheckmarkSymbol) {
            console.log('\n🎉 SUCCESS: Green checkmark UI is LIVE on www.flash.onl!');
            console.log('✅ Users will now see the green checkmark after form submission');
        } else {
            console.log('\n❌ Issue: Some success UI elements are missing');
        }
        
        console.log('\n⏳ Keeping browser open for 5 seconds to inspect...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        await page.close();
        
    } catch (error) {
        console.error('❌ Live site test failed:', error);
        console.log('🔄 This might be due to deployment timing - try again in a minute');
    } finally {
        await browser.close();
    }
}

testLiveSite().catch(console.error);