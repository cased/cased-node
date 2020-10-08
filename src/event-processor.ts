import type { AuditEvent } from "./event";
import { randomBytes } from "crypto";
import { EventProcessor } from ".";
import type { IncomingMessage } from "http";

/**
 * Function that modifies or add keys to published events.
 *
 * @public
 *
 * ```ts
 * const myProcessor = (event) => {
 *   return { ...event, foo: 42 }
 * }
 * ```
 */
export type EventProcessor = (event: Readonly<AuditEvent>) => AuditEvent;

/**
 * Combine a pipeline of event processors into a single processor.
 *
 * @public
 * @param eventProcessors - A list of event processors.
 * @returns A single event processor.
 */
export const composeEventProcessor = (
  ...eventProcessors: EventProcessor[]
): EventProcessor => {
  return (event) => {
    for (const eventProcessor of eventProcessors) {
      event = eventProcessor(event);
    }
    return event;
  };
};

/**
 * Add Cased conventional keys to every published event.
 *
 * @public
 * @param event - An event.
 * @returns An event adding a `case_id` and `timestamp` property.
 */
export const defaultEventProcessor: EventProcessor = (event) => {
  return {
    cased_id: randomBytes(16).toString("hex"),
    timestamp: new Date().toISOString(),
    ...event,
  };
};

/**
 * Get Cased conventional keys for an HTTP Request.
 *
 * @param req - An HTTP incoming request.
 * @returns An event.
 */
export const requestEvent = (req: IncomingMessage): AuditEvent => {
  return {
    location: req.connection.remoteAddress,
    http_user_agent: req.headers["user-agent"],
    http_url: req.url,
    http_method: req.method,
  };
};

/**
 * Mask sensitive fields of an audit event.
 *
 * @public
 * @param field - An object key to mask.
 * @returns An event with PII masked.
 *
 * ```ts
 * sensitiveField("password")
 * ```
 */
export const sensitiveField = (field: string): EventProcessor => {
  return (event) => {
    let pii: PII = {};

    const traverse = (event: AuditEvent) => {
      for (const key in event) {
        const value = event[key];

        if (key === ".cased") {
          continue;
        } else if (typeof value === "string" && key == field) {
          pii[key] = [
            {
              label: field,
              begin: 0,
              end: value.length,
            },
          ];
        } else if (typeof value === "object") {
          traverse(value);
        }
      }
    };

    traverse(event);
    return appendPII(event, pii);
  };
};

/**
 * Mask sensitive fields of an audit event that match a pattern.
 *
 * @public
 * @param label - A label for masked PII.
 * @param pattern - A pattern to match against values.
 * @returns An event with PII masked.
 *
 * ```ts
 * sensitivePattern("username", /@([A-Za-z0-9_]+)/g)
 * ```
 */
export const sensitivePattern = (
  label: string,
  pattern: RegExp
): EventProcessor => {
  return (event) => {
    let pii: PII = {};

    const traverse = (event: AuditEvent) => {
      for (const key in event) {
        const value = event[key];

        if (key === ".cased") {
          continue;
        } else if (typeof value === "string") {
          const piiRanges = matches(value, pattern).map((match) => {
            return {
              label,
              begin: match.index,
              end: match.index + match[0].length,
            };
          });
          if (piiRanges.length > 0) pii[key] = piiRanges;
        } else if (typeof value === "object") {
          traverse(value);
        }
      }
    };

    traverse(event);
    return appendPII(event, pii);
  };
};

/**
 * Structure for defining the range and label of a PII mask.
 *
 * @private
 */
interface PIIRange {
  begin: number;
  end: number;
  label: string;
}

/**
 * A set of PII keys and masking ranges.
 *
 * @private
 */
interface PII {
  [key: string]: PIIRange[] | undefined;
}

/**
 * Append additional PII ranges to event.
 *
 * @private
 * @param event - An Event
 * @param pii - PII Configuration
 */
const appendPII = (event: any, pii: PII): AuditEvent => {
  const anyEvent: any = {
    ...event,
    ".cased": { ...event[".cased"], pii: { ...event[".cased"]?.pii, ...pii } },
  };
  return anyEvent;
};

/**
 * Return all match objects for a global RegExp.
 *
 * @private
 * @param value - String to match
 * @param regexp - A regexp to test string against.
 */
const matches = (value: string, regexp: RegExp): RegExpExecArray[] => {
  let matches: RegExpExecArray[] = [];
  let match: RegExpExecArray | null;
  while ((match = regexp.exec(value)) !== null) matches.push(match);
  return matches;
};
