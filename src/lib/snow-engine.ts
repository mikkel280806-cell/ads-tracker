import { formatProductPriceDkk } from "./audience-insights";
import type { Ad, ProductPreview } from "./types";
import type {
  BrandMemory,
  ClonedSourceAd,
  CreativeProject,
  HookVariant,
  MinedUrlInsights,
  OwnAdMetricRow,
  SnowActionCard,
  SnowMessage,
  StaticCloneLayoutId,
  StudioScene,
  VideoStylePreset,
  VideoStylePresetId,
} from "./studio-types";

export const VIDEO_STYLE_PRESETS: VideoStylePreset[] = [
  {
    id: "iphone_ugc",
    name: "Realistic iPhone UGC",
    subtitle: "Autentisk selfie & håndholdt demo",
    badge: "Højest ROAS",
    description:
      "Naturligt dagslys, let håndholdt mikro-bevægelse og troværdig TikTok/Reels-levering med produktet i hånden.",
    whyItWorks:
      "Ligner ikke en reklame i feedet — stopper scrollet med 38–46% Thumbstop og lav CPA.",
    defaultDurationSec: 22,
    cameraRecipe: "iPhone 16 Pro 24mm · f/1.8 · Natural Window Light · Handheld 24fps",
    filterCss: "contrast(1.03) saturate(1.04)",
  },
  {
    id: "claymation_moa",
    name: "Claymation MOA",
    subtitle: "Stop-motion lermodel (Mechanism of Action)",
    badge: "Viral Pattern Interrupt",
    description:
      "Håndlavet ler-stil med taktile fingeraftryk, 12fps stop-motion kadence og visuel forklaring af problemet.",
    whyItWorks:
      "Tvinger øjet til at stoppe på 0,8 sek. Perfekt til komplekse fordele, søvn, hud & velvære.",
    defaultDurationSec: 20,
    cameraRecipe: "Macro 50mm · 12fps Stop-Motion · Soft Studio Key + Fingerprint Clay Texture",
    filterCss: "contrast(1.08) saturate(1.16)",
  },
  {
    id: "pixar_story",
    name: "Pixar 3D Story",
    subtitle: "Varm 3D-animation med følelse & humor",
    badge: "Bred Appel",
    description:
      "Udtryksfuld 3D-karakter oplever hverdagens frustration, inden dit produkt redder aftenen med gyldent lys.",
    whyItWorks:
      "Skaber øjeblikkelig sympati og høj Hold-rate hos kolde målgrupper på tværs af alder.",
    defaultDurationSec: 22,
    cameraRecipe: "35mm Anamorphic 3D Render · Subsurface Scattering · Golden Rim Light",
    filterCss: "saturate(1.18) brightness(1.03)",
  },
  {
    id: "mini_drama",
    name: "Mini-Drama / Plot Twist",
    subtitle: "2-personers konflikt + hurtig afsløring",
    badge: "Lav CPM",
    description:
      "Skarp hverdagskonflikt på 2 sekunder, dramatisk blik i kameraet og en overraskende løsning.",
    whyItWorks:
      "Historie-bue fastholder seeren forbi 15 sek. (høj Hold-rate > 32%) før CTA.",
    defaultDurationSec: 24,
    cameraRecipe: "Dual Angle Cut · Tight Reaction Close-Up · Crisp Natural Room Tone",
    filterCss: "contrast(1.06) saturate(1.02)",
  },
  {
    id: "founder_authority",
    name: "Founder / Ekspert-klip",
    subtitle: "Stifter-troværdighed + bevis på bordet",
    badge: "Trust & AOV",
    description:
      "Direkte øjenkontakt fra stifteren ved arbejdsbordet med 'derfor byggede vi den her'-historien.",
    whyItWorks:
      "Løfter konvertering på dyrere produkter & bundles, hvor tillid afgør købet.",
    defaultDurationSec: 26,
    cameraRecipe: "50mm Shallow Depth · Softbox Key Light · Crisp Lapel Audio",
    filterCss: "contrast(1.04) saturate(0.98)",
  },
  {
    id: "cinema_macro",
    name: "Cinema Product Macro",
    subtitle: "Luksus nærbilleder & taktil tekstur",
    badge: "Premium Skalering",
    description:
      "Dramatiske slow-motion makroskud af materialer, detaljer og unboxing med tung rytmisk klipning.",
    whyItWorks:
      "Positionerer produktet som high-end og retfærdiggør højere pris uden rabatter.",
    defaultDurationSec: 18,
    cameraRecipe: "100mm Macro Probe Lens · 60fps Slow-Mo · Specular Rim Highlights",
    filterCss: "contrast(1.1) saturate(1.06)",
  },
];

export const CREATOR_PERSONAS = [
  { id: "Sofie (29 · Skandinavisk UGC)", label: "Sofie (29 · Naturlig skandinavisk)" },
  { id: "Mikkel (34 · Founder / Ekspert)", label: "Mikkel (34 · Founder & direkte)" },
  { id: "Emma (26 · Energi & TikTok)", label: "Emma (26 · Hurtig & energisk)" },
  { id: "Kasper (41 · Skeptisk tester)", label: "Kasper (41 · Først skeptisk, så overbevist)" },
];

export function formatDkkExact(amount: number): string {
  const rounded = Math.round(amount);
  const formatted = String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${formatted} kr.`;
}

export function getPresetById(id: VideoStylePresetId): VideoStylePreset {
  return VIDEO_STYLE_PRESETS.find((p) => p.id === id) || VIDEO_STYLE_PRESETS[0];
}

/**
 * Optional server-side LLM enhancement via AI Gateway / OpenAI / Groq.
 * Silently returns null when keys aren't configured so local/preview works 100% deterministically.
 */
export async function tryOptionalLlm(
  systemPrompt: string,
  userPrompt: string
): Promise<string | null> {
  const gatewayKey = process.env.AI_GATEWAY_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  let endpoint = "";
  let token = "";
  let model = "";

  if (gatewayKey) {
    endpoint = "https://ai-gateway.vercel.sh/v1/chat/completions";
    token = gatewayKey;
    model = process.env.AI_GATEWAY_MODEL || "openai/gpt-4o-mini";
  } else if (openaiKey) {
    endpoint = "https://api.openai.com/v1/chat/completions";
    token = openaiKey;
    model = "gpt-4o-mini";
  } else if (groqKey) {
    endpoint = "https://api.groq.com/openai/v1/chat/completions";
    token = groqKey;
    model = "llama-3.3-70b-versatile";
  } else {
    return null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 11000);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.5,
        max_tokens: 900,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content;
    return typeof content === "string" && content.trim().length > 20 ? content.trim() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function cleanTextLines(html: string): string[] {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  const text = withoutScripts
    .replace(/<\/(p|div|li|h1|h2|h3|h4|section|article|br)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
  return text
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length >= 16 && l.length <= 240);
}

export function synthesizeBrandMemoryFromScrape(opts: {
  brandName: string;
  domain: string;
  websiteUrl: string;
  logoUrl?: string;
  title?: string;
  description?: string;
  html: string;
  category: string;
  currency: string;
  products: ProductPreview[];
  pixels: string[];
  shopifyApps: string[];
  trustpilotScore?: number;
  trustpilotReviews?: number;
}): BrandMemory {
  const lines = cleanTextLines(opts.html);
  const lower = opts.html.toLowerCase();
  const isDanish =
    opts.domain.endsWith(".dk") ||
    opts.currency === "DKK" ||
    /\b(og|med|til|fra|kr|dansk|levering|garanti)\b/i.test(opts.description || "");

  const heroTitle = opts.products[0]?.title || opts.brandName;
  const heroPrice = opts.products[0]?.price
    ? formatProductPriceDkk(opts.products[0].price, opts.products[0].currency || opts.currency)
    : undefined;

  // Detect real USPs from storefront signals + copy lines
  const usps: string[] = [];
  if (/garanti|tilfredshedsgaranti|money[\s-]?back|day guarantee|\d+\s*dages/i.test(lower)) {
    usps.push(isDanish ? "Risikofrit køb med fuld tilfredshedsgaranti" : "Risk-free 30-day satisfaction guarantee");
  }
  if (/fri fragt|gratis fragt|free shipping/i.test(lower)) {
    usps.push(isDanish ? "Hurtig levering & fri fragt over grænsen" : "Fast dispatch & free shipping threshold");
  }
  if (opts.trustpilotScore && opts.trustpilotScore >= 4) {
    usps.push(
      isDanish
        ? `${opts.trustpilotScore}/5 på Trustpilot (${(opts.trustpilotReviews || 120).toLocaleString("da-DK")}+ anmeldelser)`
        : `Rated ${opts.trustpilotScore}/5 on Trustpilot (${opts.trustpilotReviews || 120}+ reviews)`
    );
  }
  if (/bundle|pakke|spar \d+%|save \d+%/i.test(lower)) {
    usps.push(isDanish ? "Mængderabat & færdige pakkeløsninger" : "Built-in bundle & save tiers");
  }
  for (const l of lines) {
    if (usps.length >= 5) break;
    if (/(✓|✔|100%|dokumenteret|designet i|udviklet|award|patent|clinically|organic|tested)/i.test(l) && !usps.includes(l)) {
      usps.push(l.slice(0, 88));
    }
  }
  if (usps.length < 3) {
    usps.push(
      isDanish ? `Skarp hverdagsopgradering omkring ${heroTitle}` : `High-craft daily upgrade built around ${heroTitle}`,
      isDanish ? "Designet til at løse problemet på under 5 minutter" : "Fast-acting everyday upgrade without friction"
    );
  }

  // Pain points & desires tuned by store category
  const catLower = `${opts.category} ${opts.description || ""} ${heroTitle}`.toLowerCase();
  const painPoints: string[] = [];
  const desires: string[] = [];
  const objections: string[] = [];

  if (/sleep|søvn|pude|dyne|blanket|mellow|nyght|nap/i.test(catLower)) {
    painPoints.push(
      "Vågner træt med spændinger i nakke/skuldre eller uro om natten",
      "Har prøvet billige standardløsninger der mister form og støtte"
    );
    desires.push(
      "Dyb, uafbrudt nattesøvn og frisk energi fra morgenstunden",
      "Hotel-følelse derhjemme uden svedige nætter"
    );
  } else if (/skin|hud|hair|hår|beauty|care|cosmetic/i.test(catLower)) {
    painPoints.push(
      "10-trins rutiner der koster formuer uden synlige resultater",
      "Tør, irriteret eller livløs hud/hår af skrappe ingredienser"
    );
    desires.push(
      "Synlig glød og stærkere resultater på 2–4 uger i én enkel rutine",
      "Rene ingredienser man trygt kan bruge hver dag"
    );
  } else if (/supplement|health|coffee|matcha|protein|nutrition|dose|wellness|ergonom|chair|desk/i.test(catLower)) {
    painPoints.push(
      "Eftermiddags-crash, stivhed eller manglende fokus efter frokost",
      "Overfyldte produkter med fyldstoffer der ikke virker i praksis"
    );
    desires.push(
      "Stabil energi, bedre fokus og højere velvære hele dagen",
      "Mærkbar forskel på en simpel daglig vane"
    );
  } else {
    painPoints.push(
      `Frustration over kompromiser med almindelige løsninger før ${heroTitle}`,
      "Spildte penge på alternativer der ikke holder i hverdagen"
    );
    desires.push(
      `Øjeblikkelig mærkbar opgradering med ${heroTitle}`,
      "Høj kvalitet der holder længere og ser skarp ud hver dag"
    );
  }

  objections.push(
    "Er det pengene værd i forhold til billigere alternativer?",
    "Virker det også for mig i min hverdag?",
    "Hvad hvis jeg ikke er tilfreds efter at have prøvet det?"
  );

  // Extract authentic review-like quotes from HTML if present
  const customerReviews = lines
    .filter((l) => /(".*"|virkelig|elsker|bedste|game changer|amazing|recommend|worth every|så glad for)/i.test(l))
    .slice(0, 4);
  if (customerReviews.length === 0) {
    customerReviews.push(
      `"Jeg troede først det var hype, men ${heroTitle} overgik alle forventninger fra dag 1."`,
      `"Ville ønske jeg havde skiftet meget før – kvaliteten mærkes med det samme."`
    );
  }

  let primaryOffer = isDanish ? "Gratis fragt + tilfredshedsgaranti" : "Free shipping + risk-free trial";
  const saveMatch = opts.html.match(/(spar\s+\d+%|save\s+\d+%|op\s+til\s+\d+%|up\s+to\s+\d+%)/i);
  if (saveMatch?.[1]) {
    primaryOffer = `${saveMatch[1]} på pakker${heroPrice ? ` (fra ${heroPrice})` : ""}`;
  } else if (heroPrice) {
    primaryOffer = `Bestseller fra ${heroPrice} · Risikofrit køb`;
  }

  return {
    brandName: opts.brandName,
    domain: opts.domain,
    websiteUrl: opts.websiteUrl,
    logoUrl: opts.logoUrl,
    tagline: opts.title?.split(/[|\-–—·]/)[1]?.trim() || opts.description?.slice(0, 90),
    description: opts.description || `${opts.brandName} — ${opts.category}`,
    category: opts.category || "DTC E-commerce",
    currency: opts.currency || "DKK",
    toneOfVoice: isDanish
      ? "Direkte, skandinavisk, troværdig og konkret uden overdrevet salgs-fluff"
      : "Direct, modern DTC, conversational & benefit-driven",
    targetAudience:
      painPoints[0]
        ? `Kvalitetsbevidste forbrugere der oplever: ${painPoints[0].toLowerCase()}`
        : `Moderne DTC-købere i ${opts.category}`,
    primaryOffer,
    usps: usps.slice(0, 5),
    painPoints: painPoints.slice(0, 4),
    desires: desires.slice(0, 4),
    objections,
    customerReviews,
    products: opts.products.slice(0, 12),
    brandColors: ["#0027eb", "#0F172A", "#F7F8FB"],
    pixels: opts.pixels,
    shopifyApps: opts.shopifyApps,
    trustpilotScore: opts.trustpilotScore,
    trustpilotReviews: opts.trustpilotReviews,
    scrapedAt: new Date().toISOString(),
  };
}

export function buildHookVariants(opts: {
  brandName: string;
  productTitle: string;
  painPoint: string;
  desire: string;
  usp: string;
  language: "da" | "en";
  clonedFromAd?: ClonedSourceAd;
}): HookVariant[] {
  const { brandName, productTitle, painPoint, desire, usp, language, clonedFromAd } = opts;
  const pShort = productTitle.slice(0, 38);

  if (language === "en") {
    return [
      {
        id: "h-1",
        label: clonedFromAd ? `Cloned Structure (${clonedFromAd.brandName})` : "Contrarian Truth",
        framework: "Pattern Interrupt",
        spokenHook: clonedFromAd
          ? `Wait — I tested the viral ${pShort} format everyone is copying right now, and here is what actually happens on day 7.`
          : `Stop buying cheap fixes for ${painPoint.toLowerCase()} — watch what changed when I switched to ${pShort}.`,
        onScreenText: clonedFromAd
          ? `Why ${pShort} converts`
          : `Stop wasting money on this`,
        predictedThumbstopPct: 44.2,
      },
      {
        id: "h-2",
        label: "3-Second Proof",
        framework: "Visual Result First",
        spokenHook: `Look closely at this — this tiny shift from ${brandName} is the reason I finally get ${desire.toLowerCase()}.`,
        onScreenText: `Day 1 vs Day 14 with ${brandName}`,
        predictedThumbstopPct: 41.8,
      },
      {
        id: "h-3",
        label: "Skeptical Tester",
        framework: "Objection Flip",
        spokenHook: `Honestly, I thought ${pShort} was just another internet ad until I read the ${usp.toLowerCase()}.`,
        onScreenText: `I was 100% skeptical...`,
        predictedThumbstopPct: 39.5,
      },
      {
        id: "h-4",
        label: "Listicle Hook",
        framework: "3 Reasons Why",
        spokenHook: `3 things nobody tells you before switching to ${brandName}'s ${pShort}.`,
        onScreenText: `3 things I wish I knew sooner`,
        predictedThumbstopPct: 37.9,
      },
      {
        id: "h-5",
        label: "Founder / Secret",
        framework: "Behind the Mechanism",
        spokenHook: `The real reason old solutions fail isn't you — it's that none of them actually solve ${painPoint.toLowerCase()}.`,
        onScreenText: `The real reason it keeps failing`,
        predictedThumbstopPct: 36.4,
      },
    ];
  }

  return [
    {
      id: "h-1",
      label: clonedFromAd ? `Klonet vinkel (${clonedFromAd.brandName})` : "Skarp Pattern Interrupt",
      framework: "Contrarian Hook",
      spokenHook: clonedFromAd
        ? `Hvis du stadig kæmper med ${painPoint.toLowerCase()}, så se lige hvorfor alle lige nu skifter til ${pShort} fra ${brandName}.`
        : `Stop med at spilde penge på løsninger der ikke virker — det her skete da jeg skiftede til ${pShort}.`,
      onScreenText: clonedFromAd ? `Derfor skifter alle til ${brandName}` : `Stop med denne fejl 👇`,
      predictedThumbstopPct: 44.6,
    },
    {
      id: "h-2",
      label: "Skeptiker → Overbevist",
      framework: "Objection Flip",
      spokenHook: `Jeg skal være ærlig: jeg troede ${pShort} bare var endnu en reklame på Instagram, indtil jeg selv prøvede den.`,
      onScreenText: `Jeg var 100% skeptisk først...`,
      predictedThumbstopPct: 41.2,
    },
    {
      id: "h-3",
      label: "Visuelt Resultat Først",
      framework: "Desire Lead",
      spokenHook: `Det tager bogstaveligt talt 10 sekunder at mærke forskellen — se lige hvordan ${pShort} leverer ${desire.toLowerCase()}.`,
      onScreenText: `Før vs. efter med ${brandName}`,
      predictedThumbstopPct: 39.8,
    },
    {
      id: "h-4",
      label: "3 Grunde (Listicle)",
      framework: "Curiosity Gap",
      spokenHook: `3 grunde til at over tusind danskere vælger ${pShort} i stedet for standard-alternativerne.`,
      onScreenText: `3 ting jeg ville ønske jeg vidste før`,
      predictedThumbstopPct: 37.5,
    },
    {
      id: "h-5",
      label: "Ekspert / Mekanisme",
      framework: "MOA Breakdown",
      spokenHook: `Problemet er sjældent dig — problemet er, at almindelige løsninger slet ikke rammer årsagen til ${painPoint.toLowerCase()}.`,
      onScreenText: `Den skjulte årsag (og løsningen)`,
      predictedThumbstopPct: 36.9,
    },
  ];
}

export function buildScenesForPreset(opts: {
  presetId: VideoStylePresetId;
  brandName: string;
  productTitle: string;
  hook: HookVariant;
  painPoint: string;
  desire: string;
  usp: string;
  primaryOffer: string;
  language: "da" | "en";
}): StudioScene[] {
  const { presetId, brandName, productTitle, hook, painPoint, desire, usp, primaryOffer, language } = opts;

  const visualByPreset: Record<VideoStylePresetId, [string, string, string, string]> = {
    iphone_ugc: [
      `Selfie-vinkel i naturligt vindueslys, ${productTitle} holdt tæt på linsen i første sekund.`,
      "Hurtigt klip til hverdags-situationen hvor problemet mærkes – håndholdt bevægelse.",
      `Tæt POV-demo af ${productTitle} i brug med synlig detalje og tekstur.`,
      `Smilende creator peger mod knappen med pakken/produktet fra ${brandName} i hånden.`,
    ],
    claymation_moa: [
      "Stop-motion ler-figur ser udmattet og presset ud i dramatisk makro-nærskud (12fps).",
      "Små røde ler-elementer viser friktion/problemet visuelt inde i scenen.",
      `En skarp ler-version af ${productTitle} glider ind, rydder kaosset væk og tænder varmt lys.`,
      `Glad ler-karakter holder det ægte ${brandName}-produkt med blødt gyldent skær og CTA-skilt.`,
    ],
    pixar_story: [
      "Ekspressiv 3D-animeret hovedperson i hyggeligt aftenlys sukker over hverdagsproblemet.",
      "Kamerapanorering viser frustrationen tårne sig op i stiliserede 3D-omgivelser.",
      `${productTitle} ankommer med blødt cobalt/gyldent lys og forvandler scenen på 1 sekund.`,
      "Varm 3D-afslutning med let genkendelig emballage og tydeligt tilbud.",
    ],
    mini_drama: [
      "Hurtig 2-personers reaktion: den ene kommenterer skævt på problemet — frys på øjenkontakt.",
      "Overdrevet dramatisk suk og nærbillede af den gamle fejlslagne løsning.",
      `Den anden hiver roligt ${productTitle} frem: 'Prøv bare det her én gang.'`,
      "Begge griner lettet — split-screen med produkt + stærkt tilbud.",
    ],
    founder_authority: [
      `Stifteren står direkte i skarpt studiolys med ${productTitle} i hånden på arbejdsbordet.`,
      "Cutaway til prototype/materialeprøve der forklarer hvorfor markedet fejler.",
      `Nærbillede af kernen i ${productTitle} mens USP'en forklares roligt og autoritativt.`,
      "Direkte kamera-kig med garanti og invitation til at teste uden risiko.",
    ],
    cinema_macro: [
      "Ekstremt makroskud med skarp kantbelysning hen over materialets overflade.",
      "Slow-motion detalje der viser kontrast mellem ordinær kvalitet og præcision.",
      `Hero-produktet (${productTitle}) drejer langsomt i studiolys med perfekt refleksion.`,
      "Minimalistisk luksus-packshot med ren typografi og pris/tilbud.",
    ],
  };

  const visuals = visualByPreset[presetId] || visualByPreset.iphone_ugc;

  if (language === "en") {
    return [
      {
        id: "sc-1",
        sceneNumber: 1,
        phase: "0–3s Thumbstop Hook",
        timeRange: "0:00 – 0:03",
        durationSec: 3,
        spokenLine: hook.spokenHook,
        onScreenCaption: hook.onScreenText,
        visualDirection: visuals[0],
        cameraMotion: "Zoom-in + sharp 0.3s beat cut",
        hiddenPrompt: `${presetId} opener, 9:16 vertical, ${visuals[0]}, high contrast thumbstop framing`,
      },
      {
        id: "sc-2",
        sceneNumber: 2,
        phase: "3–8s Problem & Agitate",
        timeRange: "0:03 – 0:08",
        durationSec: 5,
        spokenLine: `For months I kept dealing with ${painPoint.toLowerCase()}, and nothing I bought actually fixed the root issue.`,
        onScreenCaption: "Why normal options fail",
        visualDirection: visuals[1],
        cameraMotion: "Quick cut + subtle push",
        hiddenPrompt: `${presetId} tension beat, showing pain point vividly, natural lighting`,
      },
      {
        id: "sc-3",
        sceneNumber: 3,
        phase: "8–16s Mechanism & Demo",
        timeRange: "0:08 – 0:16",
        durationSec: 8,
        spokenLine: `Then I switched to ${productTitle} by ${brandName}. The difference is ${usp.toLowerCase()} — so you finally get ${desire.toLowerCase()}.`,
        onScreenCaption: `${brandName} · ${usp.slice(0, 38)}`,
        visualDirection: visuals[2],
        cameraMotion: "Orbit product hero + tactile macro",
        hiddenPrompt: `${presetId} solution reveal, hero product in focus, clean visual proof`,
      },
      {
        id: "sc-4",
        sceneNumber: 4,
        phase: "16–22s Proof & CTA",
        timeRange: "0:16 – 0:22",
        durationSec: 6,
        spokenLine: `Right now they're running ${primaryOffer}. Tap below and test it yourself risk-free today.`,
        onScreenCaption: primaryOffer.slice(0, 42),
        visualDirection: visuals[3],
        cameraMotion: "Steady hero frame + CTA pulse",
        hiddenPrompt: `${presetId} closing CTA shot with clean negative space for Meta overlay`,
      },
    ];
  }

  return [
    {
      id: "sc-1",
      sceneNumber: 1,
      phase: "0–3s Thumbstop Hook",
      timeRange: "0:00 – 0:03",
      durationSec: 3,
      spokenLine: hook.spokenHook,
      onScreenCaption: hook.onScreenText,
      visualDirection: visuals[0],
      cameraMotion: "Hurtigt zoom-in + 0,3s cut",
      hiddenPrompt: `${presetId} scene 1 opener, 9:16 vertical, ${visuals[0]}`,
    },
    {
      id: "sc-2",
      sceneNumber: 2,
      phase: "3–8s Problem & Friktion",
      timeRange: "0:03 – 0:08",
      durationSec: 5,
      spokenLine: `Jeg brugte alt for lang tid på ${painPoint.toLowerCase()}, og intet af det jeg købte gav en reel ændring.`,
      onScreenCaption: "Derfor virker standardløsninger ikke",
      visualDirection: visuals[1],
      cameraMotion: "Håndholdt B-roll + hurtigt skift",
      hiddenPrompt: `${presetId} scene 2 problem beat, vivid everyday friction`,
    },
    {
      id: "sc-3",
      sceneNumber: 3,
      phase: "8–16s Mekanisme & Demo",
      timeRange: "0:08 – 0:16",
      durationSec: 8,
      spokenLine: `Så skiftede jeg til ${productTitle} fra ${brandName}. Hemmeligheden er ${usp.toLowerCase()} — så du faktisk får ${desire.toLowerCase()}.`,
      onScreenCaption: usp.slice(0, 44),
      visualDirection: visuals[2],
      cameraMotion: "Smooth demo + nærbillede",
      hiddenPrompt: `${presetId} scene 3 product mechanism & proof, ${productTitle}`,
    },
    {
      id: "sc-4",
      sceneNumber: 4,
      phase: "16–22s Bevis & CTA",
      timeRange: "0:16 – 0:22",
      durationSec: 6,
      spokenLine: `Lige nu kører de ${primaryOffer}. Tryk på linket herunder og prøv det risikofrit derhjemme.`,
      onScreenCaption: primaryOffer.slice(0, 44),
      visualDirection: visuals[3],
      cameraMotion: "Stabil slutframe til CTA-knap",
      hiddenPrompt: `${presetId} scene 4 closing offer shot with bottom safe zone`,
    },
  ];
}

export async function generateCreativeProject(opts: {
  brandMemory: BrandMemory | null;
  stylePresetId: VideoStylePresetId;
  staticLayoutId?: StaticCloneLayoutId;
  mode?: "video" | "static_clone" | "url_miner";
  aspectRatio?: "9:16" | "4:5" | "1:1";
  language?: "da" | "en";
  creatorPersona?: string;
  productTitle?: string;
  angle?: string;
  userPrompt?: string;
  clonedFromAd?: ClonedSourceAd;
}): Promise<CreativeProject> {
  const bm = opts.brandMemory;
  const brandName = bm?.brandName || "Dit Brand";
  const pickedProd =
    bm?.products.find((p) => p.title === opts.productTitle) || bm?.products[0];
  const productTitle = opts.productTitle || pickedProd?.title || `${brandName} Bestseller`;
  const productPriceDkk = pickedProd?.price
    ? formatProductPriceDkk(pickedProd.price, pickedProd.currency || bm?.currency)
    : undefined;
  const painPoint = bm?.painPoints[0] || "hverdagsproblemet før løsningen";
  const desire = bm?.desires[0] || "mærkbar forskel fra første dag";
  const usp = bm?.usps[0] || "dokumenteret effekt og høj kvalitet";
  const primaryOffer = bm?.primaryOffer || "Hurtig levering & fuld tilfredshedsgaranti";
  const language: "da" | "en" = opts.language || (bm?.domain.endsWith(".dk") ? "da" : "da");
  const angle =
    opts.angle ||
    (opts.clonedFromAd
      ? `Klonet struktur fra ${opts.clonedFromAd.brandName}`
      : "Problem → Mekanisme → Bevis");

  const hooks = buildHookVariants({
    brandName,
    productTitle,
    painPoint,
    desire,
    usp,
    language,
    clonedFromAd: opts.clonedFromAd,
  });

  // Optional LLM upgrade if user has AI_GATEWAY_API_KEY / OPENAI_API_KEY / GROQ_API_KEY configured
  if (opts.userPrompt || opts.clonedFromAd) {
    const llmText = await tryOptionalLlm(
      `Du er Senior Meta Creative Strategist for DTC-brandet "${brandName}". Returnér KUN valid JSON: {"hook1":"...","hook2":"...","primaryText":"...","headline":"...","callouts":["...","...","..."]}. Skriv på ${language === "da" ? "naturligt mundret dansk" : "natural conversational English"}.`,
      `Produkt: ${productTitle}\nUSPs: ${bm?.usps.join(" | ") || usp}\nPain: ${painPoint}\nDesire: ${desire}\nVinkel: ${angle}\nBruger-ønske: ${opts.userPrompt || "Lav konverterende script"}\n${opts.clonedFromAd ? `Konkurrent-ad vi kloner fra (${opts.clonedFromAd.brandName}): "${opts.clonedFromAd.primaryText.slice(0, 260)}"` : ""}`
    );
    if (llmText) {
      try {
        const cleaned = llmText.replace(/^```json\s*|\s*```$/g, "").trim();
        const parsed = JSON.parse(cleaned);
        if (typeof parsed.hook1 === "string" && parsed.hook1.length > 12) {
          hooks[0].spokenHook = parsed.hook1;
        }
        if (typeof parsed.hook2 === "string" && parsed.hook2.length > 12) {
          hooks[1].spokenHook = parsed.hook2;
        }
      } catch {
        // fallback gracefully to deterministic hooks
      }
    }
  }

  const scenes = buildScenesForPreset({
    presetId: opts.stylePresetId,
    brandName,
    productTitle,
    hook: hooks[0],
    painPoint,
    desire,
    usp,
    primaryOffer,
    language,
  });

  const preset = getPresetById(opts.stylePresetId);
  const callouts = (bm?.usps.slice(0, 3).length ? bm.usps.slice(0, 3) : [usp, primaryOffer, "Testet af tusindvis"]).map(
    (s) => s.slice(0, 36)
  );

  const primaryText =
    language === "en"
      ? `${hooks[0].spokenHook}\n\n${brandName}'s ${productTitle} gives you:\n• ${callouts.join("\n• ")}\n\n👉 Try it risk-free today (${primaryOffer}).`
      : `${hooks[0].spokenHook}\n\nDerfor skifter flere og flere til ${productTitle} fra ${brandName}:\n✓ ${callouts.join("\n✓ ")}\n\n${primaryOffer} 👇`;

  return {
    id: `proj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: opts.clonedFromAd
      ? `Clone: ${opts.clonedFromAd.brandName} → ${productTitle.slice(0, 22)}`
      : `${preset.name} · ${productTitle.slice(0, 24)}`,
    createdAt: new Date().toISOString(),
    mode: opts.mode || "video",
    stylePresetId: opts.stylePresetId,
    staticLayoutId: opts.staticLayoutId || "callout_pointers",
    aspectRatio: opts.aspectRatio || (opts.mode === "static_clone" ? "4:5" : "9:16"),
    language,
    creatorPersona: opts.creatorPersona || CREATOR_PERSONAS[0].id,
    brandName,
    productTitle,
    productImageUrl: pickedProd?.image_url,
    productPriceDkk,
    productUrl: pickedProd?.url || bm?.websiteUrl,
    angle,
    clonedFromAd: opts.clonedFromAd,
    hooks,
    selectedHookId: hooks[0].id,
    scenes,
    callouts,
    usPoints: callouts,
    themPoints: [
      painPoint.slice(0, 34),
      "Dyre mellemled & skjulte gebyrer",
      "Ingen tilfredshedsgaranti",
    ],
    primaryText,
    headline: `${productTitle} — ${primaryOffer}`.slice(0, 62),
    ctaText: "Shop now",
    landingPageUrl: pickedProd?.url || bm?.websiteUrl || "https://",
    status: "ready",
    campaignName: `${brandName} · Advantage+ Creative Test`,
    dailyBudgetDkk: 500,
  };
}

export function mineUrlToInsights(opts: {
  url: string;
  html: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  priceText?: string;
  brandMemory: BrandMemory | null;
}): MinedUrlInsights {
  const lines = cleanTextLines(opts.html);
  const title = opts.title || opts.brandMemory?.brandName || "Produkt-analyse";
  const usps = lines
    .filter((l) => /(✓|✔|garanti|guarantee|free|fri fragt|clinically|organic|hour|timer|100%)/i.test(l))
    .slice(0, 4);
  const reviewSnippets = lines
    .filter((l) => /(".*"|elsker|bedst|fantastisk|amazing|worth|recommend|game changer|changed my)/i.test(l))
    .slice(0, 4);

  const painPoints = opts.brandMemory?.painPoints.length
    ? opts.brandMemory.painPoints
    : [
        "Standardprodukter mister effekt hurtigt og giver uensartede resultater",
        "Høj friktion i hverdagen før man finder en løsning der holder",
      ];
  const desires = opts.brandMemory?.desires.length
    ? opts.brandMemory.desires
    : [
        `Hurtig, mærkbar opgradering med ${title.slice(0, 40)}`,
        "Sikkerhed og høj værdi fra første uge",
      ];
  const objections = [
    "Virker den også hvis jeg allerede har prøvet lignende produkter?",
    "Kan jeg nå at returnere hvis den ikke passer til mig?",
    "Hvor hurtigt mærker man en forskel?",
  ];

  const finalUsps =
    usps.length > 0
      ? usps
      : opts.brandMemory?.usps.slice(0, 3) || ["Dokumenteret kvalitet", "Hurtig levering", "Tilfredshedsgaranti"];

  return {
    url: opts.url,
    title,
    productImageUrl: opts.imageUrl || opts.brandMemory?.products[0]?.image_url,
    priceText: opts.priceText,
    painPoints: painPoints.slice(0, 4),
    desires: desires.slice(0, 4),
    objections,
    usps: finalUsps,
    reviewSnippets:
      reviewSnippets.length > 0
        ? reviewSnippets
        : [`"Jeg ønskede bare noget der rent faktisk virkede – ${title.slice(0, 32)} leverede fra uge 1."`],
    recommendedAngles: [
      {
        title: "Skeptiker → Overbevist UGC",
        hook: `Jeg troede ærligt talt ikke på hypen omkring ${title.slice(0, 28)}, men efter 7 dage måtte jeg trække det hele i land.`,
        presetId: "iphone_ugc",
        why: "Direkte svar på kundernes primære skepsis + stærk social proof.",
      },
      {
        title: "Claymation Mekanisme (MOA)",
        hook: `Se præcis hvorfor almindelige løsninger fejler på ${painPoints[0].toLowerCase().slice(0, 45)} — vist på 15 sekunder.`,
        presetId: "claymation_moa",
        why: "Skaber et visuelt pattern interrupt i Meta-feedet med høj 3s Thumbstop.",
      },
      {
        title: "Static 3-Punkt Callout",
        hook: `Alt det du får med ${title.slice(0, 26)}: ${finalUsps[0].slice(0, 42)}`,
        presetId: "cinema_macro",
        why: "Hurtigste statiske vinkel til retargeting og bred CBO-test.",
      },
    ],
  };
}

export async function generateSnowResponse(opts: {
  prompt: string;
  brandMemory: BrandMemory | null;
  attachedAd?: ClonedSourceAd | null;
  attachedProduct?: ProductPreview | null;
  minedInsights?: MinedUrlInsights | null;
  analyticsRows: OwnAdMetricRow[];
  candidateSwipeAds: Ad[];
}): Promise<SnowMessage> {
  const q = opts.prompt.toLowerCase();
  const bm = opts.brandMemory;
  const brandLabel = bm ? `**${bm.brandName}**` : "dit brand";
  const actionCards: SnowActionCard[] = [];

  // 1. URL Mining card if URL was mined
  if (opts.minedInsights) {
    const firstRec = opts.minedInsights.recommendedAngles[0];
    const proj = await generateCreativeProject({
      brandMemory: bm,
      stylePresetId: firstRec?.presetId || "iphone_ugc",
      productTitle: opts.minedInsights.title,
      angle: firstRec?.title,
      userPrompt: opts.prompt,
    });
    actionCards.push({ type: "mined_url", insights: opts.minedInsights });
    actionCards.push({
      type: "creative_brief",
      title: proj.title,
      angle: proj.angle,
      stylePresetId: proj.stylePresetId,
      productTitle: proj.productTitle,
      hooks: proj.hooks,
      scenes: proj.scenes,
      primaryText: proj.primaryText,
      headline: proj.headline,
    });

    return {
      id: `snow-${Date.now()}`,
      role: "assistant",
      createdAt: new Date().toISOString(),
      content: `Jeg har minet siden **${opts.minedInsights.title}** og koblet indsigterne sammen med ${brandLabel}s hukommelse.\n\nHer er de stærkeste pain points, desires og et færdigt produktions-brief klar til at åbne med 1 klik:`,
      actionCards,
    };
  }

  // 2. Ad cloning request
  if (opts.attachedAd || /(klon|clone|kopier|efterlign|omskriv|varianter af)/i.test(q)) {
    const sourceAd =
      opts.attachedAd ||
      (opts.candidateSwipeAds[0]
        ? {
            id: opts.candidateSwipeAds[0].id,
            brandName: opts.candidateSwipeAds[0].brand_name,
            headline: opts.candidateSwipeAds[0].headline,
            primaryText: opts.candidateSwipeAds[0].primary_text,
            mediaUrl: opts.candidateSwipeAds[0].media_url,
            thumbnailUrl:
              opts.candidateSwipeAds[0].fallback_image_url ||
              opts.candidateSwipeAds[0].thumbnail_url ||
              opts.candidateSwipeAds[0].media_url,
            activeDays: 35,
            euReach: opts.candidateSwipeAds[0].eu_reach,
          }
        : undefined);

    const wantsClay = /clay|ler|stop[- ]?motion/i.test(q);
    const wantsPixar = /pixar|3d|animation/i.test(q);
    const wantsDrama = /drama|plot|twist|skuespil/i.test(q);
    const presetId: VideoStylePresetId = wantsClay
      ? "claymation_moa"
      : wantsPixar
        ? "pixar_story"
        : wantsDrama
          ? "mini_drama"
          : "iphone_ugc";

    const proj = await generateCreativeProject({
      brandMemory: bm,
      stylePresetId: presetId,
      productTitle: opts.attachedProduct?.title,
      userPrompt: opts.prompt,
      clonedFromAd: sourceAd,
    });

    actionCards.push({
      type: "creative_brief",
      title: proj.title,
      angle: proj.angle,
      stylePresetId: proj.stylePresetId,
      productTitle: proj.productTitle,
      hooks: proj.hooks,
      scenes: proj.scenes,
      primaryText: proj.primaryText,
      headline: proj.headline,
      clonedFromAd: sourceAd,
    });

    return {
      id: `snow-${Date.now()}`,
      role: "assistant",
      createdAt: new Date().toISOString(),
      content: sourceAd
        ? `Perfekt — jeg har dekonstrueret vinder-strukturen fra **${sourceAd.brandName}**${sourceAd.activeDays ? ` (${sourceAd.activeDays} aktive dage)` : ""} og tilpasset den til ${brandLabel} (${proj.productTitle}).\n\nDu får **5 nye hooks** + **4 komplette video-scener** klar til Video Maker eller Static Cloner:`
        : `Jeg har bygget et komplet ad-brief til ${brandLabel} klar i **${getPresetById(presetId).name}**:`,
      actionCards,
    };
  }

  // 3. Analytics / Winner Double Down / Fatigue Refresh
  if (/(winner|double down|skaler|scale|analys|roas|cpa|fatigue|træt|thumbstop|hold[- ]?rate|performance)/i.test(q)) {
    const winner =
      opts.analyticsRows.find((r) => r.status === "Scaling Winner") || opts.analyticsRows[0];
    const fatigued =
      opts.analyticsRows.find((r) => r.status === "Fatigue") || opts.analyticsRows[opts.analyticsRows.length - 1];

    if (winner) {
      actionCards.push({
        type: "winner_scale",
        title: `Double Down: ${winner.name}`,
        diagnosis: `Din stærkeste annonce leverer ${winner.roas.toFixed(2)}x ROAS med ${winner.thumbstopPct}% Thumbstop-rate og ${formatDkkExact(winner.cpaDkk)} CPA. Samtidig viser "${fatigued?.name || "ældre variant"}" tegn på creative fatigue (+${fatigued?.cpaDeltaPct || 24}% CPA).`,
        metricSummary: `${formatDkkExact(winner.spendDkk)} spend · ${formatDkkExact(winner.revenueDkk)} omsætning · ${winner.holdPct}% Hold-rate`,
        recommendedAction:
          "Behold samme kerneargument, men skift de første 3 sekunder ud med 4 nye hooks og test et Claymation MOA- og Static-format for at give Meta frisk kreativ diversitet.",
        iterations: [
          {
            label: "Variant A · Skeptiker Hook (UGC)",
            stylePresetId: "iphone_ugc",
            hook: `Jeg troede først ${bm?.products[0]?.title || "det her"} var overvurderet – indtil jeg så dag 7.`,
            why: "Løfter Thumbstop med +6–9% på kolde målgrupper.",
          },
          {
            label: "Variant B · Claymation MOA",
            stylePresetId: "claymation_moa",
            hook: `Se hvorfor kroppen/hverdagen bliver ved med at drille – og præcis hvad der vender det på 15 sek.`,
            why: "Skaber et helt nyt visuelt udtryk så Meta giver dig lavere CPM.",
          },
          {
            label: "Variant C · Mini-Drama Plot Twist",
            stylePresetId: "mini_drama",
            hook: `"Brugte du seriøst så mange penge på det gamle?" – vent til du ser reaktionen.`,
            why: "Forlænger seerfastholdelsen forbi 15 sek. Hold-rate.",
          },
          {
            label: "Variant D · Pixar 3D Story",
            stylePresetId: "pixar_story",
            hook: "Når aftenen endelig går fra stress til ro på under 30 sekunder.",
            why: "Skalerer bredt med høj delings- og like-rate.",
          },
        ],
      });
    }

    return {
      id: `snow-${Date.now()}`,
      role: "assistant",
      createdAt: new Date().toISOString(),
      content: `Jeg har gennemgået kontodata for ${brandLabel}:\n\n1. **Dobbel ned på din winner:** **${winner?.name || "Top AI UGC"}** har høj ROAS (${winner?.roas.toFixed(2) || "3.4"}x) og stærk 3s Thumbstop.\n2. **Stop fatigue i opløbet:** Skift de trætte varianter ud med friske formater i samme vinkel.\n\nKlik på en af de 4 anbefalede varianter herunder for at åbne den direkte i Studio:`,
      actionCards,
    };
  }

  // 4. Competitor research / swipe file picks + full workflow default
  const swipePicks = opts.candidateSwipeAds.slice(0, 4).map((ad) => ({
    adId: ad.id,
    brandName: ad.brand_name,
    hook: ad.extracted_hook || ad.headline || ad.primary_text.slice(0, 90),
    activeDays: Math.max(
      1,
      Math.floor((Date.now() - new Date(ad.started_running_at).getTime()) / 86400000)
    ),
    euReach: ad.eu_reach,
    thumbnailUrl: ad.fallback_image_url || ad.thumbnail_url || ad.media_url,
    whyItWins: ad.hook_category
      ? `Bruger ${ad.hook_category}-vinkel med dokumenteret eksponering`
      : "Har kørt stabilt over længere tid i Meta Ad Library",
  }));

  if (swipePicks.length > 0) {
    actionCards.push({
      type: "swipe_picks",
      title: "Bedste konkurrenter at klone lige nu",
      subtitle: `Udvalgt fra vores ${opts.candidateSwipeAds.length.toLocaleString("da-DK")}+ live Meta-annoncer`,
      picks: swipePicks,
    });
  }

  const presetPick: VideoStylePresetId = /clay/i.test(q)
    ? "claymation_moa"
    : /pixar|3d/i.test(q)
      ? "pixar_story"
      : /drama/i.test(q)
        ? "mini_drama"
        : "iphone_ugc";

  const brief = await generateCreativeProject({
    brandMemory: bm,
    stylePresetId: presetPick,
    productTitle: opts.attachedProduct?.title,
    userPrompt: opts.prompt,
  });

  actionCards.push({
    type: "creative_brief",
    title: brief.title,
    angle: brief.angle,
    stylePresetId: brief.stylePresetId,
    productTitle: brief.productTitle,
    hooks: brief.hooks,
    scenes: brief.scenes,
    primaryText: brief.primaryText,
    headline: brief.headline,
  });

  return {
    id: `snow-${Date.now()}`,
    role: "assistant",
    createdAt: new Date().toISOString(),
    content: bm
      ? `Jeg har gennemgået hele dit setup for **${bm.brandName}** (${bm.products.length} produkter, ${bm.usps.length} USP'er i hukommelsen).\n\nHer er både **konkurrent-vindere du kan klone med ét klik** og et **færdigt produktions-brief** klar i Studio:`
      : `Jeg er **Snow** — din indbyggede AI Creative Strategist.\n\nForbind dit brand i sidebaren (det tager 5 sekunder via din URL), så skriver jeg alle briefs ud fra dine præcise produkter og USP'er. Her er et øjeblikkeligt udkast + top swipe-vindere du kan klone:`,
    actionCards,
  };
}

export function buildOwnAnalyticsDataset(
  brandMemory: BrandMemory | null,
  launchedProjects: CreativeProject[]
): OwnAdMetricRow[] {
  const prod1 = brandMemory?.products[0]?.title || "Hero Produkt";
  const prod2 = brandMemory?.products[1]?.title || `${brandMemory?.brandName || "Brand"} Bundle`;
  const thumb1 = brandMemory?.products[0]?.image_url;
  const thumb2 = brandMemory?.products[1]?.image_url || thumb1;

  const baseRows: OwnAdMetricRow[] = [
    {
      id: "own-ad-1",
      name: `UGC · Skeptiker → Overbevist (${prod1.slice(0, 22)})`,
      format: "AI UGC",
      stylePresetId: "iphone_ugc",
      angle: "Objection Flip",
      hookText: `"Jeg troede ærligt talt ${prod1.slice(0, 26)} bare var hype – her er dag 14."`,
      thumbnailUrl: thumb1,
      status: "Scaling Winner",
      spendDkk: 48600,
      revenueDkk: 176900,
      roas: 3.64,
      cpaDkk: 168,
      aovDkk: 612,
      purchases: 289,
      impressions: 942000,
      ctrPct: 2.38,
      thumbstopPct: 44.8,
      holdPct: 33.2,
      retentionCurve: [100, 44.8, 39.1, 33.2, 26.4, 21.0, 17.5],
      daysActive: 28,
      cpaDeltaPct: -14,
    },
    {
      id: "own-ad-2",
      name: `Claymation MOA · Hvorfor gamle løsninger fejler`,
      format: "Claymation MOA",
      stylePresetId: "claymation_moa",
      angle: "Mechanism of Action",
      hookText: `"Stop-motion lermodel der viser problemet på 3 sekunder"`,
      thumbnailUrl: thumb2,
      status: "Hook Winner",
      spendDkk: 29400,
      revenueDkk: 94080,
      roas: 3.2,
      cpaDkk: 184,
      aovDkk: 588,
      purchases: 160,
      impressions: 710000,
      ctrPct: 2.62,
      thumbstopPct: 51.4,
      holdPct: 29.8,
      retentionCurve: [100, 51.4, 41.0, 29.8, 22.1, 16.4, 12.9],
      daysActive: 14,
      cpaDeltaPct: -19,
    },
    {
      id: "own-ad-3",
      name: `Static Callout · 3 grunde til ${prod2.slice(0, 22)}`,
      format: "Static Callout",
      stylePresetId: "cinema_macro",
      angle: "USP Callout Stack",
      hookText: `3 punkter med pile direkte mod produktfordelene + garanti`,
      thumbnailUrl: thumb1,
      status: "Scaling Winner",
      spendDkk: 24200,
      revenueDkk: 76230,
      roas: 3.15,
      cpaDkk: 179,
      aovDkk: 565,
      purchases: 135,
      impressions: 485000,
      ctrPct: 1.94,
      thumbstopPct: 36.2,
      holdPct: 24.5,
      retentionCurve: [100, 36.2, 31.0, 24.5, 20.1, 18.0, 16.2],
      daysActive: 34,
      cpaDeltaPct: -6,
    },
    {
      id: "own-ad-4",
      name: `Mini-Drama · Aften-konflikten (Plot Twist)`,
      format: "Mini-Drama",
      stylePresetId: "mini_drama",
      angle: "2-Personer Drama",
      hookText: `"Har du virkelig købt en til?" → øjeblikkelig produkt-afsløring`,
      thumbnailUrl: thumb2,
      status: "Testing",
      spendDkk: 11800,
      revenueDkk: 33040,
      roas: 2.8,
      cpaDkk: 204,
      aovDkk: 570,
      purchases: 58,
      impressions: 295000,
      ctrPct: 2.15,
      thumbstopPct: 42.1,
      holdPct: 35.6,
      retentionCurve: [100, 42.1, 38.9, 35.6, 29.4, 24.2, 19.8],
      daysActive: 6,
      cpaDeltaPct: -9,
    },
    {
      id: "own-ad-5",
      name: `Founder Story · Direkte fra skrivebordet (v1)`,
      format: "Founder Story",
      stylePresetId: "founder_authority",
      angle: "Founder Authority",
      hookText: `"Derfor nægtede vi at gå på kompromis da vi udviklede den"`,
      thumbnailUrl: thumb1,
      status: "Fatigue",
      spendDkk: 19600,
      revenueDkk: 37240,
      roas: 1.9,
      cpaDkk: 292,
      aovDkk: 555,
      purchases: 67,
      impressions: 390000,
      ctrPct: 1.24,
      thumbstopPct: 26.8,
      holdPct: 15.2,
      retentionCurve: [100, 26.8, 20.4, 15.2, 11.0, 8.2, 6.4],
      daysActive: 49,
      cpaDeltaPct: 31,
    },
    {
      id: "own-ad-6",
      name: `Pixar 3D Story · Fra træthed til ro`,
      format: "Pixar 3D",
      stylePresetId: "pixar_story",
      angle: "Emotional Transformation",
      hookText: `Varm 3D-historie fra frustration til perfekt resultat`,
      thumbnailUrl: thumb2,
      status: "Testing",
      spendDkk: 8400,
      revenueDkk: 24360,
      roas: 2.9,
      cpaDkk: 195,
      aovDkk: 566,
      purchases: 43,
      impressions: 215000,
      ctrPct: 2.08,
      thumbstopPct: 40.5,
      holdPct: 31.0,
      retentionCurve: [100, 40.5, 36.2, 31.0, 25.0, 20.1, 16.0],
      daysActive: 5,
      cpaDeltaPct: -4,
    },
  ];

  const liveFromStudio: OwnAdMetricRow[] = launchedProjects
    .filter((p) => p.status === "live")
    .map((p, idx) => ({
      id: `live-${p.id}`,
      name: p.title,
      format:
        p.mode === "static_clone"
          ? "Static Callout"
          : p.stylePresetId === "claymation_moa"
            ? "Claymation MOA"
            : p.stylePresetId === "pixar_story"
              ? "Pixar 3D"
              : p.stylePresetId === "mini_drama"
                ? "Mini-Drama"
                : p.stylePresetId === "founder_authority"
                  ? "Founder Story"
                  : "AI UGC",
      stylePresetId: p.stylePresetId,
      angle: p.angle,
      hookText: p.hooks[0]?.spokenHook || p.headline,
      thumbnailUrl: p.productImageUrl || thumb1,
      status: "Testing",
      spendDkk: (p.dailyBudgetDkk || 500) * (2 + idx),
      revenueDkk: Math.round((p.dailyBudgetDkk || 500) * (2 + idx) * 2.95),
      roas: 2.95,
      cpaDkk: 189,
      aovDkk: 558,
      purchases: 12 + idx * 3,
      impressions: 58000,
      ctrPct: 2.45,
      thumbstopPct: 43.0,
      holdPct: 30.4,
      retentionCurve: [100, 43.0, 36.5, 30.4, 24.8, 19.6, 15.4],
      daysActive: 2 + idx,
      cpaDeltaPct: -8,
    }));

  return [...liveFromStudio, ...baseRows];
}

export function parseMetaAdsCsv(csvText: string): OwnAdMetricRow[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const splitCsvLine = (line: string) => {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if ((ch === "," || ch === ";") && !inQuotes) {
        out.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur.trim());
    return out;
  };

  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const findCol = (patterns: RegExp[]) =>
    headers.findIndex((h) => patterns.some((re) => re.test(h)));

  const nameCol = findCol([/ad name/i, /annoncenavn/i, /creative/i, /name/i]);
  const spendCol = findCol([/amount spent/i, /spend/i, /brugt/i]);
  const roasCol = findCol([/roas/i, /return on ad spend/i]);
  const revCol = findCol([/purchase conversion value/i, /revenue/i, /omsætning/i, /value/i]);
  const purCol = findCol([/purchases/i, /køb/i, /results/i]);
  const impCol = findCol([/impressions/i, /eksponeringer/i]);
  const ctrCol = findCol([/ctr/i]);

  if (nameCol === -1 || spendCol === -1) return [];

  const toNum = (raw?: string) => {
    if (!raw) return 0;
    const cleaned = raw.replace(/[^0-9.,-]/g, "").replace(",", ".");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  };

  const rows: OwnAdMetricRow[] = [];
  for (let i = 1; i < Math.min(lines.length, 40); i++) {
    const cols = splitCsvLine(lines[i]);
    const name = cols[nameCol] || `Meta Ad #${i}`;
    const spend = Math.round(toNum(cols[spendCol]));
    if (spend <= 0) continue;
    const purchases = Math.max(1, Math.round(toNum(cols[purCol])));
    const roasRaw = toNum(cols[roasCol]);
    const revRaw = Math.round(toNum(cols[revCol]));
    const revenue = revRaw > 0 ? revRaw : roasRaw > 0 ? Math.round(spend * roasRaw) : Math.round(spend * 2.4);
    const roas = Number((revenue / spend).toFixed(2));
    const cpa = Math.round(spend / purchases);
    const impressions = Math.max(spend * 12, Math.round(toNum(cols[impCol])));
    const ctrPct = Number((toNum(cols[ctrCol]) || 1.85).toFixed(2));
    const thumbstop = Number(Math.min(58, Math.max(22, 30 + roas * 4)).toFixed(1));
    const hold = Number(Math.min(42, Math.max(12, 16 + roas * 3.8)).toFixed(1));

    rows.push({
      id: `csv-${i}-${Date.now()}`,
      name,
      format: /ugc/i.test(name) ? "AI UGC" : /static/i.test(name) ? "Static Callout" : /clay/i.test(name) ? "Claymation MOA" : "Founder Story",
      stylePresetId: /clay/i.test(name) ? "claymation_moa" : "iphone_ugc",
      angle: "Meta CSV Import",
      hookText: name,
      status: roas >= 3.0 ? "Scaling Winner" : roas < 1.8 ? "Fatigue" : "Testing",
      spendDkk: spend,
      revenueDkk: revenue,
      roas,
      cpaDkk: cpa,
      aovDkk: Math.round(revenue / purchases),
      purchases,
      impressions,
      ctrPct,
      thumbstopPct: thumbstop,
      holdPct: hold,
      retentionCurve: [100, thumbstop, Number(((thumbstop + hold) / 2).toFixed(1)), hold, Number((hold * 0.78).toFixed(1)), Number((hold * 0.61).toFixed(1)), Number((hold * 0.48).toFixed(1))],
      daysActive: 14,
      cpaDeltaPct: roas >= 3.0 ? -12 : 18,
    });
  }
  return rows;
}
