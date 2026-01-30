"use client";

import { useEffect } from "react";
import api from "@/lib/api";
import { applyPrimaryColor } from "@/lib/theme";

/**
 * Fetches app settings and applies primary color to the document.
 * Ensures all primary-* shades across the app derive from Settings > Software.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    api
      .get("/settings/software")
      .then((res) => {
        const primary = res.data?.data?.primaryColor;
        if (primary) applyPrimaryColor(primary);
      })
      .catch(() => {
        applyPrimaryColor("#0d6efd");
      });
  }, []);

  return <>{children}</>;
}
