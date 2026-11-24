import crypto from "node:crypto";
import type { Ad } from "./types";

/**
 * Foreplay-style Permanent Media Vault.
 *
 * Dual-backend permanent media storage:
 *  1. Cloudflare R2 (preferred for large video libraries: 10 GB free + $0 unlimited egress!)
 *     Activated automatically when R2_ACCOUNT_ID, R2_ACCESS_KEY_ID,
 *     R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, and R2_PUBLIC_URL are set.
 *  2. Supabase Storage (`ad-media` bucket) automatic fallback when R2 is not configured.
 */

export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_NAME &&
      process.env.R2_PUBLIC_URL
  );
}

export function isPermanentMediaUrl(url?: string | null): boolean {
  if (!url) return false;
  const r2Base = (process.env.R2_PUBLIC_URL || "").replace(/\/+$/, "");
  if (r2Base && url.startsWith(r2Base)) return true;
  if (url.includes(".r2.dev/") || url.includes("supabase.co/storage/v1/object/public/")) {
    return true;
  }
  return false;
}

function hmacSha256(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac("sha256", key).update(data).digest();
}

function sha256Hex(data: Buffer | string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

async function uploadToR2(
  objectKey: string,
  body: Buffer,
  contentType: string
): Promise<string | null> {
  const accountId = process.env.R2_ACCOUNT_ID!;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID!;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY!;
  const bucket = process.env.R2_BUCKET_NAME!;
  const publicBase = process.env.R2_PUBLIC_URL!.replace(/\/+$/, "");

  const host = `${accountId}.r2.cloudflarestorage.com`;
  const encodedKey = objectKey
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  const canonicalUri = `/${bucket}/${encodedKey}`;
  const endpoint = `https://${host}${canonicalUri}`;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const region = "auto";
  const service = "s3";

  const payloadHash = sha256Hex(body);
  const canonicalHeaders =
    `content-type:${contentType}\n` +
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";

  const canonicalRequest = [
    "PUT",
    canonicalUri,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const kDate = hmacSha256(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, service);
  const kSigning = hmacSha256(kService, "aws4_request");
  const signature = crypto
    .createHmac("sha256", kSigning)
    .update(stringToSign)
    .digest("hex");

  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const res = await fetch(endpoint, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      Authorization: authorization,
    },
    body: new Uint8Array(body),
  });

  if (!res.ok) return null;
  return `${publicBase}/${encodedKey}`;
}

async function uploadToSupabaseStorage(
  objectKey: string,
  body: Buffer,
  contentType: string
): Promise<string | null> {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    "";
  if (!url || !serviceKey) return null;

  const res = await fetch(`${url}/storage/v1/object/ad-media/${objectKey}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      "Content-Type": contentType,
      "Cache-Control": "31536000",
      "x-upsert": "true",
    },
    body: new Uint8Array(body),
  });

  if (!res.ok) return null;
  return `${url}/storage/v1/object/public/ad-media/${objectKey}`;
}

export async function uploadPermanentBuffer(
  objectKey: string,
  body: Buffer,
  contentType: string
): Promise<string | null> {
  if (isR2Configured()) {
    return uploadToR2(objectKey, body, contentType);
  }
  return uploadToSupabaseStorage(objectKey, body, contentType);
}

async function downloadAndArchive(
  remoteUrl: string,
  objectKey: string,
  fallbackContentType: string,
  maxBytes = 48 * 1024 * 1024
): Promise<string | null> {
  if (!remoteUrl || !remoteUrl.startsWith("http")) return null;
  if (isPermanentMediaUrl(remoteUrl)) return remoteUrl;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25_000);
    const res = await fetch(remoteUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
    });
    clearTimeout(timer);
    if (!res.ok) return null;

    const len = Number(res.headers.get("content-length") || 0);
    if (len > maxBytes) return null;

    const ab = await res.arrayBuffer();
    if (ab.byteLength < 300 || ab.byteLength > maxBytes) return null;

    const rawCt = (res.headers.get("content-type") || fallbackContentType)
      .split(";")[0]
      .trim();
    const ext = rawCt.includes("mp4")
      ? ".mp4"
      : rawCt.includes("webm")
        ? ".webm"
        : rawCt.includes("quicktime")
          ? ".mov"
          : rawCt.includes("png")
            ? ".png"
            : rawCt.includes("webp")
              ? ".webp"
              : ".jpg";

    const finalKey = /\.[a-z0-9]{2,5}$/i.test(objectKey)
      ? objectKey
      : `${objectKey}${ext}`;

    return await uploadPermanentBuffer(finalKey, Buffer.from(ab), rawCt);
  } catch {
    return null;
  }
}

/**
 * Permanently mirrors an Ad's media_url, thumbnail_url, and optional audio_url
 * into our own permanent vault (Cloudflare R2 or Supabase Storage) so Meta CDN
 * expiry or deleted ads NEVER break the creative.
 */
export async function archiveAdMedia(
  ad: Ad,
  opts?: { includeVideo?: boolean }
): Promise<{ ad: Ad; archived: boolean; backend: "r2" | "supabase" }> {
  const includeVideo = opts?.includeVideo ?? true;
  const safeId = ad.id.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
  const isVideo = ad.media_type === "video";

  const needMedia =
    Boolean(ad.media_url) &&
    !isPermanentMediaUrl(ad.media_url) &&
    (!isVideo || includeVideo);

  const needThumb =
    Boolean(ad.thumbnail_url) &&
    ad.thumbnail_url !== ad.media_url &&
    !isPermanentMediaUrl(ad.thumbnail_url);

  const needAudio =
    Boolean(ad.audio_url) && !isPermanentMediaUrl(ad.audio_url);

  if (!needMedia && !needThumb && !needAudio) {
    return {
      ad,
      archived: false,
      backend: isR2Configured() ? "r2" : "supabase",
    };
  }

  const [newMedia, newThumb, newAudio] = await Promise.all([
    needMedia
      ? downloadAndArchive(
          ad.media_url,
          `ads/${safeId}${isVideo ? ".mp4" : ""}`,
          isVideo ? "video/mp4" : "image/jpeg"
        )
      : Promise.resolve(null),
    needThumb
      ? downloadAndArchive(
          ad.thumbnail_url,
          `ads/${safeId}-thumb.jpg`,
          "image/jpeg"
        )
      : Promise.resolve(null),
    needAudio
      ? downloadAndArchive(
          ad.audio_url!,
          `ads/${safeId}-audio.m4a`,
          "audio/mp4"
        )
      : Promise.resolve(null),
  ]);

  const updated: Ad = {
    ...ad,
    media_url: newMedia || ad.media_url,
    thumbnail_url:
      newThumb || (!isVideo && newMedia ? newMedia : ad.thumbnail_url),
    fallback_image_url:
      newThumb || (!isVideo && newMedia ? newMedia : ad.fallback_image_url),
    audio_url: newAudio || ad.audio_url,
  };

  return {
    ad: updated,
    archived: Boolean(newMedia || newThumb || newAudio),
    backend: isR2Configured() ? "r2" : "supabase",
  };
}
