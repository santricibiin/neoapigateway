import { bandelUpstreamBase } from "@/lib/bandel-upstream";

export const dynamic = "force-dynamic";

const requestHeaders = new Set([
  "accept",
  "authorization",
  "content-type",
  "x-api-key",
  "anthropic-version",
  "anthropic-beta",
  "openai-organization",
  "openai-project",
  "idempotency-key",
]);

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, x-api-key, anthropic-version, anthropic-beta, Accept",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  };
}

async function proxy(request: Request, path: string[]) {
  const source = new URL(request.url);
  const target = `${bandelUpstreamBase()}/v1/${path.map(encodeURIComponent).join("/")}${source.search}`;
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (requestHeaders.has(key.toLowerCase())) headers.set(key, value);
  });
  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
    cache: "no-store",
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
    (init as RequestInit & { duplex: string }).duplex = "half";
  }
  try {
    const upstream = await fetch(target, init);
    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.delete("set-cookie");
    Object.entries(corsHeaders()).forEach(([key, value]) => responseHeaders.set(key, value));
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    return Response.json(
      { error: { message: error instanceof Error ? error.message : "Upstream error", type: "proxy_error" } },
      { status: 502, headers: corsHeaders() }
    );
  }
}

type Context = { params: { path: string[] } };

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function GET(request: Request, context: Context) {
  return proxy(request, context.params.path || []);
}

export async function POST(request: Request, context: Context) {
  return proxy(request, context.params.path || []);
}

export async function PUT(request: Request, context: Context) {
  return proxy(request, context.params.path || []);
}

export async function PATCH(request: Request, context: Context) {
  return proxy(request, context.params.path || []);
}

export async function DELETE(request: Request, context: Context) {
  return proxy(request, context.params.path || []);
}

export async function HEAD(request: Request, context: Context) {
  return proxy(request, context.params.path || []);
}
