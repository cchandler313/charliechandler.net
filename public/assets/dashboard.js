(function () {
  const refresh = document.querySelector('[data-dashboard-refresh]');
  if (!refresh) return;

  const KEV_URL = 'https://raw.githubusercontent.com/cisagov/kev-data/develop/known_exploited_vulnerabilities.json';

  refresh.addEventListener('click', () => load(true));
  load(false);

  async function load(force) {
    setBusy(true);
    const health = document.querySelector('[data-dashboard-health]');
    if (health) health.textContent = 'Refreshing KEV and Security Wire data...';

    try {
      const newsUrl = force ? `/api/cyber-news?refresh=${Date.now()}` : '/api/cyber-news';
      const [kevResponse, newsResponse] = await Promise.all([
        fetch(KEV_URL, { cache: force ? 'no-store' : 'default' }),
        fetch(newsUrl, { headers: { Accept: 'application/json' } })
      ]);
      if (!kevResponse.ok) throw new Error(`KEV feed returned HTTP ${kevResponse.status}`);
      if (!newsResponse.ok) throw new Error(`Security Wire returned HTTP ${newsResponse.status}`);

      const kevPayload = await kevResponse.json();
      const newsPayload = await newsResponse.json();
      const kev = Array.isArray(kevPayload.vulnerabilities) ? kevPayload.vulnerabilities : [];
      const news = Array.isArray(newsPayload) ? newsPayload : (newsPayload.articles || []);

      updateStats(kev, news);
      renderKev(kev);
      renderDeadlines(kev);
      renderSignal(news, '[data-vuln-news]', (a) => ['ZERO DAY', 'VULNERABILITY'].includes(a.category));
      renderSignal(news, '[data-ransomware-news]', (a) => a.category === 'RANSOMWARE');
      renderVendors(kev);

      if (health) {
        const stamp = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        health.textContent = `Live data loaded at ${stamp}. CISA catalog version ${kevPayload.catalogVersion || 'current'} · ${news.length} Security Wire stories.`;
      }
    } catch (error) {
      if (health) health.textContent = `Dashboard data error: ${error.message}`;
    } finally {
      setBusy(false);
    }
  }

  function setBusy(value) {
    refresh.disabled = value;
    refresh.textContent = value ? 'Refreshing...' : 'Refresh data';
  }

  function updateStats(kev, news) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
    const fourteenDays = new Date(now.getTime() + 14 * 86400000);
    const recent = kev.filter((v) => parseDate(v.dateAdded) >= thirtyDaysAgo).length;
    const due = kev.filter((v) => {
      const d = parseDate(v.dueDate);
      return d && d >= startOfToday() && d <= fourteenDays;
    }).length;
    setText('[data-kev-total]', kev.length);
    setText('[data-kev-recent]', recent);
    setText('[data-kev-due]', due);
    setText('[data-news-total]', news.length);
  }

  function renderKev(kev) {
    const container = document.querySelector('[data-kev-list]');
    if (!container) return;
    const newest = [...kev]
      .sort((a, b) => parseDate(b.dateAdded) - parseDate(a.dateAdded))
      .slice(0, 8);
    container.replaceChildren(...newest.map((v) => {
      const item = document.createElement('article');
      item.className = 'kev-row';
      item.innerHTML = `
        <div class="kev-id">${escapeHtml(v.cveID || 'CVE')}</div>
        <div class="kev-main">
          <strong>${escapeHtml(`${v.vendorProject || 'Unknown vendor'} · ${v.product || 'Unknown product'}`)}</strong>
          <p>${escapeHtml(v.vulnerabilityName || '')}</p>
          <div class="kev-meta"><span>Added ${formatDate(v.dateAdded)}</span><span>Due ${formatDate(v.dueDate)}</span>${v.knownRansomwareCampaignUse === 'Known' ? '<span class="danger-pill">Ransomware use</span>' : ''}</div>
        </div>`;
      return item;
    }));
  }

  function renderDeadlines(kev) {
    const container = document.querySelector('[data-deadline-list]');
    if (!container) return;
    const today = startOfToday();
    const upcoming = kev
      .filter((v) => parseDate(v.dueDate) >= today)
      .sort((a, b) => parseDate(a.dueDate) - parseDate(b.dueDate))
      .slice(0, 7);
    if (!upcoming.length) {
      container.innerHTML = '<div class="empty-state">No upcoming deadlines in the current view.</div>';
      return;
    }
    container.replaceChildren(...upcoming.map((v) => {
      const row = document.createElement('div');
      row.className = 'deadline-row';
      row.innerHTML = `<div><strong>${escapeHtml(v.cveID || '')}</strong><span>${escapeHtml(v.vendorProject || '')}</span></div><time>${formatDate(v.dueDate)}</time>`;
      return row;
    }));
  }

  function renderSignal(news, selector, predicate) {
    const container = document.querySelector(selector);
    if (!container) return;
    const selected = news.filter(predicate).slice(0, 6);
    if (!selected.length) {
      container.innerHTML = '<div class="empty-state">No matching stories in the current feed.</div>';
      return;
    }
    container.replaceChildren(...selected.map((a) => {
      const link = document.createElement('a');
      link.className = 'signal-row';
      link.href = a.link;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.innerHTML = `<span>${escapeHtml(a.source || 'Source')}</span><strong>${escapeHtml(a.title || '')}</strong><small>${relativeTime(a.date)} · ${escapeHtml(a.category || 'Security')}</small>`;
      return link;
    }));
  }

  function renderVendors(kev) {
    const container = document.querySelector('[data-vendor-bars]');
    if (!container) return;
    const counts = new Map();
    kev.forEach((v) => counts.set(v.vendorProject || 'Unknown', (counts.get(v.vendorProject || 'Unknown') || 0) + 1));
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    const max = top[0]?.[1] || 1;
    container.replaceChildren(...top.map(([name, count]) => {
      const row = document.createElement('div');
      row.className = 'vendor-row';
      row.innerHTML = `<div class="vendor-label"><span>${escapeHtml(name)}</span><strong>${count}</strong></div><div class="vendor-track"><span style="width:${Math.max(5, (count / max) * 100)}%"></span></div>`;
      return row;
    }));
  }

  function setText(selector, value) {
    const el = document.querySelector(selector);
    if (el) el.textContent = String(value);
  }

  function parseDate(value) {
    if (!value) return null;
    const date = new Date(`${value}T00:00:00`);
    return Number.isFinite(date.getTime()) ? date : null;
  }

  function startOfToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function formatDate(value) {
    const d = parseDate(value);
    return d ? d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown';
  }

  function relativeTime(value) {
    const timestamp = new Date(value).getTime();
    if (!Number.isFinite(timestamp)) return 'recent';
    const mins = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
    if (mins < 60) return `${Math.max(1, mins)}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
})();