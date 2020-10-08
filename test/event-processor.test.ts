import { EventProcessor } from "../src/index";

test("default", () => {
  const event = EventProcessor.defaultEventProcessor({});
  expect(typeof event.cased_id).toBe("string");
  expect(typeof event.timestamp).toBe("string");
});

test("username field pii", () => {
  const event = {
    actor: "some-actor",
    action: "user.create",
    username: "@username",
  };

  const processor = EventProcessor.sensitiveField("username");
  const processedEvent = processor(event);

  expect(processedEvent).toMatchSnapshot();
});

test("username pii", () => {
  const event = {
    actor: "some-actor",
    action: "user.create",
    friend_username: "@friendusername",
    new_username: "@someusername and also @anotherusername",
  };

  const processor = EventProcessor.sensitivePattern(
    "username",
    /@([A-Za-z0-9_]+)/g
  );
  const processedEvent = processor(event);

  expect(processedEvent).toMatchSnapshot();
});

test("merge with missing pii", () => {
  const event: any = {
    ".cased": {
      pii: {
        business: [
          {
            end: 6,
            begin: 0,
            label: "pii",
          },
        ],
      },
      foo: "bar",
    },
    action: "payout.deliver",
    amount: 42,
    business: "GitHub",
    username: "@github",
    cased_id: "00004707cae288dc0f1a99ce",
    timestamp: "2020-06-04T06:59:59.000000Z",
  };

  const processor = EventProcessor.sensitivePattern(
    "username",
    /@([A-Za-z0-9_]+)/g
  );
  const processedEvent = processor(event);

  expect(processedEvent).toMatchSnapshot();
});

test("nested username field pii", () => {
  const event = {
    actor: "some-actor",
    action: "user.create",
    profile: {
      username: "@username",
    },
  };

  const processor = EventProcessor.sensitiveField("username");
  const processedEvent = processor(event);

  expect(processedEvent).toMatchSnapshot();
});

test("nested username matching pii", () => {
  const event = {
    actor: "some-actor",
    action: "user.create",
    profile: {
      username: "@someusername and also @anotherusername",
      info: {
        friend: "@friendusername",
      },
    },
  };

  const processor = EventProcessor.sensitivePattern(
    "username",
    /@([A-Za-z0-9_]+)/g
  );
  const processedEvent = processor(event);

  expect(processedEvent).toMatchSnapshot();
});
