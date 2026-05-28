import { create } from "zustand";

const AUTH_STORAGE_KEY = "wc_auth_v1";

function safeParseAuth() {
  if (typeof window === "undefined") return { user: null, token: null };
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return { user: null, token: null };
    const parsed = JSON.parse(raw);
    return {
      user: parsed?.user || null,
      token: parsed?.token || null
    };
  } catch {
    return { user: null, token: null };
  }
}

function persistAuth(user, token) {
  if (typeof window === "undefined") return;
  if (!user || !token) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user, token }));
}

const initialAuth = safeParseAuth();

export const usePlannerStore = create((set) => ({
  profile: null,
  plan: null,
  loading: false,
  error: null,
  country: "ES",
  authUser: initialAuth.user,
  authToken: initialAuth.token,
  setProfile: (profile) => set({ profile }),
  setPlan: (plan) => set({ plan }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setCountry: (country) => set({ country }),
  setAuth: ({ user, token }) =>
    set(() => {
      persistAuth(user, token);
      return { authUser: user || null, authToken: token || null };
    }),
  logoutAuth: () =>
    set(() => {
      persistAuth(null, null);
      return { authUser: null, authToken: null };
    })
}));
