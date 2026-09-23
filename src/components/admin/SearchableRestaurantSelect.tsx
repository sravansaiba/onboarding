"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Search, ChevronDown, Check, Store, X, Building2, MapPin } from "lucide-react";
import type { RestaurantRecord } from "@/src/app/actions/restaurants";

interface SearchableRestaurantSelectProps {
  restaurants: RestaurantRecord[];
  value: string;
  onChange: (restaurantId: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function SearchableRestaurantSelect({
  restaurants,
  value,
  onChange,
  placeholder = "Search and select a restaurant...",
  disabled = false,
}: SearchableRestaurantSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 60);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Selected restaurant object
  const selectedRestaurant = useMemo(() => {
    if (!value) return null;
    return restaurants.find((r) => r.id === value) || null;
  }, [restaurants, value]);

  // Filtered restaurants based on search
  const filteredRestaurants = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return restaurants;
    return restaurants.filter((r) => {
      const name = (r.restaurant_name || "").toLowerCase();
      const domain = (r.domain_name || "").toLowerCase();
      const posDomain = (r.pos_domain || "").toLowerCase();
      const addr = typeof r.address === "string" ? r.address.toLowerCase() : "";
      return name.includes(q) || domain.includes(q) || posDomain.includes(q) || addr.includes(q);
    });
  }, [restaurants, searchQuery]);

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Main Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            setSearchQuery("");
          }
        }}
        className={`flex w-full min-h-[50px] items-center justify-between gap-3 rounded-xl border bg-white px-4 py-2.5 text-left text-sm transition-all focus:outline-none ${
          isOpen
            ? "border-orange-500 ring-2 ring-orange-100 shadow-md"
            : "border-zinc-200 hover:border-zinc-300 shadow-xs hover:bg-zinc-50/50"
        } ${disabled ? "cursor-not-allowed opacity-60 bg-zinc-50" : "cursor-pointer"}`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors ${
              selectedRestaurant
                ? "bg-orange-50 text-orange-600 border-orange-200/70"
                : "bg-zinc-100 text-zinc-400 border-zinc-200/50"
            }`}
          >
            {selectedRestaurant ? <Store size={18} /> : <Building2 size={18} />}
          </div>
          <div className="min-w-0 flex-1">
            {selectedRestaurant ? (
              <div className="flex items-center gap-2">
                <span className="truncate font-bold text-zinc-900 text-sm">
                  {selectedRestaurant.restaurant_name}
                </span>
                {selectedRestaurant.domain_name && (
                  <span className="shrink-0 rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 border border-zinc-200/60">
                    {selectedRestaurant.domain_name}
                  </span>
                )}
                {selectedRestaurant.is_active === false && (
                  <span className="shrink-0 rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-600 border border-rose-200/50">
                    Inactive
                  </span>
                )}
              </div>
            ) : (
              <span className="text-zinc-400 font-normal">{placeholder}</span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {selectedRestaurant && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-200/60 hover:text-zinc-700 transition-colors"
              title="Clear selection"
            >
              <X size={15} />
            </span>
          )}
          <div className="h-4 w-px bg-zinc-200" />
          <ChevronDown
            size={18}
            className={`text-zinc-400 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-orange-500" : ""
            }`}
          />
        </div>
      </button>

      {/* Popover Dropdown (Comfortable width with high z-index and rich styling) */}
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-2 w-full min-w-[340px] rounded-2xl border border-zinc-200/90 bg-white p-3 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
          {/* Search Box Header */}
          <div className="relative mb-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by restaurant name, domain, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-9 text-sm font-medium outline-none transition placeholder:text-zinc-400 focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-100"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Counts info header */}
          <div className="flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold text-zinc-400 border-b border-zinc-100 mb-1">
            <span className="uppercase tracking-wider text-[10px]">
              Available Outlets ({filteredRestaurants.length})
            </span>
            <span className="text-[11px] font-normal text-zinc-400">Scroll for more</span>
          </div>

          {/* Scrollable list (sized for 4-5 spacious, clean items) */}
          <div className="max-h-52 overflow-y-auto space-y-1 overscroll-contain pr-1.5 [scrollbar-width:thin] [scrollbar-color:#d4d4d8_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-zinc-400">
            {/* Option: Unassigned */}
            <button
              type="button"
              onClick={() => {
                onChange("");
                setIsOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs transition-colors ${
                !value
                  ? "bg-orange-50 text-orange-950 font-bold border border-orange-200/80"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 text-zinc-400">
                  <X size={14} />
                </div>
                <div>
                  <p className="font-semibold text-sm">No restaurant (Unassigned)</p>
                  <p className="text-[11px] text-zinc-400 font-normal">Account won't be linked to any outlet</p>
                </div>
              </div>
              {!value && <Check size={16} className="text-orange-600 shrink-0" />}
            </button>

            {/* Filtered restaurant list */}
            {filteredRestaurants.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-zinc-400">
                <Store size={26} className="mx-auto mb-2 text-zinc-300" />
                <p className="font-medium text-zinc-600 text-sm">No restaurants found</p>
                <p className="text-zinc-400 mt-0.5">No match for "{searchQuery}"</p>
              </div>
            ) : (
              filteredRestaurants.map((restaurant) => {
                const isSelected = restaurant.id === value;
                return (
                  <button
                    key={restaurant.id}
                    type="button"
                    onClick={() => {
                      onChange(restaurant.id);
                      setIsOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl p-3 text-left transition-all ${
                      isSelected
                        ? "bg-orange-50 text-orange-950 border border-orange-200/90 shadow-xs"
                        : "hover:bg-zinc-50 border border-transparent text-zinc-800"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                          isSelected
                            ? "bg-orange-500 text-white shadow-xs"
                            : "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        <Store size={17} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-zinc-900 leading-tight">
                          {restaurant.restaurant_name}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs text-zinc-400">
                          {restaurant.domain_name && (
                            <span className="font-medium text-zinc-500">
                              {restaurant.domain_name}
                            </span>
                          )}
                          {restaurant.address && typeof restaurant.address === "string" && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[200px] text-zinc-400 flex items-center gap-1">
                                <MapPin size={11} className="shrink-0" />
                                {restaurant.address}
                              </span>
                            </>
                          )}
                          {restaurant.is_active === false && (
                            <span className="rounded bg-rose-50 px-1.5 py-0.2 text-[10px] font-bold text-rose-600">
                              Inactive
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {isSelected && <Check size={18} className="text-orange-600 shrink-0 ml-2" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
