jest.mock("../src/request");
const { httpsRequest } = require("../src/request");
import { mockResponse, mockRedirect } from "./mocks";

import { Export } from "../src/index";

describe("create", () => {
  test("minimal", async () => {
    httpsRequest.mockImplementationOnce(
      mockResponse(201, {
        audit_trails: ["cased"],
        download_url:
          "http://cased.localhost/api/exports/00000000-7b43-43a9-bb74-e924773e876d/download",
        events_found_count: 0,
        fields: ["action"],
        format: "json",
        state: "pending",
        token: "00000000-7b43-43a9-bb74-e924773e876d",
        updated_at: "2020-01-01T12:00:00.000000Z",
        created_at: "2020-01-01T12:00:00.000000Z",
      })
    );

    const response = await Export.create();

    expect(response.format).toBe("json");
    expect(response.state).toBe("pending");
  });

  test("with phrase", async () => {
    httpsRequest.mockImplementationOnce(
      mockResponse(201, {
        audit_trails: ["cased"],
        download_url:
          "http://cased.localhost/api/exports/00000000-7b43-43a9-bb74-e924773e876d/download",
        events_found_count: 0,
        fields: ["action"],
        format: "json",
        phrase: "action:user.login",
        state: "pending",
        token: "00000000-7b43-43a9-bb74-e924773e876d",
        updated_at: "2020-01-01T12:00:00.000000Z",
        created_at: "2020-01-01T12:00:00.000000Z",
      })
    );

    const response = await Export.create({ phrase: { action: "user.login" } });

    expect(response.format).toBe("json");
    expect(response.state).toBe("pending");
  });
});

test("fetch", async () => {
  httpsRequest.mockImplementationOnce(
    mockResponse(200, {
      audit_trails: ["cased"],
      download_url:
        "http://cased.localhost/api/exports/00000000-7b43-43a9-bb74-e924773e876d/download",
      events_found_count: 0,
      fields: ["action"],
      format: "json",
      state: "successful",
      token: "00000000-7b43-43a9-bb74-e924773e876d",
      updated_at: "2020-01-01T12:00:00.000000Z",
      created_at: "2020-01-01T12:00:00.000000Z",
    })
  );

  const response = await Export.fetch("00000000-7b43-43a9-bb74-e924773e876d");

  expect(response.format).toBe("json");
  expect(response.state).toBe("successful");
});

test("settled", async () => {
  httpsRequest
    .mockImplementationOnce(mockResponse(200, { state: "pending" }))
    .mockImplementationOnce(mockResponse(200, { state: "processing" }))
    .mockImplementationOnce(mockResponse(200, { state: "successful" }));

  await Export.settled("00000000-7b43-43a9-bb74-e924773e876d", 0.1);
});

describe("downloadURL", () => {
  test("successful state", async () => {
    httpsRequest
      .mockImplementationOnce(mockResponse(200, { state: "successful" }))
      .mockImplementationOnce(
        mockRedirect(
          "https://cased-exports.localhost/exports/00000000-7b43-43a9-bb74-e924773e876d.json"
        )
      );

    const location = await Export.downloadURL(
      "00000000-7b43-43a9-bb74-e924773e876d",
      0.1
    );
    expect(location.href).toBe(
      "https://cased-exports.localhost/exports/00000000-7b43-43a9-bb74-e924773e876d.json"
    );
  });

  test("pending state", async () => {
    httpsRequest
      .mockImplementationOnce(mockResponse(200, { state: "pending" }))
      .mockImplementationOnce(mockResponse(200, { state: "processing" }))
      .mockImplementationOnce(mockResponse(200, { state: "successful" }))
      .mockImplementationOnce(
        mockRedirect(
          "https://cased-exports.localhost/exports/00000000-7b43-43a9-bb74-e924773e876d.json"
        )
      );

    const location = await Export.downloadURL(
      "00000000-7b43-43a9-bb74-e924773e876d",
      0.1
    );
    expect(location.href).toBe(
      "https://cased-exports.localhost/exports/00000000-7b43-43a9-bb74-e924773e876d.json"
    );
  });
});
