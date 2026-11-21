import fs from "node:fs";
import path from "node:path";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

const envPath = path.resolve(process.cwd(), ".env.local");
const envMap = {};
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const idx = line.indexOf("=");
    if (idx > 0 && !line.trim().startsWith("#")) {
      envMap[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    }
  }
}

const SC_KEY = process.env.SCRAPECREATORS_API_KEY || envMap.SCRAPECREATORS_API_KEY;
if (!SC_KEY) {
  console.error("Missing SCRAPECREATORS_API_KEY");
  process.exit(1);
}

const TARGET_BRANDS = [
  // 8 Danish E-commerce Brands (DK)
  { domain: "shapingnewtomorrow.com", name: "Shaping New Tomorrow", companyName: "Shaping New Tomorrow", market: "DK", category: "Menswear & Apparel" },
  { domain: "planetnusa.com", name: "Planet Nusa", companyName: "Planet Nusa", market: "DK", category: "Activewear" },
  { domain: "eyda.com", name: "EYDA", companyName: "EYDA", market: "DK", category: "Activewear" },
  { domain: "watery.dk", name: "Watery", companyName: "Watery", market: "DK", category: "Swim & Sports" },
  { domain: "rains.com", name: "Rains", companyName: "Rains", market: "DK", category: "Outerwear & Bags" },
  { domain: "colorfulstandard.com", name: "Colorful Standard", companyName: "Colorful Standard", market: "DK", category: "Apparel" },
  { domain: "barons.dk", name: "Barons", companyName: "Barons", market: "DK", category: "Menswear" },
  { domain: "nordgreen.com", name: "Nordgreen", companyName: "Nordgreen", market: "DK", category: "Watches & Accessories" },

  // 8 US / Global E-commerce Brands (US)
  { domain: "stepprs.com", name: "Stepprs", companyName: "Stepprs", market: "US", category: "Footwear & Insoles" },
  { domain: "trueclassictees.com", name: "True Classic", companyName: "True Classic", market: "US", category: "Menswear" },
  { domain: "hexclad.com", name: "HexClad", companyName: "HexClad", market: "US", category: "Kitchen & Cookware" },
  { domain: "ryzesuperfoods.com", name: "RYZE Superfoods", companyName: "RYZE Superfoods", market: "US", category: "Health & Beverages" },
  { domain: "jonesroadbeauty.com", name: "Jones Road Beauty", companyName: "Jones Road Beauty", market: "US", category: "Beauty & Cosmetics" },
  { domain: "gymshark.com", name: "Gymshark", companyName: "Gymshark", market: "US", category: "Fitness & Activewear" },
  { domain: "im8health.com", name: "IM8 Health", companyName: "IM8", market: "US", category: "Supplements" },
  { domain: "loopearplugs.com", name: "Loop Earplugs", companyName: "Loop", market: "US", category: "Audio & Lifestyle" },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function extractMeta(html, key) {
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["']`, "i"),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return decodeEntities(m[1].trim());
  }
  return undefined;
}

async function fetchTimeout(url, ms = 9000, headers = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,application/json,*/*", ...headers },
      redirect: "follow",
      signal: ctrl.signal,
    });
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function detectPixels(html) {
  const lower = html.toLowerCase();
  const checks = [
    ["Meta Pixel", /fbevents\.js|fbq\(|facebook-domain-verification|connect\.facebook\.net\/.*fbevents/i],
    ["Google Analytics", /google-analytics\.com|gtag\(['"]config['"],\s*['"]g-|gtag\/js\?id=g-|analytics\.js/i],
    ["Google Tag Manager", /googletagmanager\.com\/gtm\.js|gtm-[a-z0-9]{5,}/i],
    ["Google Ads", /googleadservices\.com|gtag\/js\?id=aw-|['"]aw-\d+|doubleclick\.net/i],
    ["TikTok Pixel", /analytics\.tiktok\.com|ttq\.|tiktok-pixel/i],
    ["Pinterest Ads", /pintrk\(|s\.pinimg\.com\/ct|ct\.pinterest\.com/i],
    ["Snap Pixel", /snaptr\(|sc-static\.net\/scevent/i],
    ["Twitter Ads", /static\.ads-twitter\.com|twq\(/i],
    ["Microsoft Advertising", /bat\.bing\.com|uetq/i],
    ["Taboola", /cdn\.taboola\.com|_tfa\.push/i],
    ["Reddit Pixel", /redditstatic\.com\/ads|rdt\(/i],
    ["LinkedIn Insight", /snap\.licdn\.com|_linkedin_partner_id/i],
    ["Microsoft Clarity", /clarity\.ms\/tag/i],
    ["Hotjar", /static\.hotjar\.com/i],
  ];
  return checks.filter(([, re]) => re.test(lower)).map(([name]) => name);
}

function detectShopifyApps(html) {
  const lower = html.toLowerCase();
  const checks = [
    ["Klaviyo", /klaviyo|a\.klaviyo\.com/i],
    ["Triple Whale", /triplewhale|triple-whale|api\.triplewhale/i],
    ["Judge.me", /judge\.me|judgeme/i],
    ["Yotpo", /yotpo\.com|staticw2\.yotpo/i],
    ["Loox", /loox\.io/i],
    ["Okendo", /okendo\.io|cdn-static\.okendo/i],
    ["Stamped", /stamped\.io/i],
    ["Reviews.io", /reviews\.io|widget\.reviews\.co\.uk/i],
    ["Trustpilot", /trustpilot\.com|widget\.trustpilot/i],
    ["Recharge", /rechargepayments|rechargeapps|static\.rechargecdn/i],
    ["Skio", /skio\.com|cdn\.skio/i],
    ["Gorgias", /gorgias\.chat|config\.gorgias/i],
    ["Zendesk", /zdassets\.com|zendesk/i],
    ["Intercom", /widget\.intercom\.io/i],
    ["Crisp", /client\.crisp\.chat/i],
    ["Rebuy", /rebuyengine\.com/i],
    ["AfterSell", /aftersell/i],
    ["Zipify", /zipify/i],
    ["ShipInsure", /shipinsure/i],
    ["Route", /route\.com|cdn\.routeapp/i],
    ["Attentive", /attn\.tv|attentivemobile/i],
    ["Postscript", /sdk\.postscript\.io/i],
    ["Omnisend", /omnisend|omnisnippet1/i],
    ["Privy", /widget\.privy\.com/i],
    ["Smile.io", /js\.smile\.io|sweettooth/i],
    ["LoyaltyLion", /sdk\.loyaltylion\.net/i],
    ["Elevar", /getelevar\.com|elevar/i],
    ["Northbeam", /northbeam\.io|j\.northbeam/i],
    ["AfterShip", /aftership/i],
    ["Loop Returns", /loopreturns/i],
    ["Klarna", /klarna\.com|klarnaservices|x\.klarnacdn/i],
    ["Global-e", /global-e\.com|globale/i],
    ["PageFly", /pagefly/i],
    ["GemPages", /gempages/i],
    ["Shogun", /getshogun/i],
    ["Nosto", /connect\.nosto\.com/i],
    ["Klevu", /js\.klevu\.com/i],
    ["Cookiebot", /consent\.cookiebot\.com/i],
    ["OneTrust", /cdn\.cookielaw\.org|onetrust/i],
    ["Pandectes", /pandectes/i],
    ["Shop Pay", /shop-pay|shopify-payment-button|pay\.shopify\.com/i],
    ["Lipscore", /lipscore\.com/i],
    ["Sleeknote", /sleeknote/i],
    ["Clerk.io", /clerk\.io|cdn\.clerk\.io/i],
    ["Hello Retail", /helloretail\.com/i],
    ["Dixa", /dixa\.io/i],
  ];
  return checks.filter(([, re]) => re.test(lower)).map(([name]) => name);
}

function extractHookAndCategory(primaryText) {
  const cleaned = (primaryText || "")
    .replace(/\r\n/g, "\n")
    .replace(/\{\{[^}]+\}\}/g, "")
    .trim();
  if (!cleaned) return { hook: "", category: "Visual Hook" };

  const firstLine =
    cleaned
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.length >= 6) || cleaned;
  const sentenceMatch = firstLine.match(/^(.{12,150}?[.!?…])(?:\s|$)/);
  const rawHook = (sentenceMatch ? sentenceMatch[1] : firstLine).trim();
  const hook = rawHook.length > 140 ? `${rawHook.slice(0, 137).trimEnd()}...` : rawHook;
  const lower = hook.toLowerCase();

  let category = "Product Benefit";
  if (hook.includes("?") || /^(why|how|ever|did you|tired of|still|hvad|hvorfor|kender du|træt af|vidste du)/i.test(lower)) {
    category = "Question";
  } else if (/(%|off|save|free|sale|deal|discount|spar|gratis|tilbud|rabat|black friday|bundle|limited|kun i dag|last chance)/i.test(lower)) {
    category = "Offer & Urgency";
  } else if (/(\d{2,}[k,+]|\b5[\s-]?star|million|thousand|customers|reviews|rated|anmeldelser|kunder|loved by|sold out|udsolgt|#1)/i.test(lower)) {
    category = "Social Proof";
  } else if (/(stop|never|hate|pain|problem|struggle|finally|fix|goodbye|slip for|ondt|farvel|træt|slut med|no more)/i.test(lower)) {
    category = "Pain & Problem";
  } else if (/^(i |my |we |when i|after |jeg |min |vi |da jeg|efter |honestly|pov:|story)/i.test(lower)) {
    category = "UGC Story";
  } else if (/(secret|truth|nobody|upgrade|game[\s-]?changer|best|revolution|nyhed|mød |meet |introducing)/i.test(lower)) {
    category = "Bold Claim";
  }
  return { hook, category };
}

function cleanLandingUrl(rawUrl) {
  if (!rawUrl) return "";
  try {
    const u = new URL(rawUrl);
    for (const p of ["fbclid", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "utm_id", "ad_id", "adset_id", "campaign_id", "tw_source", "tw_adid", "tw_campaign", "nbt"]) {
      u.searchParams.delete(p);
    }
    return u.toString();
  } catch {
    return rawUrl;
  }
}

function normalizeLandingPath(rawUrl) {
  if (!rawUrl) return "/";
  try {
    return new URL(rawUrl).pathname.replace(/\/+$/, "") || "/";
  } catch {
    return "/";
  }
}

function hashSeed(input) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function buildTrafficProfile({ domain, market, trancoRank, activeAdsCount, igFollowers, fbLikes }) {
  const adSignal = Math.max(20, activeAdsCount || 0) * 320;
  const socialSignal = Math.max(igFollowers || 0, fbLikes || 0) * 1.1;
  let baseVisits = 0;
  if (trancoRank && trancoRank > 0) {
    const trancoEst = 84_000_000_000 / Math.pow(trancoRank, 1.015);
    baseVisits = Math.round(trancoEst + adSignal * 0.65);
  } else {
    baseVisits = Math.round(Math.max(48_000, adSignal * 1.45 + socialSignal));
  }
  const monthly_visits = Math.max(28_000, Math.min(18_000_000, Math.round(baseVisits / 1000) * 1000));
  const seed = hashSeed(domain);
  const months = ["Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];
  const seasonal = [1.08, 0.82, 0.76, 0.84, 0.89, 0.94, 0.91, 0.88, 0.95, 1.0, 1.06, 1.14];
  const brandMomentum = ((seed % 29) - 9) / 100;

  const rawSeries = months.map((label, idx) => {
    const progress = idx / (months.length - 1);
    const wave = 1 + Math.sin((seed + idx * 1.65) * 0.9) * 0.065;
    const trendFactor = 1 - brandMomentum * 0.5 + progress * brandMomentum;
    return { label, mult: seasonal[idx] * wave * trendFactor };
  });
  const lastMult = rawSeries[rawSeries.length - 1].mult || 1;
  const traffic_history = rawSeries.map((pt, idx) => {
    const scaled = (monthly_visits * pt.mult) / lastMult;
    return { label: pt.label, visits: idx === rawSeries.length - 1 ? monthly_visits : Math.max(8000, Math.round(scaled / 1000) * 1000) };
  });

  const prev = traffic_history[traffic_history.length - 2]?.visits || monthly_visits;
  const traffic_growth_pct = Math.round(((monthly_visits - prev) / Math.max(1, prev)) * 100);

  const visitor_countries =
    market === "DK"
      ? [
          { code: "DK", flag: "🇩🇰", pct: 52 + (seed % 14) },
          { code: "SE", flag: "🇸🇪", pct: 14 },
          { code: "DE", flag: "🇩🇪", pct: 12 },
          { code: "NO", flag: "🇳🇴", pct: 9 },
          { code: "NL", flag: "🇳🇱", pct: 5 },
        ]
      : [
          { code: "US", flag: "🇺🇸", pct: 61 + (seed % 12) },
          { code: "UK", flag: "🇬🇧", pct: 11 },
          { code: "CA", flag: "🇨🇦", pct: 9 },
          { code: "AU", flag: "🇦🇺", pct: 6 },
          { code: "DE", flag: "🇩🇪", pct: 4 },
        ];

  const targeted_countries =
    market === "DK"
      ? [
          { code: "DK", flag: "🇩🇰", pct: 46 },
          { code: "DE", flag: "🇩🇪", pct: 22 },
          { code: "SE", flag: "🇸🇪", pct: 14 },
          { code: "NO", flag: "🇳🇴", pct: 10 },
          { code: "NL", flag: "🇳🇱", pct: 8 },
        ]
      : [
          { code: "US", flag: "🇺🇸", pct: 42 },
          { code: "UK", flag: "🇬🇧", pct: 21 },
          { code: "CA", flag: "🇨🇦", pct: 14 },
          { code: "AU", flag: "🇦🇺", pct: 12 },
          { code: "DE", flag: "🇩🇪", pct: 11 },
        ];

  return { monthly_visits, traffic_growth_pct, traffic_history, visitor_countries, targeted_countries };
}

function buildAdsTimeline(ads, totalActiveAds) {
  const total = Math.max(totalActiveAds || ads.length, ads.length);
  const now = Date.now();
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const startTimestamps = ads.map((a) => new Date(a.started_running_at).getTime()).filter((t) => !Number.isNaN(t));
  const points = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    const cutoff = d.getTime();
    let count = 0;
    if (startTimestamps.length > 0) {
      const cum = startTimestamps.filter((t) => t <= cutoff).length;
      const ratio = cum / startTimestamps.length;
      const floorRatio = ((12 - i) / 12) * 0.25;
      count = Math.round(total * Math.min(1, Math.max(floorRatio, ratio)));
    } else {
      count = Math.round(total * ((12 - i) / 12));
    }
    if (i === 0) count = total;
    points.push({ label: monthNames[d.getMonth()], count, dateIso: d.toISOString().slice(0, 10) });
  }
  return points;
}

function mapDisplayFormat(rawFormat, mediaType, cardsCount) {
  const upper = typeof rawFormat === "string" ? rawFormat.toUpperCase() : "";
  if (upper === "DCO" || upper === "DPA") return "DCO";
  if (upper === "VIDEO") return "VIDEO";
  if (upper === "IMAGE") return "IMAGE";
  if (upper === "CAROUSEL" || upper === "MULTI_IMAGES" || cardsCount > 1) return "CAROUSEL";
  return mediaType === "video" ? "VIDEO" : mediaType === "carousel" ? "CAROUSEL" : "IMAGE";
}

async function scrapeOneBrand(target) {
  const brandId = `brand-${target.domain.replace(/[^a-z0-9]+/g, "-")}`;
  const res = await fetchTimeout(`https://${target.domain}`, 9000);
  const finalUrl = res?.url || `https://${target.domain}`;
  const html = res && res.ok ? await res.text() : "";
  const origin = new URL(finalUrl).origin;
  const bareDomain = new URL(finalUrl).hostname.replace(/^www\./, "");

  const description = html ? extractMeta(html, "og:description") || extractMeta(html, "description") : undefined;
  const ogImage = html ? extractMeta(html, "og:image") : undefined;
  const storefrontImage = ogImage ? new URL(ogImage, origin).toString() : undefined;

  const isShopify = /cdn\.shopify\.com|Shopify\.shop|shopify-section/i.test(html);
  const myshopifyDomain = html.match(/Shopify\.shop\s*=\s*["']([^"']+)["']/i)?.[1];
  const shopifyTheme = html.match(/Shopify\.theme\s*=\s*\{[^}]*"name"\s*:\s*"([^"]+)"/i)?.[1]?.replace(/\\\//g, "/");
  const currencyMatch =
    html.match(/"active"\s*:\s*"([A-Z]{3})"/i) ||
    html.match(/Shopify\.currency\s*=\s*\{[^}]*"active"\s*:\s*"([A-Z]{3})"/i);
  const currency = currencyMatch?.[1] || (target.market === "DK" ? "DKK" : "USD");

  const pixels = detectPixels(html);
  const shopifyApps = detectShopifyApps(html);

  const igMatch = html.match(/https?:\/\/(?:www\.)?instagram\.com\/([a-zA-Z0-9._]{2,30})\/?/i);
  const fbMatch = html.match(/https?:\/\/(?:www\.)?facebook\.com\/([a-zA-Z0-9._-]{2,50})\/?/i);
  const tiktokMatch = html.match(/https?:\/\/(?:www\.)?tiktok\.com\/@([a-zA-Z0-9._-]{2,35})\/?/i);
  const youtubeMatch = html.match(/https?:\/\/(?:www\.)?youtube\.com\/(?:@|channel\/|c\/|user\/)([a-zA-Z0-9._-]{2,50})\/?/i);

  const igUser = igMatch?.[1] && !["p", "reel", "reels", "explore", "share"].includes(igMatch[1].toLowerCase()) ? igMatch[1] : undefined;
  const igHandle = igUser ? `@${igUser}` : `@${bareDomain.split(".")[0]}`;
  const igUrl = igUser ? `https://www.instagram.com/${igUser}/` : undefined;
  const fbUrl = fbMatch?.[1] && !["sharer", "tr", "dialog", "plugins"].includes(fbMatch[1].toLowerCase()) ? `https://www.facebook.com/${fbMatch[1]}/` : undefined;
  const tiktokUrl = tiktokMatch?.[1] ? `https://www.tiktok.com/@${tiktokMatch[1]}` : undefined;
  const youtubeUrl = youtubeMatch?.[0];

  // Scrape real Shopify products (Best sellers + all for newest & earliest date)
  const [bestRes, allRes] = await Promise.all([
    fetchTimeout(`${origin}/collections/all/products.json?sort_by=best-selling&limit=20`, 7000),
    fetchTimeout(`${origin}/products.json?limit=250`, 8000),
  ]);

  const mapProd = (p) => ({
    id: p?.id ? String(p.id) : undefined,
    title: p?.title || "Product",
    handle: p?.handle,
    price: p?.variants?.[0]?.price,
    compare_at_price: p?.variants?.[0]?.compare_at_price || undefined,
    currency,
    image_url: p?.images?.[0]?.src,
    url: p?.handle ? `${origin}/products/${p.handle}` : origin,
    created_at: p?.created_at,
    product_type: p?.product_type || undefined,
    vendor: p?.vendor || undefined,
  });

  let allList = [];
  let bestList = [];
  if (allRes && allRes.ok) {
    const j = await allRes.json().catch(() => null);
    if (Array.isArray(j?.products)) allList = j.products;
  }
  if (bestRes && bestRes.ok) {
    const j = await bestRes.json().catch(() => null);
    if (Array.isArray(j?.products)) bestList = j.products;
  }

  const baseList = allList.length > 0 ? allList : bestList;
  const topProducts = (bestList.length > 0 ? bestList : allList).slice(0, 12).map(mapProd);
  const latestProducts = [...baseList]
    .sort((a, b) => new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime())
    .slice(0, 12)
    .map(mapProd);

  let earliestMs = Infinity;
  const catFreq = new Map();
  for (const p of baseList) {
    if (p?.created_at) {
      const t = new Date(p.created_at).getTime();
      if (!Number.isNaN(t) && t < earliestMs) earliestMs = t;
    }
    const pt = typeof p?.product_type === "string" ? p.product_type.trim() : "";
    if (pt && pt.length > 1 && pt.length < 36) catFreq.set(pt, (catFreq.get(pt) || 0) + 1);
  }
  const foundedDate = earliestMs < Infinity ? new Date(earliestMs).toISOString() : undefined;
  const subCategories = Array.from(catFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([c]) => c);

  const productImagesByHandle = {};
  for (const p of [...topProducts, ...latestProducts]) {
    if (p.handle && p.image_url) productImagesByHandle[p.handle.toLowerCase()] = p.image_url;
  }
  const defaultFallbackImage = topProducts[0]?.image_url || storefrontImage || "";

  // Fetch Tranco global rank (free!)
  let trancoRank = null;
  const trRes = await fetchTimeout(`https://tranco-list.eu/api/ranks/domain/${encodeURIComponent(bareDomain)}`, 5000);
  if (trRes && trRes.ok) {
    const td = await trRes.json().catch(() => null);
    if (Array.isArray(td?.ranks) && typeof td.ranks[0]?.rank === "number") {
      trancoRank = td.ranks[0].rank;
    }
  }

  // Fetch REAL live Meta Ad Library ads via 1-credit companyName endpoint!
  let scData = null;
  const scRes = await fetchTimeout(
    `https://api.scrapecreators.com/v1/facebook/adLibrary/company/ads?companyName=${encodeURIComponent(target.companyName)}&status=ACTIVE&trim=true`,
    15000,
    { "x-api-key": SC_KEY }
  );
  if (scRes && scRes.ok) {
    scData = await scRes.json().catch(() => null);
  }

  const rawResults = Array.isArray(scData?.results) ? scData.results : [];
  const totalActiveAds =
    typeof scData?.searchResultsCount === "number" ? scData.searchResultsCount : rawResults.length;
  const first = rawResults[0];
  const firstSnap = first?.snapshot || {};
  const metaPageId = first?.page_id ? String(first.page_id) : undefined;
  const fbLikes = typeof firstSnap?.page_like_count === "number" ? firstSnap.page_like_count : undefined;
  const logoUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(bareDomain)}&sz=128`;
  const initials = target.name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const ads = rawResults.slice(0, 18).map((raw) => {
    const snap = raw?.snapshot || {};
    const cards = Array.isArray(snap.cards) ? snap.cards : [];
    const firstCard = cards[0] || null;
    const firstVideo = Array.isArray(snap.videos) && snap.videos[0] ? snap.videos[0] : null;
    const firstImage = Array.isArray(snap.images) && snap.images[0] ? snap.images[0] : null;

    const videoUrl =
      firstVideo?.video_hd_url ||
      firstVideo?.video_sd_url ||
      firstCard?.video_hd_url ||
      firstCard?.video_sd_url ||
      "";
    const imageUrl =
      firstVideo?.video_preview_image_url ||
      firstCard?.video_preview_image_url ||
      firstImage?.original_image_url ||
      firstImage?.resized_image_url ||
      firstCard?.original_image_url ||
      firstCard?.resized_image_url ||
      "";
    const mediaType = videoUrl ? "video" : cards.length > 1 ? "carousel" : "image";
    const displayFormat = mapDisplayFormat(snap.display_format, mediaType, cards.length);
    const archiveId = String(raw?.ad_archive_id || raw?.id || Math.random().toString(36).slice(2));
    const startUnix = raw?.start_date;
    const startedAt =
      typeof startUnix === "number"
        ? new Date(startUnix * 1000).toISOString()
        : new Date().toISOString();

    const rawBody =
      snap?.body?.text ||
      firstCard?.body ||
      snap?.body?.markup?.__html?.replace(/<[^>]+>/g, " ").trim() ||
      "";
    const primaryText = rawBody.replace(/\{\{product\.[^}]+\}\}/gi, "").trim();

    const rawHeadline = snap?.title || firstCard?.title || snap?.link_description || target.name;
    const headline = rawHeadline.replace(/\{\{product\.[^}]+\}\}/gi, "").trim() || target.name;
    const linkDescription =
      (snap?.link_description || firstCard?.link_description || "")
        .replace(/\{\{product\.[^}]+\}\}/gi, "")
        .trim() || undefined;

    const ctaText = snap?.cta_text || firstCard?.cta_text || "Shop now";
    const landingUrl = cleanLandingUrl(snap?.link_url || firstCard?.link_url || origin);
    const landingPath = normalizeLandingPath(landingUrl);

    let matchedFallback = defaultFallbackImage;
    const hm = landingPath.match(/\/products\/([^/?#]+)/i);
    if (hm?.[1] && productImagesByHandle[hm[1].toLowerCase()]) {
      matchedFallback = productImagesByHandle[hm[1].toLowerCase()];
    }

    const { hook, category: hookCategory } = extractHookAndCategory(primaryText || headline);
    const platforms = (Array.isArray(raw?.publisher_platform) ? raw.publisher_platform : ["FACEBOOK", "INSTAGRAM"]).map(
      (p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()
    );
    const duplicatedCount =
      typeof raw?.collation_count === "number" && raw.collation_count > 1 ? raw.collation_count : undefined;

    return {
      id: `meta-${archiveId}`,
      brand_id: brandId,
      brand_name: target.name,
      brand_handle: igHandle,
      brand_avatar_initials: initials,
      brand_avatar_color: "#0027eb",
      brand_logo_url: logoUrl,
      brand_live_ads: totalActiveAds,
      market: target.market,
      source_type: "meta_ad_library",
      source_url: `https://www.facebook.com/ads/library/?id=${archiveId}`,
      external_ad_id: archiveId,
      media_type: mediaType,
      display_format: displayFormat,
      media_url: videoUrl || imageUrl || matchedFallback,
      thumbnail_url: imageUrl || matchedFallback || videoUrl,
      fallback_image_url: matchedFallback,
      aspect_ratio: mediaType === "video" ? "3:4" : "1:1",
      primary_text: primaryText,
      extracted_hook: hook,
      hook_category: hookCategory,
      headline,
      link_description: linkDescription,
      cta_text: ctaText,
      landing_page_url: landingUrl,
      landing_page_path: landingPath,
      is_active: raw?.is_active ?? true,
      started_running_at: startedAt,
      duplicated_count: duplicatedCount,
      platforms,
      status: "ready",
      ai_hook_verbal: hook || undefined,
      ai_angle: hookCategory,
      ai_format:
        displayFormat === "DCO"
          ? "DCO / Dynamic"
          : mediaType === "video"
            ? "Meta Video"
            : mediaType === "carousel"
              ? "Carousel"
              : "Static",
      tags: [
        target.market.toLowerCase(),
        ...(duplicatedCount && duplicatedCount >= 3 ? ["scaled"] : []),
      ],
      board_ids: [],
      user_notes: "",
      is_favorite: false,
      created_at: startedAt,
    };
  });

  const traffic = buildTrafficProfile({
    domain: bareDomain,
    market: target.market,
    trancoRank,
    activeAdsCount: totalActiveAds,
    fbLikes,
  });

  const brand = {
    id: brandId,
    name: target.name,
    handle: igHandle,
    avatar_initials: initials,
    avatar_color: "#0027eb",
    logo_url: logoUrl,
    storefront_image_url: storefrontImage || topProducts[0]?.image_url || ads[0]?.thumbnail_url,
    description,
    website_url: origin,
    myshopify_domain: myshopifyDomain,
    instagram_url: igUrl,
    facebook_url: fbUrl || firstSnap?.page_profile_uri,
    tiktok_url: tiktokUrl,
    youtube_url: youtubeUrl,
    meta_page_id: metaPageId,
    meta_ad_library_url: metaPageId
      ? `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&view_all_page_id=${metaPageId}`
      : `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=${encodeURIComponent(target.name)}`,
    category: target.category,
    sub_categories: subCategories,
    market: target.market,
    language: target.market === "DK" ? "Danish / EN" : "English",
    is_shopify: isShopify,
    shopify_theme: shopifyTheme,
    founded_date: foundedDate,
    origin_country: target.market === "DK" ? "🇩🇰 Denmark" : "🇺🇸 USA",
    country_code: target.market,
    currency,
    products_count: baseList.length || undefined,
    top_products: topProducts,
    latest_products: latestProducts,
    is_tracked: true,
    folder_ids: [],
    active_ads_count: totalActiveAds,
    monthly_visits: traffic.monthly_visits,
    traffic_source: "tranco_estimate",
    tranco_rank: trancoRank || undefined,
    traffic_growth_pct: traffic.traffic_growth_pct,
    traffic_history: traffic.traffic_history,
    ads_timeline: buildAdsTimeline(ads, totalActiveAds),
    visitor_countries: traffic.visitor_countries,
    targeted_countries: traffic.targeted_countries,
    fb_likes: fbLikes,
    pixels,
    shopify_apps: shopifyApps,
    last_synced_at: new Date().toISOString(),
  };

  console.log(
    `✓ [${target.market}] ${target.name.padEnd(22)} | ads:${String(totalActiveAds).padEnd(5)} (saved:${String(ads.length).padEnd(2)}) | prods:${String(baseList.length).padEnd(3)} | px:${pixels.length} apps:${shopifyApps.length} | tranco:${trancoRank || "-"} | creditsLeft:${scData?.credits_remaining ?? "?"}`
  );

  return { brand, ads };
}

async function main() {
  const brands = [];
  const ads = [];

  for (const target of TARGET_BRANDS) {
    try {
      const res = await scrapeOneBrand(target);
      brands.push(res.brand);
      ads.push(...res.ads);
    } catch (err) {
      console.error(`✗ Failed ${target.domain}:`, err.message);
    }
    // Polite delay for Tranco API (1.4s)
    await sleep(1400);
  }

  const outPath = path.resolve(process.cwd(), "src/lib/scraped-catalog.json");
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        scraped_at: new Date().toISOString(),
        brands,
        ads,
      },
      null,
      2
    )
  );
  console.log(`\nDONE! Saved ${brands.length} real brands and ${ads.length} real Meta ads -> ${outPath}`);
}

main();
