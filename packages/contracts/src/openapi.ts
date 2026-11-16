import type { AnyContractProcedure } from "@orpc/contract";
import {
  type JSONSchema,
  type OpenAPI,
  OpenAPIGenerator,
  type OpenAPIGeneratorGenerateOptions,
} from "@orpc/openapi";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
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

const generator = new OpenAPIGenerator({
  schemaConverters: [
    new ZodToJsonSchemaConverter({
      interceptors: [
        // Adds `x-anonymize` to each field the anonymizer replaces.
        ({ next, schema }) => {
          const [required, json] = next();
          const kind = anonymizeKind(schema);
          return kind === undefined
            ? [required, json]
            : [required, { ...json, "x-anonymize": kind }];
        },
      ],
    }),
  ],
});

const generateOptions = {
  info: {
    title: "FPR API",
    version: "1",
    description:
      "Generated from the route contracts in `@fpr/contracts` by `pnpm contracts:openapi`. `x-roles` lists the roles a route accepts. `x-anonymize` marks a field the anonymizer changes for an anonymous viewer: `personal` is replaced, `euro` is removed and the percentage beside it stays, and `quantity` is replaced with its weight in the portfolio, or `null` without one.",
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
} satisfies OpenAPIGeneratorGenerateOptions;

/**
 * The OpenAPI 3.1 document for a contract tree, served under `/api`. Each
 * operation is tagged with its top-level key, its area.
 */
export async function createOpenApiDocument(
  contract: ContractTree = apiContract,
): Promise<OpenAPI.Document> {
  const document = await generator.generate(contract, generateOptions);
  // oRPC's generator has no hook for route metadata, so each operation is
  // completed once the document is generated.
  for (const [[area], procedure] of contractProcedures(contract)) {
    completeOperation(document, area, procedure);
  }
  return document;
}

/**
 * Gives a procedure's operation its area and roles, each error response the
 * codes it carries, and takes oRPC's empty content off a success response
 * without a body.
 */
function completeOperation(
  document: OpenAPI.Document,
  area: string | undefined,
  procedure: AnyContractProcedure,
): void {
  const { route, meta, errorMap, outputSchema } = procedure["~orpc"];
  const { roles } = meta as RouteMeta;
  const method = route.method?.toLowerCase() as "get" | undefined;
  const operation =
    route.path && method ? document.paths?.[route.path]?.[method] : undefined;
  if (!operation) {
    return;
  }

  Object.assign(operation, {
    ...(area === undefined ? {} : { tags: [area] }),
    "x-roles": roles === "public" ? "public" : [...roles],
  });
  describeErrorResponses(operation, errorMap);
  const success = operation.responses?.[route.successStatus ?? 200];
  if (outputSchema instanceof z.ZodVoid && success && "content" in success) {
    delete success.content;
  }
}

/** Describes each error response with the codes it carries. */
function describeErrorResponses(
  operation: OpenAPI.OperationObject,
  errorMap: AnyContractProcedure["~orpc"]["errorMap"],
): void {
  for (const [status, response] of Object.entries(operation.responses ?? {})) {
    const codes = errorCodes
      .filter((code) => code in errorMap)
      .filter((code) => String(errorStatus[code]) === status)
      .map((code) => `\`${code}\``);
    if (codes.length > 0 && "description" in response) {
      response.description = codes.join(", ");
    }
  }
}
