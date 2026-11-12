import { type JSONSchema, type OpenAPI, OpenAPIGenerator } from "@orpc/openapi";
import {
  ZodToJsonSchemaConverter,
  type ZodToJsonSchemaConverterOptions,
} from "@orpc/zod/zod4";
import { z } from "zod";
import { anonymizeKind } from "./anonymize.js";
import { apiContract } from "./api/index.js";
import {
  type ContractTree,
  contractProcedures,
  type RouteMeta,
} from "./contract.js";
import {
  errorCodes,
  errorStatus,
  invalidRequestDetailsSchema,
} from "./errors.js";

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

/**
 * The OpenAPI 3.1 document for a contract tree, served under `/api`. Each
 * operation is tagged with its top-level key, its area.
 */
export async function createOpenApiDocument(
  contract: ContractTree = apiContract,
): Promise<OpenAPI.Document> {
  const document = await generator.generate(contract, {
    info: {
      title: "FPR API",
      version: "1",
      description:
        "Generated from the route contracts in `@fpr/contracts` by `pnpm contracts:openapi`. `x-roles` lists the roles a route accepts. `x-anonymize` marks a field the anonymizer changes for an anonymous viewer: `personal` is replaced, `euro` is removed and the percentage beside it stays, and `quantity` is replaced with its weight in the portfolio.",
    },
    servers: [{ url: "/api" }],
    // Declared once under `components`, as nearly every route answers it.
    commonSchemas: {
      InvalidRequestDetails: {
        strategy: "output",
        schema: invalidRequestDetailsSchema,
      },
    },
    // FPR's error body, `{ error: { code, details } }`, in place of oRPC's:
    // one body per code, with the `details` its schema declares.
    customErrorResponseBodySchema: (definitions) => {
      const bodies = definitions.map(
        ([code, , detailsRequired, details]): JSONSchema => ({
          type: "object",
          properties: {
            error: {
              type: "object",
              properties: { code: { const: code }, details },
              required: detailsRequired ? ["code", "details"] : ["code"],
            },
          },
          required: ["error"],
        }),
      );
      return bodies.length === 1 ? bodies[0] : { oneOf: bodies };
    },
  });

  // oRPC's generator has no hook for route metadata, so each operation gets
  // its area and roles afterwards, each error response the codes it carries,
  // and a success response without a body loses oRPC's empty content.
  for (const [[area], procedure] of contractProcedures(contract)) {
    const { route, meta, errorMap, outputSchema } = procedure["~orpc"];
    const { roles } = meta as RouteMeta;
    const method = route.method?.toLowerCase() as "get" | undefined;
    const operation =
      route.path && method ? document.paths?.[route.path]?.[method] : undefined;
    if (!operation) {
      continue;
    }

    Object.assign(operation, {
      ...(area === undefined ? {} : { tags: [area] }),
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
    const success = operation.responses?.[route.successStatus ?? 200];
    if (outputSchema instanceof z.ZodVoid && success && "content" in success) {
      delete success.content;
    }
  }

  return document;
}
