// Plain module (not "use client") so the server route can read it; client modules export proxies to the server.
export const TABS = {
  profile: "Profile & General",
  workspace: "Workspace",
  "api-keys": "API Keys",
  integrations: "Integrations & Webhooks",
  "ai-governance": "AI Governance",
  "data-privacy": "Data Privacy & GDPR",
  billing: "Plans & Pricing",
} as const;
export type SettingsTab = keyof typeof TABS;

export const TAB_ALIASES: Record<string, SettingsTab> = {
  general: "profile",
  ai: "ai-governance",
  privacy: "data-privacy",
};
