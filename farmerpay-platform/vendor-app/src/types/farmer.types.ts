export interface Farmer {
  farmerId: number;
  name: string;
  mobile: string;

  linkType:
    | "regular_customer"
    | "credit_customer"
    | "loan_linked";

  transactionCount: number;

  totalValue: number;

  currentBalance: number;

  creditLimit: number;

  totalCreditGiven: number;
}

export interface RegisterFarmerPayload {
  name: string;
  mobile: string;

  giveCredit: boolean;

  creditLimit?: number;
}

export interface RegisterFarmerResponse {
  success: boolean;
  message: string;

  data: {
    farmerId: number;
    name: string;
    mobile: string;
    creditLimit: number;
    isNew: boolean;
  };
}

export interface MyFarmersResponse {
  success: boolean;
  message: string;
  data: Farmer[];
}