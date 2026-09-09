import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";
import type { GeneratePlanRequest, LessonPlanContent, Steps5E, KPA, EvaluationItem } from "../types/lesson-plan";

// Response Schema for Google Generative AI structured JSON output
const lessonPlanContentSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    standard: {
      type: SchemaType.STRING,
      description: "มาตรฐานการเรียนรู้ตามหลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน (เช่น มาตรฐาน ว 1.2)",
    },
    indicator: {
      type: SchemaType.STRING,
      description: "ตัวชี้วัดหรือผลการเรียนรู้ที่สอดคล้องกับมาตรฐาน (เช่น ว 1.2 ม.1/1 ระบุหรืออธิบาย...)",
    },
    concept: {
      type: SchemaType.STRING,
      description: "สาระสำคัญหรือความคิดรวบยอดของบทเรียนที่ถูกต้องตามหลักวิชาการ กระชับ ชัดเจน 2-4 บรรทัด",
    },
    kpa: {
      type: SchemaType.OBJECT,
      properties: {
        knowledge: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: "ด้านความรู้ (Knowledge: K) เขียนเป็นจุดประสงค์เชิงพฤติกรรม เช่น อธิบาย..., ระบุ..., จำแนก...",
        },
        process: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: "ด้านทักษะ/กระบวนการ (Process/Skill: P) เช่น ทักษะการสังเกต, ทักษะการทดลอง, ทักษะการทำงานร่วมกับผู้อื่น",
        },
        attitude: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: "ด้านคุณลักษณะ/เจตคติ (Attitude: A) เช่น ใฝ่เรียนรู้, มีวินัย, มุ่งมั่นในการทำงาน",
        },
      },
      required: ["knowledge", "process", "attitude"],
    },
    competencies: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "สมรรถนะสำคัญของผู้เรียน (เลือก 2-3 ข้อที่เด่นชัด เช่น ความสามารถในการสื่อสาร, การคิด, การแก้ปัญหา)",
    },
    desirable_characteristics: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "คุณลักษณะอันพึงประสงค์ (เลือก 2-3 ข้อ เช่น ใฝ่เรียนรู้, มีวินัย, อยู่อย่างพอเพียง, มุ่งมั่นในการทำงาน)",
    },
    learning_content: {
      type: SchemaType.STRING,
      description: "สาระการเรียนรู้ (Learning Content) สรุปเนื้อหาสำคัญของบทเรียนเป็นประเด็นชัดเจนและมีหัวข้อย่อยแบบบุลเล็ต (•)",
    },
    tasks: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "ชิ้นงานหรือภาระงานที่สอดคล้องกับจุดประสงค์ (เช่น ใบกิจกรรม, สมุดบันทึกผลการทดลอง, แผนภาพสรุป)",
    },
    evaluation_table: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          objective: { type: SchemaType.STRING, description: "จุดประสงค์การเรียนรู้ (ระบุ K, P หรือ A)" },
          method: { type: SchemaType.STRING, description: "วิธีการวัดและประเมินผล เช่น ตรวจใบกิจกรรม, สังเกตพฤติกรรมการทดลอง" },
          tool: { type: SchemaType.STRING, description: "เครื่องมือวัดและประเมินผล เช่น แบบประเมินใบกิจกรรม, แบบสังเกตพฤติกรรม" },
          criteria: { type: SchemaType.STRING, description: "เกณฑ์การผ่าน เช่น ได้ระดับคุณภาพ 2 (ดี) ขึ้นไป หรือ ผ่านเกณฑ์ร้อยละ 70" },
        },
        required: ["objective", "method", "tool", "criteria"],
      },
      description: "ตารางการวัดและประเมินผลการเรียนรู้ที่ครอบคลุมทั้ง K, P และ A",
    },
    steps_5e: {
      type: SchemaType.OBJECT,
      properties: {
        engagement: {
          type: SchemaType.STRING,
          description: "ขั้นที่ 1: ขั้นสร้างความสนใจ (Engagement) - การกระตุ้นความสนใจ ทบทวนความรู้เดิมด้วยคำถาม ปริศนา ภาพ หรือคลิปสั้น นำสู่บทเรียน",
        },
        exploration: {
          type: SchemaType.STRING,
          description: "ขั้นที่ 2: ขั้นสำรวจและค้นหา (Exploration) - ให้นักเรียนลงมือปฏิบัติกิจกรรมกลุ่ม การทดลอง สำรวจ ค้นคว้า หรือแก้ปัญหา โดยครูเป็นผู้ชี้แนะ",
        },
        explanation: {
          type: SchemaType.STRING,
          description: "ขั้นที่ 3: ขั้นอธิบายและลงข้อสรุป (Explanation) - ตัวแทนกลุ่มนำเสนอผลการสำรวจ อภิปรายร่วมกัน และสรุปองค์ความรู้เป็นมโนทัศน์",
        },
        elaboration: {
          type: SchemaType.STRING,
          description: "ขั้นที่ 4: ขั้นขยายความรู้ (Elaboration) - นำความรู้ไปประยุกต์ใช้ในสถานการณ์ใหม่ เชื่อมโยงกับชีวิตประจำวัน หรือทำแบบฝึกหัดท้าทาย",
        },
        evaluation: {
          type: SchemaType.STRING,
          description: "ขั้นที่ 5: ขั้นประเมินผล (Evaluation) - ประเมินการเรียนรู้ของนักเรียนด้วยเครื่องมือที่กำหนด และให้นักเรียนสะท้อนสิ่งที่ได้เรียนรู้",
        },
      },
      required: ["engagement", "exploration", "explanation", "elaboration", "evaluation"],
    },
    materials: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "สื่อและแหล่งเรียนรู้ (เช่น สื่อสไลด์, ใบงาน/ใบกิจกรรม, อุปกรณ์ทดลอง, วีดิทัศน์, แหล่งเรียนรู้ออนไลน์)",
    },
  },
  required: [
    "standard",
    "indicator",
    "concept",
    "kpa",
    "competencies",
    "desirable_characteristics",
    "learning_content",
    "tasks",
    "evaluation_table",
    "steps_5e",
    "materials",
  ],
};

// Candidate models list in priority order (prioritize full flash model over lite)
function getCandidateModels(): string[] {
  const envModel = process.env.GEMINI_MODEL?.trim();
  const list = [
    envModel,
    "gemini-2.5-flash",
    "gemini-3.5-flash-lite",
  ].filter((m): m is string => Boolean(m && m.length > 0));
  return Array.from(new Set(list));
}

function isModelUnavailableError(error: any): boolean {
  return (
    error?.status === 404 ||
    error?.message?.includes("404") ||
    error?.message?.includes("no longer available") ||
    error?.message?.includes("not found")
  );
}

// Sanitize text to prevent Tokenizer Glitch / Cross-lingual Leakage (e.g. Chinese 遗传, Arabic فير, Hebrew, etc.)
export function sanitizeText(text: string, subjectName?: string): string {
  if (!text || typeof text !== "string") return text;

  // 1. Repair specific known cross-lingual token glitches and corrupt subwords
  let cleaned = text
    .replace(/สาร\s*遗传\s*สาร/g, "สารพันธุกรรม")
    .replace(/สาร\s*พันธุกรรม\s*สาร/g, "สารพันธุกรรม")
    .replace(/สาร\s*遗传/g, "สารพันธุกรรม")
    .replace(/遗传\s*สาร/g, "สารพันธุกรรม")
    .replace(/การแผ่ส\s*فير\s*ความร้อน/g, "การแผ่รังสีความร้อน")
    .replace(/การแผ่ส\s*รังสี\s*ความร้อน/g, "การแผ่รังสีความร้อน")
    .replace(/ส\s*فير/g, "รังสี");

  const isChineseSubject = /จีน|chinese/i.test(subjectName || "");
  const isJapaneseSubject = /ญี่ปุ่น|japanese/i.test(subjectName || "");

  // 2. If not a Chinese course, replace any remaining 遗传 with พันธุกรรม and strip CJK ideographs
  if (!isChineseSubject) {
    cleaned = cleaned.replace(/遗传/g, "พันธุกรรม");
    // Strip Chinese/CJK Unified Ideographs, Extensions, and Compatibility Ideographs
    cleaned = cleaned.replace(/[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]/g, "");
  }

  // 3. If not a Japanese course, strip Hiragana and Katakana
  if (!isJapaneseSubject) {
    cleaned = cleaned.replace(/[\u3040-\u309F\u30A0-\u30FF]/g, "");
  }

  // 4. Remove Arabic, Hebrew, Cyrillic, Devanagari, and invalid Unicode replacement chars
  cleaned = cleaned
    .replace(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g, "") // Arabic
    .replace(/[\u0590-\u05FF]/g, "") // Hebrew
    .replace(/[\u0400-\u04FF]/g, "") // Cyrillic
    .replace(/[\u0900-\u0D7F]/g, "") // Devanagari & Indic
    .replace(/\uFFFD/g, "") // Unicode replacement char
    .replace(/[ ]{2,}/g, " ")
    .trim();

  return cleaned;
}

export function sanitizePlanContent<T>(data: T, subjectName?: string): T {
  if (typeof data === "string") {
    return sanitizeText(data, subjectName) as unknown as T;
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizePlanContent(item, subjectName)) as unknown as T;
  }
  if (data !== null && typeof data === "object") {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      cleaned[key] = sanitizePlanContent(value, subjectName);
    }
    return cleaned as T;
  }
  return data;
}

// Retry helper with exponential backoff for handling HTTP 429
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = 2,
  delayMs = 2000
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isRateLimit =
      error?.status === 429 ||
      error?.message?.includes("429") ||
      error?.message?.includes("RESOURCE_EXHAUSTED");

    if (isRateLimit && retries > 0) {
      console.warn(`[Gemini API] Rate limited (429). Retrying in ${delayMs}ms... (${retries} retries left)`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return retryWithBackoff(fn, retries - 1, delayMs * 2);
    }
    throw error;
  }
}

export async function generateLessonPlanContent(
  req: GeneratePlanRequest
): Promise<LessonPlanContent> {
  const apiKey = process.env.GEMINI_API_KEY;

  // If no API key is provided, return rich mock data so the teacher can preview & use without downtime
  if (!apiKey || apiKey.trim() === "" || apiKey === "your-gemini-api-key") {
    console.warn("[Gemini API] GEMINI_API_KEY is not configured. Using high-quality offline Thai curriculum generator.");
    return generateOfflineFallback(req);
  }

  const prompt = `
คุณคือผู้เชี่ยวชาญด้านการออกแบบหลักสูตรและการจัดทำแผนการจัดการเรียนรู้ของกระทรวงศึกษาธิการ ประเทศไทย
ภารกิจ: จัดทำเนื้อหา "แผนการจัดการเรียนรู้ตามรูปแบบสืบเสาะหาความรู้ 5 ขั้นตอน (5E Instructional Model)" ที่สมบูรณ์ สอดคล้องกับหลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน พ.ศ. 2551 (ฉบับปรับปรุง)

ข้อมูลสำหรับจัดทำแผน:
- กลุ่มสาระการเรียนรู้ / วิชา: ${req.subject_name}
- ระดับชั้น: ${req.grade_level}
- หน่วยการเรียนรู้: ${req.unit_title}
- เรื่อง / แผนย่อย: ${req.sub_unit_title}
- รหัสวิชา: ${req.subject_code || "ไม่ระบุ"}
- เวลาเรียน: ${req.learning_hours || 1} ชั่วโมง
${req.custom_requirements ? `- ความต้องการเฉพาะเพิ่มเติมจากครูผู้สอน: ${req.custom_requirements}` : ""}

แนวทางการจัดทำ:
1. มาตรฐานและตัวชี้วัด: ต้องถูกต้องตามรหัสมาตรฐานของหลักสูตรไทย (เช่น ว 1.2, ค 1.1, ท 1.1)
2. สาระสำคัญ: ชัดเจน สรุปแก่นความคิดรวบยอดของเนื้อหา
3. KPA:
   - K (Knowledge): ระบุจุดประสงค์เชิงพฤติกรรม เช่น "อธิบาย...", "ระบุ...", "จำแนก..."
   - P (Process): ทักษะกระบวนการ เช่น "ทักษะการทดลอง...", "กระบวนการสืบค้น..."
   - A (Attitude): คุณลักษณะหรือเจตคติ เช่น "มีความใฝ่เรียนรู้", "มุ่งมั่นในการทำงาน"
4. กิจกรรมการเรียนรู้ 5E (ละเอียด เป็นขั้นตอน เห็นบทบาทครูและนักเรียนชัดเจน):
   - ขั้นสร้างความสนใจ (Engagement): กระตุ้นคำถาม นำเข้าสู่บทเรียน
   - ขั้นสำรวจและค้นหา (Exploration): นักเรียนปฏิบัติจริง ทำงานกลุ่ม ทดลอง ค้นคว้า
   - ขั้นอธิบายและลงข้อสรุป (Explanation): นำเสนอผล อภิปราย สรุปหลักการ
   - ขั้นขยายความรู้ (Elaboration): นำไปประยุกต์ใช้ในชีวิตประจำวันหรือแก้โจทย์ใหม่
   - ขั้นประเมินผล (Evaluation): การวัดผล ประเมินตนเอง และสะท้อนคิด
5. สาระการเรียนรู้ (Learning Content): สรุปเนื้อหาสำคัญของบทเรียนเป็นประเด็นชัดเจนและมีหัวข้อย่อยแบบบุลเล็ต (•) เช่นเดียวกับโครงสร้างแผนของกระทรวงฯ
6. การวัดและประเมินผล: ทำตารางที่สัมพันธ์โดยตรงกับจุดประสงค์ K, P, A มีวิธีวัด เครื่องมือ และเกณฑ์ผ่านที่ชัดเจน

ข้อกำหนดภาษาและตัวอักษรที่ต้องปฏิบัติตามอย่างเคร่งครัด (ห้ามผิดพลาด):
- ใช้ภาษาไทยมาตรฐานที่เป็นทางการ สละสลวย ถูกต้องตามหลักไวยากรณ์และพจนานุกรมฉบับราชบัณฑิตยสภา
- ห้ามมีตัวอักษรภาษาจีน (เช่น 遗传), ภาษาญี่ปุ่น, ภาษาอาหรับ (เช่น فير), ภาษาฮีบรู หรืออักขระแปลกปลอมจากภาษาอื่นโดยเด็ดขาด (ห้ามเกิด Cross-lingual Token Leakage)
- คำศัพท์ทางวิชาการและวิทยาศาสตร์ ให้ใช้คำศัพท์บัญญัติภาษาไทยที่ถูกต้องตามราชบัณฑิตยสภา เช่น "สารพันธุกรรม" (ห้ามสะกดผสมภาษาจีนอย่าง สาร遗传สาร), "การแผ่รังสี" (ห้ามสะกดผสมภาษาอาหรับอย่าง การแผ่สفير) และสามารถใส่วงเล็บภาษาอังกฤษกำกับได้ เช่น สารพันธุกรรม (Genetic material)
- ให้ส่งผลลัพธ์เป็น JSON ตาม Schema ที่กำหนดเท่านั้น
`;

  const genAI = new GoogleGenerativeAI(apiKey);
  const candidateModels = getCandidateModels();
  let lastError: any = null;

  for (const modelName of candidateModels) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: lessonPlanContentSchema,
          temperature: 0.35,
          topP: 0.85,
          topK: 40,
        },
      });

      const result = await retryWithBackoff(async () => {
        const resp = await model.generateContent(prompt);
        return resp.response.text();
      });

      const parsed: LessonPlanContent = JSON.parse(result);
      return sanitizePlanContent(parsed, req.subject_name);
    } catch (error: any) {
      lastError = error;
      if (isModelUnavailableError(error)) {
        console.warn(`[Gemini API] Model ${modelName} is unavailable/deprecated (404). Trying next model...`);
        continue;
      }
      break;
    }
  }

  console.error("[Gemini API Error]:", lastError);

  const isRateLimit =
    lastError?.status === 429 ||
    lastError?.message?.includes("429") ||
    lastError?.message?.includes("RESOURCE_EXHAUSTED");

  if (isRateLimit) {
    const err = new Error(
      "โควต้าการใช้งาน Gemini AI ชั่วคราวเกินกำหนด (HTTP 429 Rate Limit) กรุณารอสัก 1-2 นาที แล้วกดลองใหม่อีกครั้ง หรือสลับไปใช้ Mock Fallback"
    );
    (err as any).statusCode = 429;
    throw err;
  }

  throw new Error(`เกิดข้อผิดพลาดในการสร้างเนื้อหาด้วย AI: ${lastError?.message || "ไม่สามารถเชื่อมต่อ AI ได้"}`);
}

// Regenerate single section (5E, KPA, Evaluation Table, or Standards)
export async function regenerateSection(
  section: "steps_5e" | "evaluation_table" | "kpa" | "standards",
  req: GeneratePlanRequest
): Promise<any> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    const fallback = generateOfflineFallback(req);
    if (section === "standards") {
      return sanitizePlanContent(
        {
          standard: fallback.standard,
          indicator: fallback.indicator,
          concept: fallback.concept,
          learning_content: fallback.learning_content,
          competencies: fallback.competencies,
          desirable_characteristics: fallback.desirable_characteristics,
        },
        req.subject_name
      );
    }
    return fallback[section];
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  let targetSchema: Schema;
  let sectionNameThai = "";

  if (section === "steps_5e") {
    sectionNameThai = "กิจกรรมการจัดการเรียนรู้ 5 ขั้นตอน (5E)";
    targetSchema = {
      type: SchemaType.OBJECT,
      properties: {
        steps_5e: {
          type: SchemaType.OBJECT,
          properties: {
            engagement: { type: SchemaType.STRING },
            exploration: { type: SchemaType.STRING },
            explanation: { type: SchemaType.STRING },
            elaboration: { type: SchemaType.STRING },
            evaluation: { type: SchemaType.STRING },
          },
          required: ["engagement", "exploration", "explanation", "elaboration", "evaluation"],
        },
      },
      required: ["steps_5e"],
    };
  } else if (section === "evaluation_table") {
    sectionNameThai = "ตารางการวัดและประเมินผลการเรียนรู้";
    targetSchema = {
      type: SchemaType.OBJECT,
      properties: {
        evaluation_table: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              objective: { type: SchemaType.STRING },
              method: { type: SchemaType.STRING },
              tool: { type: SchemaType.STRING },
              criteria: { type: SchemaType.STRING },
            },
            required: ["objective", "method", "tool", "criteria"],
          },
        },
      },
      required: ["evaluation_table"],
    };
  } else if (section === "kpa") {
    sectionNameThai = "จุดประสงค์การเรียนรู้ (KPA)";
    targetSchema = {
      type: SchemaType.OBJECT,
      properties: {
        kpa: {
          type: SchemaType.OBJECT,
          properties: {
            knowledge: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            process: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            attitude: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          },
          required: ["knowledge", "process", "attitude"],
        },
      },
      required: ["kpa"],
    };
  } else {
    sectionNameThai = "มาตรฐานการเรียนรู้ ตัวชี้วัด สาระสำคัญ และสาระการเรียนรู้";
    targetSchema = {
      type: SchemaType.OBJECT,
      properties: {
        standards: {
          type: SchemaType.OBJECT,
          properties: {
            standard: {
              type: SchemaType.STRING,
              description: "มาตรฐานการเรียนรู้ตามหลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน (เช่น มาตรฐาน ว 2.3 เข้าใจความหมายของพลังงาน...)",
            },
            indicator: {
              type: SchemaType.STRING,
              description: "ตัวชี้วัดหรือผลการเรียนรู้ที่สอดคล้องกับมาตรฐาน (เช่น ว 2.3 ป.5/5 บรรยายการได้ยินเสียงผ่านตัวกลาง...)",
            },
            concept: {
              type: SchemaType.STRING,
              description: "สาระสำคัญหรือความคิดรวบยอดของบทเรียนที่ถูกต้องตามหลักวิชาการ 2-4 บรรทัด",
            },
            learning_content: {
              type: SchemaType.STRING,
              description: "สาระการเรียนรู้ (Learning Content) สรุปเนื้อหาสำคัญของบทเรียนเป็นประเด็นชัดเจนและมีหัวข้อย่อยแบบบุลเล็ต (•)",
            },
            competencies: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description: "สมรรถนะสำคัญของผู้เรียน (2-3 ข้อ)",
            },
            desirable_characteristics: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description: "คุณลักษณะอันพึงประสงค์ (2-3 ข้อ)",
            },
          },
          required: ["standard", "indicator", "concept", "learning_content"],
        },
      },
      required: ["standards"],
    };
  }

  const prompt = `
สร้างเฉพาะส่วน "${sectionNameThai}" ใหม่ให้มีความน่าสนใจ ทันสมัย และสอดคล้องกับหลักสูตรแกนกลางการศึกษาขั้นพื้นฐานของไทยอย่างแท้จริง
วิชา: ${req.subject_name} (${req.grade_level})
หน่วยการเรียนรู้: ${req.unit_title} เรื่อง ${req.sub_unit_title}
${req.custom_requirements ? `ข้อกำหนดเพิ่มเติม: ${req.custom_requirements}` : ""}

ข้อกำหนดภาษาและตัวอักษร:
- ใช้ภาษาไทยมาตรฐานที่เป็นทางการ สละสลวย ถูกต้องตามหลักไวยากรณ์
- ห้ามมีตัวอักษรภาษาจีน (เช่น 遗传), ภาษาญี่ปุ่น, ภาษาอาหรับ หรือภาษาอื่นเด็ดขาด
- หากมีคำศัพท์ภาษาอังกฤษ ให้ใช้วงเล็บ เช่น สารพันธุกรรม (Genetic material)
`;

  const candidateModels = getCandidateModels();
  let lastError: any = null;

  for (const modelName of candidateModels) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: targetSchema,
          temperature: 0.35,
          topP: 0.85,
          topK: 40,
        },
      });

      const result = await retryWithBackoff(async () => {
        const resp = await model.generateContent(prompt);
        return resp.response.text();
      });
      const parsed = JSON.parse(result);
      const dataToReturn = section === "standards" ? parsed.standards : parsed[section];
      return sanitizePlanContent(dataToReturn, req.subject_name);
    } catch (error: any) {
      lastError = error;
      if (isModelUnavailableError(error)) {
        console.warn(`[Gemini API] Model ${modelName} unavailable, trying next candidate...`);
        continue;
      }
      console.error(`Error regenerating section ${section}:`, error);
      break;
    }
  }

  console.error(`Error regenerating section ${section}, using fallback:`, lastError);
  const fallback = generateOfflineFallback(req);
  if (section === "standards") {
    return sanitizePlanContent(
      {
        standard: fallback.standard,
        indicator: fallback.indicator,
        concept: fallback.concept,
        learning_content: fallback.learning_content,
        competencies: fallback.competencies,
        desirable_characteristics: fallback.desirable_characteristics,
      },
      req.subject_name
    );
  }
  return sanitizePlanContent(fallback[section], req.subject_name);
}

// High-quality offline Thai curriculum generator for testing or when API key is unconfigured
export function generateOfflineFallback(req: GeneratePlanRequest): LessonPlanContent {
  const subject = req.subject_name || "วิทยาศาสตร์และเทคโนโลยี";
  const unit = req.unit_title || "หน่วยที่ 1";
  const subUnit = req.sub_unit_title || "การสืบเสาะหาความรู้";
  const grade = req.grade_level || "มัธยมศึกษาปีที่ 1";

  return {
    standard: `มาตรฐาน ${subject.includes("วิทย์") ? "ว 2.1" : subject.includes("คณิต") ? "ค 1.1" : "ศ 1.1"} เข้าใจสมบัติและความสัมพันธ์ของเนื้อหาในกลุ่มสาระฯ`,
    indicator: `ม.${grade.includes("2") ? "2" : grade.includes("3") ? "3" : "1"}/1 อธิบาย วิเคราะห์ และประยุกต์ใช้ความรู้เรื่อง ${subUnit} ในชีวิตจริง`,
    concept: `การเรียนรู้เรื่อง ${subUnit} เป็นพื้นฐานสำคัญใน ${unit} ซึ่งช่วยให้ผู้เรียนเข้าใจหลักการและกระบวนการอย่างเป็นระบบ สามารถนำความรู้ไปเชื่อมโยงและแก้ปัญหาในสถานการณ์จริงได้อย่างมีเหตุผล`,
    kpa: {
      knowledge: [
        `อธิบายความหมาย หลักการ และแนวคิดสำคัญของเรื่อง ${subUnit} ได้อย่างถูกต้อง`,
        `ระบุความสัมพันธ์และองค์ประกอบที่เกี่ยวข้องกับ ${subUnit} ได้`,
      ],
      process: [
        `ปฏิบัติกิจกรรมการสำรวจและทดลองเพื่อสืบค้นข้อมูลเรื่อง ${subUnit} ได้`,
        `ทำงานร่วมกับผู้อื่นและนำเสนอผลการสืบเสาะหาความรู้ได้อย่างเป็นระบบ`,
      ],
      attitude: [
        "มีความใฝ่เรียนรู้และกระตือรือร้นในการร่วมกิจกรรม",
        "มีความรับผิดชอบ มุ่งมั่นในการทำงาน และเคารพความคิดเห็นของผู้อื่น",
      ],
    },
    competencies: [
      "ความสามารถในการสื่อสาร",
      "ความสามารถในการคิด (การคิดวิเคราะห์ และการคิดสร้างสรรค์)",
      "ความสามารถในการแก้ปัญหา",
      "ความสามารถในการใช้ทักษะชีวิต",
    ],
    desirable_characteristics: [
      "มีวินัย",
      "ใฝ่เรียนรู้",
      "มุ่งมั่นในการทำงาน",
      "อยู่อย่างพอเพียง",
    ],
    learning_content: `สาระการเรียนรู้เรื่อง ${subUnit}:\n• ความหมายและหลักการสำคัญของ ${subUnit}\n• กระบวนการทดลอง การสำรวจ และการวิเคราะห์ผล\n• การประยุกต์ใช้ความรู้ในชีวิตประจำวันอย่างเหมาะสม`,
    tasks: [
      `ใบกิจกรรมการเรียนรู้ เรื่อง ${subUnit}`,
      `แผนผังความคิด (Mind Mapping) สรุปองค์ความรู้เรื่อง ${subUnit}`,
      "แบบทดสอบประเมินความรู้หลังเรียน",
    ],
    evaluation_table: [
      {
        objective: "ด้านความรู้ (K): อธิบายหลักการสำคัญของเนื้อหา",
        method: "ตรวจใบกิจกรรมและแบบทดสอบ",
        tool: "แบบประเมินใบกิจกรรม / แบบทดสอบท้ายบท",
        criteria: "ผ่านเกณฑ์การประเมินร้อยละ 70 ขึ้นไป",
      },
      {
        objective: "ด้านทักษะ/กระบวนการ (P): ทักษะการปฏิบัติงานและการนำเสนอ",
        method: "สังเกตพฤติกรรมการปฏิบัติกิจกรรมกลุ่ม",
        tool: "แบบประเมินพฤติกรรมการทำงานกลุ่ม",
        criteria: "ได้ระดับคุณภาพ 2 (ระดับดี) ขึ้นไป",
      },
      {
        objective: "ด้านคุณลักษณะอันพึงประสงค์ (A): ความใฝ่เรียนรู้และความรับผิดชอบ",
        method: "สังเกตพฤติกรรมการเข้าเรียนและการมีส่วนร่วม",
        tool: "แบบสังเกตคุณลักษณะอันพึงประสงค์",
        criteria: "ได้ระดับคุณภาพ 2 (ระดับดี) ขึ้นไป",
      },
    ],
    steps_5e: {
      engagement: `1. ขั้นสร้างความสนใจ (Engagement) - ครูนำเข้าสู่บทเรียนโดยเปิดประเด็นคำถามชวนคิดเกี่ยวกับ "${subUnit}" พร้อมเปิดสื่อภาพหรือคลิปวิดีโอสั้นกระตุ้นความสนใจ ครูตั้งคำถาม "นักเรียนคิดว่าสิ่งนี้เกิดขึ้นได้อย่างไร?" ให้นักเรียนร่วมกันแสดงความคิดเห็นและเชื่อมโยงกับความรู้เดิม`,
      exploration: `2. ขั้นสำรวจและค้นหา (Exploration) - ให้นักเรียนแบ่งกลุ่ม กลุ่มละ 4-5 คน ร่วมกันทำกิจกรรมตามใบงาน ครูแจกอุปกรณ์และแหล่งสืบค้นข้อมูล นักเรียนแต่ละกลุ่มลงมือสำรวจ สังเกต ทดลอง และบันทึกผลการทำกิจกรรมลงในใบงาน โดยครูคอยดูแล แนะนำ และตั้งคำถามกระตุ้นการคิดอย่างใกล้ชิด`,
      explanation: `3. ขั้นอธิบายและลงข้อสรุป (Explanation) - ตัวแทนของแต่ละกลุ่มออกมานำเสนอผลการสำรวจและค้นหาหน้าชั้นเรียน ครูและนักเรียนร่วมกันอภิปรายผล จากนั้นครูสรุปเชื่อมโยงความคิดรวบยอดเรื่อง "${subUnit}" ให้นักเรียนเข้าใจหลักการและมโนทัศน์ที่ถูกต้องอย่างเป็นระบบ`,
      elaboration: `4. ขั้นขยายความรู้ (Elaboration) - ครูมอบหมายสถานการณ์จำลองหรือคำถามท้าทายให้นักเรียนนำหลักการเรื่อง "${subUnit}" ไปประยุกต์ใช้แก้ปัญหาในชีวิตจริง เช่น การประยุกต์ใช้ในชุมชนหรือสิ่งแวดล้อมรอบตัว พร้อมเปิดโอกาสให้นักเรียนซักถามข้อสงสัย`,
      evaluation: `5. ขั้นประเมินผล (Evaluation) - ครูให้นักเรียนทำแบบทดสอบประเมินความรู้ท้ายกิจกรรม และให้นักเรียนแต่ละคนเขียนสะท้อนคิด (Exit Ticket) ว่า "วันนี้ได้เรียนรู้อะไร และจะนำไปใช้อย่างไร" ครูประเมินผลงานและให้คำชมเชยเพื่อเสริมแรงทางบวก`,
    },
    materials: [
      `สไลด์ประกอบการสอน (PowerPoint / Canva) เรื่อง ${subUnit}`,
      `ใบกิจกรรมและใบความรู้ เรื่อง ${subUnit}`,
      "วีดิทัศน์ประกอบการสอนและสื่อดิจิทัลเสริมการเรียนรู้",
      "อุปกรณ์สำหรับกิจกรรมกลุ่มและการทดลองสำรวจ",
    ],
  };
}
