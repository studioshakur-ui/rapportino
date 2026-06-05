import type { CommanderHttpResponse, InternalApiErrorShape } from "../types";

export class CommanderHttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function jsonResponse(
  status: number,
  body: unknown,
): CommanderHttpResponse {
  return {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  };
}

export function textResponse(
  status: number,
  body: string,
): CommanderHttpResponse {
  return {
    status,
    headers: { "content-type": "text/plain; charset=utf-8" },
    body,
  };
}

export function errorResponse(error: unknown): CommanderHttpResponse {
  if (error instanceof CommanderHttpError) {
    const payload: InternalApiErrorShape = {
      code: error.code,
      message: error.message,
      details: (error.details as InternalApiErrorShape["details"]) ?? undefined,
    };
    return jsonResponse(error.status, payload);
  }

  return jsonResponse(500, {
    code: "internal_error",
    message: "Unexpected Commander error",
  });
}
