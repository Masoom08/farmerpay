export const formatRupees = (
  amount: number | null | undefined
): string => {
  if (amount == null || Number.isNaN(amount)) return "₹0";

  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
};