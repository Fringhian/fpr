import { z } from "zod";
import { anonymizeKind } from "./anonymize.js";
import {
  type ErrorCode,
  errorCodes,
  errorSchema,
  errorStatus,
} from "./errors.js";
import {
  type Method,
  type RouteContract,
  routeErrorCodes,
  type SuccessStatus,
} from "./route.js";

export type JsonSchema = Record<string, unknown>;

export interface OpenApiParameter {
  name: string;
  in: "path" | "query";
  required: boolean;
  schema: JsonSchema;
}

export interface OpenApiResponse {
  description: string;
  content?: { "application/json": { schema: JsonSchema } };
}

export interface OpenApiOperation {
  summary: string;
  /** `public`, or the roles the route accepts. */
  "x-roles": "public" | string[];
  parameters?: OpenApiParameter[];
  requestBody?: {
    required: true;
    content: { "application/json": { schema: JsonSchema } };
  };
  responses: Record<string, OpenApiResponse>;
}

export interface OpenApiDocument {
  openapi: "3.1.1";
  info: { title: string; version: string; description: string };
  servers: { url: string }[];
  paths: Record<string, Partial<Record<Method, OpenApiOperation>>>;
}

const successDescriptions: Record<SuccessStatus, string> = {
  200: "OK",
  201: "Created",
  204: "No content",
};

/**
 * Zod's JSON Schema output for a schema. A field the anonymizer replaces
 * carries `x-anonymize` with its kind.
 */
export function toJsonSchema(
  schema: z.ZodType,
  io: "input" | "output",
): JsonSchema {
  const { $schema: _, ...json } = z.toJSONSchema(schema, {
    io,
    unrepresentable: "throw",
    override: ({ zodSchema, jsonSchema }) => {
      const kind = anonymizeKind(zodSchema);
      if (kind !== undefined) {
        jsonSchema["x-anonymize"] = kind;
      }
    },
  });
  return json;
}

/** `/users/:userId` as OpenAPI writes it: `/users/{userId}`. */
export function openApiPath(path: string): string {
  return path.replace(/:([A-Za-z0-9_]+)/g, "{$1}");
}

function parameters(
  schema: z.ZodObject | undefined,
  location: "path" | "query",
): OpenApiParameter[] {
  if (schema === undefined) {
    return [];
  }
  const json = toJsonSchema(schema, "input");
  const properties = (json.properties ?? {}) as Record<string, JsonSchema>;
  const required = (json.required ?? []) as string[];
  return Object.entries(properties).map(([name, property]) => ({
    name,
    in: location,
    required: location === "path" || required.includes(name),
    schema: property,
  }));
}

function jsonContent(schema: z.ZodType, io: "input" | "output") {
  return { "application/json": { schema: toJsonSchema(schema, io) } };
}

/** One response per error status, its code narrowed to the route's codes. */
function errorResponses(route: RouteContract): Record<string, OpenApiResponse> {
  const declared = new Set(routeErrorCodes(route));
  const byStatus = new Map<number, ErrorCode[]>();
  for (const code of errorCodes) {
    if (declared.has(code)) {
      const status = errorStatus[code];
      byStatus.set(status, [...(byStatus.get(status) ?? []), code]);
    }
  }

  const responses: Record<string, OpenApiResponse> = {};
  for (const [status, codes] of [...byStatus].sort(([a], [b]) => a - b)) {
    const schema = z.object({
      error: errorSchema.shape.error.extend({ code: z.enum(codes) }),
    });
    responses[status] = {
      description: codes.map((code) => `\`${code}\``).join(", "),
      content: jsonContent(schema, "output"),
    };
  }
  return responses;
}

function operation(route: RouteContract): OpenApiOperation {
  const responses: Record<string, OpenApiResponse> = {};
  for (const [status, schema] of Object.entries(route.responses)) {
    const description = successDescriptions[Number(status) as SuccessStatus];
    responses[status] =
      schema === null || schema === undefined
        ? { description }
        : { description, content: jsonContent(schema, "output") };
  }
  Object.assign(responses, errorResponses(route));

  const params = [
    ...parameters(route.params, "path"),
    ...parameters(route.query, "query"),
  ];

  return {
    summary: route.summary,
    "x-roles": route.roles === "public" ? "public" : [...route.roles],
    ...(params.length > 0 ? { parameters: params } : {}),
    ...(route.body === undefined
      ? {}
      : {
          requestBody: {
            required: true as const,
            content: jsonContent(route.body, "input"),
          },
        }),
    responses,
  };
}

/** The OpenAPI 3.1 document for a list of routes, served under `/api`. */
export function createOpenApiDocument(
  routes: readonly RouteContract[],
): OpenApiDocument {
  const paths: OpenApiDocument["paths"] = {};
  for (const route of routes) {
    const path = openApiPath(route.path);
    const item = paths[path] ?? {};
    if (item[route.method] !== undefined) {
      throw new Error(
        `${route.method.toUpperCase()} ${route.path} is declared twice`,
      );
    }
    item[route.method] = operation(route);
    paths[path] = item;
  }

  return {
    openapi: "3.1.1",
    info: {
      title: "FPR API",
      version: "1",
      description:
        "Generated from the route contracts in `@fpr/contracts` by `pnpm contracts:openapi`. `x-roles` lists the roles a route accepts. `x-anonymize` marks a field the anonymizer replaces for an anonymous viewer: `personal`, `euro`, or `quantity`.",
    },
    servers: [{ url: "/api" }],
    paths,
  };
}
