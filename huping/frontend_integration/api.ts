// src/lib/api.ts (drop-in for your project)
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export async function api<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
}

// Auth
export const Auth = {
  signup: (body: { name: string; email: string; password: string }) =>
    api<{ message: string; user: any }>("/api/signup", { method: "POST", body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) =>
    api<{ message: string; user: any }>("/api/login", { method: "POST", body: JSON.stringify(body) }),
};

// Dashboard snapshot
export const Dashboard = {
  get: () => api("/api/dashboard"),
};

// Transactions
export const Tx = {
  list: () => api<any[]>("/api/transactions"),
  add: (t: any) => api("/api/transactions", { method: "POST", body: JSON.stringify(t) }),
  del: (id: number) => api(`/api/transactions/${id}`, { method: "DELETE" }),
};

// Bills
export const Bills = {
  list: () => api<any[]>("/api/bills"),
  add: (b: any) => api("/api/bills", { method: "POST", body: JSON.stringify(b) }),
  update: (id: number, b: any) => api(`/api/bills/${id}`, { method: "PUT", body: JSON.stringify(b) }),
  del: (id: number) => api(`/api/bills/${id}`, { method: "DELETE" }),
};

// Goals & Achievements
export const Goals = {
  get: () => api("/api/goals"),
  set: (goal_days: number) => api("/api/goals", { method: "PUT", body: JSON.stringify({ goal_days }) }),
};
export const Ach = { list: () => api<any[]>("/api/achievements") };
