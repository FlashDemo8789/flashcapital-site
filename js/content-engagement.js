(function () {
    const NEWSLETTER_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwmTSDJmqKq9GE8zBNrELhQMUAoyPCQRdTE5sOZiHBLNS6oh9kq7nYzhk9ohtktVRS6HQ/exec';

    function pushEvent(payload) {
        if (typeof window.dataLayer === 'undefined') return;
        window.dataLayer.push(payload);
    }

    function withUtm(baseUrl, params) {
        const url = new URL(baseUrl, window.location.origin);
        Object.entries(params).forEach(([key, value]) => {
            if (!value) return;
            url.searchParams.set(key, value);
        });
        return url.toString();
    }

    function wireContentCtas() {
        const ctas = document.querySelectorAll('[data-content-cta], .content-cta[href*="flash.zone"]');
        ctas.forEach((cta) => {
            const body = document.body;
            const pageType = body ? body.getAttribute('data-content-type') : '';
            const pageSlug = body ? body.getAttribute('data-content-slug') : '';
            const contentType = cta.getAttribute('data-content-type') || pageType || 'content';
            const contentSlug = cta.getAttribute('data-content-slug') || pageSlug || 'unknown';
            const href = cta.getAttribute('href');

            if (href && href.indexOf('flash.zone') !== -1) {
                const trackedHref = withUtm(href, {
                    utm_source: 'flashcapital_content',
                    utm_medium: 'site',
                    utm_campaign: contentSlug
                });
                cta.setAttribute('href', trackedHref);
            }

            cta.addEventListener('click', () => {
                pushEvent({
                    event: 'content_cta_click',
                    content_type: contentType,
                    content_slug: contentSlug
                });
            });
        });
    }

    async function submitNewsletterForm(form) {
        const statusEl = form.querySelector('.form-status');
        const emailInput = form.querySelector('input[name="email"]');
        const consentInput = form.querySelector('input[name="consent"]');

        statusEl.textContent = '';
        statusEl.className = 'form-status';

        if (!emailInput || !emailInput.value.trim()) {
            statusEl.textContent = 'Please enter a valid email address.';
            statusEl.classList.add('error');
            return;
        }

        if (!consentInput || !consentInput.checked) {
            statusEl.textContent = 'Please confirm consent before subscribing.';
            statusEl.classList.add('error');
            return;
        }

        const payload = {
            submissionType: 'newsletter',
            email: emailInput.value.trim(),
            sourcePage: window.location.pathname,
            consent: true,
            timestamp: new Date().toISOString()
        };

        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) submitButton.disabled = true;

        try {
            const formData = new FormData();
            Object.keys(payload).forEach((key) => {
                formData.append(key, payload[key]);
            });

            // no-cors matches the current application submission pattern.
            await fetch(NEWSLETTER_ENDPOINT, {
                method: 'POST',
                mode: 'no-cors',
                body: formData
            });

            pushEvent({
                event: 'newsletter_subscribe',
                source_page: window.location.pathname
            });

            statusEl.textContent = 'Subscribed. You will receive the next monthly issue.';
            statusEl.classList.add('success');
            form.reset();
        } catch (error) {
            statusEl.textContent = 'Unable to subscribe right now. Please try again in a few minutes.';
            statusEl.classList.add('error');
        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    }

    function wireNewsletterForms() {
        const forms = document.querySelectorAll('.newsletter-signup-form');
        forms.forEach((form) => {
            form.addEventListener('submit', (event) => {
                event.preventDefault();
                submitNewsletterForm(form);
            });
        });
    }

    function emitPageOpenEvent() {
        const body = document.body;
        const contentType = body.getAttribute('data-content-type');
        const contentSlug = body.getAttribute('data-content-slug');
        if (contentType !== 'case_study' || !contentSlug) return;

        pushEvent({
            event: 'case_study_open',
            case_slug: contentSlug
        });
    }

    wireContentCtas();
    wireNewsletterForms();
    emitPageOpenEvent();
})();
