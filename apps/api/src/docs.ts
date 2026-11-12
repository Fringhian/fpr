import { createOpenApiDocument } from "@fpr/contracts/openapi";
import { apiReference } from "@scalar/express-api-reference";
import { Router } from "express";

/** Where the docs are mounted. */
export const docsPath = "/api/docs";

/** The viewer's script, pinned like every dependency. */
const viewerScript =
  "https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.76.0";

/**
 * The OpenAPI document, generated from the route contracts when the process
 * starts, at `openapi.json`, and the Scalar viewer reading it.
 */
export function docsRouter(): Router {
  const document = createOpenApiDocument();
  const router = Router();

  router.get("/openapi.json", async (_req, res) => {
    res.json(await document);
  });
  router.get(
    "/",
    apiReference({
      url: `${docsPath}/openapi.json`,
      pageTitle: "FPR API",
      cdn: viewerScript,
    }),
  );

  return router;
}
