// Public (browser-safe) configuration. Only NEXT_PUBLIC_* variables here –
// no secret may ever be read in this file.
export const publicConfig = {
  // Default: the built-in English clinic receptionist (chat + voice), which books, rebooks and
  // cancels via this app's API. Set NEXT_PUBLIC_AIBOOKING_WIDGET_URL to a clinic agent's
  // widget.js (or an iframe URL) to use the real AIbooking widget instead.
  widgetUrl: process.env.NEXT_PUBLIC_AIBOOKING_WIDGET_URL || "",
  widgetId: process.env.NEXT_PUBLIC_AIBOOKING_WIDGET_ID || "",
  agentId: process.env.NEXT_PUBLIC_AIBOOKING_AGENT_ID || "",
  apiUrl: process.env.NEXT_PUBLIC_AIBOOKING_API_URL || "",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "",
};

export const isWidgetConfigured = () => Boolean(publicConfig.widgetUrl);
