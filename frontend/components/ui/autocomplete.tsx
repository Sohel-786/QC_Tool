"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "./input";
import { Check } from "lucide-react";

export interface AutocompleteProps {
    options: string[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    id?: string;
    "aria-invalid"?: boolean;
    "aria-describedby"?: string;
    onBlur?: () => void;
    onKeyDown?: (e: React.KeyboardEvent) => void;
}

export function Autocomplete({
    options,
    value,
    onChange,
    placeholder,
    className,
    id,
    "aria-invalid": ariaInvalid,
    "aria-describedby": ariaDescribedby,
    onBlur,
    onKeyDown,
}: AutocompleteProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [highlightIndex, setHighlightIndex] = React.useState(-1);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const listRef = React.useRef<HTMLUListElement>(null);

    const filteredOptions = React.useMemo(() => {
        if (!value) return options;
        const lower = value.toLowerCase();
        // Show options that contain the search term, excluding exact match (no need to suggest what's already typed)
        return options.filter(
            (opt) => opt.toLowerCase().includes(lower) && opt.toLowerCase() !== lower
        );
    }, [options, value]);

    React.useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
                onBlur?.();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onBlur]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen || filteredOptions.length === 0) {
            if (e.key === "ArrowDown") {
                setIsOpen(true);
                e.preventDefault();
            }
            return;
        }

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlightIndex((prev) =>
                prev < filteredOptions.length - 1 ? prev + 1 : 0
            );
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightIndex((prev) =>
                prev > 0 ? prev - 1 : filteredOptions.length - 1
            );
        } else if (e.key === "Enter") {
            if (highlightIndex >= 0 && highlightIndex < filteredOptions.length) {
                e.preventDefault();
                handleSelect(filteredOptions[highlightIndex]);
            }
        } else if (e.key === "Escape") {
            setIsOpen(false);
        }

        onKeyDown?.(e);
    };

    const handleSelect = (option: string) => {
        onChange(option);
        setIsOpen(false);
        setHighlightIndex(-1);
    };

    React.useEffect(() => {
        if (highlightIndex >= 0 && listRef.current) {
            const item = listRef.current.children[highlightIndex] as HTMLElement;
            if (item) {
                item.scrollIntoView({ block: "nearest" });
            }
        }
    }, [highlightIndex]);


    return (
        <div ref={containerRef} className={cn("relative", className)}>
            <Input
                id={id}
                value={value}
                onChange={(e) => {
                    onChange(e.target.value);
                    setIsOpen(true);
                    setHighlightIndex(-1);
                }}
                onFocus={() => setIsOpen(true)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className={className}
                aria-invalid={ariaInvalid}
                aria-describedby={ariaDescribedby}
                autoComplete="off"
            />
            {isOpen && filteredOptions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white rounded-md border border-secondary-200 shadow-lg max-h-60 overflow-auto">
                    <ul ref={listRef} role="listbox">
                        {filteredOptions.map((opt, index) => (
                            <li
                                key={opt}
                                role="option"
                                aria-selected={index === highlightIndex}
                                className={cn(
                                    "px-3 py-2 text-sm cursor-pointer hover:bg-secondary-100 flex items-center justify-between",
                                    index === highlightIndex && "bg-secondary-100"
                                )}
                                onClick={() => handleSelect(opt)}
                                onMouseEnter={() => setHighlightIndex(index)}
                            >
                                {opt}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
