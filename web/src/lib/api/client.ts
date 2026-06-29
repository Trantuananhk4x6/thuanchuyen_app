const BASE = "/api/v1";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

function setTokens(access: string, refresh: string) {
  localStorage.setItem("access_token", access);
  localStorage.setItem("refresh_token", refresh);
}

function clearTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = localStorage.getItem("refresh_token");
  if (!refresh) return null;

  const res = await fetch(`${BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: refresh }),
  });

  if (!res.ok) { clearTokens(); return null; }

  const { data } = await res.json();
  setTokens(data.accessToken, data.refreshToken);
  return data.accessToken;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<{ data: T } & { success: true }> {
  let token = getToken();

  const doFetch = async (t: string | null) =>
    fetch(`${BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
        ...(options.headers ?? {}),
      },
    });

  let res = await doFetch(token);

  if (res.status === 401 && token) {
    token = await refreshAccessToken();
    if (token) res = await doFetch(token);
  }

  let json: Record<string, unknown>;
  try {
    json = await res.json();
  } catch {
    throw new Error(`Lỗi server (${res.status}). Vui lòng thử lại.`);
  }
  if (!json.success) throw new Error((json.error as { message?: string })?.message ?? "Lỗi API");
  return json as { data: T; success: true };
}

export const api = {
  get: <T = unknown>(path: string) => apiFetch<T>(path, { method: "GET" }),
  post: <T = unknown>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T = unknown>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  put: <T = unknown>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  del: <T = unknown>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
  setTokens,
  clearTokens,
};
