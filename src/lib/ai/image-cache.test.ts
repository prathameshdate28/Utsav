import { describe, expect, it } from "vitest";
import { queueAiImageRequest } from "./image-cache";

describe("AI image request queue", () => {
  it("runs requests one at a time even when callers start together", async () => {
    const calls: string[] = [];
    let releaseFirst!: () => void;
    const first = queueAiImageRequest("first", async () => {
      calls.push("first-start");
      await new Promise<void>((resolve) => {
        releaseFirst = resolve;
      });
      calls.push("first-end");
      return new Response("first");
    });
    const second = queueAiImageRequest("second", async () => {
      calls.push("second-start");
      return new Response("second");
    });

    await Promise.resolve();
    expect(calls).toEqual(["first-start"]);
    releaseFirst();
    await expect(Promise.all([first, second]).then(async ([a, b]) => [await a.text(), await b.text()]))
      .resolves.toEqual(["first", "second"]);
    expect(calls).toEqual(["first-start", "first-end", "second-start"]);
  });

  it("deduplicates concurrent requests with the same cache key", async () => {
    let requestCount = 0;
    let release!: () => void;
    const request = () => queueAiImageRequest("same-key", async () => {
      requestCount += 1;
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return new Response("shared");
    });

    const first = request();
    const second = request();
    await Promise.resolve();
    release();
    const responses = await Promise.all([first, second]);

    expect(requestCount).toBe(1);
    await expect(Promise.all(responses.map((response) => response.text()))).resolves.toEqual(["shared", "shared"]);
  });
});
