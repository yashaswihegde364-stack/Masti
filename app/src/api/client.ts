import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

// Point this at the deployed server; defaults to localhost for the Expo
// Go app on a simulator. Physical devices need your machine's LAN IP.
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8080";

const TOKEN_KEY = "masti_auth_token";

// expo-secure-store has no web implementation (its native module is an
// empty stub there), so it throws on any call under `expo start --web`.
// localStorage isn't as safe as the OS keychain, but this only runs in
// the web target, which is a dev/preview surface, not the shipped app.
export async function getToken(): Promise<string | null> {
  if (Platform.OS === "web") return window.localStorage.getItem(TOKEN_KEY);
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    window.localStorage.setItem(TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${path}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export interface ChatResponse {
  conversationId: string;
  scripture: string;
  reflection: string;
  verses: { id: number; reference: string; text: string }[];
  flagged: string[];
}

export const api = {
  devLogin: (email: string) =>
    request<{ token: string; userId: string }>("/auth/dev-login", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  sendMessage: (message: string, conversationId?: string) =>
    request<ChatResponse>("/chat", {
      method: "POST",
      body: JSON.stringify({ message, conversationId }),
    }),

  dailyVerse: () => request<{ id: number; reference: string; text: string }>("/verse/daily"),

  searchVerses: (q: string) =>
    request<{ id: number; reference: string; text: string }[]>(
      `/verse/search?q=${encodeURIComponent(q)}`
    ),

  listJournal: () =>
    request<{ id: string; prompt: string | null; content: string; created_at: string }[]>(
      "/journal"
    ),

  addJournalEntry: (content: string, prompt?: string) =>
    request<{ id: string }>("/journal", {
      method: "POST",
      body: JSON.stringify({ content, prompt }),
    }),

  subscriptionStatus: () =>
    request<{ status: string; plan: string | null }>("/subscription"),
};
