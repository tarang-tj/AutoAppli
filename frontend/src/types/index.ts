export type JobStatus = "bookmarked" | "applied" | "interviewing" | "offer" | "rejected" | "ghosted";

export interface Job {
  id: string;
  company: string;
  title: string;
  url?: string;
  description?: string;
  status: JobStatus;
  /** Order within the Kanban column; persisted when using the API or demo store. */
  sort_order?: number;
  source: string;
  notes?: string;
  applied_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Resume {
  id: string;
  file_name: string;
  storage_path: string;
  parsed_text: string;
  is_primary: boolean;
  created_at: string;
}

export interface GeneratedDocument {
  id: string;
  doc_type: "tailored_resume" | "cover_letter";
  content?: string;
  storage_path: string;
  download_url: string;
  /** Base64-encoded PDF when the API generated one (`include_pdf: true`). */
  pdf_base64?: string | null;
}

export interface ResumeReview {
  id: string;
  overall_score: number;
  ats_score: number;
  strengths: string[];
  improvements: string[];
  ats_issues: string[];
  missing_sections: string[];
  keyword_suggestions: string[];
}

export interface OutreachMessage {
  id: string;
  message_type: "email" | "linkedi