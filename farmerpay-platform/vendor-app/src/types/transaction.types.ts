export interface Transaction {
  transactionId: number;
  transactionUuid: string;

  farmerId: number;
  farmerName: string;

  amount: string;

  type: string;
  status: string;
  paymentStatus: string;

  date: string;
}

export interface TransactionResponse {
  success: boolean;
  message: string;
  data: Transaction[];

  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface TransactionItem {
  itemId: string;
  packId: string;
  quantity: number;
}

export interface CreateTransactionRequest {
  farmerId: number;

  transactionType:
    | "cash_sale"
    | "credit_sale";

  loanApplicationId?: number | null;

  items: TransactionItem[];
}

export interface CreateTransactionResponse {
  success: boolean;
  message: string;

  data: {
    transactionId: number;
  };
}