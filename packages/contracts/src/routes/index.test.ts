import { describe, expect, it } from "vitest";
import { missingErrorCodes } from "../contract.js";
import { apiContract } from "./index.js";

const routes = Object.entries(apiContract);

describe.each(routes)("%s", (_, procedure) => {
  const { route } = procedure["~orpc"];

  it("declares its method, path and summary", () => {
    expect(route.method).toBeDefined();
    expect(route.path).toMatch(/^\//);
    expect(route.summary).toBeTruthy();
  });

  it("declares every error code its kind requires", () => {
    expect(missingErrorCodes(procedure)).toEqual([]);
  });
});
