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

    function slugify(value) {
        return value
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');
    }

    function estimateReadTime(text) {
        const words = (text.match(/\S+/g) || []).length;
        return Math.max(3, Math.ceil(words / 220));
    }

    function ensureAuthorityMeta(article) {
        let meta = article.querySelector('.authority-meta');
        if (meta) return meta;
        const subtitle = article.querySelector('.hero-subtitle');
        meta = document.createElement('div');
        meta.className = 'authority-meta';
        if (subtitle) {
            subtitle.insertAdjacentElement('afterend', meta);
        } else {
            article.appendChild(meta);
        }
        return meta;
    }

    function injectBreadcrumbs(article) {
        if (!article || article.querySelector('.content-breadcrumbs')) return;
        const pageType = document.body.getAttribute('data-content-type');
        const map = {
            insight: { label: 'Insights', href: '/insights/' },
            case_study: { label: 'Case Studies', href: '/case-studies/' },
            newsletter: { label: 'Newsletter', href: '/newsletter/' }
        };
        const section = map[pageType];
        if (!section) return;

        const title = article.querySelector('.hero-title');
        const kicker = article.querySelector('.hero-kicker');
        if (!title || !kicker) return;

        const crumbs = document.createElement('nav');
        crumbs.className = 'content-breadcrumbs';
        crumbs.setAttribute('aria-label', 'Breadcrumb');
        crumbs.innerHTML = [
            '<a href="/">Home</a>',
            '<span class="separator">/</span>',
            `<a href="${section.href}">${section.label}</a>`,
            '<span class="separator">/</span>',
            `<span>${title.textContent.trim()}</span>`
        ].join('');
        article.insertBefore(crumbs, kicker);
    }

    function injectReadTime(article, articleBody) {
        if (!article || !articleBody) return;
        const meta = ensureAuthorityMeta(article);
        if (meta.querySelector('[data-read-time]')) return;
        const minutes = estimateReadTime(articleBody.textContent || '');
        const chip = document.createElement('span');
        chip.className = 'authority-meta-item';
        chip.setAttribute('data-read-time', 'true');
        chip.textContent = `Read time: ${minutes} min`;
        meta.appendChild(chip);
    }

    function buildInPageToc(articleBody) {
        if (!articleBody || articleBody.previousElementSibling?.classList.contains('in-page-toc')) return;
        const headings = Array.from(articleBody.querySelectorAll('.article-section h2'));
        if (headings.length < 3) return;

        const usedIds = new Set();
        const toc = document.createElement('nav');
        toc.className = 'in-page-toc';
        toc.setAttribute('aria-label', 'Table of contents');
        toc.innerHTML = '<h3>On this page</h3><ol></ol>';
        const list = toc.querySelector('ol');

        headings.forEach((heading, index) => {
            const base = slugify(heading.textContent) || `section-${index + 1}`;
            let id = base;
            let suffix = 2;
            while (usedIds.has(id) || document.getElementById(id)) {
                id = `${base}-${suffix}`;
                suffix += 1;
            }
            usedIds.add(id);
            heading.id = id;

            const li = document.createElement('li');
            const link = document.createElement('a');
            link.href = `#${id}`;
            link.textContent = heading.textContent.replace(/^\d+\)\s*/, '').trim();
            li.appendChild(link);
            list.appendChild(li);
        });

        articleBody.parentNode.insertBefore(toc, articleBody);

        const links = Array.from(toc.querySelectorAll('a'));
        const linkMap = new Map(links.map((link) => [link.getAttribute('href').slice(1), link]));

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    const id = entry.target.id;
                    const link = linkMap.get(id);
                    if (!link) return;
                    if (entry.isIntersecting) {
                        links.forEach((item) => item.classList.remove('active'));
                        link.classList.add('active');
                    }
                });
            },
            {
                rootMargin: '-35% 0px -55% 0px',
                threshold: [0.01, 0.25, 0.5]
            }
        );

        headings.forEach((heading) => observer.observe(heading));
    }

    function wireReadingProgress(article) {
        if (!article || document.querySelector('.reading-progress')) return;

        const progress = document.createElement('div');
        progress.className = 'reading-progress';
        progress.innerHTML = '<span class="reading-progress-bar"></span>';
        const bar = progress.querySelector('.reading-progress-bar');
        document.body.appendChild(progress);

        function update() {
            const start = article.offsetTop - 120;
            const end = start + article.offsetHeight - window.innerHeight * 0.45;
            const span = Math.max(end - start, 1);
            const ratio = Math.max(0, Math.min(1, (window.scrollY - start) / span));
            bar.style.transform = `scaleX(${ratio})`;
        }

        window.addEventListener('scroll', update, { passive: true });
        window.addEventListener('resize', update);
        update();
    }

    function wireHubFilters() {
        const tabGroups = document.querySelectorAll('[data-filter-tabs]');
        tabGroups.forEach((group) => {
            const targetSelector = group.getAttribute('data-filter-target');
            const target = targetSelector ? document.querySelector(targetSelector) : null;
            if (!target) return;

            const cards = Array.from(target.querySelectorAll('.card[data-tags]'));
            if (!cards.length) return;

            const buttons = Array.from(group.querySelectorAll('.content-tab[data-filter]'));
            if (!buttons.length) return;

            function applyFilter(filterValue) {
                const normalized = (filterValue || 'all').toLowerCase();
                cards.forEach((card) => {
                    const tags = (card.getAttribute('data-tags') || '')
                        .toLowerCase()
                        .split(',')
                        .map((item) => item.trim())
                        .filter(Boolean);
                    const visible = normalized === 'all' || tags.includes(normalized);
                    card.classList.toggle('is-hidden', !visible);
                });
                buttons.forEach((button) => {
                    const active = button.getAttribute('data-filter') === filterValue;
                    button.classList.toggle('is-active', active);
                    button.setAttribute('aria-pressed', active ? 'true' : 'false');
                });
            }

            buttons.forEach((button) => {
                button.addEventListener('click', () => {
                    applyFilter(button.getAttribute('data-filter') || 'all');
                });
            });

            const initial = buttons.find((button) => button.classList.contains('is-active')) || buttons[0];
            applyFilter(initial.getAttribute('data-filter') || 'all');
        });
    }

    function wireEditorialEnhancements() {
        const article = document.querySelector('article.hero-block');
        if (!article) return;
        const articleBody = article.querySelector('.article-body');
        if (!articleBody) return;
        injectBreadcrumbs(article);
        injectReadTime(article, articleBody);
        buildInPageToc(articleBody);
        wireReadingProgress(article);
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
    wireEditorialEnhancements();
    wireHubFilters();
})();
