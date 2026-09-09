import * as path from "path";
import { exportLessonPlanToDocx } from "../services/docx";
import { initialLessonPlan } from "../../../frontend/src/lib/sample-data";
import * as fs from "fs";

export async function generateDocxTemplate(outputPath: string) {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const buffer = await exportLessonPlanToDocx(initialLessonPlan);
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
