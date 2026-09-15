import axios from "axios";
import { clearTokens, getAccess, getRefresh, setTokens } from "./auth";

// Gunakan proxy Vite (/api) saat development.
export const api = axios.create({
  baseURL: "/api/",
  headers: { "Content-Type": "application/json" },
});

// Lampirkan access token ke setiap request.
api.interceptors.request.use((config) => {
  const token = getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing: Promise<string> | null = null;

// Saat token kedaluwarsa (401), coba refresh sekali lalu ulangi request.
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config as
      | (typeof error.config & { _retry?: boolean })
      | undefined;
    const url: string = original?.url ?? "";
    const isAuthRequest = url.includes("/auth/");

    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !isAuthRequest
    ) {
      original._retry = true;
      const refresh = getRefresh();
      if (refresh) {
        try {
          refreshing =
            refreshing ??
            axios
              .post("/api/auth/token/refresh/", { refresh })
              .then((r) => r.data.access as string)
              .finally(() => {
                refreshing = null;
              });
          const access = await refreshing;
          setTokens(access, refresh);
          original.headers.Authorization = `Bearer ${access}`;
          return api(original);
        } catch {
          clearTokens();
          window.location.href = "/login";
        }
      } else {
        clearTokens();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

/** Helper: ambil semua halaman dari endpoint yang ter-paginasi. */
export async function fetchAll<T>(path: string, params: Record<string, unknown> = {}): Promise<T[]> {
  const results: T[] = [];
  let url: string | null = path;
  while (url) {
    const res: { data: { results: T[]; next: string | null } } = await api.get(
      url,
      { params: url === path ? params : undefined }
    );
    results.push(...res.data.results);
    url = res.data.next
      ? new URL(res.data.next).pathname + new URL(res.data.next).search
      : null;
  }
  return results;
}

export function fmtIDR(value: number | string): string {
  const num = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num || 0);
}

export function fmtDate(value: string | null | undefined): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Unduh laporan (blob) dari endpoint dengan Authorization header. */
export async function downloadReport(
  path: string,
  params: Record<string, unknown>,
  filename: string
): Promise<void> {
  const res = await api.get(path, { params, responseType: "blob" });
  const blobUrl = URL.createObjectURL(res.data as Blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(blobUrl);
}
