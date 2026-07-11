export type TurfType = '5-a-side' | '6-a-side';

export type PaymentMethod = 'UPI' | 'Card' | 'Cash';

export type PaymentStatus = 'Paid' | 'Pending';

export type BookingStatus = 'Confirmed' | 'Cancelled' | 'Completed';

export interface Booking {
  id: string;
  customerName: string;
  customerPhone: string;
  date: string; // YYYY-MM-DD
  timeSlot: string; // e.g. "06:00 - 07:00"
  duration: number; // in hours
  turfType: TurfType;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: BookingStatus;
  createdAt: string;
  locationId: string; // branch location ID
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  role: 'user' | 'admin';
}

export interface Review {
  id: string;
  name: string;
  rating: number;
  comment: string;
  date: string;
}

export interface TurfConfig {
  id: TurfType;
  name: string;
  pricePerHour: number;
  description: string;
  amenities: string[];
  imageUrl: string;
}

export interface TurfLocation {
  id: string;
  name: string;
  address: string;
  rating: number;
  reviewsCount: number;
  hours: string;
  phone: string;
  price: string;
  websiteLabel: string;
  websiteUrl: string;
  amenities: string[];
  landmarks: string;
}

export interface DashboardStats {
  totalBookingsToday: number;
  totalRevenueToday: number;
  totalBookingsThisMonth: number;
  occupancyRate: number; // percentage
}
