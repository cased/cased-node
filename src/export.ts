import { request } from "./client";
import { httpsRequestStream } from "./request";
import { ConfigOverrides } from "./config";
import { ExportError } from "./errors";
import { stringifySearchPhrase, SearchPhrase } from "./event";
import type { Readable } from "stream";
import assert from "assert";
import type { Request, Response, Handler } from "express";

/**
 * An `Export`s metadata and current state
 *
 * @public
 */
export interface Export {
  audit_trails: string[];
  download_url: string;
  events_found_count: number;
  fields: string[];
  format: "json";
  phrase: string | null;
  state: "pending" | "processing" | "successful" | "errored";
  token: string;
  updated_at: string;
  created_at: string;
}

/**
 * Options for creating a new `Export`.
 *
 * @public
 */
export interface ExportOptions {
  audit_trails?: string[];
  fields?: string[];
  format?: "json";
  phrase?: string | SearchPhrase;
}

/**
 * Request a new `Export`.
 *
 * @public
 * @param options - See `ExportOptions`.
 * @param config - Configuration to override.
 */
export const create = (
  options: ExportOptions = {},
  config: ConfigOverrides = {}
): Promise<Export> => {
  // Stringify SearchPhrase object
  if (typeof options.phrase === "object") {
    options = { ...options, phrase: stringifySearchPhrase(options.phrase) };
  }

  return request<Export>({
    method: "POST",
    path: "exports",
    params: options,
    config: config,
  });
};

/**
 * Fetch `Export` status and metadata.
 *
 * @public
 * @param token - The `Export` token identifier.
 * @param config - Configuration to override.
 */
export const fetch = (
  token: string,
  config: ConfigOverrides = {}
): Promise<Export> => {
  return request<Export>({
    method: "GET",
    path: `exports/${token}`,
    params: {},
    config: config,
  });
};

/**
 * Express compatible route handler for proxying export downloads.
 *
 * ```ts
 * import express from "express";
 * const app = express();
 *
 * app.get("/audit-trails/export/:export_id/download", Export.downloadHandler());
 *
 * app.get("/admin/audit-trails/export/:export_id/download", Export.downloadHandler({
 *   apiKey: "policy_admin_f964a5f252aaca986b0526b42a6f7e95"
 * }));
 * ```
 *
 * @public
 * @param config - Configuration to override.
 */
export const downloadHandler = (config: ConfigOverrides = {}): Handler => {
  return async (req: Request, res: Response) => {
    const { export_id } = req.params;
    const { state, download_url } = await fetch(export_id, config);
    switch (state) {
      case "pending":
      case "processing":
        res.send(201);
        return;
      case "successful":
        res.redirect(download_url);
        return;
      case "errored":
        res.send(500);
        return;
    }
  };
};

/**
 * Wait for `Export` to complete successful or fail.
 *
 * @public
 * @param token - The `Export` token identifier.
 * @param pollInterval - The polling interval in milliseconds.
 * @param config - Configuration to override.
 * @returns Successful promise when export is successful, otherwise throws an `Error`.
 */
export const settled = async (
  token: string,
  pollInterval = 30_000,
  config: ConfigOverrides = {}
): Promise<void> => {
  while (true) {
    const { state } = await fetch(token, config);
    switch (state) {
      case "pending":
      case "processing":
        await sleep(pollInterval);
        break;
      case "successful":
        return;
      case "errored":
        throw new ExportError("export errored");
    }
  }
};

/**
 * Get or wait for download URL for an `Export` token.
 *
 * @public
 * @param token - The `Export` token identifier.
 * @param pollInterval - The polling interval in milliseconds.
 * @param config - Configuration to override.
 */
export const downloadURL = async (
  token: string,
  pollInterval: number = 30_000,
  config: ConfigOverrides = {}
): Promise<URL> => {
  await settled(token, pollInterval, config);

  const response = await request<{ location: string }>({
    method: "GET",
    path: `exports/${token}/download`,
    params: {},
    config: config,
  });

  assert(response);
  assert(typeof response.location === "string");

  return new URL(response.location);
};

/**
 * Download `Export` and return a stream of readable bytes.
 *
 * @public
 * @param token - The `Export` token identifier.
 * @param pollInterval - The polling interval in milliseconds.
 * @param config - Configuration to override.
 */
export const download = async (
  token: string,
  pollInterval: number = 30_000,
  config: ConfigOverrides = {}
): Promise<Readable> => {
  const url = await downloadURL(token, pollInterval, config);
  return httpsRequestStream(url);
};

/**
 * Async Sleep.
 *
 * @private
 * @param delay - The time, in milliseconds, to wait.
 */
const sleep = (delay: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, delay);
  });
};
