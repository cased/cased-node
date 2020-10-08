import assert from "assert";
import { config as globalConfig, ConfigOverrides } from "./config";
import { request, requestPage, Page, PaginationOptions } from "./client";
import { composeEventProcessor } from "./event-processor";

/**
 * A `AuditEvent`.
 *
 * @public
 */
export interface AuditEvent {
  [key: string]: string | AuditEvent | undefined;
}

/**
 * Publish an `AuditEvent`.
 *
 * @public
 * @param event - The event.
 * @param config - Configuration to override.
 */
export const publish = (
  event: AuditEvent,
  config: ConfigOverrides = {}
): Promise<void> => {
  const eventProcessor = composeEventProcessor(
    ...globalConfig.eventPipeline,
    ...(config.eventPipeline || [])
  );

  event = eventProcessor(event);

  if (config.mockPublishEvents) {
    if (typeof config.mockPublishEvents !== "boolean")
      config.mockPublishEvents.push(event);
    return Promise.resolve();
  }

  return request({
    method: "POST",
    baseURL: "publish",
    params: event,
    config: config,
  });
};

/**
 * Search Events.
 *
 * ```ts
 * const firstPage = await event.search({ action: "team.update" });
 *
 * for (event of firstPage) {
 *   console.log(event);
 * }
 *
 * // request next page
 * const secondPage = await firstPage.nextPage();
 * ```
 *
 * @public
 * @param phrase - A string or `SearchPhrase` object.
 * @param paginationOptions - See `PaginationOptions`.
 * @param config - Configuration to override.
 * @returns A `Page` of `AuditEvent`s.
 */
export const search = async (
  phrase: string | SearchPhrase,
  paginationOptions: PaginationOptions = {},
  config: ConfigOverrides = {}
): Promise<Page<AuditEvent>> => {
  return await requestPage<AuditEvent>({
    method: "GET",
    path: "events",
    params: {
      phrase:
        typeof phrase === "string" ? phrase : stringifySearchPhrase(phrase),
    },
    config: config,
    ...paginationOptions,
  });
};

/**
 * Search an audit trail by action.
 *
 * ```ts
 * const events = await event.searchAction("user.login");
 * ```
 *
 * @public
 * @param action - A action name.
 * @param paginationOptions - See `PaginationOptions`.
 * @param config - Configuration to override.
 * @returns A `Page` of `AuditEvent`s.
 */
export const searchAction = async (
  action: string,
  paginationOptions: PaginationOptions = {},
  config: ConfigOverrides = {}
): Promise<Page<AuditEvent>> => {
  return search({ action }, paginationOptions, config);
};

/**
 * Search an audit trail by an actor.
 *
 * ```ts
 * const events = await event.searchActor("jill");
 * ```
 *
 * @public
 * @param actor - A actor name.
 * @param paginationOptions - See `PaginationOptions`.
 * @param config - Configuration to override.
 * @returns A `Page` of `AuditEvent`s.
 */
export const searchActor = async (
  actor: string,
  paginationOptions: PaginationOptions = {},
  config: ConfigOverrides = {}
): Promise<Page<AuditEvent>> => {
  return search({ actor }, paginationOptions, config);
};

/**
 * A search phrase object is composed of event names and values.
 *
 * ```ts
 * { action: "user.login", actor: "jill" }
 * ```
 *
 * @public
 */
export interface SearchPhrase {
  [name: string]: string | undefined;
}

/**
 * Convert `SearchPhrase` to `string`.
 *
 * ```ts
 * stringifyPhrase({ action: "user.login", actor: "jill" });
 * // "(action:user.login AND actor:jill)"
 * ```
 *
 * @protected
 * @param obj - A `SearchPhrase` object.
 * @returns A phrase string.
 */
export const stringifySearchPhrase = (obj: SearchPhrase): string => {
  let parts: string[] = [];
  for (const key in obj) parts.push(`${key}:${obj[key]}`);
  assert(parts.length > 0);
  if (parts.length === 1) return parts[0];
  return `(${parts.join(" AND ")})`;
};

/**
 * @public
 */
export interface AuditTrail {
  name: string;
  id: string;
}

/**
 * @public
 */
export interface AuditEventResult {
  audit_trail: AuditTrail;
  audit_event_url: string;
  audit_event: AuditEvent;
}

/**
 * Fetch a `AuditEvent`.
 *
 * @public
 * @param auditTrailName - The Audit Trail name.
 * @param id - The event id.
 * @param config - Configuration to override.
 */
export const fetch = (
  auditTrailName: string,
  id: string,
  config: ConfigOverrides = {}
): Promise<AuditEventResult> => {
  return request<AuditEventResult>({
    method: "GET",
    path: `audit-trails/${auditTrailName}/events/${id}`,
    params: {},
    config: config,
  });
};
