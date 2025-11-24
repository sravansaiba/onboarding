

// 3333333333333333333333333333333




'use client';

import { UserRound } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';



interface User {
  username?: string;
  name?: string;
  email?: string;
  role?: string; // Add role property
  [key: string]: string | undefined; // Allow other properties
}

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<{
    username?: string;
    isLoggedIn?: boolean;
    role?: string; // Add role property
  } | null>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ✅ Load user data (from sessionStorage first, fallback to localStorage)
  useEffect(() => {
    const loadUserData = () => {
      try {
        const getFromStorage = (key: string) =>
          sessionStorage.getItem(key) || localStorage.getItem(key);

        const storedUser = getFromStorage('user');
        const storedIsLoggedIn = getFromStorage('isLoggedIn');

        let parsedUser: User | null =null;
        let username: string ="";
        let role: string= "";

        if (storedUser) {
          try {
            parsedUser = JSON.parse(storedUser);
            // username =
            //   parsedUser.username ||
            //   parsedUser.name ||
            //   parsedUser.email?.split('@')[0] ||
            //   'User';
            username = parsedUser?.username || parsedUser?.name || parsedUser?.email?.split('@')[0] || 'User';
            role = parsedUser?.role || 'customer';
          } catch (e) {
            console.error('Error parsing user data:', e);
          }
        }

        const isLoggedIn = !!parsedUser || storedIsLoggedIn === 'true';

        if (isLoggedIn && username) {
          setUser({
            username,
            isLoggedIn: true,
            role:"" // Include role in the user state
          });
        } else {
          setUser({ isLoggedIn: false });
        }
      } catch (err) {
        console.error('Error loading user data:', err);
        setUser({ isLoggedIn: false });
      }
    };

    loadUserData();

    // Re-check after small delay (for async login updates)
    const timeoutId = setTimeout(loadUserData, 200);

    // Watch for storage updates
    const handleStorageChange = (e: StorageEvent) => {
      if (['user', 'isLoggedIn'].includes(e.key || '')) {
        loadUserData();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // ✅ Scroll listener
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ✅ Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    ['user', 'isLoggedIn', 'jwt'].forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });

    setUser({ isLoggedIn: false });
    setShowProfileDropdown(false);
    window.location.href = '/';
  };

  const handleRegisterClick = () => {
    window.location.href = user?.isLoggedIn ? '/register' : '/login';
  };

  const usernameDisplay =
    user?.username && user.username.trim() !== '' ? user.username : 'User';

  // Function to determine the dashboard link based on role
  const getDashboardLink = () => {
    if (user?.role === 'admin') {
      return '/dashboard';
    } else {
      return '/dashboard';
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isScrolled ? 'bg-white shadow-md' : 'bg-transparent'
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`flex justify-between items-center transition-all duration-500 ${isScrolled ? 'h-16' : 'h-20'
            }`}
        >
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="shrink-0">
              <Image
                className="hover:scale-105 transition-transform"
                src="/logo/marinate2.png"
                alt="Marinate360 Logo"
                width={150}
                height={150}
              />
            </Link>
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-4">
            {user?.isLoggedIn ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className={`flex items-center space-x-2 rounded-full px-3 py-1 transition duration-200 ${isScrolled
                    ? 'bg-gray-100 hover:bg-gray-200'
                    : 'bg-white/20 hover:bg-white/30 backdrop-blur-md'
                    }`}
                >
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-sm">
                    {usernameDisplay.charAt(0).toUpperCase()}
                  </div>
                  <span
                    className={`text-sm font-medium ${isScrolled ? 'text-gray-700' : 'text-gray-800'
                      }`}
                  >
                    Welcome,{usernameDisplay}!
                  </span>
                </button>

                {showProfileDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-xs text-gray-500">Logged in as</p>
                      <p className="text-sm font-medium text-gray-700">
                        {usernameDisplay}
                      </p>
                      <p className="text-xs text-gray-500">Role: {user?.role || 'customer'}</p>
                    </div>
                    {user?.isLoggedIn && (
                      <Link
                        href={getDashboardLink()} // Use the dynamic dashboard link
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setShowProfileDropdown(false)}
                      >
                        Dashboard
                      </Link>
                    )}
                    <Link
                      href="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setShowProfileDropdown(false)}
                    >
                      My Profile
                    </Link>
                    <Link
                      href="/businesses"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setShowProfileDropdown(false)}
                    >
                      My Businesses
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition duration-300 ${isScrolled
                  ? 'bg-blue-500 hover:bg-blue-600 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white backdrop-blur-sm border border-white/30'
                  }`}
              >
                Partner Login
              </Link>
            )}

            {/* Mobile Menu Toggle */}
            <button
            aria-label='toggle open'
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`md:hidden ml-2 transition duration-300 ${isScrolled
                ? 'text-gray-700 hover:text-blue-500'
                : 'text-gray-700 hover:text-blue-200'
                }`}
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ✅ Mobile Nav */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link
              href="/"
              className="text-gray-700 hover:text-orange-500 block px-3 py-2 rounded-md text-base font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              href="/about"
              className="text-gray-700 hover:text-orange-500 block px-3 py-2 rounded-md text-base font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              About
            </Link>
            <Link
              href="/contact"
              className="text-gray-700 hover:text-orange-500 block px-3 py-2 rounded-md text-base font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              Contact
            </Link>
            {user?.isLoggedIn ? (
              <>
                <button
                  onClick={handleRegisterClick}
                  className="w-full text-left bg-orange-500 text-white block px-3 py-2 rounded-md text-base font-medium"
                >
                  Register Your Business
                </button>
                <div className="border-t border-gray-200 pt-2">
                  <div className="px-3 py-2 text-sm text-gray-500">
                    Logged in as:{' '}
                    <span className="font-medium text-gray-700">
                      {usernameDisplay}
                    </span>
                  </div>
                  <Link
                    href={getDashboardLink()} // Use the dynamic dashboard link in mobile menu as well
                    className="block px-3 py-2 text-gray-700 hover:text-orange-500 rounded-md text-base font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/profile"
                    className="block px-3 py-2 text-gray-700 hover:text-orange-500 rounded-md text-base font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    My Profile
                  </Link>
                  <Link
                    href="/businesses"
                    className="block px-3 py-2 text-gray-700 hover:text-orange-500 rounded-md text-base font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    My Businesses
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left block px-3 py-2 text-gray-700 hover:text-orange-500 rounded-md text-base font-medium"
                  >
                    Sign out
                  </button>
                </div>
              </>
            ) : (
              <Link
                href="/login"
                className="bg-orange-500 text-white block px-3 py-2 rounded-md text-base font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Partner Login
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
