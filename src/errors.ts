export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

interface ErrorResponse {
  error: string;
  message?: string;
  messages?: { [name: string]: string[] };
}

export class APIError extends Error {
  constructor(response: ErrorResponse) {
    let message = "unknown API error";

    if (response.message) {
      message = response.message;
    } else if (response.messages) {
      let messages: string[] = [];
      for (const name in response.messages) {
        messages.push(`${name} ${response.messages[name]}`);
      }
      message = messages.join(", ");
    }

    super(message);
    Object.setPrototypeOf(this, APIError.prototype);
  }
}

export class ExportError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, ExportError.prototype);
  }
}

export class ReasonRequiredError extends Error {
  constructor() {
    super("Reason required");
    Object.setPrototypeOf(this, ReasonRequiredError.prototype);
  }
}
