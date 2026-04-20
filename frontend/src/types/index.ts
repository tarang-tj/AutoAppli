export type JobStatus = "bookmarked" | "applied" | "interviewing" | "offer" | "rejected" | "ghosted";
export type RemoteType = "remote" | "hybrid" | "onsite" | "unknown";
export type JobType = "full_time" | "part_time" | "contract" | "internship" | "freelance";
export type ExperienceLevel = "intern" | "entry" | "mid" | "senior" | "lead" | "director" | "vp" | "c_level";

/**
 * Why an application reached a terminal state. Persisted to
 * jobs.closed_reason; nullable until the user marks the job as closed.
 */
export type ClosedReason =
  | "rejected_by_company"
  | "withdrew"
  | "no_response"
  | "offer_accepted"
  | "offer_declined"
  | "role_closed";

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

  // ── Rich fields ────────────────────────────────────────────
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency?: string;
  location?: string | null;
  remote_type?: RemoteType;
  job_type?: JobType;
  experience_level?: ExperienceLevel;
  skills?: string[];
  company_logo_url?: string | null;
  deadline?: string | null;
  /** 0 = unrated, 1-5 star priority */
  priority?: number;
  application_email?: string | null;
  company_website?: string | null;
  department?: string | null;
  recruiter_name?: string | null;
  recruiter_email?: string | null;
  referral_source?: string | null;
  /** 0 = unrated, 1-5 excitement level */
  excitement?: number;
  /** 0-100 self-assessed fit score */
  fit_score?: number;
  next_step?: string | null;
  next_step_date?: string | null;
  tags?: string[];

  // ── Outcome tracking (20260419130000) ─────────────────────
  /** Timestamp when this application reached a terminal state. */
  closed_at?: string | null;
  /** Why this application ended (rejected_by_company, withdrew, ...). */
  closed_reason?: ClosedReason | null;
  /** Soft-hide from the default kanban view without deleting. */
  archived?: boolean;
}

export interface Resume {
  id: string;
  file_name: string;
  storage_path: string;
  parsed_text: string;
  is_primary: boolean;
  created_at: string;
}

export interface KeywordCoverage {
  score: number;
  matched: string[];
  missing: string[];
  total_keywords: number;
}

export interface HallucinationCheck {
  score: number;
  hallucinated_skills: string[];
  hallucinated_credentials: string[];
}

export interface ChangeDelta {
  score: number;
  change_percent: number;
  similarity_ratio: number;
  verdict: string;
  added_sentences: number;
  removed_sentences: number;
}

export interface EvalResult {
  overall_score: number;
  keyword_coverage: KeywordCoverage;
  hallucination_check: HallucinationCheck;
  change_delta: ChangeDelta;
}

export interface GeneratedDocument {
  id: string;
  doc_type: "tailored_resume" | "cover_letter";
  content?: string;
  storage_path: string;
  download_url: string;
  /** Base64-encoded PDF when the API generated one (`include_pdf: true`). */
  pdf_base64?: string | null;
  /** Eval scores from the AI eval pipeline (present when generated via tailoring). */
  eval_result?: EvalResult | null;
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

export type OutreachMessagePurpose = "outreach" | "thank_you";

export interface OutreachMessage {
  id: string;
  message_type: "email" | "linkedin";
  recipient_name: string;
  recipient_role?: string;
  subject?: string;
  body: string;
  created_at: string;
  /** Cold outreach vs post-interview thank-you (Supabase after migration; defaults to outreach). */
  message_purpose?: OutreachMessagePurpose;
}

export interface ThankYouResponse {
  subject: string;
  body: string;
  saved_outreach_id?: string | null;
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
  closing_date?: string | null;
  salary?: string | null;
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

// ── Analytics Dashboard types ──────────────────────────────────────────

export interface FunnelStage {
  stage: string;
  count: number;
}

export interface AnalyticsConversions {
  bookmarked_to_applied: number;
  applied_to_interviewing: number;
  interviewing_to_offer: number;
  rejection_rate: number;
  ghost_rate: number;
}

export interface AnalyticsDurations {
  bookmarked_to_applied: number | null;
  applied_to_latest: number | null;
  total_lifecycle: number | null;
}

export interface SourceBreakdown {
  source: string;
  count: number;
}

export interface WeeklyActivity {
  week_start: string;
  week_end: string;
  jobs_added: number;
}

export interface TopCompany {
  company: string;
  count: number;
}

export interface AnalyticsSummary {
  active_applications: number;
  interviews_in_progress: number;
  offers: number;
  rejections: number;
}

// ── Match score types ──────────────────────────────────────────────

export interface MatchScore {
  score: number;
  matched_keywords: string[];
  missing_keywords: string[];
  top_job_keywords: string[];
}

export interface MatchScoresResponse {
  scores: Record<string, MatchScore>;
}


// ── Interview prep types ──────────────────────────────────────────

export interface InterviewPrepMaterial {
  company_overview: string;
  role_insights: string;
  talking_points: string[];
  likely_questions: string[];
  questions_to_ask: string[];
  tips: string[];
}

// ── Interview practice session types (20260419120000) ──────────────

export type InterviewPracticeRole = "user" | "assistant";

export interface InterviewPracticeMessage {
  role: InterviewPracticeRole;
  content: string;
  /** Client-generated millisecond epoch — used only for display ordering. */
  ts: number;
}

/**
 * One persisted mock-interview transcript. Created on the first AI reply,
 * updated on every subsequent turn, marked `ended=true` when the user
 * clicks "End & debrief".
 */
export interface InterviewPracticeSession {
  id: string;
  job_id: string | null;
  job_title: string;
  company: string;
  job_description: string | null;
  resume_snapshot: string | null;
  messages: InterviewPracticeMessage[];
  turn_count: number;
  ended: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * A row out of the public.cached_jobs firehose (Sprint 4). Read-only from
 * the browser — only the nightly ingestion cron writes here.
 *
 * `remote_type` here is a stricter subset than Job.remote_type because the
 * ingestion layer never emits "unknown"; if the source didn't specify, the
 * field comes back as null.
 */
export interface CachedJob {
  id: string;
  source: string;
  external_id: string;
  title: string;
  company: string;
  url: string;
  description: string;
  location: string | null;
  remote_type: "remote" | "hybrid" | "onsite" | null;
  salary_min: number | null;
  salary_max: number | null;
  skills: string[];
  tags: string[];
  posted_at: string | null;
  first_seen_at: string;
  last_seen_at: string;
  /** When non-null, the row wasn't returned by the most recent ingestion run. */
  inactive_at: string | null;
}

export interface InterviewNote {
  id: string;
  job_id: string;
  round_name: string;
  scheduled_at: string | null;
  interviewer_name: string;
  notes: string;
  prep_material: InterviewPrepMaterial | null;
  status: "upcoming" | "completed" | "cancelled";
  created_at: string;
  updated_at: string;
}

export interface AnalyticsData {
  total_jobs: number;
  funnel: FunnelStage[];
  conversions: AnalyticsConversions;
  avg_durations_days: AnalyticsDurations;
  sources: SourceBreakdown[];
  weekly_activity: WeeklyActivity[];
  top_companies: TopCompany[];
  response_rate: number;
  summary: AnalyticsSummary;
}

// ── Notification & reminder types ────────────────────────────────

export type ReminderType =
  | "interview_upcoming"
  | "follow_up_application"
  | "follow_up_interview"
  | "offer_deadline"
  | "custom";

export interface Reminder {
  id: string;
  job_id: string | null;
  reminder_type: ReminderType;
  title: string;
  message: string;
  due_at: string | null;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
  updated_at: string;
}

// ── Salary & compensation types ──────────────────────────────────

export interface Compensation {
  id: string;
  job_id: string | null;
  base_salary: number;
  bonus: number;
  equity_value: number;
  signing_bonus: number;
  benefits_value: number;
  total_compensation: number;
  currency: string;
  pay_period: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface CompensationComparison {
  entries: Compensation[];
  best_total_id: string | null;
  best_base_id: string | null;
  average_total: number;
  count: number;
}

// ── Contacts CRM types ───────────────────────────────────────────

export type ContactRelationship = "recruiter" | "hiring_manager" | "referral" | "peer" | "other";

export interface ContactInteraction {
  id: string;
  contact_id: string;
  interaction_type: string;
  summary: string;
  occurred_at: string;
  created_at: string;
}

export interface CRMContact {
  id: string;
  job_id: string | null;
  name: string;
  role: string;
  company: string;
  email: string;
  phone: string;
  linkedin_url: string;
  relationship: ContactRelationship;
  notes: string;
  last_contacted_at: string | null;
  interactions?: ContactInteraction[];
  created_at: string;
  updated_at: string;
}

// ── Application timeline types ───────────────────────────────────

export type TimelineEventType =
  | "status_change"
  | "application_sent"
  | "interview_scheduled"
  | "interview_completed"
  | "outreach_sent"
  | "offer_received"
  | "note"
  | "document_generated"
  | "contact_added"
  | "custom";

export interface TimelineEvent {
  id: string;
  job_id: string;
  event_type: TimelineEventType;
  title: string;
  description: string;
  occurred_at: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

// ── Document template types ─────────────────────────────────────
export type TemplateType = "resume" | "cover_letter";
export type TemplateCategory = "tech" | "finance" | "general" | "creative";

export interface DocTemplate {
  id: string;
  name: string;
  template_type: TemplateType;
  content: string;
  category: TemplateCategory;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// ── Kanban automation types ─────────────────────────────────────
export type AutomationTrigger = "application_sent" | "interview_scheduled" | "no_response_days" | "offer_received" | "manual";
export type AutomationAction = "move_to_status" | "add_reminder" | "add_tag";

export interface AutomationRule {
  id: string;
  name: string;
  trigger: AutomationTrigger;
  action: AutomationAction;
  action_config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AutomationSuggestion {
  rule_id: string;
  job_id: string;
  suggested_action: string;
  reason: string;
}

// ── AI Cover Letter types ─────────────────────────────────────────
export type CoverLetterTone = "professional" | "enthusiastic" | "conversational" | "formal";

export interface GeneratedCoverLetter {
  id: string;
  job_title: string;
  company: string;
  content: string;
  tone: CoverLetterTone;
  created_at: string;
}
