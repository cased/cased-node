import * as https from "https";
import type { IncomingMessage } from "http";
import type { Readable } from "stream";

/**
 * Make low level HTTPS request via Node's built-in `http.request()`.
 *
 * This function serves as a low level choke point for all networking
 * requests. Useful for mocking out in test.
 *
 * @protected
 * @param options - Any valid `http.request(options)`.
 * @param body - A request body buffer for non-GET requests.
 * @returns The `response` and `body` as a single `Buffer`.
 */
export const httpsRequest = (
  options: https.RequestOptions,
  body: Buffer | null
): Promise<{
  response: IncomingMessage;
  body: Buffer;
}> => {
  return new Promise((resolve, reject) => {
    const request = https.request(options, (response) => {
      let chunks: Buffer[] = [];
      response.on("data", (chunk) => {
        chunks.push(chunk);
      });
      response.on("end", () => {
        resolve({ response, body: Buffer.concat(chunks) });
      });
    });
    request.on("error", reject);
    if (body) request.write(body);
    request.end();
  });
};

/**
 * Make low level HTTPS request via Node's built-in `http.request()`, returning a readable stream response.
 *
 * @protected
 * @param options - A `URL`.
 * @param body - A request body buffer for non-GET requests.
 * @returns A `stream.Readable` response.
 */
export const httpsRequestStream = (url: URL): Promise<Readable> => {
  return new Promise((resolve, reject) => {
    const request = https.request(url, resolve);
    request.on("error", reject);
    request.end();
  });
};
