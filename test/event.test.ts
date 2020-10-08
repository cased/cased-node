jest.mock("../src/request");
const { httpsRequest } = require("../src/request");

import { Event } from "../src/index";
import { mockResponse } from "./mocks";
import assert from "assert";

test("publish", async () => {
  httpsRequest.mockImplementationOnce(
    mockResponse(200, {
      recieved_at: "1590801840.9284723",
      id: "a0e10024-7b43-43a9-bb74-e924773e876d",
      queued: {
        event_id: "a0e10024-7b43-43a9-bb74-e924773e876d",
        audit_event: { action: "user.login" },
        api_key: "cs_test_001",
      },
      status_url:
        "http://cased.localhost/api/events/a0e10024-7b43-43a9-bb74-e924773e876d",
    })
  );

  const response = await Event.publish({ action: "user.login" });
  expect(response).not.toBeNull();
});

test("publish mocked with helper", async () => {
  let events: Event.AuditEvent[] = [];
  expect(events.length).toBe(0);

  const response = await Event.publish(
    { action: "user.login" },
    { mockPublishEvents: events }
  );
  expect(response).not.toBeNull();
  expect(events.length).toBe(1);
});

describe("search", () => {
  test("raw phrase", async () => {
    httpsRequest.mockImplementationOnce(
      mockResponse(200, {
        total_count: 30,
        total_pages: 2,
        results: Array(25),
      })
    );

    const firstPage = await Event.search("action:team.update");
    expect(firstPage.totalCount).toEqual(30);
    expect(firstPage.pageCount).toEqual(2);

    {
      let eventsCount = 0;
      for (let e of firstPage) eventsCount++;
      expect(eventsCount).toEqual(25);
    }

    httpsRequest.mockImplementationOnce(
      mockResponse(200, {
        total_count: 30,
        total_pages: 2,
        results: Array(5),
      })
    );

    const secondPage = await firstPage.nextPage();
    assert(secondPage);
    expect(secondPage).toBeTruthy();
    expect(secondPage.totalCount).toEqual(30);
    expect(secondPage.pageCount).toEqual(2);

    {
      let eventsCount = 0;
      for (let e of secondPage) eventsCount++;
      expect(eventsCount).toEqual(5);
    }

    expect(secondPage.nextPage()).resolves.toBeNull();
  });

  test("phrase object", async () => {
    httpsRequest.mockImplementationOnce(
      mockResponse(200, {
        total_count: 352,
        total_pages: 15,
        results: Array(25),
      })
    );

    const page = await Event.search({ action: "team.update" });

    expect(page.totalCount).toEqual(352);
    expect(page.pageCount).toEqual(15);

    let eventsCount = 0;
    for (let e of page) eventsCount++;
    expect(eventsCount).toEqual(25);
  });

  test("action", async () => {
    httpsRequest.mockImplementationOnce(
      mockResponse(200, {
        total_count: 100,
        total_pages: 4,
        results: Array(25),
      })
    );

    const page = await Event.searchAction("user.login");

    expect(page.totalCount).toEqual(100);
    expect(page.pageCount).toEqual(4);

    let eventsCount = 0;
    for (let e of page) eventsCount++;
    expect(eventsCount).toEqual(25);
  });

  test("actor", async () => {
    httpsRequest.mockImplementationOnce(
      mockResponse(200, {
        total_count: 100,
        total_pages: 4,
        results: Array(25),
      })
    );

    const page = await Event.searchActor("jill");

    expect(page.totalCount).toEqual(100);
    expect(page.pageCount).toEqual(4);

    let eventsCount = 0;
    for (let e of page) eventsCount++;
    expect(eventsCount).toEqual(25);
  });

  const usersPolicy = {
    name: "users",
    policyKey: "cs_test_003",
  };

  test("for policy name", async () => {
    httpsRequest.mockImplementationOnce(
      mockResponse(200, {
        total_count: 352,
        total_pages: 15,
        results: Array(25),
      })
    );

    const page = await Event.search(
      { action: "team.update" },
      {},
      { name: "organizations" }
    );

    expect(page.totalCount).toEqual(352);
    expect(page.pageCount).toEqual(15);

    let eventsCount = 0;
    for (let e of page) eventsCount++;
    expect(eventsCount).toEqual(25);
  });

  test("for policy object", async () => {
    httpsRequest.mockImplementationOnce(
      mockResponse(200, {
        total_count: 352,
        total_pages: 15,
        results: Array(25),
      })
    );

    const page = await Event.search({ action: "team.update" }, {}, usersPolicy);

    expect(page.totalCount).toEqual(352);
    expect(page.pageCount).toEqual(15);

    let eventsCount = 0;
    for (let e of page) eventsCount++;
    expect(eventsCount).toEqual(25);
  });
});

test("fetch", async () => {
  httpsRequest.mockImplementationOnce(
    mockResponse(200, {
      audit_trail: {
        id: "00000000-4086-425b-83f3-d6defafb7381",
        name: "system",
      },
      audit_event_url:
        "http://cased.localhost/api/audit-trails/system/events/00000b3aa6d6672171da2f209df91831",
      audit_event: {
        action: "audit_trail_export.success",
        audit_trail_export: "",
        audit_trail_export_id:
          "AuditTrailExport;00000000-f79b-4c21-a75f-d19f35266b92",
        cased_id: "00000b3aa6d6672171da2f209df91831",
        timestamp: "2020-06-08T00:00:00Z",
      },
    })
  );

  const response = await Event.fetch(
    "system",
    "00000b3aa6d6672171da2f209df91831"
  );

  expect(response.audit_trail.name).toBe("system");
  expect(response.audit_trail.id).toBe("00000000-4086-425b-83f3-d6defafb7381");
});
