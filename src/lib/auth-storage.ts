/**
 * Auth Cookie and Storage Management Utility
 * Manages access_token, user profile, and session state via browser cookies.
 */

export function setCookie(name: string, value: string, days: number = 7) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  const isSecure = typeof window !== "undefined" && window.location.protocol === "https:";
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax${
    isSecure ? "; Secure" : ""
  }`;
}

export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const cookies = document.cookie ? document.cookie.split("; ") : [];
  for (const cookie of cookies) {
    const parts = cookie.split("=");
    const key = decodeURIComponent(parts[0]);
    if (key === name) {
      return decodeURIComponent(parts.slice(1).join("="));
    }
  }
  return null;
}

export function deleteCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

export function saveAuthSession(
  accessToken: string,
  user: Record<string, unknown> | null,
  rememberMe: boolean = true
) {
  const days = rememberMe ? 30 : 1;
  setCookie("accessToken", accessToken, days);
  setCookie("isLoggedIn", "true", days);
  if (user) {
    setCookie("user", JSON.stringify(user), days);
  }

  // Also clean up any old localStorage/sessionStorage
  try {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("jwt");
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("isLoggedIn");
    sessionStorage.removeItem("jwt");
  } catch {
    // Ignore storage errors
  }
}

export function getAuthSession(): {
  accessToken: string | null;
  user: any | null;
  isLoggedIn: boolean;
} {
  // Read from cookies first
  let accessToken = getCookie("accessToken");
  let userJson = getCookie("user");

  // Fallback check to localStorage in case of transition
  if (!accessToken && typeof window !== "undefined") {
    try {
      accessToken = localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");
      userJson = userJson || localStorage.getItem("user") || sessionStorage.getItem("user");
      if (accessToken) {
        saveAuthSession(accessToken, userJson ? JSON.parse(userJson) : null, true);
      }
    } catch {}
  }

  let user = null;
  if (userJson) {
    try {
      user = typeof userJson === "string" ? JSON.parse(userJson) : userJson;
    } catch {
      user = null;
    }
  }

  const hasValidToken = Boolean(accessToken && accessToken.trim() !== "");

  return {
    accessToken: hasValidToken ? accessToken : null,
    user: hasValidToken ? user : null,
    isLoggedIn: hasValidToken,
  };
}

export function clearAuthSession() {
  deleteCookie("accessToken");
  deleteCookie("user");
  deleteCookie("isLoggedIn");
  deleteCookie("jwt");
  try {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("jwt");
    if (typeof window !== "undefined") {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
          localStorage.removeItem(key);
        }
      });
    }
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("isLoggedIn");
    sessionStorage.removeItem("jwt");
    if (typeof window !== "undefined") {
      Object.keys(sessionStorage).forEach((key) => {
        if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
          sessionStorage.removeItem(key);
        }
      });
    }
  } catch {}
}
