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
  disabled?: boolean;
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filteredOptions = React.useMemo(() => {
    if (!searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase();
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(term),
    );
  }, [options, searchTerm]);

  const selectedLabel = value !== undefined && value !== null && value !== ""
    ? options.find((o) => o.value === value)?.label ?? ""
    : "";

  useEffect(() => {
    if (isOpen) {
      setSearchTerm("");
      setHighlightIndex(0);
      // Use a slightly longer delay to ensure the input is mounted even in slow rendering conditions
      const timer = setTimeout(() => searchInputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    } else {
      // Return focus to the trigger button when closing
      // but only if focus was inside the component
      if (document.activeElement && containerRef.current?.contains(document.activeElement)) {
        triggerRef.current?.focus();
      }
    }
  }, [isOpen]);

  const moveHighlight = (delta: number) => {
    setHighlightIndex((i) => {
      let next = i + delta;
      if (next < 0) next = 0;
      if (next >= filteredOptions.length) next = filteredOptions.length - 1;
      return next;
    });
  };

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
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        moveHighlight(1);
        break;
      case "ArrowUp":
        e.preventDefault();
        moveHighlight(-1);
        break;
      case "Enter":
        e.preventDefault();
        const opt = filteredOptions[highlightIndex];
        if (opt && !opt.disabled) {
          onChange(opt.value);
          setIsOpen(false);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        break;
      case "Tab":
        // Allow Tab to move focus out but close the dropdown
        setIsOpen(false);
        break;
    }
  };

  const listboxId = id ? `${id}-listbox` : "searchable-select-listbox";
  const activeOptionId = id ? `${id}-option-${highlightIndex}` : `searchable-select-option-${highlightIndex}`;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {label && (
        <Label htmlFor={id} className="block mb-1">
          {label}
        </Label>
      )}
      <button
        ref={triggerRef}
        type="button"
        id={id}
        aria-label={ariaLabel ?? label ?? placeholder}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listboxId}
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
          className="absolute z-50 mt-1 w-full rounded-md border border-secondary-200 bg-white shadow-lg overflow-hidden"
        >
          <div className="border-b border-secondary-200 p-2 bg-secondary-50">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-400" />
              <Input
                ref={searchInputRef}
                type="text"
                autoComplete="off"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setHighlightIndex(0);
                }}
                placeholder={searchPlaceholder}
                className="h-9 pl-8 border-secondary-200 bg-white"
                onKeyDown={handleKeyDown}
                role="combobox"
                aria-autocomplete="list"
                aria-expanded="true"
                aria-haspopup="listbox"
                aria-controls={listboxId}
                aria-activedescendant={activeOptionId}
              />
            </div>
          </div>
          <ul
            ref={listRef}
            id={listboxId}
            className="max-h-60 overflow-auto py-1"
            role="listbox"
            aria-label={label ?? placeholder}
          >
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-2 text-sm text-secondary-500 italic">No matches</li>
            ) : (
              filteredOptions.map((opt, index) => (
                <li
                  key={opt.value}
                  id={id ? `${id}-option-${index}` : `searchable-select-option-${index}`}
                  role="option"
                  aria-selected={value === opt.value}
                  aria-disabled={opt.disabled}
                  className={cn(
                    "px-3 py-2 text-sm transition-colors",
                    opt.disabled
                      ? "cursor-not-allowed bg-secondary-50 text-secondary-400"
                      : "cursor-pointer",
                    !opt.disabled && value === opt.value
                      ? "bg-primary-100 text-primary-800"
                      : !opt.disabled && index === highlightIndex
                        ? "bg-secondary-100 text-text outline-none"
                        : !opt.disabled && "text-text hover:bg-secondary-50",
                  )}
                  onClick={() => {
                    if (opt.disabled) return;
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  onMouseEnter={() => !opt.disabled && setHighlightIndex(index)}
                >
                  {opt.label}
                </li>
              ))
            )}
          </ul>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 mt-1" role="alert">{error}</p>
      )}
    </div>
  );
}

