(function () {
  const navToggle = document.querySelector('[data-nav-toggle]');
  const nav = document.querySelector('[data-site-nav]');

  if (nav) ensureNavSocials(nav);

  if (navToggle && nav) {
    navToggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(open));
    });
    nav.addEventListener('click', (event) => {
      if (event.target.closest('a')) {
        nav.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = new Date().getFullYear();
  });

  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    reveals.forEach((el) => observer.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('visible'));
  }

  const latest = document.querySelector('[data-latest-security]');
  if (latest) loadLatestSecurity(latest);

  function ensureNavSocials(navElement) {
    const existing = navElement.querySelector('.nav-socials');
    if (existing) existing.remove();

    const socials = document.createElement('div');
    socials.className = 'nav-socials';

    socials.append(
      socialLink('https://github.com/cchandler313', 'GitHub', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 .7a11.5 11.5 0 0 0-3.64 22.4c.58.1.79-.25.79-.56v-2.2c-3.22.7-3.9-1.37-3.9-1.37-.53-1.33-1.29-1.68-1.29-1.68-1.05-.72.08-.7.08-.7 1.17.08 1.78 1.2 1.78 1.2 1.04 1.77 2.72 1.26 3.38.96.1-.75.4-1.26.74-1.55-2.57-.3-5.28-1.29-5.28-5.73 0-1.27.45-2.3 1.2-3.12-.12-.3-.52-1.48.11-3.08 0 0 .98-.31 3.17 1.19A11 11 0 0 1 12 6.07c.98 0 1.95.13 2.86.39 2.2-1.5 3.17-1.19 3.17-1.19.63 1.6.23 2.78.11 3.08.75.82 1.2 1.85 1.2 3.12 0 4.45-2.71 5.43-5.3 5.72.42.36.79 1.07.79 2.16v3.2c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .7Z"/></svg>', true),
      socialLink('https://www.linkedin.com/in/charliechandler/', 'LinkedIn', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.34 7.5H1.67V22h3.67V7.5ZM3.5 1.99A2.14 2.14 0 1 0 3.5 6.27a2.14 2.14 0 0 0 0-4.28ZM22.33 13.68c0-4.37-2.33-6.4-5.44-6.4-2.5 0-3.62 1.38-4.24 2.35V7.5H8.98V22h3.67v-7.18c0-1.9.36-3.75 2.73-3.75 2.34 0 2.37 2.19 2.37 3.87V22h3.67l.91-8.32Z"/></svg>', true),
      socialLink('mailto:charlie@charliechandler.net', 'Email Charlie', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 4.5h19A1.5 1.5 0 0 1 23 6v12a1.5 1.5 0 0 1-1.5 1.5h-19A1.5 1.5 0 0 1 1 18V6a1.5 1.5 0 0 1 1.5-1.5Zm0 2v.34L12 13l9.5-6.16V6.5h-19Zm19 10.86V9.22L12.54 15a1 1 0 0 1-1.08 0L2.5 9.22v8.14h19Z"/></svg>')
    );

    navElement.appendChild(socials);
  }

  function socialLink(href, label, icon, external) {
    const link = document.createElement('a');
    link.className = 'icon-link';
    link.href = href;
    link.setAttribute('aria-label', label);
    link.innerHTML = icon;
    if (external) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
    return link;
  }

  function formatAge(dateValue) {
    const ts = new Date(dateValue).getTime();
    if (!Number.isFinite(ts)) return 'recent';
    const minutes = Math.max(0, Math.floor((Date.now() - ts) / 60000));
    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  }

  async function loadLatestSecurity(container) {
    container.innerHTML = '<div class="news-row"><span class="news-meta">LIVE</span><span class="news-title">Loading the latest security intelligence...</span><span class="news-source">Security Wire</span></div>';
    try {
      const response = await fetch('/api/cyber-news', { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const articles = Array.isArray(payload) ? payload : payload.articles || [];
      container.replaceChildren();
      articles.slice(0, 3).forEach((article) => {
        const row = document.createElement('a');
        row.className = 'news-row';
        row.href = article.link;
        row.target = '_blank';
        row.rel = 'noopener noreferrer';

        const meta = document.createElement('span');
        meta.className = 'news-meta';
        meta.textContent = `${article.category || 'SECURITY'} · ${formatAge(article.date)}`;
        const title = document.createElement('span');
        title.className = 'news-title';
        title.textContent = article.title;
        const source = document.createElement('span');
        source.className = 'news-source';
        source.textContent = article.source;
        row.append(meta, title, source);
        container.appendChild(row);
      });
      if (!container.children.length) throw new Error('No articles returned');
    } catch (error) {
      container.innerHTML = '<div class="news-row"><span class="news-meta">STATUS</span><span class="news-title">Security Wire is temporarily unavailable.</span><span class="news-source">Try again shortly</span></div>';
    }
  }
})();
