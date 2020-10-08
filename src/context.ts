import type { AuditEvent } from "./event";
import type { Handler } from "express";
import { EventProcessor, requestEvent } from "./event-processor";
import assert from "assert";

// Define no-op functions when async_hooks aren't available
export let eventProcessor: EventProcessor = (event) => {
  return event;
};
export let middleware: Handler = (req, res, next) => {
  next();
};

export let push = (event: AuditEvent) => {};
export let pop = () => {};

try {
  const { AsyncLocalStorage } = require("async_hooks");
  const storage = new AsyncLocalStorage();
  const requestStorage = new AsyncLocalStorage();

  push = (event: AuditEvent) => {
    let events: AuditEvent[] | undefined = storage.getStore();
    if (!events) {
      events = [];
      storage.enterWith(events);
    }
    events.push(event);
  };

  pop = () => {
    const events: AuditEvent[] | undefined = storage.getStore();
    assert(events);
    events.pop();
  };

  eventProcessor = (event: AuditEvent): AuditEvent => {
    const events: AuditEvent[] | undefined = storage.getStore();
    if (!events) return event;

    let mergedEvent = event;
    for (const contextEvent of events) {
      mergedEvent = { ...contextEvent, ...mergedEvent };
    }

    return mergedEvent;
  };

  middleware = (req, res, next) => {
    push(requestEvent(req));
    next();
  };
} catch (error) {}
