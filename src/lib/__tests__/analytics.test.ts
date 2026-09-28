import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const captured: { event: string; props: unknown }[] = [];
vi.mock("posthog-js", () => ({
  default: {
    init: vi.fn(),
    identify: vi.fn(),
    capture: (event: string, props: unknown) => captured.push({ event, props }),
    reset: vi.fn(),
  },
}));

describe("track before init", () => {
  beforeEach(() => {
    captured.length = 0;
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    // initAnalytics needs a window with a non-local hostname; there is no DOM
    // environment in this suite, so provide the two fields it reads.
    (globalThis as { window?: unknown }).window = { location: { hostname: "www.usevalence.app" } };
  });

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  it("queues events fired before initAnalytics and flushes them in order", async () => {
    const { track, initAnalytics } = await import("../analytics");
    track("welcome_shown");
    track("practice_started", { topic: "kinetics" });
    expect(captured).toHaveLength(0);
    initAnalytics("anon-1");
    expect(captured.map((c) => c.event)).toEqual(["welcome_shown", "practice_started", "session_start"]);
  });

  it("does not grow without bound while analytics never starts", async () => {
    const { track } = await import("../analytics");
    for (let i = 0; i < 200; i++) track("question_answered");
    expect(captured).toHaveLength(0);
  });
});
