export interface VendorOnboardingPayload {
  vendorName: string;
  vendorType: string;
  shopName: string;
  stateId: number;
  districtId: number;
  blockId: number;
  businessPan?: string;
}

export interface VendorOnboardingResponse {
  vendorId: number;
  vendorUuid: string;
  status: string;
}