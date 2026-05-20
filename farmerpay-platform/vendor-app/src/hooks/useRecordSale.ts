import { useState } from "react";

import { recordSale } from "../api/modules/sales.api";
import type {
  CartItem,
  Farmer,
  RecordSalePayload,
  Transaction,
} from "../types/sale.types";
import type { Season } from "../utils/season.util";

type PaymentType = "cash_sale" | "credit_sale";

interface RecordSaleParams {
  selectedFarmer: Farmer | null;
  farmerMobile: string;
  paymentType: PaymentType;
  season: Season;
  cart: CartItem[];
  loanApplicationId?: number | null;
}

export const useRecordSale = () => {
  const [submitting, setSubmitting] = useState(false);
  const [transaction, setTransaction] =
    useState<Transaction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submitSale = async ({
    selectedFarmer,
    farmerMobile,
    paymentType,
    season,
    cart,
    loanApplicationId = null,
  }: RecordSaleParams): Promise<boolean> => {
    // Validation
    const mobile =
      selectedFarmer?.mobile || farmerMobile;

    if (!mobile || mobile.replace(/\D/g, "").length < 10) {
      setError("Please select a valid farmer.");
      return false;
    }

    if (cart.length === 0) {
      setError("Please add at least one item to the cart.");
      return false;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload: RecordSalePayload = {
        farmerId: selectedFarmer?.id ?? null,
        farmerMobile: mobile.replace(/\D/g, "").slice(-10),
        transactionType: paymentType,
        transactionDate: new Date()
          .toISOString()
          .slice(0, 10),
        season,
        loan_application_id: loanApplicationId,
        items: cart.map((cartItem) => ({
          inputItemId:
            cartItem.item.input_item_id ||
            cartItem.item.inputItemId!,
          inputPackId:
            cartItem.item.input_pack_id ||
            cartItem.item.inputPackId!,
          quantity: cartItem.quantity,
        })),
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