// Shapes a Prisma Booking (with turfConfig included) into the flat shape the
// frontend's `Booking` type expects — in particular it synthesizes `turfType`
// from the related TurfConfig's `type` field, since the frontend was built
// against a simpler "one turf type per booking" model.

type BookingWithTurfConfig = {
  id: string;
  customerName: string;
  customerPhone: string;
  date: string;
  timeSlot: string;
  duration: number;
  amount: number;
  paymentMethod: string | null;
  paymentStatus: string;
  status: string;
  createdAt: Date;
  locationId: string;
  turfConfig: { type: string };
};

export function serializeBooking(b: BookingWithTurfConfig) {
  return {
    id: b.id,
    customerName: b.customerName,
    customerPhone: b.customerPhone,
    date: b.date,
    timeSlot: b.timeSlot,
    duration: b.duration,
    turfType: b.turfConfig.type,
    amount: b.amount,
    paymentMethod: b.paymentMethod,
    paymentStatus: b.paymentStatus,
    status: b.status,
    createdAt: b.createdAt.toISOString(),
    locationId: b.locationId,
  };
}
