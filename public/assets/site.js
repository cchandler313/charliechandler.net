(function () {
  const navToggle = document.querySelector('[data-nav-toggle]');
  const nav = document.querySelector('[data-site-nav]');
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
