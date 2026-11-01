interface RequestWindow {
  minuteStartedAt: number;
  minuteCount: number;
  dayStartedAt: number;
  dayCount: number;
}

const windows = new Map<string, RequestWindow>();
const minuteLimit = 12;
const dailyLimit = 100;

export function rateLimitResponse(request: Request, route: string): Response | null {
  const now = Date.now();
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const clientIp = forwarded || request.headers.get("x-real-ip") || "unknown";
  const key = `${clientIp}:${route}`;
  const current = windows.get(key) ?? {
    minuteStartedAt: now,
    minuteCount: 0,
    dayStartedAt: now,
    dayCount: 0,
  };
  if (now - current.minuteStartedAt >= 60_000) {
    current.minuteStartedAt = now;
    current.minuteCount = 0;
  }
  if (now - current.dayStartedAt >= 86_400_000) {
    current.dayStartedAt = now;
    current.dayCount = 0;
  }
  if (current.minuteCount >= minuteLimit || current.dayCount >= dailyLimit) {
    windows.set(key, current);
    return Response.json({ error: "That’s a lot of requests in a short time. Please pause and try again shortly." }, { status: 429 });
  }
  current.minuteCount += 1;
  current.dayCount += 1;
  windows.set(key, current);
  return null;
}
