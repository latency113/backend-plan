import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
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
  .use(
    swagger({
      path: "/docs",
      provider: "swagger-ui",
      documentation: {
        info: {
          title: "Thai Lesson Plan Generator API",
          version: "1.0.0",
          description:
            "RESTful API สำหรับระบบสร้างและจัดการแผนการจัดการเรียนรู้ตามแนวทาง 5E ด้วย Google Gemini AI และ Supabase",
          contact: {
            name: "Teacher Assistant API Support",
          },
        },
        tags: [
          {
            name: "AI Generation",
            description: "สร้างแผนการสอนและสร้างเนื้อหาเฉพาะส่วนด้วย Gemini AI",
          },
          {
            name: "Lesson Plans",
            description: "จัดการแผนการจัดการเรียนรู้ในฐานข้อมูล Supabase (CRUD)",
          },
          {
            name: "Presets",
            description: "คลังแม่แบบแผนการสอนตามกลุ่มสาระการเรียนรู้ต่างๆ (28 Presets)",
          },
          {
            name: "Export",
            description: "ส่งออกแผนการสอนเป็นไฟล์เอกสาร Word (.docx)",
          },
          {
            name: "System",
            description: "ตรวจสอบสถานะและการทำงานของระบบ API",
          },
        ],
      },
    })
  )
  .get("/swagger", ({ redirect }) => redirect("/docs"), {
    detail: {
      tags: ["System"],
      summary: "Redirect to /docs",
      description: "Redirects /swagger to /docs for convenience",
    },
  })
  .get(
    "/",
    () => ({
      name: "Thai Lesson Plan Generator API",
      version: "1.0.0",
      status: "online",
      docs: "/docs",
      model: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
    }),
    {
      detail: {
        tags: ["System"],
        summary: "API Health & Info",
        description: "ตรวจสอบสถานะ API และโมเดล AI ที่กำลังใช้งาน พร้อมลิงก์ไปยังหน้าเอกสาร /docs",
      },
    }
  )
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
        subject_name: t.String({ description: "ชื่อกลุ่มสาระ/วิชา เช่น วิทยาศาสตร์และเทคโนโลยี" }),
        grade_level: t.String({ description: "ระดับชั้น เช่น มัธยมศึกษาปีที่ 1" }),
        unit_title: t.String({ description: "ชื่อหน่วยการเรียนรู้" }),
        sub_unit_title: t.String({ description: "ชื่อแผน/เรื่องย่อย" }),
        subject_code: t.Optional(t.String({ description: "รหัสวิชา เช่น ว21101" })),
        learning_hours: t.Optional(t.Number({ description: "จำนวนชั่วโมงเรียน เช่น 1 หรือ 2" })),
        teacher_name: t.Optional(t.String({ description: "ชื่อครูผู้สอน" })),
        custom_requirements: t.Optional(t.String({ description: "ความต้องการเพิ่มเติมหรือเน้นกิจกรรมเฉพาะ" })),
      }),
      detail: {
        tags: ["AI Generation"],
        summary: "สร้างแผนการสอนฉบับเต็มด้วย Gemini AI",
        description:
          "สร้างแผนการจัดการเรียนรู้โมเดล 5E ฉบับสมบูรณ์ (มาตรฐาน/ตัวชี้วัด, สาระสำคัญ, KPA, สมรรถนะ, คุณลักษณะ, ลำดับการสอน 5 ขั้น, การวัดผล, สื่อการสอน)",
      },
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
        ], { description: "ส่วนที่ต้องการสร้างใหม่ (steps_5e, evaluation_table, หรือ kpa)" }),
        subject_name: t.String({ description: "ชื่อวิชา" }),
        grade_level: t.String({ description: "ระดับชั้น" }),
        unit_title: t.String({ description: "ชื่อหน่วยการเรียนรู้" }),
        sub_unit_title: t.String({ description: "ชื่อแผน/เรื่อง" }),
        custom_requirements: t.Optional(t.String({ description: "เงื่อนไขเฉพาะในการปรับปรุงเนื้อหา" })),
      }),
      detail: {
        tags: ["AI Generation"],
        summary: "สร้างเนื้อหาเฉพาะส่วนใหม่ด้วย Gemini AI",
        description: "สร้างเนื้อหาเฉพาะส่วนที่เลือกใหม่ (steps_5e, evaluation_table, หรือ kpa) โดยไม่ต้อง Re-generate ทั้งหมด",
      },
    }
  )
  // 3. Export to DOCX via PizZip and Docxtemplater
  .post(
    "/api/export/docx",
    async ({ body, set }) => {
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
    },
    {
      detail: {
        tags: ["Export"],
        summary: "ส่งออกแผนการสอนเป็นไฟล์ Word (.docx)",
        description: "รับข้อมูลโครงสร้างแผนการสอน แล้วแปลงเป็นไฟล์เอกสาร Word (.docx) ตามแบบฟอร์มทางการ",
      },
    }
  )
  // 4. CRUD: List saved plans
  .get(
    "/api/plans",
    async ({ set }) => {
      try {
        const plans = await listLessonPlans();
        return { success: true, data: plans };
      } catch (error: any) {
        set.status = 500;
        return { success: false, error: error.message };
      }
    },
    {
      detail: {
        tags: ["Lesson Plans"],
        summary: "ดึงรายการแผนการสอนทั้งหมด",
        description: "ดึงรายการแผนการสอนทั้งหมดที่บันทึกไว้ในระบบ เรียงลำดับจากล่าสุด",
      },
    }
  )
  // 5. CRUD: Get single plan
  .get(
    "/api/plans/:id",
    async ({ params, set }) => {
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
    },
    {
      params: t.Object({
        id: t.String({ description: "ID ของแผนการสอน (UUID)" }),
      }),
      detail: {
        tags: ["Lesson Plans"],
        summary: "ดึงข้อมูลแผนการสอนตาม ID",
        description: "ส่งคืนข้อมูลรายละเอียดแผนการสอนตัวเต็มตาม ID ที่ระบุ",
      },
    }
  )
  // 6. CRUD: Save or update plan
  .post(
    "/api/plans",
    async ({ body, set }) => {
      try {
        const saved = await upsertLessonPlan(body as LessonPlan);
        return { success: true, data: saved };
      } catch (error: any) {
        console.error("[API Error] Saving plan:", error);
        set.status = 500;
        return { success: false, error: error.message };
      }
    },
    {
      detail: {
        tags: ["Lesson Plans"],
        summary: "บันทึกหรืออัปเดตแผนการสอน",
        description: "บันทึกแผนการสอนใหม่ หรืออัปเดตแผนเดิมที่มีอยู่แล้วลงในฐานข้อมูล Supabase",
      },
    }
  )
  // 7. CRUD: Delete plan
  .delete(
    "/api/plans/:id",
    async ({ params, set }) => {
      try {
        const ok = await deleteLessonPlan(params.id);
        return { success: ok };
      } catch (error: any) {
        set.status = 500;
        return { success: false, error: error.message };
      }
    },
    {
      params: t.Object({
        id: t.String({ description: "ID ของแผนการสอนที่ต้องการลบ (UUID)" }),
      }),
      detail: {
        tags: ["Lesson Plans"],
        summary: "ลบแผนการสอนตาม ID",
        description: "ลบแผนการสอนออกจากฐานข้อมูล",
      },
    }
  )
  // 8. Preset Library for AI Generator
  .get(
    "/api/presets",
    async ({ set }) => {
      try {
        const presets = await listPresets();
        return { success: true, count: presets.length, data: presets };
      } catch (error: any) {
        set.status = 500;
        return { success: false, error: error.message };
      }
    },
    {
      detail: {
        tags: ["Presets"],
        summary: "ดึงรายการแม่แบบแผนการสอน (Presets)",
        description: "ส่งคืนคลังแม่แบบแผนการสอน 28 ตัวอย่าง สำหรับใช้กด Quick-Fill ในหน้าสร้างแผน",
      },
    }
  );

export default app;

if (!process.env.VERCEL) {
  app.listen(port);
  console.log(`🦊 Elysia server is running at http://${app.server?.hostname || 'localhost'}:${app.server?.port || port}`);
}

export type App = typeof app;

