export interface EvaluationItem {
  objective: string;
  method: string;
  tool: string;
  criteria: string;
}

export interface Steps5E {
  engagement: string;
  exploration: string;
  explanation: string;
  elaboration: string;
  evaluation: string;
}

export interface KPA {
  knowledge: string[];
  process: string[];
  attitude: string[];
}

export interface LessonPlanContent {
  standard: string;
  indicator: string;
  concept: string;
  kpa: KPA;
  competencies: string[];
  desirable_characteristics: string[];
  learning_content?: string;
  tasks: string[];
  evaluation_table: EvaluationItem[];
  steps_5e: Steps5E;
  materials: string[];
}

export interface LessonPlan {
  id?: string;
  teacher_name: string;
  teacher_position?: string;
  plan_number: number;
  subject_code: string;
  subject_name: string;
  course_title?: string;
  grade_level: string;
  unit_number?: number | string;
  unit_title: string;
  unit_hours?: number;
  sub_unit_number?: number | string;
  sub_unit_title: string;
  learning_hours: number;
  teach_date?: string;
  mentor_name?: string;
  mentor_position?: string;
  reviewer_name?: string;
  reviewer_position?: string;
  approver_name?: string;
  approver_position?: string;
  admin_feedback?: string;
  school_logo?: string;
  content: LessonPlanContent;
  created_at?: string;
  updated_at?: string;
}

export interface GeneratePlanRequest {
  subject_name: string;
  grade_level: string;
  unit_title: string;
  sub_unit_title: string;
  subject_code?: string;
  learning_hours?: number;
  teacher_name?: string;
  custom_requirements?: string;
  section?: 'all' | 'steps_5e' | 'evaluation_table' | 'kpa';
  current_plan?: Partial<LessonPlan>;
}

export interface PresetItem {
  id: string;
  category: "sci" | "math" | "thai" | "eng" | "soc" | "other";
  label: string;
  badge: string;
  subject_name: string;
  grade_level: string;
  subject_code: string;
  unit_title: string;
  sub_unit_title: string;
  learning_hours: number;
  custom_requirements: string;
  display_order?: number;
  created_at?: string;
}

