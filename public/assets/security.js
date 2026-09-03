(function () {
  const articleGrid = document.querySelector('[data-wire-grid]');
  if (!articleGrid) return;

  const searchInput = document.querySelector('[data-wire-search]');
  const categorySelect = document.querySelector('[data-wire-category]');
  const sourceSelect = document.querySelector('[data-wire-source]');
  const refreshButton = document.querySelector('[data-wire-refresh]');
  const totalStat = document.querySelector('[data-stat-total]');
  const sourceStat = document.querySelector('[data-stat-sources]');
  const categoryStat = document.querySelector('[data-stat-categories]');
  const updatedStat = document.querySelector('[data-stat-updated]');
  const health = document.querySelector('[data-source-health]');

  let articles = [];
  let meta = {};

  refreshButton?.addEventListener('click', () => load(true));
  searchInput?.addEventListener('input', render);
  categorySelect?.addEventListener('change', render);
  sourceSelect?.addEventListener('change', render);

  load(false);

  async function load(force) {
    setLoading(true);
    try {
      const suffix = force ? `?refresh=${Date.now()}` : '';
      const response = await fetch(`/api/cyber-news${suffix}`, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      if (Array.isArray(payload)) {
        articles = payload;
        meta = {};
      } else {
        articles = payload.articles || [];
        meta = payload.meta || {};
      }
      populateFilters();
      updateStats();
      render();
    } catch (error) {
      articleGrid.innerHTML = '<div class="empty-state">Security Wire could not load right now. The feed sources may be temporarily unavailable.</div>';
      if (health) health.textContent = `Feed error: ${error.message}`;
    } finally {
      setLoading(false);
    }
  }

  function setLoading(value) {
    if (!refreshButton) return;
    refreshButton.disabled = value;
    refreshButton.textContent = value ? 'Refreshing...' : 'Refresh';
  }

  function populateFilters() {
    const selectedCategory = categorySelect?.value || 'all';
    const selectedSource = sourceSelect?.value || 'all';
    const categories = [...new Set(articles.map((a) => a.category).filter(Boolean))].sort();
    const sources = [...new Set(articles.map((a) => a.source).filter(Boolean))].sort();

    if (categorySelect) {
      categorySelect.innerHTML = '<option value="all">All categories</option>';
      categories.forEach((category) => categorySelect.append(new Option(category, category)));
      categorySelect.value = categories.includes(selectedCategory) ? selectedCategory : 'all';
    }
    if (sourceSelect) {
      sourceSelect.innerHTML = '<option value="all">All sources</option>';
      sources.forEach((source) => sourceSelect.append(new Option(source, source)));
      sourceSelect.value = sources.includes(selectedSource) ? selectedSource : 'all';
    }
  }

  function updateStats() {
    const sources = new Set(articles.map((a) => a.source));
    const categories = new Set(articles.map((a) => a.category));
    if (totalStat) totalStat.textContent = String(articles.length);
    if (sourceStat) sourceStat.textContent = String(sources.size);
    if (categoryStat) categoryStat.textContent = String(categories.size);
    if (updatedStat) updatedStat.textContent = meta.generatedAt ? new Date(meta.generatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'live';

    if (health) {
      const failed = meta.failedSources || [];
      const ok = meta.successfulSources ?? sources.size;
      health.textContent = failed.length
        ? `${ok} sources responding. ${failed.length} source${failed.length === 1 ? '' : 's'} temporarily unavailable: ${failed.map((item) => item.name || item).join(', ')}.`
        : `${ok} sources responding normally.`;
    }
  }

  function render() {
    const q = (searchInput?.value || '').trim().toLowerCase();
    const category = categorySelect?.value || 'all';
    const source = sourceSelect?.value || 'all';
    const filtered = articles.filter((article) => {
      const haystack = `${article.title || ''} ${article.summary || ''} ${article.source || ''}`.toLowerCase();
      return (!q || haystack.includes(q)) &&
        (category === 'all' || article.category === category) &&
        (source === 'all' || article.source === source);
    });

    articleGrid.replaceChildren();
    if (!filtered.length) {
      articleGrid.innerHTML = '<div class="empty-state">No stories match those filters.</div>';
      return;
    }

    filtered.forEach((article) => articleGrid.appendChild(buildCard(article)));
  }

  function buildCard(article) {
    const link = document.createElement('a');
    link.className = 'card article-card';
    link.href = article.link;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';

    const metaRow = document.createElement('div');
    metaRow.className = 'article-meta';
    const cat = document.createElement('span');
    cat.textContent = article.category || 'Security';
    const time = document.createElement('span');
    time.textContent = relativeTime(article.date);
    metaRow.append(cat, time);

    const title = document.createElement('h3');
    title.textContent = article.title;
    const summary = document.createElement('p');
    summary.textContent = article.summary || 'Open the original source for the full story.';
    const tags = document.createElement('div');
    tags.className = 'tag-row';
    const source = document.createElement('span');
    source.className = 'tag';
    source.textContent = article.source;
    tags.appendChild(source);
    const arrow = document.createElement('span');
    arrow.className = 'card-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '↗';
    link.append(metaRow, title, summary, tags, arrow);
    return link;
  }

  function relativeTime(value) {
    const timestamp = new Date(value).getTime();
    if (!Number.isFinite(timestamp)) return 'recent';
    const mins = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
})();
