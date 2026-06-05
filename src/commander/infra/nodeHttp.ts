import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { CommanderHttpResponse } from "../types";

async function readBody(request: IncomingMessage): Promise<Uint8Array> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function toFetchRequest(
  request: IncomingMessage,
  baseUrl: string,
): Promise<Request> {
  const bodyBytes = request.method === "GET" || request.method === "HEAD"
    ? undefined
    : await readBody(request);
  const body = bodyBytes ? new Uint8Array(bodyBytes) : undefined;

  return new Request(new URL(request.url ?? "/", baseUrl), {
    method: request.method,
    headers: request.headers as HeadersInit,
    body,
  } as RequestInit);
}

function writeResponse(
  response: ServerResponse,
  result: CommanderHttpResponse,
): void {
  response.statusCode = result.status;
  for (const [key, value] of Object.entries(result.headers ?? {})) {
    response.setHeader(key, value);
  }
  response.end(result.body ?? "");
}

export function createNodeServer(
  baseUrl: string,
  handler: (request: Request) => Promise<CommanderHttpResponse>,
) {
  return createServer(async (request: IncomingMessage, response: ServerResponse) => {
    try {
      const fetchRequest = await toFetchRequest(request, baseUrl);
      const result = await handler(fetchRequest);
      writeResponse(response, result);
    } catch (error) {
      response.statusCode = 500;
      response.setHeader("content-type", "application/json; charset=utf-8");
      response.end(JSON.stringify({
        code: "server_error",
        message: error instanceof Error ? error.message : "Unknown server error",
      }));
    }
  });
}
