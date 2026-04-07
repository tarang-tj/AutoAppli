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
  /** Present on POST /jobs when this URL was already on the user’s board. */
  duplicate?: boolean;
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
  message_type: "email" | "linkedin";
  recipient_name: string;
  recipient_role?: string;
  subject?: string;
  body: string;
  created_at: string;
}

export interface UserProfile {
  display_name: string;
  headline: string;
  linkedin_url: string;
  updated_at?: string | null;
}

/** Saved tailored resume text from the API (Supabase) or demo store. */
export interface SavedTailoredDocument {
  id: string;
  doc_type: string;
  title: string;
  resume_id?: string | null;
  job_description_excerpt: string;
  content: string;
  created_at: string;
}

export interface Contact {
  id: string;
  name: string;
  role?: string;
  email?: string;
  linkedin_url?: string;
  notes?: string;
  created_at: string;
}

export interface JobSearchResult {
  title: string;
  company: string;
  location: string;
  url: string;
  snippet: string;
  posted_date?: string;
  source: string;
}

/** Row from GET /search/history (Supabase-backed API, signed-in user). */
export interface JobSearchHistoryItem {
  id: string;
  query: string;
  location: string;
  remote_only: boolean;
  result_count: number;
  created_at: string;
}
