type Env = {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  GITHUB_PAT?: string;
};

type AuthUser = { id: string; email?: string };
type WorkflowRun = {
  id: number;
  name?: string;
  status?: string;
  conclusion?: string | null;
  html_url?: string;
  created_at?: string;
  updated_at?: string;
  run_number?: number;
  event?: string;
};

const ADMIN_EMAIL = "drillbobhii@gmail.com";
const PROJECT_URL = "https://cbkrpyfkteomcukdisdw.supabase.co";
const GITHUB_API = "https://api.github.com";
const REPO = "drillbobhii-star/rcc";
const WORKFLOW = "bulk-import.yml";

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" },
  });
}

function baseUrl(env: Env) {
  return (env.SUPABASE_URL || PROJECT_URL).replace(/\\/+$/, "");
}

async function requireAdmin(request: Request, env: Env): Promise<AuthUser | Response> {
  const token = request.headers.get("authorization")?.match(/^Bearer\\s+(.+)$/i)?.[1];
  if (!token) return json({ error: "Inicia sesión para continuar." }, 401);
  if (!env.SUPABASE_ANON_KEY) return json({ error: "Falta SUPABASE_ANON_KEY en Pages." }, 503);
  try {
    const response = await fetch(baseUrl(env) + "/auth/v1/user", {
      headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: "Bearer " + token },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return json({ error: "La sesión no es válida." }, 401);
    const user = await response.json() as AuthUser;
    if (user.email?.trim().toLowerCase() !== ADMIN_EMAIL) return json({ error: "Acceso denegado." }, 403);
    return user;
  } catch {
    return json({ error: "No se pudo verificar la sesión de administrador." }, 503);
  }
}

async function githubRequest(env: Env, path: string, init: RequestInit = {}) {
  if (!env.GITHUB_PAT) throw new Error("Falta GITHUB_PAT en las variables de entorno de Cloudflare Pages.");
  return fetch(GITHUB_API + path, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: "Bearer " + env.GITHUB_PAT,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(15000),
  });
}

async function workflowStatus(env: Env, since: string | null) {
  const response = await githubRequest(
    "/repos/" + REPO + "/actions/workflows/" + WORKFLOW + "/runs?event=workflow_dispatch&per_page=5"
  );
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    console.error("[RCC Script Miner] GitHub status error:", response.status, detail);
    return json({ error: "GitHub no pudo consultar el estado de la importación." }, 502);
  }
  const payload = await response.json() as { workflow_runs?: WorkflowRun[] };
  const runs = Array.isArray(payload.workflow_runs) ? payload.workflow_runs : [];
  const threshold = since ? Date.parse(since) : NaN;
  const run = runs.find(item => {
    const created = Date.parse(item.created_at || "");
    return Number.isFinite(created) && (!Number.isFinite(threshold) || created >= threshold - 5000);
  });
  if (!run) return json({ found: false, status: "pending", message: "GitHub está registrando la ejecución…" });
  return json({
    found: true,
    id: run.id,
    run_number: run.run_number,
    status: run.status || "unknown",
    conclusion: run.conclusion || null,
    html_url: run.html_url || null,
    created_at: run.created_at || null,
    updated_at: run.updated_at || null,
  });
}

export async function onRequest({ request, env }: { request: Request; env: Env }) {
  if (request.method !== "GET" && request.method !== "POST") {
    return new Response(null, { status: 405, headers: { Allow: "GET, POST" } });
  }
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return json({ error: "Origen no permitido." }, 403);
  const auth = await requireAdmin(request, env);
  if (auth instanceof Response) return auth;

  try {
    if (request.method === "GET") {
      const since = new URL(request.url).searchParams.get("since");
      return await workflowStatus(env, since);
    }

    const dispatch = await githubRequest(
      "/repos/" + REPO + "/actions/workflows/" + WORKFLOW + "/dispatches",
      { method: "POST", body: JSON.stringify({ ref: "main" }) }
    );
    if (dispatch.status !== 204) {
      const detail = (await dispatch.text()).slice(0, 500);
      console.error("[RCC Script Miner] GitHub dispatch error:", dispatch.status, detail);
      return json({
        error: dispatch.status === 401 || dispatch.status === 403
          ? "GITHUB_PAT no tiene permisos para ejecutar el workflow."
          : "GitHub rechazó la solicitud de importación.",
      }, 502);
    }
    return json({ ok: true, dispatched: true, requested_at: new Date().toISOString() }, 202);
  } catch (error) {
    console.error("[RCC Script Miner]", error);
    return json({ error: error instanceof Error ? error.message : "No se pudo iniciar la importación." }, 503);
  }
}
