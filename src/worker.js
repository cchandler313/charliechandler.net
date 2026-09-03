const FEEDS = [
  { name: 'BleepingComputer', url: 'https://www.bleepingcomputer.com/feed/' },
  { name: 'The Hacker News', url: 'https://feeds.feedburner.com/TheHackersNews' },
  { name: 'KrebsOnSecurity', url: 'https://krebsonsecurity.com/feed/' },
  { name: 'SANS ISC', url: 'https://isc.sans.edu/rssfeed.xml' },
  { name: 'CISA Advisories', url: 'https://www.cisa.gov/cybersecurity-advisories/all.xml' },
  { name: 'SecurityWeek', url: 'https://www.securityweek.com/feed/' },
  { name: 'Cloudflare', url: 'https://blog.cloudflare.com/rss/' },
  { name: 'Unit 42', url: 'https://unit42.paloaltonetworks.com/feed/' },
  { name: 'Cisco Talos', url: 'https://blog.talosintelligence.com/rss/' },
  { name: 'Microsoft Security', url: 'https://www.microsoft.com/en-us/security/blog/feed/' }
];

const ARTICLES_PER_SOURCE = 7;
const REQUEST_TIMEOUT_MS = 7000;
const MAX_ARTICLES = 60;

const CATEGORY_RULES = [
  ['ZERO DAY', /zero[- ]?day|0day|actively exploited|in the wild/i],
  ['RANSOMWARE', /ransomware|extortion|encryptor/i],
  ['VULNERABILITY', /\bcve-\d{4}-\d+\b|vulnerab|security flaw|critical flaw|patch/i],
  ['MALWARE', /malware|trojan|backdoor|infostealer|stealer|botnet|rootkit/i],
  ['THREAT INTEL', /threat actor|campaign|apt\b|espionage|nation-state|initial access broker/i],
  ['DATA BREACH', /data breach|breach|leak|stolen data|exposed data/i],
  ['IDENTITY', /identity|authentication|credential|phishing|mfa|oauth|single sign-on|sso\b/i],
  ['CLOUD', /cloud|aws\b|azure|google cloud|kubernetes|container|serverless/i],
  ['NETWORK', /network|router|switch|firewall|vpn\b|dns\b|bgp\b|wireless|wifi/i],
  ['SUPPLY CHAIN', /supply chain|dependency|package|npm\b|pypi|repository compromise/i],
  ['SECURITY', /./]
];

function decodeEntities(value = '') {
  return value
    .replace(/<!\[CDATA\[/g, '')
    .replace(/\]\]>/g, '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function stripHtml(value = '') {
  return decodeEntities(value)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getTagValue(item, tag) {
  const escaped = tag.replace(':', '\\:');
  const regex = new RegExp(`<${escaped}[^>]*>([\\s\\S]*?)<\\/${escaped}>`, 'i');
  const match = item.match(regex);
  return match ? stripHtml(match[1]) : '';
}

function getAtomLink(item) {
  const alternate = item.match(/<link[^>]+rel=["']alternate["'][^>]+href=["']([^"']+)["'][^>]*>/i);
  if (alternate) return decodeEntities(alternate[1]).trim();
  const href = item.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i);
  return href ? decodeEntities(href[1]).trim() : '';
}

function normalizeDate(value) {
  const parsed = new Date(value || 0);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
}

function classify(article) {
  const text = `${article.title} ${article.summary}`;
  for (const [category, regex] of CATEGORY_RULES) {
    if (regex.test(text)) return category;
  }
  return 'SECURITY';
}

function articleFromRss(item, feed) {
  const article = {
    source: feed.name,
    title: getTagValue(item, 'title'),
    link: getTagValue(item, 'link') || getTagValue(item, 'guid'),
    summary: (getTagValue(item, 'description') || getTagValue(item, 'content:encoded')).slice(0, 320),
    date: normalizeDate(getTagValue(item, 'pubDate') || getTagValue(item, 'dc:date'))
  };
  article.category = classify(article);
  return article;
}

function articleFromAtom(entry, feed) {
  const article = {
    source: feed.name,
    title: getTagValue(entry, 'title'),
    link: getAtomLink(entry),
    summary: (getTagValue(entry, 'summary') || getTagValue(entry, 'content')).slice(0, 320),
    date: normalizeDate(getTagValue(entry, 'updated') || getTagValue(entry, 'published'))
  };
  article.category = classify(article);
  return article;
}

function parseFeed(xml, feed) {
  const isAtom = /<entry\b/i.test(xml);
  const blocks = isAtom
    ? xml.split(/<entry\b[^>]*>/i).slice(1).map((entry) => entry.split(/<\/entry>/i)[0])
    : xml.split(/<item\b[^>]*>/i).slice(1).map((item) => item.split(/<\/item>/i)[0]);

  return blocks
    .slice(0, ARTICLES_PER_SOURCE)
    .map((block) => isAtom ? articleFromAtom(block, feed) : articleFromRss(block, feed))
    .filter((article) => article.title && /^https?:\/\//i.test(article.link || ''));
}

async function fetchFeed(feed) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(feed.url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'charliechandler.net Security Wire/1.0 (+https://charliechandler.net/security/)',
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5'
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const xml = await response.text();
    const articles = parseFeed(xml, feed);
    if (!articles.length) throw new Error('No parseable articles');
    return articles;
  } finally {
    clearTimeout(timeout);
  }
}

function dedupeAndSort(articles) {
  const seen = new Set();
  return articles
    .filter((article) => {
      const key = (article.link || article.title).toLowerCase().replace(/[#?].*$/, '');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .slice(0, MAX_ARTICLES);
}

async function handleCyberNews(request) {
  const results = await Promise.allSettled(FEEDS.map(fetchFeed));
  const articles = dedupeAndSort(results.flatMap((result) => result.status === 'fulfilled' ? result.value : []));
  const failedSources = results
    .map((result, index) => result.status === 'rejected' ? { name: FEEDS[index].name, reason: String(result.reason?.message || result.reason || 'Unknown error') } : null)
    .filter(Boolean);

  const body = JSON.stringify({
    articles,
    meta: {
      generatedAt: new Date().toISOString(),
      totalSources: FEEDS.length,
      successfulSources: FEEDS.length - failedSources.length,
      failedSources
    }
  });

  return new Response(body, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': new URL(request.url).searchParams.has('refresh')
        ? 'no-store'
        : 'public, max-age=300, s-maxage=900, stale-while-revalidate=1800',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/ping') {
      return Response.json({ status: 'ok', service: 'charliechandler.net', time: new Date().toISOString() }, {
        headers: { 'Cache-Control': 'no-store' }
      });
    }

    if (url.pathname === '/api/cyber-news') {
      return handleCyberNews(request);
    }

    return env.ASSETS.fetch(request);
  }
};
