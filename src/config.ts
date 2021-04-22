import type { AuditEvent } from "./event";
import { EventProcessor, defaultEventProcessor } from "./event-processor";
import { eventProcessor as contextEventProcessor } from "./context";
import { CLI } from ".";

/**
 * Cased client configuration.
 *
 * @public
 */
export interface Config {
  /**
   * A policy name for this config.
   */
  name: string | null;

  /**
   * The API endpoint.
   *
   * "https://api.cased.com/"
   */
  apiBaseURL: URL;

  /**
   * The publish API endpoint.
   *
   * "https://publish.cased.com/"
   */
  publishBaseURL: URL;

  /**
   * The API version number.
   */
  apiVersion: number;

  /**
   * Your default policy API Key.
   */
  policyKey: string | null;

  /**
   * Named policy API Keys.
   */
  policyKeys: {
    [key: string]: string | undefined;
  };

  /**
   * Your publishing API Key.
   */
  publishKey: string | null;

  /**
   * A list of processor functions to apply to published events.
   */
  eventPipeline: EventProcessor[];

  /**
   * Mock out any publish event during testing.
   */
  mockPublishEvents: MockPublishEvents | boolean;

  /**
   * Your CLI API Key.
   */
  guardApplicationKey: string | null;

  /**
   * Your user identifier.
   */
  guardUserToken: string | null;

  guardDenyIfUnreachable: boolean;

  cli: CLI;
}

export interface CLI {
  metadata: Dictionary;
}

/**
 * A simple dictionary conforms to this interface.
 *
 * @public
 */
export interface Dictionary {
  [name: string]: string | undefined;
}

/**
 * A mocked events object.
 *
 * A simple Array conforms to this interface.
 *
 * @public
 */
export interface MockPublishEvents {
  push(event: AuditEvent): void;
}

/**
 * Configure options to override.
 *
 * @public
 */
export interface ConfigOverrides {
  /**
   * A policy name for this config.
   */
  name?: string;

  /**
   * The API endpoint.
   *
   * "https://api.cased.com/"
   */
  apiBaseURL?: URL;

  /**
   * The publish API endpoint.
   *
   * "https://publish.cased.com/"
   */
  publishBaseURL?: URL;

  /**
   * The API version number.
   */
  apiVersion?: number;

  /**
   * Your default policy API Key.
   */
  policyKey?: string;

  /**
   * Your publishing API Key.
   */
  publishKey?: string;

  /**
   * A list of processor functions to apply to published events.
   */
  eventPipeline?: EventProcessor[];

  /**
   * Mock out any publish event during testing.
   */
  mockPublishEvents?: MockPublishEvents | boolean;

  guardApplicationKey?: string;

  guardUserToken?: string;
}

const castBool = (val: string | undefined): boolean => {
  if (!val) {
    return false;
  }

  return ["true", "1"].indexOf(val) >= 0;
}

/**
 * Global configuration for process.
 *
 * A mutable binding is exported to allow for global config changes.
 *
 * ```ts
 * import { config } from "cased";
 * config.apiKey = "cs_live_f764a5f252aaca986b0526b42a6f7e95";
 * ```
 *
 * @public
 */
export let config: Config = {
  name: null,
  apiBaseURL: new URL(process.env["CASED_API_URL"] || "https://api.cased.com/"),
  publishBaseURL: new URL(
    process.env["CASED_PUBLISH_URL"] || "https://publish.cased.com/"
  ),
  apiVersion: 1,
  policyKey: process.env["CASED_POLICY_KEY"] || null,
  policyKeys: {},
  publishKey: process.env["CASED_PUBLISH_KEY"] || null,
  eventPipeline: [defaultEventProcessor, contextEventProcessor],
  mockPublishEvents: false,
  guardApplicationKey: process.env["GUARD_APPLICATION_KEY"] || null,
  guardUserToken: process.env["GUARD_USER_TOKEN"] || null,
  guardDenyIfUnreachable: castBool(process.env["DENY_IF_UNREACHABLE"]),
  cli: {
    metadata: {},
  },
};

/**
 * Get policy key for config.
 *
 * Try to read policy key from config, but fallback to fetching
 * from the environment.
 *
 * @protected
 * @param config - A policy config.
 */
export const getPolicyKey = (config: Config): string | null => {
  let key: string | undefined | null;

  if (config.name) {
    key = config.policyKeys[config.name];
    if (key) return key;

    key = process.env[`CASED_${config.name}_POLICY_KEY`];
    if (key) return key;
  }

  key = config.policyKey;
  if (key !== null) return key;

  key = process.env["CASED_POLICY_KEY"];
  if (key) return key;

  return null;
};
