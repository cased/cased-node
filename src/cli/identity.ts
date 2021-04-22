import { config } from "..";
import { request } from "../client";
import { config as globalConfig, ConfigOverrides, Dictionary } from "../config";


export const userToken = async (): Promise<string> => {
  if (config.guardUserToken) {
    return Promise.resolve(config.guardUserToken)
  }

  const identityRequest = await create()
  const identity = settled(identityRequest.api_url)

  return request<Session>({
    method: "GET",
    baseURL: "cli",
    path: `cli/sessions/${sessionId}`,
    params: {},
    config: config,
  });
};


export interface IdentityResponse {
  url: string;
  api_url: string;
  code: string;
}

export const create = (
  config: ConfigOverrides = {},
): Promise<IdentityResponse> => {
  return request<IdentityResponse>({
    method: "POST",
    baseURL: "cli",
    path: `cli/applications/users/identify`,
    params: {},
    config: config,
  });
};

export const fetch = (
  config: ConfigOverrides = {},
): Promise<IdentityResponse> => {
  return request<IdentityResponse>({
    method: "POST",
    baseURL: "cli",
    path: `cli/applications/users/identify`,
    params: {},
    config: config,
  });
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
  apiUrl: string,
  pollInterval = 1_000,
  config: ConfigOverrides = {}
): Promise<string> => {
  while (true) {
    const session = await fetch(apiUrl, config);
    switch (session.state) {
      case "requested":
        await sleep(pollInterval);
        break;
      default:
        return session;
    }
  }
};
