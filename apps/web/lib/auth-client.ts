"use client";

const DEV_USER_STORAGE_KEY = "healthhub-dev-user-id";
const DEV_USER_COOKIE = "healthhub-dev-user";

export const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
export const devAuthEnabled =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH !== "false";

type ClerkWindow = Window & {
  Clerk?: {
    loaded?: boolean;
    session?: {
      getToken: () => Promise<string | null>;
    } | null;
  };
};

export function readDevUserId() {
  if (typeof window === "undefined" || !devAuthEnabled) {
    return "";
  }

  return window.localStorage.getItem(DEV_USER_STORAGE_KEY) ?? "";
}

export function setDevUserId(userId: string) {
  if (typeof window === "undefined" || !devAuthEnabled) {
    return;
  }

  window.localStorage.setItem(DEV_USER_STORAGE_KEY, userId);
  document.cookie = `${DEV_USER_COOKIE}=${encodeURIComponent(userId)}; path=/; SameSite=Lax`;
}

export function clearDevUserId() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(DEV_USER_STORAGE_KEY);
  document.cookie = `${DEV_USER_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax`;
}

async function getClerkToken() {
  if (!clerkEnabled || typeof window === "undefined") {
    return "";
  }

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const clerk = (window as ClerkWindow).Clerk;

    if (clerk?.loaded) {
      return (await clerk.session?.getToken()) ?? "";
    }

    await new Promise((resolve) => window.setTimeout(resolve, 50));
  }

  return "";
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const devUserId = readDevUserId();

  if (devUserId) {
    return { "X-HealthHub-Dev-User": devUserId };
  }

  const token = await getClerkToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
