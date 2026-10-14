// Plain module (not "use client") so the server route can read it; client modules export proxies to the server.
export const TABS = { profile: "Profile", workspace: "Workspace", ai: "AI", "api-keys": "API Keys", integrations: "Integrations & Plugins" } as const;
export type SettingsTab = keyof typeof TABS;
