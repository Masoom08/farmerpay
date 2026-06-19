import { useState } from "react";
import { recordSale } from "../api/modules/sales.api";
import type { RecordSalePayload, Transaction} from "../types/sale.types";
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
  cashAmount?: number;
  creditAmount?: number;
  loanApplicationId?: number | null;
}

export const useRecordSale = () => {
  const [submitting, setSubmitting] = useState(false);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submitSale = async ({
    selectedFarmer,
    paymentType,
    items,
    cashAmount = 0,
    creditAmount = 0,
    loanApplicationId = null,
  }: RecordSaleParams): Promise<{
    success: boolean;error?: string;
  }> => {
    // Validation
    if (!selectedFarmer?.farmerId) {
      setError("Please select a farmer.");
      return { success: false };
    }

    if (items.length === 0) {
      setError("Please add at least one item to the cart.");
      return { success: false };
    }

    const totalAmount = items.reduce(
      (sum, item) => sum + item.unitPrice,
      0
    );

    if (paymentType === "cash_credit_sale") {
      if (cashAmount <= 0 || creditAmount <= 0) {
        setError("Cash and Credit amount are required");
        return { success: false };
      }

      if (cashAmount + creditAmount !== totalAmount) {
        setError(
          `Cash + Credit must equal total amount ₹${totalAmount}`
        );
        return { success: false };
      }
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
      if (paymentType === "cash_credit_sale") {
        payload.cashAmount = cashAmount;
        payload.creditAmount = creditAmount;
      }

      console.log("SALE PAYLOAD",JSON.stringify(payload, null, 2));
      console.log("BEFORE API CALL");
      const response = await recordSale(payload);
      console.log("AFTER API CALL");
      console.log("RESPONSE",JSON.stringify(response, null, 2));

      if (response.success) {
        setTransaction(response.data);
        return { success: true };
      }

      const msg = response.message || "Failed to record sale.";
      setError(msg);
      return { success: false, error: msg };
    } catch (err: any) {
      console.log("===== SALE ERROR =====");
      console.log(err);
      console.log("STATUS",err?.response?.status);
      console.log("DATA", JSON.stringify(err?.response?.data, null, 2));
      console.log( "MESSAGE", err?.message);
      setError( err?.response?.data?.message || err?.message || "Failed to record sale.");

      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to record sale.";

      console.log("SALE ERROR:", msg);

      setError(msg);
      return { success: false, error: msg};
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