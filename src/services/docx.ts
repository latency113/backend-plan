import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  TableLayoutType,
  ImageRun,
} from "docx";
import * as fs from "fs";
import * as path from "path";
import type{ LessonPlan } from "../types/lesson-plan";

const FONT_NAME = "TH Sarabun PSK";
const FONT_SIZE = 32; // 16pt throughout the entire document
const LINE_SPACING = 240; // 1.0 single line spacing
const TABLE_WIDTH = 9332; // DXA (Printable width of A4 with 1.0in left, 2.0cm right margin)

const NO_BORDERS = {
  top: { style: BorderStyle.NONE, size: 0, color: "auto" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
  left: { style: BorderStyle.NONE, size: 0, color: "auto" },
  right: { style: BorderStyle.NONE, size: 0, color: "auto" },
  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
  insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" },
};

const CELL_NO_BORDER = {
  top: { style: BorderStyle.NONE, size: 0, color: "auto" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
  left: { style: BorderStyle.NONE, size: 0, color: "auto" },
  right: { style: BorderStyle.NONE, size: 0, color: "auto" },
};

const DOUBLE_BOTTOM_BORDER = {
  style: BorderStyle.DOUBLE,
  size: 12,
  color: "000000",
};

// Invisible zero-height separator paragraph so Word does not merge adjacent tables
function createSeparator(): Paragraph {
  return new Paragraph({
    spacing: { before: 0, after: 0, line: 20 },
    children: [new TextRun({ text: "", size: 2 })],
  });
}

function createHeading(text: string, spaceBefore = 140, spaceAfter = 40): Paragraph {
  return new Paragraph({
    spacing: { before: spaceBefore, after: spaceAfter, line: LINE_SPACING },
    children: [
      new TextRun({
        text,
        bold: true,
        font: FONT_NAME,
        size: FONT_SIZE,
        color: "000000",
      }),
    ],
  });
}

function createBodyParagraph(text: string, firstLineIndent = 0): Paragraph {
  const cleanText = text.replace(/[ \t]{2,}/g, " ");
  return new Paragraph({
    alignment: AlignmentType.THAI_DISTRIBUTE,
    indent: firstLineIndent > 0 ? { firstLine: firstLineIndent } : undefined,
    spacing: { before: 20, after: 20, line: LINE_SPACING },
    children: [
      new TextRun({
        text: cleanText,
        font: FONT_NAME,
        size: FONT_SIZE,
        color: "000000",
      }),
    ],
  });
}

function createNumberedItem(num: string | number, text: string): Paragraph {
  const cleanText = text.replace(/[ \t]{2,}/g, " ");
  return new Paragraph({
    alignment: AlignmentType.THAI_DISTRIBUTE,
    indent: { left: 720, hanging: 360 }, // Matches test-data.pdf list indent
    spacing: { before: 20, after: 20, line: LINE_SPACING },
    children: [
      new TextRun({
        text: `${num}.  `,
        font: FONT_NAME,
        size: FONT_SIZE,
        color: "000000",
      }),
      new TextRun({
        text: cleanText,
        font: FONT_NAME,
        size: FONT_SIZE,
        color: "000000",
      }),
    ],
  });
}

function createBulletItem(text: string, indentLeft = 720, bulletSymbol = "•   "): Paragraph {
  const cleanText = text.replace(/[ \t]{2,}/g, " ");
  return new Paragraph({
    alignment: AlignmentType.THAI_DISTRIBUTE,
    indent: { left: indentLeft, hanging: 360 },
    spacing: { before: 20, after: 20, line: LINE_SPACING },
    children: [
      new TextRun({
        text: bulletSymbol,
        font: FONT_NAME,
        size: FONT_SIZE,
        color: "000000",
      }),
      new TextRun({
        text,
        font: FONT_NAME,
        size: FONT_SIZE,
        color: "000000",
      }),
    ],
  });
}

function createTwoColItem(code: string, desc: string): Table {
  return new Table({
    width: { size: TABLE_WIDTH, type: WidthType.DXA },
    columnWidths: [2053, 7279],
    layout: TableLayoutType.FIXED,
    borders: NO_BORDERS,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 2053, type: WidthType.DXA },
            borders: CELL_NO_BORDER,
            margins: { top: 20, bottom: 20, left: 0, right: 60 },
            children: [
              new Paragraph({
                spacing: { before: 0, after: 0, line: LINE_SPACING },
                children: [
                  new TextRun({
                    text: code,
                    bold: true,
                    font: FONT_NAME,
                    size: FONT_SIZE,
                    color: "000000",
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 7279, type: WidthType.DXA },
            borders: CELL_NO_BORDER,
            margins: { top: 20, bottom: 20, left: 60, right: 0 },
            children: [
              new Paragraph({
                alignment: AlignmentType.THAI_DISTRIBUTE,
                spacing: { before: 0, after: 0, line: LINE_SPACING },
                children: [
                  new TextRun({
                    text: desc.replace(/[ \t]{2,}/g, " "),
                    font: FONT_NAME,
                    size: FONT_SIZE,
                    color: "000000",
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function parseStepToParagraphs(text?: string): Paragraph[] {
  if (!text || !text.trim()) {
    return [
      new Paragraph({
        indent: { left: 720 },
        spacing: { before: 20, after: 20, line: LINE_SPACING },
        children: [
          new TextRun({
            text: "-",
            font: FONT_NAME,
            size: FONT_SIZE,
            color: "000000",
          }),
        ],
      }),
    ];
  }

  const rawLines = text.split("\n").filter((line) => {
    const t = line.trim();
    if (!t) return false;
    if (
      /^(ขั้นที่\s*\d+|ขั้น\s*(สร้างความสนใจ|สำรวจและค้นหา|อธิบายและลงข้อสรุป|ขยายความรู้|ประเมินผล|นำเข้าสู่บทเรียน)|(1|2|3|4|5)\.\s*ขั้น)/i.test(
        t
      )
    ) {
      const stripped = t
        .replace(
          /^(ขั้นที่\s*\d+|ขั้น\s*(สร้างความสนใจ|สำรวจและค้นหา|อธิบายและลงข้อสรุป|ขยายความรู้|ประเมินผล|นำเข้าสู่บทเรียน)|(1|2|3|4|5)\.\s*ขั้น)/i,
          ""
        )
        .replace(/[:\-–—]/g, "")
        .replace(
          /\((Engagement|Exploration|Explanation|Elaboration|Evaluation|\d+\s*นาที)\)/gi,
          ""
        )
        .trim();
      return stripped !== "" && !/^(สร้างความสนใจ|สำรวจและค้นหา|อธิบายและลงข้อสรุป|ขยายความรู้|ประเมินผล)$/.test(stripped);
    }
    return true;
  });

  const paragraphs: Paragraph[] = [];

  for (const rawLine of rawLines) {
    const line = rawLine.trim().replace(/[ \t]{2,}/g, " ");
    if (!line) continue;

    const isIndented = /^\s{2,}|\t/.test(rawLine);

    // 1. Arrow flow diagram (e.g. "แหล่งกำเนิดเสียง → ตัวกลาง → หูของผู้ฟัง")
    if (line.includes("→") && (line.startsWith("→") || isIndented || line.startsWith("ของแข็ง") || line.startsWith("แหล่งกำเนิดเสียง"))) {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          indent: { left: 720 },
          spacing: { before: 30, after: 30, line: LINE_SPACING },
          children: [
            new TextRun({
              text: line,
              font: FONT_NAME,
              size: FONT_SIZE,
              color: "000000",
            }),
          ],
        })
      );
      continue;
    }

    // 2. Sub-headings (e.g. 'กิจกรรม ...', 'ตอนที่ ...', 'สถานการณ์ที่ ...')
    if (
      line.startsWith("กิจกรรม") ||
      line.startsWith("ตอนที่") ||
      line.startsWith("สถานการณ์ที่") ||
      line.startsWith("กรณีศึกษา")
    ) {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { before: 80, after: 20, line: LINE_SPACING },
          children: [
            new TextRun({
              text: line,
              bold: true,
              font: FONT_NAME,
              size: FONT_SIZE,
              color: "000000",
            }),
          ],
        })
      );
      continue;
    }

    // 3. Bullet items (matches circle ○, bullet •, dash -)
    const bulletMatch =
      line.match(/^([-•–—\u25CB\u25E6*▪▫✦✓✔])\s*(.*)$/) ||
      line.match(/^([oO])\s+(.*)$/);
    if (bulletMatch) {
      // In test-data.pdf, 5E questions use circle "○  "
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.THAI_DISTRIBUTE,
          indent: { left: 1080, hanging: 360 }, // Level 2 indent
          spacing: { before: 20, after: 20, line: LINE_SPACING },
          children: [
            new TextRun({
              text: "○   ",
              font: FONT_NAME,
              size: FONT_SIZE,
              color: "000000",
            }),
            new TextRun({
              text: bulletMatch[2],
              font: FONT_NAME,
              size: FONT_SIZE,
              color: "000000",
            }),
          ],
        })
      );
      continue;
    }

    // 4. Sub-numbered items (1.1, (1), 1) or indented number)
    const subNumMatch = line.match(/^(\d+\.\d+[\.)]?|\(\d+\)|\d+\))\s*(.*)$/);
    const regularNumMatch = line.match(/^(\d+[\.]|[๑-๙]+[\.])\s*(.*)$/);

    if (subNumMatch || (isIndented && regularNumMatch)) {
      const numLabel = subNumMatch ? subNumMatch[1] : regularNumMatch![1];
      const textContent = subNumMatch ? subNumMatch[2] : regularNumMatch![2];
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.THAI_DISTRIBUTE,
          indent: { left: 1080, hanging: 360 }, // Level 2 indent
          spacing: { before: 20, after: 20, line: LINE_SPACING },
          children: [
            new TextRun({
              text: `${numLabel}  `,
              font: FONT_NAME,
              size: FONT_SIZE,
              color: "000000",
            }),
            new TextRun({
              text: textContent,
              font: FONT_NAME,
              size: FONT_SIZE,
              color: "000000",
            }),
          ],
        })
      );
      continue;
    }

    // 5. Root numbered list items (1. , 2. )
    if (regularNumMatch) {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.THAI_DISTRIBUTE,
          indent: { left: 720, hanging: 360 }, // Matches test-data.pdf list indent
          spacing: { before: 20, after: 20, line: LINE_SPACING },
          children: [
            new TextRun({
              text: `${regularNumMatch[1]}  `,
              font: FONT_NAME,
              size: FONT_SIZE,
              color: "000000",
            }),
            new TextRun({
              text: regularNumMatch[2],
              font: FONT_NAME,
              size: FONT_SIZE,
              color: "000000",
            }),
          ],
        })
      );
      continue;
    }

    // 6. Regular text lines / continuation paragraphs
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.THAI_DISTRIBUTE,
        indent: { left: isIndented ? 720 : 0 },
        spacing: { before: 20, after: 20, line: LINE_SPACING },
        children: [
          new TextRun({
            text: line,
            font: FONT_NAME,
            size: FONT_SIZE,
            color: "000000",
          }),
        ],
      })
    );
  }

  return paragraphs;
}

export async function exportLessonPlanToDocx(plan: LessonPlan): Promise<Buffer> {
  const topElements: Paragraph[] = [];

  // 1. School Emblem / Logo
  let logoBuffer: Buffer | null = null;
  if (plan.school_logo && plan.school_logo.startsWith("data:image")) {
    const base64Data = plan.school_logo.split(";base64,").pop();
    if (base64Data) {
      logoBuffer = Buffer.from(base64Data, "base64");
    }
  }
  if (!logoBuffer) {
    const logoPaths = [
      path.resolve(process.cwd(), "src/templates/school-logo.png"),
      path.resolve(process.cwd(), "templates/school-logo.png"),
      typeof import.meta !== "undefined" && import.meta.dir
        ? path.resolve(import.meta.dir, "../templates/school-logo.png")
        : "",
    ].filter(Boolean);
    for (const lp of logoPaths) {
      if (fs.existsSync(lp)) {
        try {
          logoBuffer = fs.readFileSync(lp);
          break;
        } catch (err) {
          console.warn("Logo read error:", err);
        }
      }
    }
  }

  if (logoBuffer) {
    topElements.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 120 },
        children: [
          new ImageRun({
            type: "png",
            data: logoBuffer,
            transformation: {
              width: 75,
              height: 75,
            },
          }),
        ],
      })
    );
  }

  // 2. Document Title
  topElements.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 140, line: LINE_SPACING },
      children: [
        new TextRun({
          text: `แผนการจัดการเรียนรู้ที่ ${plan.plan_number || 36}`,
          bold: true,
          font: FONT_NAME,
          size: FONT_SIZE,
          color: "000000",
        }),
      ],
    })
  );

  // 3. Header Tables (Exact columns & Double bottom border matching A4Preview & test-data.pdf)
  // Table 1: Row 1 & Row 2 (2 columns: 5200 dxa & 4132 dxa)
  const headerTable1 = new Table({
    width: { size: TABLE_WIDTH, type: WidthType.DXA },
    columnWidths: [5200, 4132],
    layout: TableLayoutType.FIXED,
    borders: NO_BORDERS,
    rows: [
      // Row 1: รหัสวิชา (left) / รายวิชา (right)
      new TableRow({
        children: [
          new TableCell({
            width: { size: 5200, type: WidthType.DXA },
            borders: CELL_NO_BORDER,
            margins: { top: 10, bottom: 10, left: 0, right: 0 },
            children: [
              new Paragraph({
                spacing: { before: 10, after: 10, line: LINE_SPACING },
                children: [
                  new TextRun({ text: `รหัสวิชา ${plan.subject_code || "15101"}`, font: FONT_NAME, size: FONT_SIZE }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 4132, type: WidthType.DXA },
            borders: CELL_NO_BORDER,
            margins: { top: 10, bottom: 10, left: 0, right: 0 },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { before: 10, after: 10, line: LINE_SPACING },
                children: [
                  new TextRun({ text: plan.course_title || `รายวิชา${plan.subject_name || "วิทยาศาสตร์และเทคโนโลยี"}`, font: FONT_NAME, size: FONT_SIZE }),
                ],
              }),
            ],
          }),
        ],
      }),
      // Row 2: กลุ่มสาระการเรียนรู้ (left) / ชั้น (right)
      new TableRow({
        children: [
          new TableCell({
            width: { size: 5200, type: WidthType.DXA },
            borders: CELL_NO_BORDER,
            margins: { top: 10, bottom: 10, left: 0, right: 0 },
            children: [
              new Paragraph({
                spacing: { before: 10, after: 10, line: LINE_SPACING },
                children: [
                  new TextRun({ text: `กลุ่มสาระการเรียนรู้ ${plan.subject_name || "วิทยาศาสตร์และเทคโนโลยี"}`, font: FONT_NAME, size: FONT_SIZE }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 4132, type: WidthType.DXA },
            borders: CELL_NO_BORDER,
            margins: { top: 10, bottom: 10, left: 0, right: 0 },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { before: 10, after: 10, line: LINE_SPACING },
                children: [
                  new TextRun({ text: `ชั้น ${plan.grade_level || "ประถมศึกษาปีที่ 5"}`, font: FONT_NAME, size: FONT_SIZE }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // Table 2: Row 3 & Row 4 (3 columns: 2800 dxa, 3932 dxa, 2600 dxa)
  const headerTable2 = new Table({
    width: { size: TABLE_WIDTH, type: WidthType.DXA },
    columnWidths: [2800, 3932, 2600],
    layout: TableLayoutType.FIXED,
    borders: NO_BORDERS,
    rows: [
      // Row 3: ชื่อหน่วยการเรียนรู้ที่ (Col 1) / เรื่อง (Col 2) / จำนวน ... ชั่วโมง (Col 3)
      new TableRow({
        children: [
          new TableCell({
            width: { size: 2800, type: WidthType.DXA },
            borders: CELL_NO_BORDER,
            margins: { top: 10, bottom: 10, left: 0, right: 0 },
            children: [
              new Paragraph({
                spacing: { before: 10, after: 10, line: LINE_SPACING },
                children: [
                  new TextRun({ text: `ชื่อหน่วยการเรียนรู้ที่ ${plan.unit_number || 5}`, font: FONT_NAME, size: FONT_SIZE }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 3932, type: WidthType.DXA },
            borders: CELL_NO_BORDER,
            margins: { top: 10, bottom: 10, left: 0, right: 0 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 10, after: 10, line: LINE_SPACING },
                children: [
                  new TextRun({ text: `เรื่อง ${plan.unit_title || "แรงและพลังงาน"}`, font: FONT_NAME, size: FONT_SIZE }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 2600, type: WidthType.DXA },
            borders: CELL_NO_BORDER,
            margins: { top: 10, bottom: 10, left: 0, right: 0 },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { before: 10, after: 10, line: LINE_SPACING },
                children: [
                  new TextRun({ text: `จำนวน ${plan.unit_hours || 12} ชั่วโมง`, font: FONT_NAME, size: FONT_SIZE }),
                ],
              }),
            ],
          }),
        ],
      }),
      // Row 4: หน่วยย่อยที่ (Col 1) / เรื่อง (Col 2) / เวลา ... ชั่วโมง (Col 3)
      new TableRow({
        children: [
          new TableCell({
            width: { size: 2800, type: WidthType.DXA },
            borders: CELL_NO_BORDER,
            margins: { top: 10, bottom: 10, left: 0, right: 0 },
            children: [
              new Paragraph({
                spacing: { before: 10, after: 10, line: LINE_SPACING },
                children: [
                  new TextRun({ text: `หน่วยย่อยที่ ${plan.sub_unit_number || 1}`, font: FONT_NAME, size: FONT_SIZE }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 3932, type: WidthType.DXA },
            borders: CELL_NO_BORDER,
            margins: { top: 10, bottom: 10, left: 0, right: 0 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 10, after: 10, line: LINE_SPACING },
                children: [
                  new TextRun({ text: `เรื่อง ${plan.sub_unit_title || "พลังงานเสียง"}`, font: FONT_NAME, size: FONT_SIZE }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 2600, type: WidthType.DXA },
            borders: CELL_NO_BORDER,
            margins: { top: 10, bottom: 10, left: 0, right: 0 },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { before: 10, after: 10, line: LINE_SPACING },
                children: [
                  new TextRun({ text: `เวลา ${plan.learning_hours || 1} ชั่วโมง`, font: FONT_NAME, size: FONT_SIZE }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // Table 3: Row 5 (2 columns: 5200 dxa & 4132 dxa) WITH DOUBLE BOTTOM BORDER
  const headerTable3 = new Table({
    width: { size: TABLE_WIDTH, type: WidthType.DXA },
    columnWidths: [5200, 4132],
    layout: TableLayoutType.FIXED,
    borders: {
      ...NO_BORDERS,
      bottom: DOUBLE_BOTTOM_BORDER,
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 5200, type: WidthType.DXA },
            borders: { ...CELL_NO_BORDER, bottom: DOUBLE_BOTTOM_BORDER },
            margins: { top: 10, bottom: 40, left: 0, right: 0 },
            children: [
              new Paragraph({
                spacing: { before: 10, after: 10, line: LINE_SPACING },
                children: [
                  new TextRun({ text: `วันที่ทำการสอน  ${plan.teach_date || "วันที่ 1 กันยายน 2569"}`, font: FONT_NAME, size: FONT_SIZE }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 4132, type: WidthType.DXA },
            borders: { ...CELL_NO_BORDER, bottom: DOUBLE_BOTTOM_BORDER },
            margins: { top: 10, bottom: 40, left: 0, right: 0 },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { before: 10, after: 10, line: LINE_SPACING },
                children: [
                  new TextRun({ text: `ผู้สอน ${plan.teacher_name || "นางสาวพีรภัทร พุ่มสิน"}`, font: FONT_NAME, size: FONT_SIZE }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // Body Elements
  const bodyElements: (Paragraph | Table)[] = [];

  // มาตรฐานการเรียนรู้และตัวชี้วัด
  bodyElements.push(createHeading("มาตรฐานการเรียนรู้และตัวชี้วัด", 160, 40));
  bodyElements.push(createHeading("มาตรฐานการเรียนรู้", 80, 20));
  const stdText = plan.content?.standard || "";
  const stdMatch = stdText.match(/^(มาตรฐาน\s*[^\s]+\s*[\d.]*)/);
  const stdCode = stdMatch ? stdMatch[0].trim() : (plan.subject_code ? `มาตรฐาน ${plan.subject_code}` : "มาตรฐาน ว 2.3");
  const stdDesc = stdText.replace(/^(มาตรฐาน\s*[^\s]+\s*[\d.]*\s*)/, "").trim() || stdText;
  bodyElements.push(createTwoColItem(stdCode, stdDesc));

  bodyElements.push(createHeading("ตัวชี้วัด", 80, 20));
  const indText = plan.content?.indicator || "";
  const indMatch = indText.match(/^(ว\s*[\d.]*\s*ป\.?\d+\/\d+|[^\s]+\s*[\d.]*\s*[มป]\.?\d+\/\d+)/);
  const indCode = indMatch ? indMatch[0].trim() : "ว 2.3 ป.5/5";
  const indDesc = indText.replace(/^(ว\s*[\d.]*\s*ป\.?\d+\/\d+|[^\s]+\s*[\d.]*\s*[มป]\.?\d+\/\d+)\s*/, "").trim() || indText;
  bodyElements.push(createTwoColItem(indCode, indDesc));

  // สาระสำคัญ
  bodyElements.push(createHeading("สาระสำคัญ", 140, 40));
  bodyElements.push(createBodyParagraph(plan.content?.concept || "-", 720));

  // จุดประสงค์การเรียนรู้
  bodyElements.push(createHeading("จุดประสงค์การเรียนรู้", 140, 40));
  let objIndex = 1;
  for (const k of plan.content?.kpa?.knowledge || []) {
    bodyElements.push(createNumberedItem(objIndex++, k));
  }
  for (const p of plan.content?.kpa?.process || []) {
    bodyElements.push(createNumberedItem(objIndex++, p));
  }
  for (const a of plan.content?.kpa?.attitude || []) {
    bodyElements.push(createNumberedItem(objIndex++, a));
  }

  // สมรรถนะสำคัญ
  bodyElements.push(createHeading("สมรรถนะสำคัญ", 140, 40));
  (plan.content?.competencies || []).forEach((item, idx) => {
    bodyElements.push(createNumberedItem(idx + 1, item.replace(/^\d+\.\s*/, "")));
  });

  // คุณลักษณะอันพึงประสงค์
  bodyElements.push(createHeading("คุณลักษณะอันพึงประสงค์", 140, 40));
  (plan.content?.desirable_characteristics || []).forEach((item, idx) => {
    bodyElements.push(createNumberedItem(idx + 1, item.replace(/^\d+\.\s*/, "")));
  });

  // สาระการเรียนรู้ (Matches test-data.pdf page 2!)
  bodyElements.push(createHeading("สาระการเรียนรู้", 140, 40));
  const contentText =
    plan.content?.learning_content ||
    plan.content?.concept ||
    `สาระการเรียนรู้เรื่อง ${plan.sub_unit_title || plan.unit_title || "บทเรียน"}`;

  const contentLines = contentText.split("\n");
  for (const cl of contentLines) {
    const trimmed = cl.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("•") || trimmed.startsWith("-") || trimmed.startsWith("*")) {
      bodyElements.push(createBulletItem(trimmed.replace(/^[•\-\*]\s*/, ""), 720, "•   "));
    } else {
      bodyElements.push(createBodyParagraph(trimmed, 0));
    }
  }

  // ชิ้นงาน / ภาระงาน
  bodyElements.push(createHeading("ชิ้นงาน / ภาระงาน", 140, 40));
  const tasks = (plan.content?.tasks && plan.content.tasks.length > 0)
    ? plan.content.tasks
    : [
        "ใบงาน เรื่อง “เสียงเดินทางผ่านอะไร?”",
        "การบันทึกผลการสังเกตจากกิจกรรม “เสียงเดินทางผ่านตัวกลาง”",
      ];
  tasks.forEach((task, idx) => {
    bodyElements.push(createNumberedItem(idx + 1, task.replace(/^\d+\.\s*/, "")));
  });

  // การวัดและประเมินผล (ตาราง) - Thin black borders, White header
  bodyElements.push(createHeading("การวัดและประเมินผล", 160, 60));
  const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: "000000" };

  const tableHeaderCell = (text: string, widthDxa: number) =>
    new TableCell({
      width: { size: widthDxa, type: WidthType.DXA },
      borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
      margins: { top: 60, bottom: 60, left: 80, right: 80 },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 20, after: 20, line: LINE_SPACING },
          children: [
            new TextRun({ text, bold: true, font: FONT_NAME, size: FONT_SIZE, color: "000000" }),
          ],
        }),
      ],
    });

  const tableBodyCell = (
    text: string,
    widthDxa: number,
    align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.CENTER
  ) =>
    new TableCell({
      width: { size: widthDxa, type: WidthType.DXA },
      borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
      margins: { top: 60, bottom: 60, left: 80, right: 80 },
      children: [
        new Paragraph({
          alignment: align,
          spacing: { before: 20, after: 20, line: LINE_SPACING },
          children: [
            new TextRun({ text, font: FONT_NAME, size: FONT_SIZE, color: "000000" }),
          ],
        }),
      ],
    });

  const tableRows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [
        tableHeaderCell("สิ่งที่ต้องการวัด", 2986),
        tableHeaderCell("วิธีการวัด", 1866),
        tableHeaderCell("เครื่องมือ", 1866),
        tableHeaderCell("เกณฑ์การประเมิน", 2614),
      ],
    }),
  ];

  for (const row of plan.content?.evaluation_table || []) {
    tableRows.push(
      new TableRow({
        children: [
          tableBodyCell(row.objective || "-", 2986, AlignmentType.LEFT),
          tableBodyCell(row.method || "-", 1866, AlignmentType.CENTER),
          tableBodyCell(row.tool || "-", 1866, AlignmentType.CENTER),
          tableBodyCell(row.criteria || "-", 2614, AlignmentType.CENTER),
        ],
      })
    );
  }

  bodyElements.push(
    new Table({
      width: { size: TABLE_WIDTH, type: WidthType.DXA },
      columnWidths: [2986, 1866, 1866, 2614],
      layout: TableLayoutType.FIXED,
      rows: tableRows,
    })
  );

  // กิจกรรมการเรียนรู้ (5E)
  bodyElements.push(createHeading("กิจกรรมการเรียนรู้ (5E)", 180, 40));

  bodyElements.push(createHeading("ขั้นสร้างความสนใจ", 100, 20));
  bodyElements.push(...parseStepToParagraphs(plan.content?.steps_5e?.engagement));

  bodyElements.push(createHeading("ขั้นสำรวจและค้นหา", 100, 20));
  bodyElements.push(...parseStepToParagraphs(plan.content?.steps_5e?.exploration));

  bodyElements.push(createHeading("ขั้นอธิบายและลงข้อสรุป", 100, 20));
  bodyElements.push(...parseStepToParagraphs(plan.content?.steps_5e?.explanation));

  bodyElements.push(createHeading("ขั้นขยายความรู้", 100, 20));
  bodyElements.push(...parseStepToParagraphs(plan.content?.steps_5e?.elaboration));

  bodyElements.push(createHeading("ขั้นประเมินผล", 100, 20));
  bodyElements.push(...parseStepToParagraphs(plan.content?.steps_5e?.evaluation));

  // สื่อการเรียนรู้ / แหล่งการเรียนรู้
  bodyElements.push(createHeading("สื่อการเรียนรู้ / แหล่งการเรียนรู้", 160, 40));
  (plan.content?.materials || []).forEach((mat, idx) => {
    bodyElements.push(createNumberedItem(idx + 1, mat.replace(/^\d+\.\s*/, "")));
  });

  // ลายมือชื่อ (Signatures) & ข้อเสนอแนะจากผู้บริหาร
  bodyElements.push(new Paragraph({ spacing: { before: 240, after: 0 }, children: [] }));

  // แถวที่ 1: ผู้สอน และ ครูพี่เลี้ยง
  bodyElements.push(
    new Table({
      width: { size: TABLE_WIDTH, type: WidthType.DXA },
      columnWidths: [4666, 4666],
      layout: TableLayoutType.FIXED,
      borders: NO_BORDERS,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 4666, type: WidthType.DXA },
              borders: CELL_NO_BORDER,
              children: [
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 10, after: 10, line: LINE_SPACING }, children: [new TextRun({ text: "ลงชื่อ .......................................... ผู้สอน", font: FONT_NAME, size: FONT_SIZE })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 10, after: 10, line: LINE_SPACING }, children: [new TextRun({ text: `(${plan.teacher_name || "นางสาว พีรภัทร พุ่มสิน"})`, font: FONT_NAME, size: FONT_SIZE })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 10, after: 10, line: LINE_SPACING }, children: [new TextRun({ text: plan.teacher_position || "นักศึกษาฝึกประสบการณ์ชั้นปีที่ 4", font: FONT_NAME, size: FONT_SIZE })] }),
              ],
            }),
            new TableCell({
              width: { size: 4666, type: WidthType.DXA },
              borders: CELL_NO_BORDER,
              children: [
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 10, after: 10, line: LINE_SPACING }, children: [new TextRun({ text: "ลงชื่อ .......................................... ครูพี่เลี้ยง", font: FONT_NAME, size: FONT_SIZE })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 10, after: 10, line: LINE_SPACING }, children: [new TextRun({ text: `(${plan.mentor_name || "นายนิวัฒน์ ไม้ใหญ่เจริญวงศ์"})`, font: FONT_NAME, size: FONT_SIZE })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 10, after: 10, line: LINE_SPACING }, children: [new TextRun({ text: plan.mentor_position || "ครูพี่เลี้ยง", font: FONT_NAME, size: FONT_SIZE })] }),
              ],
            }),
          ],
        }),
      ],
    })
  );

  // ข้อเสนอแนะจากผู้บริหาร
  bodyElements.push(createHeading("ข้อเสนอแนะจากผู้บริหาร", 200, 40));
  for (let i = 0; i < 4; i++) {
    bodyElements.push(
      new Paragraph({
        spacing: { before: 60, after: 60, line: LINE_SPACING },
        children: [
          new TextRun({
            text: "..................................................................................................................................................",
            font: FONT_NAME,
            size: FONT_SIZE,
            color: "000000",
          }),
        ],
      })
    );
  }

  // แถวที่ 2: ผู้ตรวจ และ ผู้อนุมัติ
  bodyElements.push(new Paragraph({ spacing: { before: 200, after: 0 }, children: [] }));
  bodyElements.push(
    new Table({
      width: { size: TABLE_WIDTH, type: WidthType.DXA },
      columnWidths: [4666, 4666],
      layout: TableLayoutType.FIXED,
      borders: NO_BORDERS,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 4666, type: WidthType.DXA },
              borders: CELL_NO_BORDER,
              children: [
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 10, after: 10, line: LINE_SPACING }, children: [new TextRun({ text: "ลงชื่อ...........................................ผู้ตรวจ", font: FONT_NAME, size: FONT_SIZE })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 10, after: 10, line: LINE_SPACING }, children: [new TextRun({ text: `(${plan.reviewer_name || "นางสาวสุมา สามเพชรเจริญ"})`, font: FONT_NAME, size: FONT_SIZE })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 10, after: 10, line: LINE_SPACING }, children: [new TextRun({ text: plan.reviewer_position || "รองผู้อำนวยการสถานศึกษา", font: FONT_NAME, size: FONT_SIZE })] }),
              ],
            }),
            new TableCell({
              width: { size: 4666, type: WidthType.DXA },
              borders: CELL_NO_BORDER,
              children: [
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 10, after: 10, line: LINE_SPACING }, children: [new TextRun({ text: "ลงชื่อ...........................................ผู้อนุมัติ", font: FONT_NAME, size: FONT_SIZE })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 10, after: 10, line: LINE_SPACING }, children: [new TextRun({ text: `(${plan.approver_name || "นางสาวสริตาภร สุวรรณดี"})`, font: FONT_NAME, size: FONT_SIZE })] }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 10, after: 10, line: LINE_SPACING },
                  children: [
                    new TextRun({
                      text: "ผู้อำนวยการสถานศึกษา โรงเรียนเทศบาล ๕ วัดพระปฐมเจดีย์ ช่วยปฏิบัติราชการในตำแหน่ง ผู้อำนวยการสถานศึกษา โรงเรียนเทศบาล ๓ (สระกระเทียม)",
                      font: FONT_NAME,
                      size: 24,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              bottom: 1134,
              left: 1440,
              right: 1134,
            },
          },
        },
        children: [
          ...topElements,
          headerTable1,
          createSeparator(),
          headerTable2,
          createSeparator(),
          headerTable3,
          ...bodyElements,
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
