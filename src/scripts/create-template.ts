import * as path from "path";
import { exportLessonPlanToDocx } from "../services/docx";
import type { LessonPlan } from "../types/lesson-plan";
import * as fs from "fs";

const sampleLessonPlan: LessonPlan = {
  plan_number: 1,
  subject_code: "ว15101",
  subject_name: "วิทยาศาสตร์และเทคโนโลยี",
  course_title: "รายวิชาวิทยาศาสตร์และเทคโนโลยี",
  grade_level: "ประถมศึกษาปีที่ 5",
  unit_number: 5,
  unit_title: "แรงและพลังงาน",
  unit_hours: 12,
  sub_unit_number: 1,
  sub_unit_title: "พลังงานเสียง",
  learning_hours: 1,
  teach_date: "วันที่ 1 กันยายน 2569",
  teacher_name: "ครูผู้สอน",
  teacher_position: "ครูชำนาญการ",
  mentor_name: "ครูพี่เลี้ยง",
  mentor_position: "ครูเชี่ยวชาญ",
  reviewer_name: "หัวหน้ากลุ่มสาระฯ",
  reviewer_position: "ครูชำนาญการพิเศษ",
  approver_name: "ผู้อำนวยการโรงเรียน",
  approver_position: "ผู้อำนวยการสถานศึกษา",
  content: {
    standard: "มาตรฐาน ว 2.3 เข้าใจความหมายของพลังงาน การเปลี่ยนแปลงและการถ่ายโอนพลังงาน",
    indicator: "ว 2.3 ป.5/1 อธิบายการได้ยินเสียงผ่านตัวกลาง",
    concept: "เสียงเป็นพลังงานที่เกิดจากการสั่นของแหล่งกำเนิดเสียงและต้องอาศัยตัวกลางในการถ่ายโอนพลังงาน",
    kpa: {
      knowledge: ["อธิบายการเคลื่อนที่ของเสียงผ่านตัวกลางได้ (K)"],
      process: ["ทดลองและสังเกตการได้ยินเสียงผ่านตัวกลางต่างๆ ได้ (P)"],
      attitude: ["มีความใฝ่รู้และมุ่งมั่นในการทำงาน (A)"],
    },
    competencies: ["ความสามารถในการสื่อสาร", "ความสามารถในการคิด"],
    desirable_characteristics: ["มีวินัย", "ใฝ่เรียนรู้", "มุ่งมั่นในการทำงาน"],
    learning_content: "การเกิดเสียงและการเคลื่อนที่ของเสียงผ่านตัวกลาง",
    tasks: ["ใบงานการทดลองเรื่องตัวกลางของเสียง"],
    evaluation_table: [
      {
        objective: "อธิบายการเคลื่อนที่ของเสียงผ่านตัวกลางได้",
        method: "ตรวจใบงาน",
        tool: "แบบประเมินใบงาน",
        criteria: "ผ่านเกณฑ์ร้อยละ 70 ขึ้นไป",
      },
    ],
    steps_5e: {
      engagement: "ขั้นสร้างความสนใจ (Engagement)",
      exploration: "ขั้นสำรวจและค้นหา (Exploration)",
      explanation: "ขั้นอธิบายและลงข้อสรุป (Explanation)",
      elaboration: "ขั้นขยายความรู้ (Elaboration)",
      evaluation: "ขั้นประเมินผล (Evaluation)",
    },
    materials: ["หนังสือเรียน", "อุปกรณ์ทดลอง"],
  },
};

export async function generateDocxTemplate(outputPath: string) {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const buffer = await exportLessonPlanToDocx(sampleLessonPlan);
  fs.writeFileSync(outputPath, buffer);
  console.log(`Successfully generated docx template at: ${outputPath}`);
}

if (import.meta.main) {
  const targetPath = path.resolve(
    import.meta.dir,
    "../templates/lesson_plan_template.docx"
  );
  generateDocxTemplate(targetPath)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Error creating template:", err);
      process.exit(1);
    });
}
