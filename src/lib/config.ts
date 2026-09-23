// Public (browser-safe) configuration. Only NEXT_PUBLIC_* variables here –
// no secret may ever be read in this file.
export const publicConfig = {
  // Default: the AIbooking "Clinic" agent (voice widget). Override via env; set
  // NEXT_PUBLIC_AIBOOKING_WIDGET_URL to an empty string to use the built-in demo receptionist.
  widgetUrl: process.env.NEXT_PUBLIC_AIBOOKING_WIDGET_URL ?? "https://aibooking-backendnew.vercel.app/widget.js",
  widgetId: process.env.NEXT_PUBLIC_AIBOOKING_WIDGET_ID || "NuQB1HFdM8Q3MI",
  agentId: process.env.NEXT_PUBLIC_AIBOOKING_AGENT_ID || "",
  apiUrl: process.env.NEXT_PUBLIC_AIBOOKING_API_URL || "",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "",
};

export const isWidgetConfigured = () => Boolean(publicConfig.widgetUrl);
