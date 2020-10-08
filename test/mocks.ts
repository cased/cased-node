import { RequestOptions } from "https";
import { config } from "../src/index";

config.apiBaseURL = new URL("http://cased.localhost/api/");
config.publishBaseURL = new URL("http://cased.localhost/api/");
config.policyKey = "cs_test_001";
config.policyKeys = {
  organizations: "cs_test_002",
};
config.publishKey = "publish_test_001";
config.eventPipeline = [
  (event) => ({
    cased_id: "11111111111111111111111111111111",
    timestamp: "2020-01-01T12:00:00.000Z",
    ...event,
  }),
];

export const mockResponse = (statusCode: number, responseBody: any) => (
  requestOptions: RequestOptions,
  requestBody: Buffer | null
) => {
  // stub useragent so snapshots don't need to be updated after every version
  if (requestOptions.headers) requestOptions.headers["User-Agent"] = "Jest/1.0";

  expect(requestOptions).toMatchSnapshot();
  if (requestBody) expect(requestBody.toString("utf8")).toMatchSnapshot();
  return Promise.resolve({
    response: {
      statusCode,
      headers: {
        "content-type": "application/json; charset=utf-8",
      },
    },
    body: Buffer.from(JSON.stringify(responseBody)),
  });
};

export const mockRedirect = (location: string) => (
  requestOptions: RequestOptions,
  requestBody: Buffer | null
) => {
  // stub useragent so snapshots don't need to be updated after every version
  if (requestOptions.headers) requestOptions.headers["User-Agent"] = "Jest/1.0";

  expect(requestOptions).toMatchSnapshot();
  if (requestBody) expect(requestBody.toString("utf8")).toMatchSnapshot();
  return Promise.resolve({
    response: {
      statusCode: 302,
      headers: {
        location: location,
      },
    },
    body: Buffer.from(""),
  });
};
