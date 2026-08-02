"use client";

import { useState, useEffect } from "react";

interface Brand {
  siteName: string;
  logoUrl: string | null;
}

export function useBrand(): Brand | null {
  const [brand, setBrand] = useState<Brand | null>(null);
  useEffect(() => {
    if (typeof window !== "undefined" && window.__BRAND__) {
      setBrand(window.__BRAND__);
    } else {
      fetch("/api/brand/info")
        .then((r) => r.json())
        .then((d) => setBrand({ siteName: d.siteName || "Neo API Gateway", logoUrl: d.logoUrl || null }))
        .catch(() => setBrand({ siteName: "Neo API Gateway", logoUrl: null }));
    }
  }, []);
  return brand;
}
