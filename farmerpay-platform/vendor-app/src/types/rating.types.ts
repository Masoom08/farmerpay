export interface FarmerRating {
  first_name: string;
  last_name: string;
}

export interface Rating {
  id: number;

  vendor_id: number;
  farmer_id: number;

  rating_score: number;
  rating_feedback: string;

  rated_on: string;

  is_active: boolean;

  createdAt: string;
  updatedAt: string;

  farmer: FarmerRating;
}

export interface RatingsData {
  ratings: Rating[];

  averageRating: number;

  totalRatings: number;
}

export interface RatingsResponse {
  success: boolean;

  message: string;

  data: RatingsData;
}