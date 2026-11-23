export type SettingsTab = "general" | "branding" | "members" | "plan" | "account";

// Re-opens a tab with fresh values from the store, like the legacy page re-render after a save.
export type Reload = (tab: SettingsTab) => void;
