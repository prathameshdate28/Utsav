type OpenRouterImageResponse = {
  data?: Array<{ b64_json?: string; media_type?: string }>;
  error?: { message?: string };
};

export async function generateOpenRouterImage(prompt: string, siteUrl: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not configured.");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90_000);
  try {
    const response = await fetch("https://openrouter.ai/api/v1/images", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": siteUrl,
        "X-Title": "Utsav",
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_IMAGE_MODEL?.trim() || "bytedance-seed/seedream-4.5",
        prompt,
        aspect_ratio: "4:3",
        n: 1,
      }),
      signal: controller.signal,
    });

    const result = await response.json() as OpenRouterImageResponse;
    if (!response.ok) {
      throw new Error(`OpenRouter image request failed (HTTP ${response.status}): ${result.error?.message || "Unknown provider error."}`);
    }
    const image = result.data?.[0];
    if (!image?.b64_json) throw new Error("OpenRouter returned no image data.");
    const mediaType = image.media_type || "image/png";
    if (!/^image\/(?:png|jpeg|webp)$/.test(mediaType)) {
      throw new Error(`OpenRouter returned an unsupported image type: ${mediaType}.`);
    }
    return `data:${mediaType};base64,${image.b64_json}`;
  } catch (error) {
    if (controller.signal.aborted) throw new Error("OpenRouter image generation timed out after 90 seconds.");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
