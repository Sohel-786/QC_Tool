"use client";

import * as React from "react";
import { useRef, useEffect, useState } from "react";
import { Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "./input";
import { Label } from "./label";

export interface MultiSelectSearchOption {
  value: number | string;
  label: string;
}

export interface MultiSelectSearchProps {
  options: MultiSelectSearchOption[];
  value: (number | string)[];
  onChange: (value: (number | string)[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  id?: string;
  label?: string;
  className?: string;
  "aria-label"?: string;
}

export function MultiSelectSearch({
  options,
  value,
  onChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  disabled = false,
  id,
  label,
  className,
  "aria-label": ariaLabel,
}: MultiSelectSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = React.useMemo(() => {
    if (!searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(term));
  }, [options, searchTerm]);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm("");
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const toggle = (v: number | string) => {
    const set = new Set(value);
    if (set.has(v)) set.delete(v);
    else set.add(v);
    onChange(Array.from(set));
  };

  const displayText =
    value.length === 0
      ? placeholder
      : value.length === 1
        ? options.find((o) => o.value === value[0])?.label ?? placeholder
        : `${value.length} selected`;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {label && (
        <Label htmlFor={id} className="block mb-1.5 text-sm font-medium text-secondary-700">
          {label}
        </Label>
      )}
      <button
        type="button"
        id={id}
        aria-label={ariaLabel ?? label ?? placeholder}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((o) => !o)}
        className={cn(
          "flex h-10 w-full min-h-10 items-center justify-between rounded-lg border border-secondary-300 bg-white px-3 py-2 text-left text-sm ring-offset-white",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        <span className={value.length ? "text-text truncate" : "text-secondary-500"}>
          {displayText}
        </span>
        <svg
          className={cn("h-4 w-4 shrink-0 text-secondary-500 transition-transform", isOpen && "rotate-180")}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 z-50 mt-1 w-full min-w-[200px] max-w-[min(100vw-2rem,320px)] rounded-lg border border-secondary-200 bg-white shadow-lg">
          <div className="border-b border-secondary-200 p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-400" />
              <Input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-9 pl-8 border-secondary-200 text-sm"
              />
            </div>
          </div>
          <ul className="max-h-60 overflow-auto py-1" role="listbox">
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-2 text-sm text-secondary-500">No matches</li>
            ) : (
              filteredOptions.map((opt) => {
                const selected = value.includes(opt.value);
                return (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={selected}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-text hover:bg-secondary-50",
                      selected && "bg-primary-50 text-primary-800",
                    )}
                    onClick={() => toggle(opt.value)}
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                        selected
                          ? "border-primary-500 bg-primary-500 text-white"
                          : "border-secondary-300 bg-white",
                      )}
                    >
                      {selected ? <Check className="h-3 w-3" /> : null}
                    </span>
                    <span className="truncate">{opt.label}</span>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
