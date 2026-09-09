import { supabase } from "../services/supabase";
import { DEFAULT_PRESETS } from "../services/default-presets";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("=== Checking Supabase Connection & Tables ===");
  if (!supabase) {
    console.error("❌ Supabase client is not initialized. Please check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
  }

  // 1. Check plan_presets table
  console.log("\n1. Checking table 'plan_presets'...");
  const { data: presetData, error: presetErr } = await supabase
    .from("plan_presets")
    .select("id")
    .limit(1);

  if (presetErr) {
    console.error("❌ Table 'plan_presets' not accessible:", presetErr.message);
    console.log("👉 Please run 'supabase/setup_database.sql' in your Supabase SQL Editor first!");
  } else {
    console.log("✅ Table 'plan_presets' is accessible.");
    console.log(`📦 Upserting ${DEFAULT_PRESETS.length} presets to Supabase...`);
    const { error: upsertErr } = await supabase
      .from("plan_presets")
      .upsert(
        DEFAULT_PRESETS.map((p, idx) => ({ ...p, display_order: idx })),
        { onConflict: "id" }
      );
    if (upsertErr) {
      console.error("❌ Failed to upsert presets:", upsertErr.message);
    } else {
      console.log(`✅ Successfully synced ${DEFAULT_PRESETS.length} presets to Supabase!`);
    }
  }

  // 2. Check lesson_plans table
  console.log("\n2. Checking table 'lesson_plans'...");
  const { data: planData, error: planErr } = await supabase
    .from("lesson_plans")
    .select("id")
    .limit(1);

  if (planErr) {
    console.error("❌ Table 'lesson_plans' not accessible:", planErr.message);
    console.log("👉 Please run 'supabase/setup_database.sql' in your Supabase SQL Editor first!");
  } else {
    console.log("✅ Table 'lesson_plans' is accessible.");

    // Migrate local plans if exists
    const localPlansPath = path.resolve(import.meta.dir, "../data/local_plans.json");
    if (fs.existsSync(localPlansPath)) {
      try {
        const localPlans = JSON.parse(fs.readFileSync(localPlansPath, "utf-8"));
        if (Array.isArray(localPlans) && localPlans.length > 0) {
          console.log(`📦 Found ${localPlans.length} local plans. Migrating to Supabase...`);
          for (const plan of localPlans) {
            const { error: insertPlanErr } = await supabase
              .from("lesson_plans")
              .upsert(plan, { onConflict: "id" });
            if (insertPlanErr) {
              console.warn(`⚠️ Failed to upsert plan ${plan.id}:`, insertPlanErr.message);
            } else {
              console.log(`✅ Migrated plan ${plan.id} (${plan.subject_name} - ${plan.unit_title})`);
            }
          }
        }
      } catch (e) {
        console.warn("Could not read local_plans.json:", e);
      }
    }
  }

  console.log("\n=== Migration check complete! ===");
}

main().catch(console.error);
