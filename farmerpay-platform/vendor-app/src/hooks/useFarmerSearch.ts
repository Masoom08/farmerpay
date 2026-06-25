import { useEffect, useState } from "react";

import { searchFarmers } from "../api/modules/farmer.api";
import type { Farmer } from "../types/farmer.types";

export const useFarmerSearch = (query: string) => {
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const searchTerm = query.trim();

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await searchFarmers(searchTerm);

        if (response.success) {
          setFarmers(response.data || []);
        } else {
          setFarmers([]);
          setError(response.message || "Failed to search farmers.");
        }
      } catch (err: any) {
        setFarmers([]);
        setError(err?.message || "Failed to search farmers.");
      } finally {
        setLoading(false);
      }
    }, 400); // debounce

    return () => clearTimeout(timer);
  }, [query]);

  return {
    farmers,
    loading,
    error,
  };
};