import { useCallback, useState,} from "react";
import { getRatings, } from "../api/modules/rating.api";
import { RatingsData,} from "../types/rating.types";

export const useRatings = () => {
  const [ratings, setRatings] = useState<RatingsData | null>(null);
  const [loading, setLoading] = useState(false);
  const loadRatings = useCallback(async () => {
      try {
        setLoading(true);
        const response =
          await getRatings();
        if (response.success) {
          setRatings(response.data);
        }
      } catch (error) {
        console.log(
          "Ratings Error",
          error
        );
      } finally {
        setLoading(false);
      }
    }, []);
  return {
    ratings,
    loading,
    loadRatings,
  };
};