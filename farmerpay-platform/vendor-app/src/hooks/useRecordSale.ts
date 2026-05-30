import { useState } from "react";

import { recordSale } from "../api/modules/sales.api";
import type {
  RecordSalePayload,
  Transaction,
} from "../types/sale.types";
import type { Farmer } from "../types/farmer.types";
import type { Season } from "../utils/season.util";

import type { PaymentType } from "../types/payment.types";

interface RecordSaleParams {
  selectedFarmer: Farmer | null;
  paymentType: PaymentType;

  items: {
    category: string;
    unitPrice: number;
  }[];

  loanApplicationId?: number | null;
}
export const useRecordSale = () => {
  const [submitting, setSubmitting] = useState(false);
  const [transaction, setTransaction] =
    useState<Transaction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submitSale = async ({
    selectedFarmer,
    // farmerMobile,
    paymentType,
    // season,
    items,
    loanApplicationId = null,
  }: RecordSaleParams): Promise<boolean> => {
    // Validation
    if (!selectedFarmer?.farmerId) {
      setError("Please select a farmer.");
      return false;
    }

    if (items.length === 0) {
      setError("Please add at least one item to the cart.");
      return false;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload: RecordSalePayload = {
        farmerId: selectedFarmer!.farmerId,
        transactionType: paymentType,
        loanApplicationId,
        items,
      };

      const response = await recordSale(payload);

      if (response.success) {
        setTransaction(response.data);
        return true;
      }

      setError(
        response.message || "Failed to record sale."
      );
      return false;
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to record sale."
      );
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setTransaction(null);
    setError(null);
    setSubmitting(false);
  };

  return {
    submitSale,
    submitting,
    transaction,
    error,
    reset,
  };
};