import { apiContract, contractProcedures } from "@fpr/contracts";
import { minifyContractRouter } from "@orpc/contract";
import { describe, expect, it } from "vitest";
import { invalidations } from "../src/lib/api/invalidation.ts";

describe("the web app's view of the contracts", () => {
  // The client routes each call with this file, which holds only each
  // route's method, path and roles, so the schemas stay out of the bundle.
  // `pnpm test --project @fpr/web -u` rewrites it after a contract change.
  it("routes calls with the current contracts", async () => {
    const routes = minifyContractRouter(apiContract);
    await expect(`${JSON.stringify(routes, null, 2)}\n`).toMatchFileSnapshot(
      "../src/lib/api/contract.gen.json",
    );
  });

  it("names what every write invalidates, and only writes", () => {
    const writes = contractProcedures(apiContract)
      .filter(([, procedure]) => procedure["~orpc"].route.method !== "GET")
      .map(([path]) => path.join("."));

    expect(Object.keys(invalidations).toSorted()).toEqual(writes.toSorted());
  });
});
