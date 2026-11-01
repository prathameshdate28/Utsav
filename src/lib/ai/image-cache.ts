const CACHE_NAME = "utsav-ai-images-v1";
const MAX_CACHED_IMAGES = 36;
let requestQueue: Promise<void> = Promise.resolve();
const inFlightRequests = new Map<string, Promise<Response>>();

function cacheRequest(key: string): Request {
  const url = new URL("/__utsav-ai-cache__/image", window.location.origin);
  url.searchParams.set("key", key);
  return new Request(url);
}

export async function getCachedAiImage(key: string): Promise<string | null> {
  if (!("caches" in window)) return null;
  try {
    const cache = await window.caches.open(CACHE_NAME);
    const response = await cache.match(cacheRequest(key));
    if (!response) return null;
    return URL.createObjectURL(await response.blob());
  } catch (error) {
    console.warn("AI image cache could not be read:", error);
    return null;
  }
}

export async function saveCachedAiImage(key: string, imageUrl: string): Promise<string> {
  if (!("caches" in window)) return imageUrl;
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return imageUrl;
    const blob = await response.blob();
    const cache = await window.caches.open(CACHE_NAME);
    await cache.put(
      cacheRequest(key),
      new Response(blob, { headers: { "Content-Type": blob.type || "image/png" } }),
    );
    const entries = await cache.keys();
    for (const expired of entries.slice(0, Math.max(0, entries.length - MAX_CACHED_IMAGES))) {
      await cache.delete(expired);
    }
    return URL.createObjectURL(blob);
  } catch (error) {
    console.warn("AI image cache could not be updated:", error);
    return imageUrl;
  }
}

export function queueAiImageRequest(key: string, request: () => Promise<Response>): Promise<Response> {
  const existing = inFlightRequests.get(key);
  if (existing) return existing.then((response) => response.clone());

  const queued = requestQueue.then(request, request);
  requestQueue = queued.then(() => undefined, () => undefined);
  const result = queued.then((response) => response);
  inFlightRequests.set(key, result);
  const clear = () => {
    if (inFlightRequests.get(key) === result) inFlightRequests.delete(key);
  };
  void result.then(clear, clear);
  return result.then((response) => response.clone());
}
