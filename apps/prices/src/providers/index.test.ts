import { Writable } from "node:stream";
import { describe, expect, it, vi } from "vitest";
import { createLogger } from "../logger.js";
import type { Fetch } from "./http.js";
import { createProvider } from "./index.js";

describe("createProvider", () => {
  it("builds the implementation PRICE_PROVIDER names, with its key", async () => {
    const fetchMock = vi.fn<Fetch>().mockResolvedValue(Response.json([]));
    const provider = createProvider({
      name: "eodhd",
      apiKey: "test-key",
      logger: createLogger({
        destination: new Writable({ write: (_c, _e, done) => done() }),
      }),
      fetch: fetchMock,
    });

    await provider.lookup("EXA");

    expect(provider.name).toBe("eodhd");
    const url = fetchMock.mock.calls[0]?.[0] as URL;
    expect(url.origin).toBe("https://eodhd.com");
    expect(url.searchParams.get("api_token")).toBe("test-key");
  });
});
