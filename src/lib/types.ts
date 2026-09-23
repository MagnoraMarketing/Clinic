// Domain types for AIbooking Clinic.
// All tenant data carries a clinicId, so many clinics can run on the same platform
// without data being mixed (see supabase/migrations for the matching database model).

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday (JS Date.getDay)

export interface OpeningHours {
  day: Weekday;
  open: string; // "09:00"
  close: string; // "18:00"
  closed?: boolean;
}

export type ClinicType = "massage" | "hair" | "chiropractic" | "physio" | "dental" | "beauty" | "podiatry";

export interface WidgetConfig {
  clinicId: string;
  agentId?: string;
  voiceAgentId?: string;
  chatAgentId?: string;
  theme: "dark" | "light";
  accentColor: string;
  welcomeMessage: string;
  position: "bottom-right" | "bottom-left";
  enabled: boolean;
}

export interface FaqEntry {
  question: string;
  answer: string;
  keywords: string[];
}

export type PaymentMethod = "card" | "mobilepay" | "cash" | "insurance" | "invoice";

export interface BookingRules {
  enabled: boolean;
  /** Grid for start times, e.g. every 15 minutes. */
  slotMinutes: number;
  /** Cleaning/preparation time between two appointments with the same practitioner. */
  bufferMinutes: number;
  /** Earliest bookable time, counted from now. */
  minNoticeHours: number;
  /** How far ahead clients can book. */
  maxDaysAhead: number;
  /** Free cancellation/rebooking until this many hours before the appointment. */
  cancellationHours: number;
  /** Fee for late cancellation / no-show (0 = none). */
  lateCancellationFee: number;
  /** New clients must be confirmed by the clinic (e.g. first dental exam). */
  confirmNewClients: boolean;
  rules: string;
}

export interface Clinic {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  type: ClinicType;
  emoji: string;
  accentColor: string;
  heroImage: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  parking: string;
  openingHours: OpeningHours[];
  booking: BookingRules;
  paymentMethods: PaymentMethod[];
  /** Health insurance / reimbursement info the AI can explain (e.g. "sygeforsikring danmark"). */
  insurance?: string;
  faq: FaqEntry[];
  widget: WidgetConfig;
  /** Where the NFC review chip sends the client (e.g. Google review). Managed in admin. */
  reviewUrl?: string;
}

export interface ServiceCategory {
  id: string;
  clinicId: string;
  name: string;
  emoji: string;
  sortOrder: number;
}

export interface Service {
  id: string;
  clinicId: string;
  categoryId: string;
  name: string;
  description: string;
  durationMinutes: number;
  price: number; // DKK
  /** Show as "from" price (e.g. hair colour depends on length). */
  priceFrom?: boolean;
  emoji: string;
  /** Extra words the AI should recognise, e.g. ["deep tissue", "sports massage"]. */
  aliases?: string[];
  popular?: boolean;
  /** Only for new clients (e.g. first consultation). */
  newClientsOnly?: boolean;
  available: boolean;
  /** Empty = all practitioners can perform the service. */
  practitionerIds: string[];
}

export interface Practitioner {
  id: string;
  clinicId: string;
  name: string;
  title: string;
  bio: string;
  color: string;
  /** Weekdays the practitioner works (within the clinic's opening hours). */
  workDays: Weekday[];
  active: boolean;
}

export interface Catalog {
  categories: ServiceCategory[];
  services: Service[];
  practitioners: Practitioner[];
}

export type AppointmentSource = "website" | "chat" | "voice" | "phone" | "api";
export type AppointmentStatus = "pending" | "confirmed" | "checked_in" | "completed" | "cancelled" | "no_show";

export interface CustomerInfo {
  name: string;
  phone: string;
  email?: string;
}

export interface AppointmentChange {
  at: string;
  by: AppointmentSource | "admin";
  from: string; // "2026-09-24 10:00"
  to: string;
}

export interface Appointment {
  id: string;
  clinicId: string;
  reference: string;
  source: AppointmentSource;
  status: AppointmentStatus;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  durationMinutes: number;
  serviceId: string;
  serviceName: string;
  practitionerId: string;
  practitionerName: string;
  price: number;
  customer: CustomerInfo;
  newClient: boolean;
  comment?: string;
  /** Rebooking history – every move is logged. */
  changes: AppointmentChange[];
  cancelledAt?: string;
  /** Cancelled inside the cancellation window (fee may apply). */
  lateCancellation?: boolean;
  externalRefs: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  clinicId: string;
  name: string;
  phone: string;
  email?: string;
  visitCount: number;
  upcomingCount: number;
  cancellationCount: number;
  totalSpent: number;
  lastSeenAt: string;
}

export type IntegrationKind = "aibooking_calendar" | "calendar_sync" | "practice_system" | "sms" | "custom_api";

export interface IntegrationStatus {
  kind: IntegrationKind;
  name: string;
  description: string;
  configured: boolean;
  enabled: boolean;
  details: string;
}

// API input types
export interface CreateAppointmentInput {
  clinicId: string;
  source?: AppointmentSource;
  /** Service id OR a name – the AI may send "60 min deep tissue". */
  serviceId?: string;
  service?: string;
  /** Practitioner id or name. Omit / "any" = first available. */
  practitionerId?: string;
  practitioner?: string;
  date: string;
  time: string;
  customer: CustomerInfo;
  newClient?: boolean;
  comment?: string;
}

export interface Slot {
  time: string;
  practitionerIds: string[];
}

export type CallOutcome = "booking" | "rebooking" | "cancellation" | "question" | "transfer" | "missed";

/** Inbound call handled by the AI receptionist (AIbooking Voice). */
export interface Call {
  id: string;
  clinicId: string;
  from: string;
  channel: "phone" | "voice_widget";
  startedAt: string;
  durationSec: number;
  outcome: CallOutcome;
  summary: string;
  transcript: { who: "caller" | "ai"; text: string }[];
  appointmentId?: string;
}
