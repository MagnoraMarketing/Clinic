// Public (browser-safe) configuration. Only NEXT_PUBLIC_* variables here –
// no secret may ever be read in this file.
export const publicConfig = {
  // Default: the AIbooking test widget, so clinics can try it live. Override via env.
  // Set NEXT_PUBLIC_AIBOOKING_WIDGET_URL to an empty string to use the built-in demo receptionist.
  widgetUrl: process.env.NEXT_PUBLIC_AIBOOKING_WIDGET_URL ?? "https://aibooking-backendnew.vercel.app/widget.js",
  widgetId: process.env.NEXT_PUBLIC_AIBOOKING_WIDGET_ID ?? "prfA6rbfVJC7K2",
  agentId: process.env.NEXT_PUBLIC_AIBOOKING_AGENT_ID || "",
  apiUrl: process.env.NEXT_PUBLIC_AIBOOKING_API_URL || "",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "",
};

export const isWidgetConfigured = () => Boolean(publicConfig.widgetUrl);
