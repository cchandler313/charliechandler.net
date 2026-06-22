const FEEDS = [
  {
    name: "BleepingComputer",
    url: "https://www.bleepingcomputer.com/feed/",
    homepage: "https://www.bleepingcomputer.com/"
  },
  {
    name: "The Hacker News",
    url: "https://feeds.feedburner.com/TheHackersNews?format=xml",
    homepage: "https://thehackernews.com/"
  },
  {
    name: "SANS ISC",
    url: "https://isc.sans.edu/rssfeed.xml",
    homepage: "https://isc.sans.edu/"
  },
  {
    name: "KrebsOnSecurity",
    url: "https://krebsonsecurity.com/feed/",
    homepage: "https://krebsonsecurity.com/"
  },
  {
    name: "CISA Advisories",
    url: "https://www.cisa.gov/cybersecurity-advisories/all.xml",
    homepage: "https://www.cisa.gov/news-events/cybersecurity-advisories"
  }
];

const ARTICLES_PER_SOURCE = 5;

function decodeEntities(value = "") {
  return value
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripHtml(value = "") {
  return decodeEntities(value)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getTagValue(item, tag) {
  const match = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? stripHtml(match[1]) : "";
}

function getAtomLink(item) {
  const hrefMatch = item.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i);
  return hrefMatch ? decodeEntities(hrefMatch[1]).trim() : "";
}

function parseRssItems(xml, feed) {
  const items = xml
    .split(/<item\b[^>]*>/i)
    .slice(1)
    .map(item => item.split(/<\/item>/i)[0]);

  return items.slice(0, ARTICLES_PER_SOURCE).map(item => ({
    source: feed.name,
    title: getTagValue(item, "title"),
    link: getTagValue(item, "link"),
    summary: getTagValue(item, "description").slice(0, 260),
    date: getTagValue(item, "pubDate") || getTagValue(item, "dc:date")
  }));
}

function parseAtomItems(xml, feed) {
  const entries = xml
    .split(/<entry\b[^>]*>/i)
    .slice(1)
    .map(entry => entry.split(/<\/entry>/i)[0]);

  return entries.slice(0, ARTICLES_PER_SOURCE).map(entry => ({
    source: feed.name,
    title: getTagValue(entry, "title"),
    link: getAtomLink(entry),
    summary: (getTagValue(entry, "summary") || getTagValue(entry, "content")).slice(0, 260),
    date: getTagValue(entry, "updated") || getTagValue(entry, "published")
  }));
}

function parseFeed(xml, feed) {
  const parsed = xml.includes("<entry")
    ? parseAtomItems(xml, feed)
    : parseRssItems(xml, feed);

  return parsed.filter(article => article.title && article.link);
}

async function fetchFeed(feed) {
  const response = await fetch(feed.url, {
    headers: {
      "User-Agent": "charliechandler.net RSS Aggregator",
      "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml"
    }
  });

  if (!response.ok) {
    throw new Error(`${feed.name} returned ${response.status}`);
  }

  const xml = await response.text();
  return parseFeed(xml, feed);
}

export async function onRequestGet() {
  const results = await Promise.allSettled(FEEDS.map(fetchFeed));

  const articles = results
    .filter(result => result.status === "fulfilled")
    .flatMap(result => result.value)
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  return new Response(JSON.stringify(articles), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=900",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
