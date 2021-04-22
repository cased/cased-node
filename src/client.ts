import * as querystring from "querystring";
import assert from "assert";
import { httpsRequest } from "./request";
import {
  config as globalConfig,
  getPolicyKey,
  Config,
  ConfigOverrides,
} from "./config";
import type { OutgoingHttpHeaders } from "http";
import { APIError, AuthenticationError } from "./errors";
import version from "./version";

/**
 * Options for making a Cased API request.
 *
 * @protected
 */
interface RequestOptions {
  /**
   * The HTTP method.
   */
  method: "GET" | "POST" | "PUT" | "DELETE";

  /**
   * Base URL for request.
   *
   * Default `"api"`.
   */
  baseURL?: "api" | "publish" | "cli";

  /**
   * The API endpoint path.
   *
   * Omit a leading and trailing slash.
   *
   * @example `"events"`, `"events/123"`
   */
  path?: string;

  /**
   * URL search query or POST data parameters.
   */
  params: any;

  /**
   * Configuration to override on global config.
   */
  config: ConfigOverrides;
}

/**
 * Make a Cased API request.
 *
 * A high level request helper that covers all API access.
 *
 * @protected
 */
export const request = async <T>(options: RequestOptions): Promise<T> => {
  const config: Config = {
    ...globalConfig,
    ...options.config,
  };

  let apiKey: string;
  if (options.baseURL === "publish") {
    if (!config.publishKey) {
      throw new AuthenticationError(
        "No Publish API key provided. " +
          "Set your API key using config.publishKey = <API-KEY>, or supply the key with the request. " +
          "See https://docs.cased.com for more information."
      );
    }
    apiKey = config.publishKey;
  } else if (options.baseURL === "cli") {
    if (!config.guardApplicationKey) {
      throw new AuthenticationError(
        "No CLI API key provided. " +
          "Set your API key using config.guardApplicationKey = <API-KEY>, or supply the key with the request. " +
          "See https://docs.cased.com for more information."
      );
    }
    apiKey = config.guardApplicationKey;

    if (!options.params.user_token) {
      options.params.user_token = options.params.userToken || config.guardUserToken;
    }
  } else {
    let policyKey = getPolicyKey(config);
    if (!policyKey) {
      throw new AuthenticationError(
        "No API key provided. " +
          "Set your API key using config.policyKey = <POLICY-KEY>, or supply the key with the request. " +
          "See https://docs.cased.com for more information."
      );
    }
    apiKey = policyKey;
  }

  const baseURL: URL =
    options.baseURL === "publish" ? config.publishBaseURL : config.apiBaseURL;

  let url = new URL(options.path || "", baseURL);

  if (options.method === "GET") {
    url.search = querystring.stringify(options.params);
  }

  let headers: OutgoingHttpHeaders = {};
  headers["Accept"] = "application/json";
  headers["Authorization"] = `Bearer ${apiKey}`;
  headers["User-Agent"] = `cased-node/${version}`;

  let postData: Buffer | null = null;

  if (options.method !== "GET") {
    postData = Buffer.from(JSON.stringify(options.params));
    headers["Content-Type"] = "application/json; charset=utf-8";
    headers["Content-Length"] = `${postData.length}`;
  }

  const opts = {
    host: baseURL.hostname,
    path: `${url.pathname}${url.search}`,
    method: options.method,
    headers: headers,
  };

  const { response, body } = await httpsRequest(opts, postData);

  let data: any | null = null;
  if (response.headers["content-type"] === "application/json; charset=utf-8") {
    data = JSON.parse(body.toString("utf8"));
  }

  switch (response.statusCode) {
    case 200:
    case 201:
    case 202:
    case 204:
    case 400:
    case 404:
      return data;

    case 302:
      data = { location: response.headers["location"] };
      return data;

    case 401:
    case 417:
      throw new APIError(data);

    default:
      assert.fail(`unhandled status code: ${response.statusCode}`);
  }
};

// Pagination

/**
 * Raw response structure of all paginated responses.
 *
 * This structure is not exposed publically. See `Page` interface instead.
 *
 * @private
 */
interface PageResponse<T> {
  results: T[];
  total_count: number;
  total_pages: number;
}

/**
 * Generic paginated results value.
 *
 * @public
 *
 * @example
 * ```ts
 * const page = await event.search({ action: "team.update" });
 * page.totalCount // 42
 *
 * // log each event for this page of results
 * for (const event of page) {
 *    console.log(event)
 * }
 *
 * // fetch second page of results
 * const secondPage = await page.nextPage();
 * ```
 */
export interface Page<T> {
  /**
   * Iterator for page items.
   *
   * @public
   *
   * @example
   * ```ts
   * const page = await event.search({ action: "team.update" });
   *
   * // log each event for this page of results
   * for (const event of page) {
   *    console.log(event)
   * }
   * ```
   */
  [Symbol.iterator](): Iterator<T, void, undefined>;

  /**
   * Async iterator for all items.
   *
   * @public
   *
   * @example
   * ```ts
   * const events = await event.search({ action: "team.update" });
   *
   * // log each event while fetching all pages
   * for async (const event of events) {
   *    console.log(event)
   * }
   * ```
   */
  [Symbol.asyncIterator](): AsyncIterator<T, void, undefined>;

  /**
   * Total number of results in data set.
   *
   * @public
   *
   * @example
   * ```ts
   * const results = await event.search({ action: "team.update" });
   * results.totalCount // 42
   * ```
   */
  totalCount: number;

  /**
   * Total number of pages in data set.
   *
   * @public
   *
   * @example
   * ```ts
   * const results = await event.search({ action: "team.update" });
   * results.pageCount // 42
   * ```
   */
  pageCount: number;

  /**
   * Fetch next page of results.
   *
   * Returns null if there are no more pages.
   *
   * @public
   *
   * @example
   * ```ts
   * const page = await event.search({ action: "team.update" });
   *
   * // fetch second page of results
   * const secondPage = await page.nextPage();
   * ```
   */
  nextPage(): Promise<Page<T> | null>;

  /**
   * Fetch previous page of results.
   *
   * Returns null if there are no previous pages.
   *
   * @public
   *
   * @example
   * ```ts
   * const secondPage = await event.search({ action: "team.update" }, { page: 2 });
   *
   * // go back to page 1
   * const firstPage = await page.previousPage();
   * ```
   */
  previousPage(): Promise<Page<T> | null>;

  /**
   * Fetch first page of results.
   *
   * @public
   *
   * @example
   * ```ts
   * const secondPage = await event.search({ action: "team.update" }, { page: 2 });
   *
   * // go back to page 1
   * const firstPage = await page.firstPage();
   * ```
   */
  firstPage(): Promise<Page<T>>;

  /**
   * Fetch last page of results.
   *
   * @public
   *
   * @example
   * ```ts
   * const firstPage = await event.search({ action: "team.update" });
   *
   * // jump to last page
   * const lastPage = await page.lastPage();
   * ```
   */
  lastPage(): Promise<Page<T>>;
}

/**
 * Standard options for any paginated request.
 *
 * @public
 */
export interface PaginationOptions {
  /**
   * Current page number.
   *
   * Default: 1
   *
   * @example
   * ```ts
   * const secondPage = await event.search({ action: "team.update" }, { page: 2 });
   * ```
   */
  page?: number;

  /**
   * Number of results per page.
   *
   * Default: 25
   *
   * @example
   * ```ts
   * const smallPage = await event.search({ action: "team.update" }, { page: 5 });
   * ```
   */
  perPage?: number;
}

/**
 * Make a paginated Cased API request.
 *
 * @protected
 */
export const requestPage = async <T>(
  options: RequestOptions & PaginationOptions
): Promise<Page<T>> => {
  const page = options.page || 1;
  const perPage = options.perPage || 25;

  const response = await request<PageResponse<T>>({
    ...options,
    params: {
      page,
      per_page: perPage,
      ...options.params,
    },
  });

  assert(response.total_count >= 0);
  assert(response.total_pages > 0);
  assert(response.results.length >= 0);

  const iterator = (): Iterator<T> => response.results[Symbol.iterator]();

  async function* asyncIterator() {
    for (let p = page; p < response.total_pages; p++) {
      for (const item of await requestPage<T>({ ...options, page: p })) {
        yield item;
      }
    }
    return;
  }

  return {
    [Symbol.iterator]: iterator,
    [Symbol.asyncIterator]: asyncIterator,
    totalCount: response.total_count,
    pageCount: response.total_pages,
    nextPage() {
      if (page >= response.total_pages) return Promise.resolve(null);
      return requestPage({ ...options, page: page + 1 });
    },
    previousPage() {
      if (page <= 1) return Promise.resolve(null);
      return requestPage({ ...options, page: page - 1 });
    },
    firstPage() {
      return requestPage({ ...options, page: 1 });
    },
    lastPage() {
      return requestPage({
        ...options,
        page: response.total_pages,
      });
    },
  };
};
