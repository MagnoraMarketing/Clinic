// Server-side configuration. This file may ONLY be imported from server code
// (route handlers, server components). Secrets are read from environment
// variables and are never sent to the browser.
const bool = (v: string | undefined, fallback: boolean) =>
  v === undefined || v === "" ? fallback : ["1", "true", "yes", "on"].includes(v.toLowerCase());

export const serverEnv = {
  /** Public demo: no login for /admin and the API is open for reading. */
  demoMode: bool(process.env.DEMO_MODE, true),
  defaultClinicSlug: process.env.DEFAULT_CLINIC_SLUG || "calm-hands",
  /** Phone number of the AIbooking demo line (shown in "Call the demo"). */
  demoPhone: process.env.AIBOOKING_DEMO_PHONE || "",

  supabaseUrl: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",

  adminApiKey: process.env.ADMIN_API_KEY || "",
  adminPassword: process.env.ADMIN_PASSWORD || "",
  adminSessionSecret: process.env.ADMIN_SESSION_SECRET || "",

  webhookSigningSecret: process.env.AIBOOKING_WEBHOOK_SECRET || "",
  aibookingApiKey: process.env.AIBOOKING_API_KEY || "",

  calcomApiKey: process.env.CALCOM_API_KEY || "",
  calcomEventTypeId: process.env.CALCOM_EVENT_TYPE_ID || "",
  practiceWebhookUrl: process.env.PRACTICE_SYSTEM_WEBHOOK_URL || "",
  customWebhookUrl: process.env.CUSTOM_WEBHOOK_URL || "",
  customWebhookSecret: process.env.CUSTOM_WEBHOOK_SECRET || "",
  smsWebhookUrl: process.env.SMS_WEBHOOK_URL || "",
};

export const isSupabaseConfigured = () => Boolean(serverEnv.supabaseUrl && serverEnv.supabaseServiceRoleKey);
