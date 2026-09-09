import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { LessonPlan } from "../types/lesson-plan";
import * as fs from "fs";
import * as path from "path";

export let supabase: SupabaseClient | null = null;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (SUPABASE_URL && SUPABASE_KEY && !SUPABASE_URL.includes("your-project")) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log("[Supabase] Connected successfully to:", SUPABASE_URL);
  } catch (err) {
    console.warn("[Supabase] Failed to initialize client:", err);
  }
} else {
  console.log("[Supabase] No valid credentials found. Using local JSON store fallback.");
}

// Local JSON fallback file when Supabase is not configured or table does not exist yet
const LOCAL_STORE_PATH = path.resolve(import.meta.dir, "../data/local_plans.json");

function getLocalPlans(): LessonPlan[] {
  try {
    if (!fs.existsSync(LOCAL_STORE_PATH)) {
      fs.mkdirSync(path.dirname(LOCAL_STORE_PATH), { recursive: true });
      fs.writeFileSync(LOCAL_STORE_PATH, JSON.stringify([]));
      return [];
    }
    const data = fs.readFileSync(LOCAL_STORE_PATH, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveLocalPlans(plans: LessonPlan[]) {
  try {
    fs.mkdirSync(path.dirname(LOCAL_STORE_PATH), { recursive: true });
    fs.writeFileSync(LOCAL_STORE_PATH, JSON.stringify(plans, null, 2));
  } catch (err) {
    console.error("Failed to save local plans:", err);
  }
}

export function isTableMissingError(error: any): boolean {
  if (!error) return false;
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    error.message?.includes("Could not find the table") ||
    error.message?.includes("relation") && error.message?.includes("does not exist")
  );
}

export async function listLessonPlans(): Promise<LessonPlan[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("lesson_plans")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        if (isTableMissingError(error)) {
          console.warn(
            "[Supabase Notice] Table 'lesson_plans' is not yet created in Supabase database. Falling back to local storage seamlessly."
          );
          return getLocalPlans();
        }
        console.error("[Supabase Error listing plans]:", error);
        return getLocalPlans();
      }
      return data || [];
    } catch (err) {
      console.warn("[Supabase Exception listing plans, using fallback]:", err);
      return getLocalPlans();
    }
  }

  // Fallback to local store
  return getLocalPlans();
}

export async function getLessonPlanById(id: string): Promise<LessonPlan | null> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("lesson_plans")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        if (isTableMissingError(error)) {
          const local = getLocalPlans();
          return local.find((p) => p.id === id) || null;
        }
        console.error(`[Supabase Error getting plan ${id}]:`, error);
        return null;
      }
      return data;
    } catch {
      const local = getLocalPlans();
      return local.find((p) => p.id === id) || null;
    }
  }

  const local = getLocalPlans();
  return local.find((p) => p.id === id) || null;
}

export async function upsertLessonPlan(plan: LessonPlan): Promise<LessonPlan> {
  const now = new Date().toISOString();

  if (supabase) {
    const payload = {
      ...plan,
      updated_at: now,
    };
    if (!payload.id) {
      delete payload.id;
    }

    try {
      const { data, error } = await supabase
        .from("lesson_plans")
        .upsert(payload)
        .select()
        .single();

      if (error) {
        if (isTableMissingError(error)) {
          console.warn(
            "[Supabase Notice] Table 'lesson_plans' not created yet. Saving to local store fallback."
          );
          return saveToLocalFallback(plan, now);
        }
        console.error("[Supabase Error upserting plan]:", error);
        return saveToLocalFallback(plan, now);
      }
      return data;
    } catch {
      return saveToLocalFallback(plan, now);
    }
  }

  return saveToLocalFallback(plan, now);
}

function saveToLocalFallback(plan: LessonPlan, now: string): LessonPlan {
  const local = getLocalPlans();
  if (plan.id) {
    const index = local.findIndex((p) => p.id === plan.id);
    if (index !== -1) {
      local[index] = { ...plan, updated_at: now };
      saveLocalPlans(local);
      return local[index];
    }
  }

  const newPlan: LessonPlan = {
    ...plan,
    id: plan.id || crypto.randomUUID(),
    created_at: plan.created_at || now,
    updated_at: now,
  };
  local.unshift(newPlan);
  saveLocalPlans(local);
  return newPlan;
}

export async function deleteLessonPlan(id: string): Promise<boolean> {
  if (supabase) {
    try {
      const { error } = await supabase.from("lesson_plans").delete().eq("id", id);
      if (error) {
        if (isTableMissingError(error)) {
          const local = getLocalPlans();
          const filtered = local.filter((p) => p.id !== id);
          saveLocalPlans(filtered);
          return true;
        }
        console.error(`[Supabase Error deleting plan ${id}]:`, error);
        return false;
      }
      return true;
    } catch {
      const local = getLocalPlans();
      const filtered = local.filter((p) => p.id !== id);
      saveLocalPlans(filtered);
      return true;
    }
  }

  const local = getLocalPlans();
  const filtered = local.filter((p) => p.id !== id);
  saveLocalPlans(filtered);
  return true;
}
