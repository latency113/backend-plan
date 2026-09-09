import type { PresetItem } from "../types/lesson-plan";
import { supabase, isTableMissingError } from "./supabase";
import { DEFAULT_PRESETS } from "./default-presets";
import * as fs from "fs";
import * as path from "path";

const LOCAL_PRESETS_PATH = path.resolve(import.meta.dir, "../data/local_presets.json");

// In-memory cache for fallback when Supabase is unreachable
let memoryPresets: PresetItem[] = [...DEFAULT_PRESETS];

function getFallbackPresets(): PresetItem[] {
  try {
    if (fs.existsSync(LOCAL_PRESETS_PATH)) {
      const data = fs.readFileSync(LOCAL_PRESETS_PATH, "utf-8");
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Ignore read errors, use in-memory/default presets
  }
  return memoryPresets;
}

export async function listPresets(): Promise<PresetItem[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("plan_presets")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) {
        if (!isTableMissingError(error)) {
          console.error("[Supabase Error listing plan_presets]:", error);
        }
        return getFallbackPresets();
      }

      // If table exists but is empty, seed initial presets into Supabase automatically
      if (data && data.length === 0) {
        console.log("[Supabase] Seeding plan_presets table with default presets...");
        const itemsToInsert = DEFAULT_PRESETS.map((p, index) => ({
          ...p,
          display_order: index,
        }));
        const { data: inserted, error: insertError } = await supabase
          .from("plan_presets")
          .insert(itemsToInsert)
          .select();

        if (!insertError && inserted && inserted.length > 0) {
          return inserted;
        }
      }

      return data && data.length > 0 ? data : getFallbackPresets();
    } catch (err) {
      console.warn("[Supabase Exception listing plan_presets, using fallback]:", err);
      return getFallbackPresets();
    }
  }

  return getFallbackPresets();
}

export async function upsertPreset(preset: PresetItem): Promise<PresetItem> {
  const existingIdx = memoryPresets.findIndex((p) => p.id === preset.id);
  if (existingIdx >= 0) {
    memoryPresets[existingIdx] = { ...memoryPresets[existingIdx], ...preset };
  } else {
    memoryPresets.push(preset);
  }

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("plan_presets")
        .upsert(preset)
        .select()
        .single();
      if (!error && data) {
        return data;
      }
    } catch (err) {
      console.warn("[Supabase upsert plan_preset error]:", err);
    }
  }

  return preset;
}
