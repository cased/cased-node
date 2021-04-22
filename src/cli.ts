import { config as globalConfig, ConfigOverrides, Dictionary } from "./config";
import { request } from "./client";


/**
 * An `Export`s metadata and current state
 *
 * @public
 */
 export interface SessionResult {
  // The CLI session ID
  id: string;

  // The CLI session web URL
  url: string;

  // The CLI session API URL
  api_url: string;

  // The CLI session record API URL
  api_record_url: string;

  // The current state the CLI session is in
  state: "requested" | "approved" | "denied" | "timed_out" | "canceled";

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

/**
 * Options for creating a new `Session`.
 *
 * @public
 */
export interface SessionOptions {
  metadata?: Dictionary;
  command?: string;
  reason?: string;
}

export const session = (
  options: SessionOptions = {},
  config: ConfigOverrides = {},
): Promise<SessionResult> => {
  return request<SessionResult>({
    method: "POST",
    baseURL: "api",
    path: "cli/sessions",
    params: options,
    config: config,
  });
};
