import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import { generateLessonPlanContent, regenerateSection } from "./services/gemini";
import { exportLessonPlanToDocx } from "./services/docx";
import {
  listLessonPlans,
  getLessonPlanById,
  upsertLessonPlan,
  deleteLessonPlan,
} from "./services/supabase";
import { listPresets } from "./services/presets";
import type { LessonPlan } from "./types/lesson-plan";

const port = Number(process.env.PORT) || 4000;

const app = new Elysia()
  .use(
    cors({
      origin: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    })
  )
  .get("/", () => ({
    name: "Thai Lesson Plan Generator API",
    version: "1.0.0",
    status: "online",
    model: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
  }))
  // 1. Generate full lesson plan via Gemini AI
  .post(
    "/api/generate-plan",
    async ({ body, set }) => {
      try {
        const {
          subject_name,
          grade_level,
          unit_title,
          sub_unit_title,
          subject_code,
          learning_hours,
          teacher_name,
          custom_requirements,
        } = body;

        console.log(
          `[Generate Plan] Received request for ${subject_name} (${grade_level}) - ${sub_unit_title}`
        );

        const content = await generateLessonPlanContent({
          subject_name,
          grade_level,
          unit_title,
          sub_unit_title,
          subject_code,
          learning_hours,
          teacher_name,
          custom_requirements,
        });

        const fullPlan: LessonPlan = {
          teacher_name: teacher_name || "ครูผู้สอน",
          plan_number: 1,
          subject_code: subject_code || "ว21101",
          subject_name,
          grade_level,
          unit_title,
          sub_unit_title,
          learning_hours: learning_hours || 1,
          teach_date: new Date().toISOString().split("T")[0],
          mentor_name: "ครูพี่เลี้ยง / หัวหน้ากลุ่มสาระฯ",
          approver_name: "ผู้อำนวยการโรงเรียน",
          content,
        };

        return {
          success: true,
          data: fullPlan,
        };
      } catch (error: any) {
        console.error("[API Error] /api/generate-plan:", error);
        if (error?.statusCode === 429) {
          set.status = 429;
          return {
            success: false,
            error: "RATE_LIMIT",
            message: error.message,
          };
        }
        set.status = 500;
        return {
          success: false,
          error: "GENERATION_FAILED",
          message: error.message || "เกิดข้อผิดพลาดในการสร้างแผนด้วย AI",
        };
      }
    },
    {
      body: t.Object({
        subject_name: t.String(),
        grade_level: t.String(),
        unit_title: t.String(),
        sub_unit_title: t.String(),
        subject_code: t.Optional(t.String()),
        learning_hours: t.Optional(t.Number()),
        teacher_name: t.Optional(t.String()),
        custom_requirements: t.Optional(t.String()),
      }),
    }
  )
  // 2. Regenerate a specific section (5E, KPA, or Evaluation table)
  .post(
    "/api/regenerate-section",
    async ({ body, set }) => {
      try {
        const { section, subject_name, grade_level, unit_title, sub_unit_title, custom_requirements } =
          body;

        const data = await regenerateSection(section as any, {
          subject_name,
          grade_level,
          unit_title,
          sub_unit_title,
          custom_requirements,
        });

        return {
          success: true,
          section,
          data,
        };
      } catch (error: any) {
        console.error(`[API Error] /api/regenerate-section (${body.section}):`, error);
        set.status = error?.statusCode || 500;
        return {
          success: false,
          error: error.message || "ไม่สามารถสร้างส่วนนี้ใหม่ได้",
        };
      }
    },
    {
      body: t.Object({
        section: t.Union([
          t.Literal("steps_5e"),
          t.Literal("evaluation_table"),
          t.Literal("kpa"),
        ]),
        subject_name: t.String(),
        grade_level: t.String(),
        unit_title: t.String(),
        sub_unit_title: t.String(),
        custom_requirements: t.Optional(t.String()),
      }),
    }
  )
  // 3. Export to DOCX via PizZip and Docxtemplater
  .post("/api/export/docx", async ({ body, set }) => {
    try {
      const plan = body as LessonPlan;
      if (!plan || !plan.content) {
        set.status = 400;
        return { success: false, error: "Invalid lesson plan payload" };
      }

      console.log(`[Export DOCX] Generating document for plan: ${plan.sub_unit_title || "Untitled"}`);
      const buffer = await exportLessonPlanToDocx(plan);

      const filename = `แผนการจัดการเรียนรู้_${plan.subject_code || "วิชา"}_${plan.sub_unit_title || "แผนที่1"}.docx`;
      const encodedFilename = encodeURIComponent(filename);

      set.headers["Content-Type"] =
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      set.headers["Content-Disposition"] = `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`;
      set.headers["Content-Length"] = buffer.length.toString();

      return buffer;
    } catch (error: any) {
      console.error("[API Error] /api/export/docx:", error);
      set.status = 500;
      return {
        success: false,
        error: "DOCX_EXPORT_FAILED",
        message: error?.message || "ไม่สามารถสร้างไฟล์ Word (.docx) ได้",
      };
    }
  })
  // 4. CRUD: List saved plans
  .get("/api/plans", async ({ set }) => {
    try {
      const plans = await listLessonPlans();
      return { success: true, data: plans };
    } catch (error: any) {
      set.status = 500;
      return { success: false, error: error.message };
    }
  })
  // 5. CRUD: Get single plan
  .get("/api/plans/:id", async ({ params, set }) => {
    try {
      const plan = await getLessonPlanById(params.id);
      if (!plan) {
        set.status = 404;
        return { success: false, error: "Plan not found" };
      }
      return { success: true, data: plan };
    } catch (error: any) {
      set.status = 500;
      return { success: false, error: error.message };
    }
  })
  // 6. CRUD: Save or update plan
  .post("/api/plans", async ({ body, set }) => {
    try {
      const saved = await upsertLessonPlan(body as LessonPlan);
      return { success: true, data: saved };
    } catch (error: any) {
      console.error("[API Error] Saving plan:", error);
      set.status = 500;
      return { success: false, error: error.message };
    }
  })
  // 7. CRUD: Delete plan
  .delete("/api/plans/:id", async ({ params, set }) => {
    try {
      const ok = await deleteLessonPlan(params.id);
      return { success: ok };
    } catch (error: any) {
      set.status = 500;
      return { success: false, error: error.message };
    }
  })
  // 8. Preset Library for AI Generator
  .get("/api/presets", async ({ set }) => {
    try {
      const presets = await listPresets();
      return { success: true, count: presets.length, data: presets };
    } catch (error: any) {
      set.status = 500;
      return { success: false, error: error.message };
    }
  })
  .listen(port);

console.log(`🦊 Elysia server is running at ${app.server?.hostname}:${app.server?.port}`);
export type App = typeof app;
