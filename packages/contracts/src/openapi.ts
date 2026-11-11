import type { AnyContractProcedure } from "@orpc/contract";
import { type OpenAPI, OpenAPIGenerator } from "@orpc/openapi";
import {
  ZodToJsonSchemaConverter,
  type ZodToJsonSchemaConverterOptions,
} from "@orpc/zod/zod4";
import { anonymizeKind } from "./anonymize.js";
import type { RouteMeta } from "./contract.js";
import { errorCodes, errorStatus } from "./errors.js";
import { apiContract } from "./routes/index.js";

type ConvertInterceptor = NonNullable<
  ZodToJsonSchemaConverterOptions["interceptors"]
>[number];

/** Adds `x-anonymize` to each field the anonymizer replaces. */
const markAnonymized: ConvertInterceptor = ({ next, schema }) => {
  const [required, json] = next();
  const kind = anonymizeKind(schema);
  return kind === undefined
    ? [required, json]
    : [required, { ...json, "x-anonymize": kind }];
};

const generator = new OpenAPIGenerator({
  schemaConverters: [
    new ZodToJsonSchemaConverter({ interceptors: [markAnonymized] }),
  ],
});

/** The OpenAPI 3.1 document for a contract, served under `/api`. */
export async function createOpenApiDocument(
  contract: Record<string, AnyContractProcedure> = apiContract,
): Promise<OpenAPI.Document> {
  const document = await generator.generate(contract, {
    info: {
      title: "FPR API",
      version: "1",
      description:
        "Generated from the route contracts in `@fpr/contracts` by `pnpm contracts:openapi`. `x-roles` lists the roles a route accepts. `x-anonymize` marks a field the anonymizer replaces for an anonymous viewer: `personal`, `euro`, or `quantity`.",
    },
    servers: [{ url: "/api" }],
    // FPR's error body, `{ error: { code, details } }`, in place of oRPC's.
    customErrorResponseBodySchema: (definitions) => ({
      type: "object",
      properties: {
        error: {
          type: "object",
          properties: {
            code: { type: "string", enum: definitions.map(([code]) => code) },
            details: { type: "object" },
          },
          required: ["code"],
        },
      },
      required: ["error"],
    }),
  });

  // oRPC's generator has no hook for route metadata, so each operation gets
  // its roles afterwards, and each error response the codes it carries.
  for (const procedure of Object.values(contract)) {
    const { route, meta, errorMap } = procedure["~orpc"];
    const { roles } = meta as RouteMeta;
    const method = route.method?.toLowerCase() as "get" | undefined;
    const operation =
      route.path && method ? document.paths?.[route.path]?.[method] : undefined;
    if (!operation) {
      continue;
    }

    Object.assign(operation, {
      "x-roles": roles === "public" ? "public" : [...roles],
    });
    for (const [status, response] of Object.entries(
      operation.responses ?? {},
    )) {
      const codes = errorCodes
        .filter((code) => code in errorMap)
        .filter((code) => String(errorStatus[code]) === status)
        .map((code) => `\`${code}\``);
      if (codes.length > 0 && "description" in response) {
        response.description = codes.join(", ");
      }
    }
  }

  return document;
}
