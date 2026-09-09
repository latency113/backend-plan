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

function filterPlansByUserId(plans: LessonPlan[], userId?: string): LessonPlan[] {
  if (userId) {
    return plans.filter((p) => p.user_id === userId);
  }
  // If no userId, return only guest/anonymous plans (or plans without user_id)
  return plans.filter((p) => !p.user_id);
}

export async function listLessonPlans(userId?: string): Promise<LessonPlan[]> {
  if (supabase) {
    try {
      let query = supabase
        .from("lesson_plans")
        .select("*")
        .order("created_at", { ascending: false });

      if (userId) {
        query = query.eq("user_id", userId);
      } else {
        query = query.is("user_id", null);
      }

      const { data, error } = await query;

      if (error) {
        if (isTableMissingError(error)) {
          console.warn(
            "[Supabase Notice] Table 'lesson_plans' is not yet created in Supabase database. Falling back to local storage seamlessly."
          );
          return filterPlansByUserId(getLocalPlans(), userId);
        }
        // If column user_id is missing in Supabase (not yet migrated), fallback to local
        if (error.message?.includes("column") && error.message?.includes("user_id")) {
          console.warn("[Supabase Notice] Column 'user_id' not found in Supabase table. Using local filter.");
          return filterPlansByUserId(getLocalPlans(), userId);
        }
        console.error("[Supabase Error listing plans]:", error);
        return filterPlansByUserId(getLocalPlans(), userId);
      }
      return data || [];
    } catch (err) {
      console.warn("[Supabase Exception listing plans, using fallback]:", err);
      return filterPlansByUserId(getLocalPlans(), userId);
    }
  }

  // Fallback to local store
  return filterPlansByUserId(getLocalPlans(), userId);
}

export async function getLessonPlanById(id: string, userId?: string): Promise<LessonPlan | null> {
  if (supabase) {
    try {
      let query = supabase
        .from("lesson_plans")
        .select("*")
        .eq("id", id);

      if (userId) {
        query = query.eq("user_id", userId);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        if (isTableMissingError(error)) {
          const local = getLocalPlans();
          return local.find((p) => p.id === id && (!userId || p.user_id === userId)) || null;
        }
        console.error(`[Supabase Error getting plan ${id}]:`, error);
        return null;
      }
      return data;
    } catch {
      const local = getLocalPlans();
      return local.find((p) => p.id === id && (!userId || p.user_id === userId)) || null;
    }
  }

  const local = getLocalPlans();
  return local.find((p) => p.id === id && (!userId || p.user_id === userId)) || null;
}

export async function upsertLessonPlan(plan: LessonPlan, userId?: string): Promise<LessonPlan> {
  const now = new Date().toISOString();
  const effectiveUserId = userId || plan.user_id;

  const payload: LessonPlan = {
    ...plan,
    user_id: effectiveUserId,
    updated_at: now,
  };

  if (supabase) {
    const dbPayload: any = { ...payload };
    if (!dbPayload.id) {
      delete dbPayload.id;
    }

    try {
      const { data, error } = await supabase
        .from("lesson_plans")
        .upsert(dbPayload)
        .select()
        .single();

      if (error) {
        if (isTableMissingError(error)) {
          console.warn(
            "[Supabase Notice] Table 'lesson_plans' not created yet. Saving to local store fallback."
          );
          return saveToLocalFallback(payload, now);
        }
        // If user_id column doesn't exist in Supabase yet, retry without user_id and save local
        if (error.message?.includes("column") && error.message?.includes("user_id")) {
          console.warn("[Supabase Notice] Column 'user_id' missing in Supabase. Upserting without user_id and saving locally.");
          const fallbackDbPayload = { ...dbPayload };
          delete fallbackDbPayload.user_id;
          try {
            await supabase.from("lesson_plans").upsert(fallbackDbPayload).select().single();
          } catch {}
          return saveToLocalFallback(payload, now);
        }
        console.error("[Supabase Error upserting plan]:", error);
        return saveToLocalFallback(payload, now);
      }
      // Also sync to local store
      saveToLocalFallback(data, now);
      return data;
    } catch {
      return saveToLocalFallback(payload, now);
    }
  }

  return saveToLocalFallback(payload, now);
}

function saveToLocalFallback(plan: LessonPlan, now: string): LessonPlan {
  const local = getLocalPlans();
  if (plan.id) {
    const index = local.findIndex((p) => p.id === plan.id);
    if (index !== -1) {
      local[index] = { ...local[index], ...plan, updated_at: now };
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

export async function deleteLessonPlan(id: string, userId?: string): Promise<boolean> {
  const local = getLocalPlans();
  const target = local.find((p) => p.id === id);

  // If userId is provided and the target plan exists, ensure the user owns it
  if (userId && target && target.user_id && target.user_id !== userId) {
    console.warn(`[Security] User ${userId} attempted to delete plan ${id} owned by ${target.user_id}`);
    return false;
  }

  if (supabase) {
    try {
      let query = supabase.from("lesson_plans").delete().eq("id", id);
      if (userId) {
        query = query.eq("user_id", userId);
      }
      const { error } = await query;
      if (error) {
        // If column user_id is missing in Supabase table, delete by id after our local ownership check
        if (
          error.code === "42703" ||
          (error.message?.includes("column") && error.message?.includes("user_id"))
        ) {
          try {
            await supabase.from("lesson_plans").delete().eq("id", id);
          } catch {}
        } else if (!isTableMissingError(error)) {
          console.error(`[Supabase Error deleting plan ${id}]:`, error);
        }
      }
    } catch {}
  }

  const filtered = local.filter((p) => !(p.id === id && (!userId || p.user_id === userId)));
  saveLocalPlans(filtered);
  return true;
}
