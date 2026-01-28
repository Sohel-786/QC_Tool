"use client";

import * as React from "react";
import { useRef, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "./input";
import { Label } from "./label";

export interface SearchableSelectOption {
  value: number | string;
  label: string;
}

export interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: number | string | "";
  onChange: (value: number | string) => void;
  placeholder?: string;
  disabled?: boolean;
  searchPlaceholder?: string;
  id?: string;
  label?: string;
  error?: string;
  className?: string;
  "aria-label"?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  disabled = false,
  searchPlaceholder = "Search...",
  id,
  label,
  error,
  className,
  "aria-label": ariaLabel,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filteredOptions = React.useMemo(() => {
    if (!searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase();
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(term),
    );
  }, [options, searchTerm]);

  const selectedLabel = value
    ? options.find((o) => o.value === value)?.label ?? ""
    : "";

  useEffect(() => {
    if (isOpen) {
      setSearchTerm("");
      setHighlightIndex(0);
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const el = listRef.current;
    if (!el) return;
    const item = el.children[highlightIndex] as HTMLElement;
    item?.scrollIntoView({ block: "nearest" });
  }, [highlightIndex, isOpen]);

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, filteredOptions.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const opt = filteredOptions[highlightIndex];
      if (opt) {
        onChange(opt.value);
        setIsOpen(false);
      }
      return;
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {label && (
        <Label htmlFor={id} className="block mb-1">
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
        onKeyDown={handleKeyDown}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-secondary-300 bg-white px-3 py-2 text-left text-sm ring-offset-white",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-red-500",
        )}
      >
        <span className={selectedLabel ? "text-text" : "text-secondary-500"}>
          {selectedLabel || placeholder}
        </span>
        <svg
          className={cn("h-4 w-4 text-secondary-500 transition-transform", isOpen && "rotate-180")}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute z-50 mt-1 w-full rounded-md border border-secondary-200 bg-white shadow-lg"
          role="listbox"
        >
          <div className="border-b border-secondary-200 p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-400" />
              <Input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setHighlightIndex(0);
                }}
                placeholder={searchPlaceholder}
                className="h-9 pl-8 border-secondary-200"
                onKeyDown={handleKeyDown}
              />
            </div>
          </div>
          <ul
            ref={listRef}
            className="max-h-60 overflow-auto py-1"
            role="listbox"
          >
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-2 text-sm text-secondary-500">No matches</li>
            ) : (
              filteredOptions.map((opt, index) => (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={value === opt.value}
                  className={cn(
                    "cursor-pointer px-3 py-2 text-sm",
                    value === opt.value
                      ? "bg-primary-100 text-primary-800"
                      : index === highlightIndex
                        ? "bg-secondary-100 text-text"
                        : "text-text hover:bg-secondary-50",
                  )}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  onMouseEnter={() => setHighlightIndex(index)}
                >
                  {opt.label}
                </li>
              ))
            )}
          </ul>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 mt-1">{error}</p>
      )}
    </div>
  );
}
