import { describe, expect, it, vi } from "vitest";
import type { OpenClawConfig } from "../config/config.js";

vi.mock("../channels/registry.js", () => ({
  normalizeChatChannelId: (raw: string) => {
    const builtIn: Record<string, string> = {
      telegram: "telegram",
      discord: "discord",
      whatsapp: "whatsapp",
    };
    return builtIn[raw] ?? null;
  },
}));

// eslint-disable-next-line import/first -- mock must precede import
const { setPluginEnabledInConfig } = await import("./toggle-config.js");

describe("setPluginEnabledInConfig", () => {
  it("enables a third-party plugin — only plugins.entries changes", () => {
    const cfg = {} as OpenClawConfig;
    const result = setPluginEnabledInConfig(cfg, "my-custom-plugin", true);

    expect(result.plugins?.entries?.["my-custom-plugin"]).toEqual({ enabled: true });
    expect(result.channels).toBeUndefined();
  });

  it("enables a built-in channel — dual-writes plugins.entries and channels", () => {
    const cfg = {} as OpenClawConfig;
    const result = setPluginEnabledInConfig(cfg, "telegram", true);

    expect(result.plugins?.entries?.telegram).toEqual({ enabled: true });
    expect(result.channels?.telegram).toEqual({ enabled: true });
  });

  it("disables a plugin — sets enabled: false", () => {
    const cfg = {
      plugins: { entries: { "my-plugin": { enabled: true } } },
    } as OpenClawConfig;
    const result = setPluginEnabledInConfig(cfg, "my-plugin", false);

    expect(result.plugins?.entries?.["my-plugin"]?.enabled).toBe(false);
  });

  it("disables a built-in channel — preserves existing channel config", () => {
    const cfg = {
      channels: {
        discord: { enabled: true, allowFrom: "+1234567890", groupPolicy: "opt-in" },
      },
      plugins: { entries: { discord: { enabled: true } } },
    } as OpenClawConfig;
    const result = setPluginEnabledInConfig(cfg, "discord", false);

    expect(result.plugins?.entries?.discord?.enabled).toBe(false);
    expect(result.channels?.discord).toEqual({
      enabled: false,
      allowFrom: "+1234567890",
      groupPolicy: "opt-in",
    });
  });

  it("creates plugins structure from empty config", () => {
    const cfg = {} as OpenClawConfig;
    const result = setPluginEnabledInConfig(cfg, "some-plugin", true);

    expect(result.plugins).toBeDefined();
    expect(result.plugins?.entries).toBeDefined();
    expect(result.plugins?.entries?.["some-plugin"]?.enabled).toBe(true);
  });

  it("creates channel entry when existing channel config is null-ish", () => {
    const cfg = {
      channels: { whatsapp: null },
    } as unknown as OpenClawConfig;
    const result = setPluginEnabledInConfig(cfg, "whatsapp", true);

    // null is not a non-array object, so existingRecord falls back to {}
    expect(result.channels?.whatsapp).toEqual({ enabled: true });
  });

  it("handles existing channel config that is an array (non-object fallback)", () => {
    const cfg = {
      channels: { whatsapp: ["unexpected"] },
    } as unknown as OpenClawConfig;
    const result = setPluginEnabledInConfig(cfg, "whatsapp", true);

    // Arrays are excluded by the !Array.isArray check, so existingRecord = {}
    expect(result.channels?.whatsapp).toEqual({ enabled: true });
  });

  it("is idempotent — re-enabling an already-enabled plugin", () => {
    const cfg = {
      plugins: { entries: { "my-plugin": { enabled: true, config: { key: "val" } } } },
    } as OpenClawConfig;
    const result = setPluginEnabledInConfig(cfg, "my-plugin", true);

    expect(result.plugins?.entries?.["my-plugin"]).toEqual({
      enabled: true,
      config: { key: "val" },
    });
  });

  it("preserves existing plugin entry config when toggling", () => {
    const cfg = {
      plugins: {
        entries: {
          "my-plugin": {
            enabled: true,
            hooks: { allowPromptInjection: true },
            config: { apiKey: "secret" },
          },
        },
      },
    } as OpenClawConfig;
    const result = setPluginEnabledInConfig(cfg, "my-plugin", false);

    expect(result.plugins?.entries?.["my-plugin"]).toEqual({
      enabled: false,
      hooks: { allowPromptInjection: true },
      config: { apiKey: "secret" },
    });
  });

  it("preserves sibling plugin entries when toggling one", () => {
    const cfg = {
      plugins: {
        entries: {
          "plugin-a": { enabled: true },
          "plugin-b": { enabled: false },
        },
      },
    } as OpenClawConfig;
    const result = setPluginEnabledInConfig(cfg, "plugin-a", false);

    expect(result.plugins?.entries?.["plugin-a"]?.enabled).toBe(false);
    expect(result.plugins?.entries?.["plugin-b"]?.enabled).toBe(false);
  });
});
