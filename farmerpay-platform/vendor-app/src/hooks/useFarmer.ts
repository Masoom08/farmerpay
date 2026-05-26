import { useEffect, useMemo, useState } from "react";

import { farmerApi } from "../api/modules/farmer.api";

import type {
  Farmer,
} from "../types/farmer.types";

export const useFarmer = (
  searchQuery?: string
) => {
  const [farmers, setFarmers] =
    useState<Farmer[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const fetchFarmers = async () => {
    try {
      setLoading(true);
      setError(null);

      const data =
        await farmerApi.getMyFarmers();

      setFarmers(data || []);
    } catch (err: any) {
      console.log(err);

      setError(
        err?.response?.data?.message ||
          "Failed to fetch farmers"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFarmers();
  }, []);

  const filteredFarmers = useMemo(() => {
    if (!searchQuery?.trim()) {
      return farmers;
    }

    const query =
      searchQuery.toLowerCase();

    return farmers.filter((farmer) => {
      return (
        farmer.name
          .toLowerCase()
          .includes(query) ||
        farmer.mobile.includes(query)
      );
    });
  }, [farmers, searchQuery]);

  return {
    farmers: filteredFarmers,
    loading,
    error,
    refresh: fetchFarmers,
  };
};