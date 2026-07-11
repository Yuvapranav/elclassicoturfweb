import { TurfType, Review, TurfLocation } from '../types';

// Helper to format date
export const formatDateString = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const TURF_LOCATIONS: TurfLocation[] = [
  {
    id: 'potheri',
    name: 'Potheri (SRM)',
    address: 'Potheri, SRM Nagar, Kattankulathur, TN 603203',
    rating: 4.4,
    reviewsCount: 185,
    hours: '24 hrs, all week',
    phone: '+91 94999 61063',
    price: '₹800–1100/hr',
    websiteLabel: 'elclasicoturf.in',
    websiteUrl: 'https://elclasicoturf.in',
    amenities: ['Changing room', 'RO water', 'Rest area', 'No dedicated parking'],
    landmarks: 'SRM Nagar, near Kattankulathur railway station & SRM University'
  },
  {
    id: 'chengalpattu',
    name: 'Chengalpattu',
    address: 'PV Kalathur–Thirukazhukundram Rd, Pon Vilaintha Kalathur, TN 603405',
    rating: 3.0,
    reviewsCount: 2,
    hours: '24 hrs, all week',
    phone: '+91 63799 59597',
    price: '₹700–950/hr',
    websiteLabel: '@elclasico_chengalpattu (Instagram)',
    websiteUrl: 'https://instagram.com/elclasico_chengalpattu',
    amenities: ['Parking available', 'Good lighting'],
    landmarks: 'PV Kalathur–Thirukazhukundram Rd'
  },
  {
    id: 'selaiyur',
    name: 'Selaiyur/Tambaram',
    address: 'Tiruvanchery, Camp Road, Selaiyur, Chennai 600126',
    rating: 4.5,
    reviewsCount: 193,
    hours: '24 hrs, all week',
    phone: '+91 96004 98656',
    price: '₹900–1200/hr',
    websiteLabel: 'Playo',
    websiteUrl: 'https://playo.co',
    amenities: ['Good lighting', 'Flexible timing', 'Gets slippery in rain'],
    landmarks: 'Tiruvanchery, Camp Road, Selaiyur'
  },
  {
    id: 'porur',
    name: 'Porur',
    address: 'Himachal Nagar, Kurinji Nagar, Madhanandapuram, Chennai 600125',
    rating: 4.5,
    reviewsCount: 101,
    hours: '24 hrs, all week',
    phone: '+91 93606 66461',
    price: '₹1000–1350/hr',
    websiteLabel: 'Playo',
    websiteUrl: 'https://playo.co',
    amenities: ['Parking available', 'Bat & wickets provided', 'Open roof', 'Small bathroom', 'Changing room'],
    landmarks: 'Himachal Nagar, Kurinji Nagar, Madhanandapuram'
  }
];

export const getTurfPriceForLocation = (turfType: TurfType, locationId: string): number => {
  switch (locationId) {
    case 'potheri':
      if (turfType === '5-a-side') return 800;
      return 1100;
    case 'chengalpattu':
      if (turfType === '5-a-side') return 700;
      return 950;
    case 'selaiyur':
      if (turfType === '5-a-side') return 900;
      return 1200;
    case 'porur':
    default:
      if (turfType === '5-a-side') return 1000;
      return 1350;
  }
};

export const TURF_CONFIGS = [
  {
    id: '5-a-side' as TurfType,
    name: 'Classico 5s (Futsal & Cricket)',
    pricePerHour: 1000,
    description: 'Perfect for fast-paced 5v5 football action or box cricket matches. Premium FIFA-grade artificial turf with high-quality shock absorption.',
    amenities: ['Floodlights', 'Bibs & Footballs', 'Drinking Water', 'Dugout Seating'],
    imageUrl: 'https://images.unsplash.com/photo-1510566337590-2fc1f21d0faa?auto=format&fit=crop&q=80&w=1200'
  },
  {
    id: '6-a-side' as TurfType,
    name: 'Classico 6s (Medium Turf)',
    pricePerHour: 1200,
    description: 'Ideal for 6v6 football and cricket tournaments. Designed to support heavy foot traffic with exceptional grip and true ball roll.',
    amenities: ['Professional Floodlights', 'Shin Guards & Equipment', 'Locker Rooms', 'Spectator Seating', 'Refreshment Bar'],
    imageUrl: 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&q=80&w=1200'
  }
];

const TIME_SLOTS = [
  '00:00 - 01:00',
  '01:00 - 02:00',
  '02:00 - 03:00',
  '03:00 - 04:00',
  '04:00 - 05:00',
  '05:00 - 06:00',
  '06:00 - 07:00',
  '07:00 - 08:00',
  '08:00 - 09:00',
  '09:00 - 10:00',
  '10:00 - 11:00',
  '11:00 - 12:00',
  '12:00 - 13:00',
  '13:00 - 14:00',
  '14:00 - 15:00',
  '15:00 - 16:00',
  '16:00 - 17:00',
  '17:00 - 18:00',
  '18:00 - 19:00',
  '19:00 - 20:00',
  '20:00 - 21:00',
  '21:00 - 22:00',
  '22:00 - 23:00',
  '23:00 - 00:00'
];

export { TIME_SLOTS };

// NOTE: Mock booking generation/storage and dashboard-stat calculation used to live
// here, but that logic is now handled server-side (see server/src/routes/admin.ts
// and server/src/routes/bookings.ts) against the real Postgres database.

export const REVIEWS: Review[] = [
  {
    id: 'rev-1',
    name: 'Sanjeev Kumar',
    rating: 5,
    comment: 'The FIFA-grade turf is incredible! Perfect bounce and excellent padding. The floodlights are extremely bright, making night games super enjoyable.',
    date: 'July 5, 2026'
  },
  {
    id: 'rev-2',
    name: 'Sarah Dsouza',
    rating: 5,
    comment: 'Booked El Classico Turf for a cricket tournament last Sunday. The facilities (especially locker rooms and spectator stands) are professional grade. Highly recommend UPI checkout, super smooth!',
    date: 'July 2, 2026'
  },
  {
    id: 'rev-3',
    name: 'Rithvik Sen',
    rating: 4,
    comment: 'Best turf in the city. The dugouts are spacious and there is plenty of clean drinking water provided. Parking space is generous. Only wish they had more late-night slots available!',
    date: 'June 28, 2026'
  }
];
