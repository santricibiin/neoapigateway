import { upstreamBaseFor, publicBrandName } from "@/lib/bandel-upstream";
import {
  filterModelListPayload,
  modelFromRequestBody,
  modelGateConfig,
  resolveModelTarget,
  routerModelAllowed,
  type ModelGateConfig,
} from "@/lib/model-gate";
import { fetchRouterModels, routerBase, routerKey } from "@/lib/router-upstream";
import { checkUpstreamKey } from "@/lib/v1-key-auth";

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

/** Header yang menggambarkan encoding body upstream; body sudah didekode fetch, jadi jangan diteruskan. */
const stripResponseHeaders = ["set-cookie", "content-encoding", "content-length", "transfer-encoding"];

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, x-api-key, anthropic-version, anthropic-beta, Accept",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  };
}

function notFound(id: string) {
  return Response.json(
    {
      error: {
        message: `The model \`${id}\` does not exist or you do not have access to it.`,
        type: "invalid_request_error",
        code: "model_not_found",
        param: "model",
      },
    },
    { status: 404, headers: corsHeaders() }
  );
}

function isJson(request: Request) {
  return (request.headers.get("content-type") || "").toLowerCase().includes("json");
}

function passthroughHeaders(upstream: Response) {
  const headers = new Headers(upstream.headers);
  stripResponseHeaders.forEach((key) => headers.delete(key));
  Object.entries(corsHeaders()).forEach(([key, value]) => headers.set(key, value));
  return headers;
}

/** GET /v1/models: gabungan bandel (tanpa yang dimatikan) + model router yang diizinkan. */
async function modelList(upstream: Response, config: ModelGateConfig) {
  const headers = passthroughHeaders(upstream);
  headers.set("content-type", "application/json");
  let payload: unknown;
  try {
    payload = await upstream.json();
  } catch {
    // Upstream bandel membalas non-JSON: teruskan status apa adanya.
    return new Response(null, { status: upstream.status, statusText: upstream.statusText, headers });
  }
  const merged = filterModelListPayload(payload, config.disabled) as { data?: unknown[] } | null;

  if (config.routerEnabled && config.routerProviders.size && merged && Array.isArray(merged.data)) {
    try {
      const extra = (await fetchRouterModels()).filter((model) => routerModelAllowed(model.id, config));
      merged.data = [...merged.data, ...extra];
    } catch (error) {
      // Router mati: sajikan model bandel saja, jangan gagalkan seluruh list.
      console.error("[v1/models] router tidak terjangkau:", error instanceof Error ? error.message : error);
    }
  }

  // Timpa owned_by upstream (mis. "bandelbanget-proxy") dengan nama brand sendiri
  // supaya identitas provider di belakang proxy tidak bocor ke client.
  if (merged && Array.isArray(merged.data)) {
    const brand = publicBrandName();
    for (const model of merged.data) {
      const row = model as { owned_by?: unknown } | null;
      if (row && typeof row.owned_by === "string") row.owned_by = brand;
    }
  }
  return Response.json(merged, { status: upstream.status, headers });
}

async function proxy(request: Request, path: string[]) {
  const config = await modelGateConfig();
  const isModelList = path.length === 1 && path[0] === "models" && request.method === "GET";

  // GET /v1/models/{id}; ID router mengandung "/" jadi sisa segmen digabung kembali.
  if (path.length > 1 && path[0] === "models") {
    const id = path.slice(1).join("/");
    if (resolveModelTarget(id, config).kind === "blocked") return notFound(id);
  }

  let body: BodyInit | undefined;
  let toRouter = false;
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  if (hasBody && isJson(request)) {
    // ponytail: body JSON dibuffer supaya field `model` bisa divalidasi dan diarahkan. Request inference
    // wajarnya < beberapa MB; kalau nanti perlu upload besar, kecualikan path-nya dari buffering.
    const raw = await request.text();
    const model = modelFromRequestBody(raw);
    const target = resolveModelTarget(model, config);
    if (target.kind === "blocked" && model) return notFound(model);
    toRouter = target.kind === "router";
    body = raw;
  }

  const source = new URL(request.url);
  const suffix = `${path.map(encodeURIComponent).join("/")}${source.search}`;
  const target = toRouter ? `${routerBase()}/v1/${suffix}` : `${upstreamBaseFor(request)}/v1/${suffix}`;

  // F-01: gerbang key member. Lewati untuk request router 9router (auth-nya
  // diganti key milik kita sendiri). Jalur bandel & VIP divalidasi karena semua
  // key member diterbitkan dari akun reseller yang sama. Gate fail-open saat
  // daftar key tidak tersedia — lihat src/lib/v1-key-auth.ts.
  if (!toRouter && !(await checkUpstreamKey(request))) {
    return Response.json(
      {
        error: {
          message: "Invalid API key provided.",
          type: "invalid_request_error",
          code: "invalid_api_key",
        },
      },
      { status: 401, headers: corsHeaders() }
    );
  }

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (requestHeaders.has(key.toLowerCase())) headers.set(key, value);
  });
  if (toRouter) {
    // Key customer tidak dikenal 9router; pakai key milik kita.
    headers.set("authorization", `Bearer ${routerKey()}`);
    headers.delete("x-api-key");
  }

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
    cache: "no-store",
  };
  if (hasBody) {
    if (body !== undefined) {
      init.body = body;
    } else {
      init.body = request.body;
      (init as RequestInit & { duplex: string }).duplex = "half";
    }
  }

  try {
    const upstream = await fetch(target, init);
    if (isModelList) return modelList(upstream, config);
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: passthroughHeaders(upstream),
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
