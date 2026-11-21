export interface TechMeta {
  name: string;
  kind: "pixel" | "app";
  domain: string;
  category: string;
}

export const TECH_CATALOG: Record<string, TechMeta> = {
  // =========================================================================
  // AD PIXELS & ANALYTICS
  // =========================================================================
  "Meta Pixel": { name: "Meta Pixel", kind: "pixel", domain: "meta.com", category: "Paid Social" },
  "Google Analytics": { name: "Google Analytics", kind: "pixel", domain: "analytics.google.com", category: "Analytics" },
  "Google Tag Manager": { name: "Google Tag Manager", kind: "pixel", domain: "tagmanager.google.com", category: "Tag Manager" },
  "Google Ads": { name: "Google Ads", kind: "pixel", domain: "ads.google.com", category: "Paid Search" },
  "TikTok Pixel": { name: "TikTok Pixel", kind: "pixel", domain: "tiktok.com", category: "Paid Social" },
  "Pinterest Ads": { name: "Pinterest Ads", kind: "pixel", domain: "pinterest.com", category: "Paid Social" },
  "Snap Pixel": { name: "Snap Pixel", kind: "pixel", domain: "snapchat.com", category: "Paid Social" },
  "Twitter Ads": { name: "Twitter Ads", kind: "pixel", domain: "x.com", category: "Paid Social" },
  "Microsoft Advertising": { name: "Microsoft Advertising", kind: "pixel", domain: "ads.microsoft.com", category: "Paid Search" },
  "Microsoft Clarity": { name: "Microsoft Clarity", kind: "pixel", domain: "clarity.microsoft.com", category: "Heatmaps" },
  "AppLovin Axon": { name: "AppLovin Axon", kind: "pixel", domain: "applovin.com", category: "Performance Ads" },
  "Taboola": { name: "Taboola", kind: "pixel", domain: "taboola.com", category: "Native Ads" },
  "Outbrain": { name: "Outbrain", kind: "pixel", domain: "outbrain.com", category: "Native Ads" },
  "Reddit Pixel": { name: "Reddit Pixel", kind: "pixel", domain: "reddit.com", category: "Paid Social" },
  "LinkedIn Insight": { name: "LinkedIn Insight", kind: "pixel", domain: "linkedin.com", category: "Paid Social" },
  "Hotjar": { name: "Hotjar", kind: "pixel", domain: "hotjar.com", category: "Heatmaps" },
  "Vibe CTV": { name: "Vibe CTV", kind: "pixel", domain: "vibe.co", category: "CTV Ads" },
  "Adtraction": { name: "Adtraction", kind: "pixel", domain: "adtraction.com", category: "Affiliate" },
  "Partner-Ads": { name: "Partner-Ads", kind: "pixel", domain: "partner-ads.com", category: "Affiliate" },
  "AdRoll": { name: "AdRoll", kind: "pixel", domain: "adroll.com", category: "Retargeting" },

  // =========================================================================
  // SHOPIFY APPS & E-COMMERCE STACK
  // =========================================================================
  "Klaviyo": { name: "Klaviyo", kind: "app", domain: "klaviyo.com", category: "Email & SMS" },
  "Triple Whale": { name: "Triple Whale", kind: "app", domain: "triplewhale.com", category: "Attribution" },
  "Elevar": { name: "Elevar", kind: "app", domain: "getelevar.com", category: "Server-Side Tracking" },
  "Northbeam": { name: "Northbeam", kind: "app", domain: "northbeam.io", category: "Attribution" },
  "Blotout EdgeTag": { name: "Blotout EdgeTag", kind: "app", domain: "blotout.io", category: "Server-Side Tracking" },
  "Converge": { name: "Converge", kind: "app", domain: "runconverge.com", category: "Attribution" },
  "mParticle": { name: "mParticle", kind: "app", domain: "mparticle.com", category: "CDP" },
  "Judge.me": { name: "Judge.me", kind: "app", domain: "judge.me", category: "Reviews" },
  "Yotpo": { name: "Yotpo", kind: "app", domain: "yotpo.com", category: "Reviews & Loyalty" },
  "Loox": { name: "Loox", kind: "app", domain: "loox.app", category: "Photo Reviews" },
  "Okendo": { name: "Okendo", kind: "app", domain: "okendo.io", category: "Reviews" },
  "Stamped": { name: "Stamped", kind: "app", domain: "stamped.io", category: "Reviews" },
  "Reviews.io": { name: "Reviews.io", kind: "app", domain: "reviews.io", category: "Reviews" },
  "Trustpilot": { name: "Trustpilot", kind: "app", domain: "trustpilot.com", category: "Reviews" },
  "Junip": { name: "Junip", kind: "app", domain: "juniphq.com", category: "Reviews" },
  "Lipscore": { name: "Lipscore", kind: "app", domain: "lipscore.com", category: "Reviews" },
  "Recharge": { name: "Recharge", kind: "app", domain: "rechargepayments.com", category: "Subscriptions" },
  "Skio": { name: "Skio", kind: "app", domain: "skio.com", category: "Subscriptions" },
  "Gorgias": { name: "Gorgias", kind: "app", domain: "gorgias.com", category: "Customer Support" },
  "Richpanel": { name: "Richpanel", kind: "app", domain: "richpanel.com", category: "Customer Support" },
  "Zendesk": { name: "Zendesk", kind: "app", domain: "zendesk.com", category: "Customer Support" },
  "Intercom": { name: "Intercom", kind: "app", domain: "intercom.com", category: "Customer Support" },
  "Crisp": { name: "Crisp", kind: "app", domain: "crisp.chat", category: "Customer Support" },
  "Siena AI": { name: "Siena AI", kind: "app", domain: "siena.cx", category: "AI Support" },
  "Dixa": { name: "Dixa", kind: "app", domain: "dixa.com", category: "Customer Support" },
  "Rebuy": { name: "Rebuy", kind: "app", domain: "rebuyengine.com", category: "Upsell & Cross-sell" },
  "AfterSell": { name: "AfterSell", kind: "app", domain: "aftersell.app", category: "Post-Purchase Upsell" },
  "Zipify": { name: "Zipify", kind: "app", domain: "zipify.com", category: "Funnels & Upsell" },
  "Conversion Bear": { name: "Conversion Bear", kind: "app", domain: "conversionbear.com", category: "Bundles & Upsell" },
  "Shoplift": { name: "Shoplift", kind: "app", domain: "shoplift.ai", category: "A/B Testing" },
  "Intelligems": { name: "Intelligems", kind: "app", domain: "intelligems.io", category: "A/B & Price Testing" },
  "Convert": { name: "Convert", kind: "app", domain: "convert.com", category: "A/B Testing" },
  "Visually": { name: "Visually", kind: "app", domain: "visually.io", category: "CRO & A/B Testing" },
  "ABConvert": { name: "ABConvert", kind: "app", domain: "abconvert.io", category: "A/B Testing" },
  "OptiMonk": { name: "OptiMonk", kind: "app", domain: "optimonk.com", category: "Popups & CRO" },
  "Sleeknote": { name: "Sleeknote", kind: "app", domain: "sleeknote.com", category: "Popups & Lead Gen" },
  "Privy": { name: "Privy", kind: "app", domain: "privy.com", category: "Popups & Email" },
  "Alia": { name: "Alia", kind: "app", domain: "alialearn.com", category: "Popups & Education" },
  "Attentive": { name: "Attentive", kind: "app", domain: "attentive.com", category: "SMS Marketing" },
  "Postscript": { name: "Postscript", kind: "app", domain: "postscript.io", category: "SMS Marketing" },
  "Omnisend": { name: "Omnisend", kind: "app", domain: "omnisend.com", category: "Email & SMS" },
  "Smile.io": { name: "Smile.io", kind: "app", domain: "smile.io", category: "Loyalty" },
  "LoyaltyLion": { name: "LoyaltyLion", kind: "app", domain: "loyaltylion.com", category: "Loyalty" },
  "Duel": { name: "Duel", kind: "app", domain: "duel.tech", category: "Brand Advocacy" },
  "AfterShip": { name: "AfterShip", kind: "app", domain: "aftership.com", category: "Tracking & Returns" },
  "ParcelPanel": { name: "ParcelPanel", kind: "app", domain: "parcelpanel.com", category: "Order Tracking" },
  "Loop Returns": { name: "Loop Returns", kind: "app", domain: "loopreturns.com", category: "Returns" },
  "Route": { name: "Route", kind: "app", domain: "route.com", category: "Shipping Protection" },
  "ShipInsure": { name: "ShipInsure", kind: "app", domain: "shipinsure.io", category: "Shipping Protection" },
  "Klarna": { name: "Klarna", kind: "app", domain: "klarna.com", category: "BNPL Payments" },
  "Anyday": { name: "Anyday", kind: "app", domain: "anyday.io", category: "BNPL Payments (DK)" },
  "Global-e": { name: "Global-e", kind: "app", domain: "global-e.com", category: "Cross-Border" },
  "Shop Pay": { name: "Shop Pay", kind: "app", domain: "shop.app", category: "Accelerated Checkout" },
  "PageFly": { name: "PageFly", kind: "app", domain: "pagefly.io", category: "Landing Page Builder" },
  "GemPages": { name: "GemPages", kind: "app", domain: "gempages.net", category: "Landing Page Builder" },
  "Foxify": { name: "Foxify", kind: "app", domain: "foxify.app", category: "Landing Page Builder" },
  "Instant": { name: "Instant", kind: "app", domain: "instant.so", category: "Landing Page Builder" },
  "Shogun": { name: "Shogun", kind: "app", domain: "getshogun.com", category: "Landing Page Builder" },
  "Nosto": { name: "Nosto", kind: "app", domain: "nosto.com", category: "Personalization" },
  "Klevu": { name: "Klevu", kind: "app", domain: "klevu.com", category: "Search & Merchandising" },
  "Searchspring": { name: "Searchspring", kind: "app", domain: "searchspring.com", category: "Search & Merchandising" },
  "Clerk.io": { name: "Clerk.io", kind: "app", domain: "clerk.io", category: "Search & Recommendations" },
  "Hello Retail": { name: "Hello Retail", kind: "app", domain: "helloretail.com", category: "Personalization (DK)" },
  "Cookiebot": { name: "Cookiebot", kind: "app", domain: "cookiebot.com", category: "Cookie Consent" },
  "OneTrust": { name: "OneTrust", kind: "app", domain: "onetrust.com", category: "Cookie Consent" },
  "Pandectes": { name: "Pandectes", kind: "app", domain: "pandectes.io", category: "GDPR Compliance" },
  "CookieScript": { name: "CookieScript", kind: "app", domain: "cookie-script.com", category: "Cookie Consent" },
  "e-mærket": { name: "e-mærket", kind: "app", domain: "emaerket.dk", category: "Danish Trustmark" },
  "Sprii": { name: "Sprii", kind: "app", domain: "sprii.io", category: "Live Shopping (DK)" },
  "Black Crow AI": { name: "Black Crow AI", kind: "app", domain: "blackcrow.ai", category: "Predictive AI" },
  "Globo Options": { name: "Globo Options", kind: "app", domain: "globosoftware.net", category: "Product Options" },
  "Archive": { name: "Archive", kind: "app", domain: "archive.com", category: "Influencer UGC" },
  "GoCertify": { name: "GoCertify", kind: "app", domain: "gocertify.me", category: "Gated Offers" },
  "Sprout": { name: "Sprout", kind: "app", domain: "thegoodapi.com", category: "Sustainability" },
  "Recoup": { name: "Recoup", kind: "app", domain: "recoup.app", category: "Recovery & Retention" },
};

export function getTechMeta(name: string): TechMeta | null {
  if (TECH_CATALOG[name]) return TECH_CATALOG[name];
  const lower = name.toLowerCase();
  for (const [key, meta] of Object.entries(TECH_CATALOG)) {
    if (key.toLowerCase() === lower) return meta;
  }
  return null;
}

export function getTechLogoUrl(name: string): string | null {
  const meta = getTechMeta(name);
  if (meta) {
    return `/api/tech-logo?name=${encodeURIComponent(meta.name)}&domain=${encodeURIComponent(meta.domain)}`;
  }
  // If an auto-discovered app already looks like a domain (e.g. "appname.io")
  if (/^[a-z0-9-]+\.[a-z]{2,}$/i.test(name.trim())) {
    return `/api/tech-logo?domain=${encodeURIComponent(name.trim().toLowerCase())}`;
  }
  return null;
}
