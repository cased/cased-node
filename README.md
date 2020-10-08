# cased-node

`cased-node` is the official node client for [Cased](https://cased.com), a web service for adding audit trails to any application in minutes. This node client makes it easy to record and query your Cased audit trail events. The client also includes a robust set of features to mask PII, add client-side resilience, and automatically augment events with more data.

| Contents                         |
| :------------------------------- |
| [Installation](##installation)   |
| [Configuration](##configuration) |
| [How To Guide](##usage-guide)    |
| [Tests](##tests)                 |

## Installation

The recommended way to install the Cased library module is via npm.

```
npm install -g @casedinc/cased
```

## Configuration

The client can be configured using environment variables or initialized programmatically.

To start sending events, the client will look for `CASED_PUBLISH_KEY`. This can be found in your [Cased](https://app.cased.com) dashboard.
The API key can also be provided programatically and this will take precedence if provided. Example environment variable usage:

```
$ CASED_PUBLISH_KEY="publish_test_c260ffa178db6d5953f11f747ecb7ee3" node app.js
```

Or programmatically:

```javascript
import { config } from "@casedinc/cased";
config.publishKey = "publish_test_c260ffa178db6d5953f11f747ecb7ee3";
```

You can also send your API key with each request:

```javascript
import { Event } from "@casedinc/cased";

await Event.publish("user.login", {
  publishKey: "publish_test_c260ffa178db6d5953f11f747ecb7ee3",
});
```

## How To Guide

Record your first audit trail event using the `publish()` function on the `Event` module.

```javascript
import { Event } from "@casedinc/cased";

await Event.publish({
  event: "user.login",
  location: "130.25.167.191",
  request_id: "e851b3a7-9a16-4c20-ac7f-cbcdd3a9c183",
  server: "app.fe1.disney.com",
  session_id: "e2bd0d0e-165c-4e2a-b40b-8e2997fd7915",
  user_agent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Safari/537.36",
  user_id: "User;1",
  user: "mickeymouse",
});
```

### Fetch an event

Event can then be fetched later by their ID.

```javascript
import { Event } from "@casedinc/cased";
config.policyKey = "policy_test_f764a5f252aaca986b0526b42a6f7e95";

await Event.fetch("e19a2032-f841-426c-8a13-5a938e7934a3");
```

### Result lists and pagination

Many resources, such as `Event` and `Policy` can return paged result sets.

```javascript
import { Event } from "@casedinc/cased";

const events = await Event.search({ action: "team.update" });

for (event of events) {
  console.log(event);
}
```

By default, 25 items are returned per page. This can be adjusted, with a maximum of 50 items.

```javascript
const events = await Event.search({ action: "team.update" }, { perPage: 50 });
```

You can get metadata:

```javascript
events.totalCount; // Total count of objects
events.pageCount; // Total number of pages
```

Then fetch the next, previous, first or last page.

```javascript
const nextPageOfEvents = await page.nextPage();
const previousPageofEvents = await page.previousPage();
const firstPageOfEvents = await page.firstPage();
const lastPageOfEvents = await page.lastPage();
```

An async iterator is also provided.

```javascript
const events = await Event.search({ action: "team.update" });

for async (const event of events) {
  console.log(event)
}
```

### Searching

You can search for events by using `Event.search` with an object:

```javascript
import { Event } from "@casedinc/cased";

const events = await Event.search({ actor: "jill" });
```

You can use some convenience functions:

```javascript
await Event.searchActor("jill");

await Event.searchAction("invite.created");
```

You can also do a raw search, using a string phrase:

```javascript
await Event.search("actor:jill AND event:invite.created");
```

## Event Processors

Event processors are custom functions that modify or add additional keys to published events.

Processors are just simple functions that take an audit event and return a new modified event.

Here's an example of the default plugin that ships with this library:

```javascript
const defaultEventProcessor = (event) => {
  return {
    cased_id: randomBytes(16).toString("hex"),
    timestamp: new Date().toISOString(),
    ...event,
  };
};
```

Processors can be registered globally or passed along as an option to `Event.publish`.

```javascript
import { config, Event } from "@casedinc/cased";

const myProcessor = (event) => {};

// run myProcessor on all events
config.eventPipeline.push(myProcessor);

// run myProcessor on just this publish
await Event.publish("user.login", { eventPipeline: [myProcessor] });
```

### Sensitive Data

There is a special set of event processors designed specifically to help mask sensitive PII.

```javascript
import { config, EventProcessor } from "@casedinc/cased";

config.eventPipeline.push(
  EventProcessor.sensitiveField("username"),
  EventProcessor.sensitiveField("address")
);
```

Any field, in any audit event, that matches one of those key name will be marked as sensitive when sent to Cased.

You can also mark _patterns_ in your audit trail as sensitive in order to mask PII.

```javascript
import { config, EventProcessor } from "@casedinc/cased";

config.eventPipeline.push(
  EventProcessor.sensitivePattern("username", /@([A-Za-z0-9_]+)/g)
);
```

A sensitive data handler includes a `label`, which makes it easy to identify what kind of data is being masked. Additionally, it includes a `pattern`, which is a regular expression matching a pattern you want to mark as sensitive.

Now any data you send that matches that pattern with will be marked as PII when sent to Cased.

### Contextual Data

If you're using a Node v14 and are willing to use an experimental API, Async Hooks provide the ability to attach contextual data to all Cased events.

```javascript
import { Context as CasedContext } from "@casedinc/cased"

app.use(CasedContext.middleware));
```

See the Node documentation on [`AsyncLocalStorage`](https://nodejs.org/api/async_hooks.html#async_hooks_class_asynclocalstorage) as it's API is subject to change in the future.

## Testing

In your tests, you'll likely want to disable publishing events. You can do this globally by setting the `mockPublishEvents` config value.

```javascript
import { config } from "@casedinc/cased";
config.mockPublishEvents = true;
```

You can also capture events published during a test to use for your own assertions.

```javascript
import { config, Event } from "@casedinc/cased";

beforeEach(() => {
  config.mockPublishEvents = [];
});

test("publish", async () => {
  expect(config.mockPublishEvents.length).toBe(0);
  await Event.publish("user.login");
  expect(config.mockPublishEvents.length).toBe(1);
});
```

## Contributing

Contributions to this library are welcomed and a complete test suite is available. Tests can be run locally using the following command:

```
$ npm test
```
