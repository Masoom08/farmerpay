import { useEffect, useState } from "react";

import { getCatalog } from "../api/modules/sales.api";
import type { CatalogItem } from "../types/sale.types";

export const useCatalog = () => {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCatalog = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getCatalog();

      if (response.success) {
        setCatalog(response.data || []);
      } else {
        setError(response.message || "Failed to load catalog.");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load catalog.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  return {
    catalog,
    loading,
    error,
    refetch: fetchCatalog,
  };
};