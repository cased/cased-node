import { config as globalConfig, ConfigOverrides, Dictionary } from "../config";
import { request } from "../client";
import { ReasonRequiredError } from "../errors";
import { sleep } from "../utils";


type SessionState = "requested" | "approved" | "denied" | "timed_out" | "canceled"

/**
 * An `Export`s metadata and current state
 *
 * @public
 */
 export interface Session {
  // The CLI session ID
  id: string;

  // The CLI session web URL
  url: string;

  // The CLI session API URL
  api_url: string;

  // The CLI session record API URL
  api_record_url: string;

  // The current state the CLI session is in
  state: SessionState;

  // Command that invoked CLI session.
  command: string;

  // Additional user supplied metadata about the CLI session.
  metadata: string;
  reason: string;

  // The forwarded IP V4 or IP V6 address of the user that initiated the
  // CLI session.
  forwarded_ip_address: string | null;

  // The client's IP V4 or IP V6 address that initiated the CLI session.
  ip_address: string | null;

  // The Cased user that requested the CLI session.
  requester: string;

  // The Cased user that requested the CLI session.
  responded_at: string;

  // The Cased user that responded to the CLI session.
  responder: string;

  // The CLI application that the CLI session belongs to.
  guard_application: string;

  updated_at: string;
  created_at: string;
}

export interface ReasonRequiredResult {
  error: "reason_required";
}

/**
 * Options for creating a new `Session`.
 *
 * @public
 */
export interface SessionOptions {
  metadata?: Dictionary;
  command?: string;
  reason?: string;
  userToken?: string;
}

/**
 * Fetch `Session` status and metadata.
 *
 * @public
 * @param sessionId - The `Session` identifier.
 * @param config - Configuration to override.
 */
 export const fetch = (
  sessionId: string,
  config: ConfigOverrides = {}
): Promise<Session> => {
  return request<Session>({
    method: "GET",
    baseURL: "cli",
    path: `cli/sessions/${sessionId}`,
    params: {},
    config: config,
  });
};

export const create = async (
  options: SessionOptions = {},
  config: ConfigOverrides = {},
): Promise<Session | ReasonRequiredResult> => {
  const session = await request<Session | ReasonRequiredResult>({
    method: "POST",
    baseURL: "cli",
    path: "cli/sessions",
    params: options,
    config: config,
  });

  if((session as ReasonRequiredResult).error) {
    throw new ReasonRequiredError()
  }

  return session
};

/**
 * Wait for `Session` to have its state changed.
 *
 * @public
 * @param sessionId - The `Session` identifier.
 * @param pollInterval - The polling interval in milliseconds.
 * @param config - Configuration to override.
 * @returns Successful promise when session has changed its state.
 */
export const settled = async (
  sessionId: string,
  pollInterval = 1_000,
  config: ConfigOverrides = {}
): Promise<Session> => {
  while (true) {
    const session = await fetch(sessionId, config);
    switch (session.state) {
      case "requested":
        await sleep(pollInterval);
        break;
      default:
        return session;
    }
  }
};
