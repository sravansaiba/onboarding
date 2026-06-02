"use client";

import { LayoutDashboard, LogIn, Menu, UserRound, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

interface User {
  username?: string;
  name?: string;
  email?: string;
  role?: string;
  [key: string]: string | undefined;
}

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<{
    username?: string;
    isLoggedIn?: boolean;
    role?: string;
    email?: string;
  } | null>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadUserData = () => {
      try {
        const getFromStorage = (key: string) => sessionStorage.getItem(key) || localStorage.getItem(key);
        const storedUser = getFromStorage("user");
        const storedIsLoggedIn = getFromStorage("isLoggedIn");

        let parsedUser: User | null = null;
        let username = "";
        let role = "";
        let email = "";

        if (storedUser) {
          try {
            parsedUser = JSON.parse(storedUser);
            username = parsedUser?.username || parsedUser?.name || parsedUser?.email?.split("@")[0] || "User";
            role = parsedUser?.role || "customer";
            email = parsedUser?.email || "";
          } catch (error) {
            console.error("Error parsing user data:", error);
          }
        }

        const isLoggedIn = Boolean(parsedUser) || storedIsLoggedIn === "true";
        setUser(isLoggedIn && username ? { username, isLoggedIn: true, role, email } : { isLoggedIn: false });
      } catch (error) {
        console.error("Error loading user data:", error);
        setUser({ isLoggedIn: false });
      }
    };

    loadUserData();
    const timeoutId = window.setTimeout(loadUserData, 200);

    const handleStorageChange = (event: StorageEvent) => {
      if (["user", "isLoggedIn"].includes(event.key || "")) {
        loadUserData();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 80);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMenuOpen]);

  const usernameDisplay = user?.username && user.username.trim() !== "" ? user.username : "User";

  const handleLogout = () => {
    if (!window.confirm("Are you sure you want to logout?")) return;

    ["user", "isLoggedIn", "jwt", "accessToken"].forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });

    setUser({ isLoggedIn: false });
    setShowProfileDropdown(false);
    setIsMenuOpen(false);
    window.location.href = "/";
  };

  return (
    <>
      <header className="fixed left-0 right-0 top-0 z-50 px-4 pt-5 sm:px-6">
        <div
          className={`mx-auto flex max-w-7xl items-center justify-between rounded-2xl px-4 transition-all duration-300 sm:px-6 ${
            isScrolled
              ? "h-16 border border-white/16 bg-black/40 shadow-2xl shadow-zinc-950/20 backdrop-blur-2xl"
              : "h-20 border border-transparent bg-transparent shadow-none"
          }`}
        >
          <Link href="/" className="flex items-center">
            <Image src="/logo/marinate2.png" alt="Marinate360" width={150} height={64} className="h-12 w-auto object-contain" priority />
          </Link>

          <div className="hidden items-center md:flex">
            {user?.isLoggedIn ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowProfileDropdown((value) => !value)}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    isScrolled ? "border border-white/16 bg-white/12 text-white backdrop-blur hover:bg-white/20" : "bg-white text-zinc-900 shadow-md hover:bg-orange-50"
                  }`}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-sm font-semibold text-white">
                    {usernameDisplay.charAt(0).toUpperCase()}
                  </span>
                  <span className="max-w-32 truncate">{usernameDisplay}</span>
                </button>

                {showProfileDropdown ? (
                  <div className="absolute right-0 mt-3 w-56 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl">
                    <div className="border-b border-zinc-100 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Signed in</p>
                      <p className="mt-1 truncate text-sm font-semibold text-zinc-900">{usernameDisplay}</p>
                      <p className="truncate text-xs text-zinc-500">{user.email || user.role || "Partner"}</p>
                    </div>
                    <Link href="/dashboard" onClick={() => setShowProfileDropdown(false)} className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-orange-50 hover:text-orange-700">
                      <LayoutDashboard size={16} />
                      Dashboard
                    </Link>
                    <button onClick={handleLogout} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-zinc-700 hover:bg-rose-50 hover:text-rose-700">
                      <UserRound size={16} />
                      Sign out
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <Link
                href="/login"
                className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                  isScrolled ? "border border-white/20 bg-white/12 text-white backdrop-blur hover:bg-white/20" : "bg-white text-zinc-950 shadow-md hover:bg-orange-50"
                }`}
              >
                <LogIn size={16} />
                Partner Login
              </Link>
            )}
          </div>

          <button
            aria-label="Open menu"
            onClick={() => setIsMenuOpen(true)}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition md:hidden ${
              isScrolled ? "border border-white/16 bg-white/10 text-white backdrop-blur hover:bg-white/18" : "bg-white text-zinc-950 shadow-md"
            }`}
          >
            <Menu size={20} />
          </button>
        </div>
      </header>

      {isMenuOpen ? (
        <div className="fixed inset-0 z-50 bg-zinc-950/70 backdrop-blur-sm md:hidden" onClick={() => setIsMenuOpen(false)}>
          <div className="ml-auto flex h-full w-[86%] max-w-sm flex-col bg-[#111111] text-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <Image src="/logo/marinate2.png" alt="Marinate360" width={142} height={58} className="h-12 w-auto rounded-lg bg-white object-contain px-2" />
              <button onClick={() => setIsMenuOpen(false)} className="rounded-full p-2 text-white/80 hover:bg-white/10" aria-label="Close menu">
                <X size={20} />
              </button>
            </div>

            <nav className="flex-1 space-y-2 px-4 py-5">
              {user?.isLoggedIn ? (
                <>
                  <Link href="/dashboard" onClick={() => setIsMenuOpen(false)} className="block rounded-lg bg-orange-500 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-orange-600">
                    Open dashboard
                  </Link>
                  <button onClick={handleLogout} className="block w-full rounded-lg px-4 py-3 text-left text-sm font-semibold text-rose-200 hover:bg-rose-500/10">
                    Sign out
                  </button>
                </>
              ) : (
                <Link href="/login" onClick={() => setIsMenuOpen(false)} className="block rounded-lg bg-orange-500 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-orange-600">
                  Partner Login
                </Link>
              )}
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
}
