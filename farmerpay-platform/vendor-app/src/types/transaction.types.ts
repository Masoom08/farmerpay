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