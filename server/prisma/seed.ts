import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Mirrors src/utils/mockData.ts TURF_LOCATIONS on the frontend.
const TURF_LOCATIONS = [
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
    landmarks: 'SRM Nagar, near Kattankulathur railway station & SRM University',
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
    landmarks: 'PV Kalathur–Thirukazhukundram Rd',
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
    landmarks: 'Tiruvanchery, Camp Road, Selaiyur',
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
    landmarks: 'Himachal Nagar, Kurinji Nagar, Madhanandapuram',
  },
];

function getTurfPriceForLocation(turfType: '5-a-side' | '6-a-side', locationId: string): number {
  switch (locationId) {
    case 'potheri':
      return turfType === '5-a-side' ? 800 : 1100;
    case 'chengalpattu':
      return turfType === '5-a-side' ? 700 : 950;
    case 'selaiyur':
      return turfType === '5-a-side' ? 900 : 1200;
    case 'porur':
    default:
      return turfType === '5-a-side' ? 1000 : 1350;
  }
}

const TURF_CONFIG_TEMPLATES = [
  {
    type: '5-a-side' as const,
    name: 'Classico 5s (Futsal & Cricket)',
    description: 'Perfect for fast-paced 5v5 football action or box cricket matches. Premium FIFA-grade artificial turf with high-quality shock absorption.',
    amenities: ['Floodlights', 'Bibs & Footballs', 'Drinking Water', 'Dugout Seating'],
    imageUrl: 'https://images.unsplash.com/photo-1510566337590-2fc1f21d0faa?auto=format&fit=crop&q=80&w=1200',
  },
  {
    type: '6-a-side' as const,
    name: 'Classico 6s (Medium Turf)',
    description: 'Ideal for 6v6 football and cricket tournaments. Designed to support heavy foot traffic with exceptional grip and true ball roll.',
    amenities: ['Professional Floodlights', 'Shin Guards & Equipment', 'Locker Rooms', 'Spectator Seating', 'Refreshment Bar'],
    imageUrl: 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&q=80&w=1200',
  },
];

async function main() {
  for (const loc of TURF_LOCATIONS) {
    await prisma.location.upsert({
      where: { id: loc.id },
      update: loc,
      create: loc,
    });

    for (const tpl of TURF_CONFIG_TEMPLATES) {
      const existing = await prisma.turfConfig.findFirst({
        where: { locationId: loc.id, type: tpl.type },
      });
      const pricePerHour = getTurfPriceForLocation(tpl.type, loc.id);
      if (existing) {
        await prisma.turfConfig.update({
          where: { id: existing.id },
          data: { ...tpl, pricePerHour, locationId: loc.id },
        });
      } else {
        await prisma.turfConfig.create({
          data: { ...tpl, pricePerHour, locationId: loc.id },
        });
      }
    }
  }

  const adminEmail = 'admin@elclasicoturf.in';
  const adminPassword = 'Admin@123';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash,
      name: 'Prestige Director',
      role: 'admin',
    },
  });

  console.log('Seed complete.');
  console.log('--------------------------------------------------');
  console.log('Admin login:');
  console.log(`  email:    ${adminEmail}`);
  console.log(`  password: ${adminPassword}`);
  console.log('--------------------------------------------------');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
