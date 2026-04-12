import type {
  Job,
  Resume,
  OutreachMessage,
  JobSearchResult,
  UserProfile,
  SavedTailoredDocument,
  GeneratedDocument,
  GeneratedCoverLetter,
  CoverLetterTone,
  InterviewNote,
  Reminder,
  Compensation,
  CRMContact,
  TimelineEvent,
  DocTemplate,
  AutomationRule,
} from "@/types";

// Demo state — updates persist for the browser session
let demoJobs: Job[] = [
  {
    id: "job-1",
    company: "Spotify",
    title: "Senior Data Analyst",
    url: "https://jobs.spotify.com/careers/3123456",
    description:
      "Lead data analysis initiatives for our streaming platform. Work with Python, SQL, and modern analytics tools.",
    status: "bookmarked",
    sort_order: 0,
    source: "linkedin",
    notes: "Great company culture, interested in their podcast analytics team",
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "job-2",
    company: "Stripe",
    title: "Business Intelligence Engineer",
    url: "https://jobs.stripe.com/engineering/bi-engineer-2024",
    description: "Build BI infrastructure for payments platform. Design and implement data pipelines using modern tools.",
    status: "bookmarked",
    sort_order: 1,
    source: "indeed",
    created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "job-3",
    company: "Notion",
    title: "Product Operations Manager",
    url: "https://www.notion.so/careers/product-operations-manager",
    description: "Optimize product workflows and cross-functional processes. Help scale our product operations team.",
    status: "applied",
    sort_order: 0,
    source: "company-website",
    applied_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    notes: "Applied through Angelist, strong fit for the role",
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "job-4",
    company: "Figma",
    title: "Analytics Engineer",
    url: "https://www.figma.com/careers/analytics-engineer",
    description: "Build data infrastructure and analytics pipelines for our design platform.",
    status: "applied",
    sort_order: 1,
    source: "linkedin",
    applied_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "job-5",
    company: "Anthropic",
    title: "Operations Analyst",
    url: "https://www.anthropic.com/careers/operations-analyst",
    description: "Support business operations for AI safety research organization.",
    status: "applied",
    sort_order: 2,
    source: "linkedin",
    applied_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    notes: "Applied via LinkedIn, waiting to hear back",
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "job-6",
    company: "Databricks",
    title: "Senior Data Engineer",
    url: "https://www.databricks.com/careers/senior-data-engineer",
    description: "Lead data engineering initiatives on our data and AI platform.",
    status: "interviewing",
    sort_order: 0,
    source: "company-website",
    applied_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    notes: "First round interview completed. Second round scheduled for next week.",
    created_at: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "job-7",
    company: "Hubspot",
    title: "Product Manager - Analytics",
    url: "https://www.hubspot.com/careers/product-manager-analytics",
    description: "Own product strategy for our analytics and reporting platform.",
    status: "interviewing",
    sort_order: 1,
    source: "linkedin",
    applied_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    notes: "Take-home project submitted. Waiting for feedback from hiring team.",
    created_at: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "job-8",
    company: "Airbnb",
    title: "Business Analyst - Host Growth",
    url: "https://www.airbnb.com/careers/business-analyst-host-growth",
    description: "Drive growth initiatives for our host community using data and analytics.",
    status: "offer",
    sort_order: 0,
    source: "linkedin",
    applied_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    notes: "Offer received! Negotiating salary. Decision deadline next Friday.",
    created_at: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "job-9",
    company: "Meta",
    title: "Data Scientist - Integrity",
    url: "https://www.meta.com/careers/data-scientist-integrity",
    description: "Work on integrity and safety initiatives using advanced analytics.",
    status: "rejected",
    sort_order: 0,
    source: "linkedin",
    applied_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    notes: "Rejected after phone screen. Feedback: strong background but looking for more ML experience.",
    created_at: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "job-10",
    company: "Twilio",
    title: "Product Analyst",
    url: "https://www.twilio.com/careers/product-analyst",
    description: "Analyze user behavior and product metrics for communication platform.",
    status: "rejected",
    sort_order: 1,
    source: "indeed",
    applied_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    notes: "Rejected - position filled internally",
    created_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

/** Seeded resumes for the Resume Builder (reset via loadSampleResumesForBuilder). */
const RESUME_BUILDER_SAMPLES: Resume[] = [
  {
    id: "resume-1",
    file_name: "resume_2024.pdf",
    storage_path: "resumes/resume_2024.pdf",
    parsed_text: `JOHN SMITH
San Francisco, CA | (555) 123-4567 | john.smith@email.com | linkedin.com/in/johnsmith

PROFESSIONAL SUMMARY
Experienced data analyst and business intelligence professional with 6+ years of experience building analytics solutions and driving data-driven decision making. Proficient in SQL, Python, and modern analytics tools. Strong background in product analytics and operational efficiency.

EXPERIENCE
Senior Data Analyst - TechCorp Inc. (2021 - Present)
- Led data strategy initiatives reducing query times by 40% through optimized data warehouse design
- Built automated dashboards for executive team using Tableau, enabling real-time business monitoring
- Managed team of 2 junior analysts, providing mentorship and career development
- Implemented data governance framework reducing data quality issues by 60%

Data Analyst - StartupXYZ (2019 - 2021)
- Designed and maintained ETL pipelines processing 50M+ daily events using Python and SQL
- Created self-service analytics portal reducing report request turnaround by 75%
- Conducted A/B testing and statistical analysis for product features impacting 2M+ users

Junior Data Analyst - FinanceBase (2018 - 2019)
- Automated financial reporting processes saving 20 hours per week
- Developed SQL queries for ad-hoc analysis supporting business decisions
- Created KPI dashboards for various departments

EDUCATION
Bachelor of Science in Computer Science
University of California, Berkeley (2018)

TECHNICAL SKILLS
- Languages: Python, SQL, R
- Tools: Tableau, Looker, dbt, Airflow
- Databases: PostgreSQL, Snowflake, BigQuery
- Other: Excel, Google Analytics, Git, Statistical Analysis

CERTIFICATIONS
- Google Analytics Certification (2021)
- Tableau Desktop Specialist (2022)`,
    is_primary: true,
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "resume-2",
    file_name: "resume_operations.pdf",
    storage_path: "resumes/resume_operations.pdf",
    parsed_text: `JOHN SMITH
San Francisco, CA | (555) 123-4567 | john.smith@email.com | linkedin.com/in/johnsmith

PROFESSIONAL SUMMARY
Operations and business strategy professional with 8+ years of experience optimizing business processes and scaling organizations. Expertise in operational efficiency, process improvement, and cross-functional team leadership.

EXPERIENCE
Operations Manager - TechCorp Inc. (2020 - Present)
- Streamlined hiring process reducing time-to-hire by 35%
- Led operational transformation saving $2.5M annually
- Built and managed operations team of 5 across 3 regions
- Implemented new project management systems improving delivery timelines by 25%

Business Operations Lead - StartupXYZ (2018 - 2020)
- Established operational infrastructure for rapid scaling (50 to 200 employees)
- Designed and implemented vendor management system reducing costs by 20%
- Created operational KPI dashboards and reporting cadence

Operations Coordinator - FinanceBase (2016 - 2018)
- Managed office operations, events, and employee programs
- Coordinated vendor relationships and contract negotiations
- Implemented process improvements across multiple departments

EDUCATION
Bachelor of Science in Business Administration
University of California, Berkeley (2016)

TECHNICAL SKILLS
- Languages: Python (basic)
- Tools: Asana, Monday.com, Tableau, Excel
- Other: Project Management, Process Design, Vendor Management, Team Leadership

CERTIFICATIONS
- Certified Operations Manager (2021)`,
    is_primary: false,
    created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

let demoResumes: Resume[] = structuredClone(RESUME_BUILDER_SAMPLES);

/** Replace session resumes with rich samples (for testing without an API). */
export function loadSampleResumesForBuilder(): Resume[] {
  demoResumes = structuredClone(RESUME_BUILDER_SAMPLES);
  return demoResumes;
}

/** Sample JD for quick testing of tailor flow. */
export const SAMPLE_JOB_DESCRIPTION_FOR_BUILDER = `Senior Data Analyst — Growth & Product

We are looking for a data analyst to partner with product and marketing on experimentation, funnel analysis, and reporting. You will own core dashboards, define metrics, and influence roadmap decisions with data.

Requirements:
- 4+ years in analytics or data science in a product-led company
- Strong SQL and Python; experience with dbt or similar
- Comfort with A/B testing, causal thinking, and stakeholder communication
- Nice to have: experience in B2C subscription or marketplace businesses

Location: Remote (US) | Full-time`;

let demoOutreachMessages: OutreachMessage[] = [
  {
    id: "msg-1",
    message_type: "email",
    message_purpose: "outreach",
    recipient_name: "Sarah Johnson",
    recipient_role: "Hiring Manager",
    subject: "Data Analyst Position - Let's Connect",
    body: `Hi Sarah,

I came across the Senior Data Analyst role at Spotify and was impressed by your team's work on podcast analytics. With my 6+ years of experience building analytics solutions and my background in product analytics at TechCorp, I believe I could make meaningful contributions to your team.

I'm particularly interested in how Spotify uses data to drive growth and would love to discuss how my experience optimizing data pipelines and creating executive dashboards could benefit your team.

Would you be open to a brief conversation next week?

Best regards,
John Smith`,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "msg-2",
    message_type: "linkedin",
    message_purpose: "outreach",
    recipient_name: "Michael Chen",
    recipient_role: "Engineering Manager at Stripe",
    subject: undefined,
    body: `Hi Michael,

I've been following Stripe's engineering blog and was really impressed by your recent work on payment infrastructure. As someone who's spent the last 6 years building scalable data solutions, I'm excited about the Business Intelligence Engineer role on your team.

My experience with Python, SQL, and designing data pipelines would align well with building BI infrastructure for a payments platform. I'd love to learn more about your team's approach to analytics at scale.

Are you open to a quick chat about the role?

John`,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "msg-3",
    message_type: "email",
    message_purpose: "outreach",
    recipient_name: "Emily Rodriguez",
    recipient_role: "Hiring Lead, Product Operations",
    subject: "Product Operations Manager Opportunity - John Smith",
    body: `Hi Emily,

I'm reaching out because I've been following Notion's product evolution and I'm impressed by how your team has scaled operations alongside rapid product growth. With my background in operational scaling at StartupXYZ where I grew the operations function from 0 to 5 people across 3 regions, I believe I could help optimize and scale your product operations function.

My experience establishing operational infrastructure, implementing systems thinking, and cross-functional collaboration directly translates to the Product Operations Manager role.

I'd love to discuss how I can contribute to your team's success.

Best,
John Smith
(555) 123-4567`,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "msg-thankyou-demo",
    message_type: "email",
    message_purpose: "thank_you",
    recipient_name: "Alex Rivera",
    recipient_role: "Hiring Manager",
    subject: "Thank you — Analytics Engineer interview",
    body: `Dear Alex,

Thank you for discussing the Analytics Engineer role at Figma. I appreciated learning more about how your team partners with product on experimentation.

Best regards`,
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

let demoProfile: UserProfile = {
  display_name: "",
  headline: "",
  linkedin_url: "",
  updated_at: null,
};

let demoGeneratedDocuments: SavedTailoredDocument[] = [];

const demoJobSearchResults: JobSearchResult[] = [
  {
    title: "Staff Data Engineer",
    company: "DuckDB Labs",
    location: "Remote",
    url: "https://duckdblabs.com/careers/staff-data-engineer",
    snippet:
      "Looking for an experienced data engineer to lead our analytics platform development. Must have 8+ years experience with distributed systems.",
    posted_date: "2 days ago",
    source: "company-website",
  },
  {
    title: "Product Analytics Lead",
    company: "Retool",
    location: "Remote",
    url: "https://retool.com/careers/product-analytics-lead",
    snippet:
      "Join Retool to build analytics for our internal tools platform. Lead product analytics strategy and help define metrics for product decisions.",
    posted_date: "1 week ago",
    source: "linkedin",
  },
  {
    title: "Analytics Engineer Manager",
    company: "Amplitude",
    location: "San Francisco, CA",
    url: "https://amplitude.com/careers/analytics-engineer-manager",
    snippet:
      "Manage team of analytics engineers building data infrastructure for product analytics company. Leadership experience required.",
    posted_date: "3 days ago",
    source: "indeed",
  },
  {
    title: "Business Intelligence Developer",
    company: "Salesforce",
    location: "San Francisco, CA",
    url: "https://careers.salesforce.com/bi-developer",
    snippet: "Build BI solutions for enterprise CRM platform. Experience with Tableau and data warehouses required.",
    posted_date: "4 days ago",
    source: "linkedin",
  },
  {
    title: "Data Analytics Engineer",
    company: "Canva",
    location: "Remote",
    url: "https://www.canva.com/careers/data-analytics-engineer",
    snippet:
      "Help scale Canva's analytics infrastructure. Work with large-scale event data and build analytics platforms for our product teams.",
    posted_date: "5 days ago",
    source: "company-website",
  },
  {
    title: "Senior Product Manager, Analytics",
    company: "Mixpanel",
    location: "San Francisco, CA",
    url: "https://mixpanel.com/careers/pm-analytics",
    snippet: "Lead product roadmap for analytics platform. Work with engineers and customers to define product direction.",
    posted_date: "1 week ago",
    source: "linkedin",
  },
];

export function getDemoJobs(): Job[] {
  return demoJobs;
}

export function setDemoJobs(jobs: Job[]): void {
  demoJobs = jobs;
}

export function getDemoResumes(): Resume[] {
  return demoResumes;
}

export function setDemoResumes(resumes: Resume[]): void {
  demoResumes = resumes;
}

export function getDemoOutreachMessages(): OutreachMessage[] {
  return [...demoOutreachMessages].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function pushDemoOutreachMessage(msg: OutreachMessage): void {
  demoOutreachMessages = [msg, ...demoOutreachMessages];
}

export function removeDemoOutreachMessage(id: string): void {
  demoOutreachMessages = demoOutreachMessages.filter((m) => m.id !== id);
}

export function getDemoJobSearchResults(): JobSearchResult[] {
  return demoJobSearchResults;
}

export function getDemoProfile(): UserProfile {
  return { ...demoProfile };
}

export function setDemoProfile(patch: Partial<UserProfile>): UserProfile {
  demoProfile = {
    ...demoProfile,
    ...patch,
    updated_at: new Date().toISOString(),
  };
  return getDemoProfile();
}

export function getDemoGeneratedDocuments(): SavedTailoredDocument[] {
  return [...demoGeneratedDocuments];
}

export function removeDemoGeneratedDocument(id: string): void {
  demoGeneratedDocuments = demoGeneratedDocuments.filter((d) => d.id !== id);
}

export function pushDemoGeneratedDocument(
  doc: GeneratedDocument,
  jobDescription: string,
  resumeId: string
): SavedTailoredDocument {
  const jd = jobDescription.trim();
  const excerpt = jd.length > 400 ? `${jd.slice(0, 400)}…` : jd;
  const title =
    jd.length > 0 ? (jd.split(/\s+/).slice(0, 12).join(" ") + (jd.length > 80 ? "…" : "")) : "Tailored resume";
  const row: SavedTailoredDocument = {
    id: doc.id,
    doc_type: doc.doc_type,
    title: title.slice(0, 200),
    resume_id: resumeId,
    job_description_excerpt: excerpt,
    content: doc.content ?? "",
    created_at: new Date().toISOString(),
  };
  demoGeneratedDocuments = [row, ...demoGeneratedDocuments].slice(0, 50);
  return row;
}

// ── Interview notes demo data ─────────────────────────────────────

let demoInterviewNotes: InterviewNote[] = [
  {
    id: "int-demo-1",
    job_id: "job-4",
    round_name: "Phone Screen",
    scheduled_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    interviewer_name: "Sarah Chen",
    notes: "30 min call with recruiter. Prepare elevator pitch and salary expectations.",
    prep_material: {
      company_overview: "Airbnb is a global travel platform connecting hosts and guests.",
      role_insights: "Data Engineering at Airbnb involves building large-scale ETL pipelines and real-time data systems.",
      talking_points: [
        "Experience building data pipelines with Airflow and Spark",
        "Reduced pipeline latency by 40% at previous role",
      ],
      likely_questions: [
        "Tell me about yourself",
        "Why are you interested in Airbnb?",
        "Describe a challenging data pipeline you built",
      ],
      questions_to_ask: [
        "What does the data stack look like?",
        "How large is the data engineering team?",
      ],
      tips: [
        "Research Airbnb's recent earnings and product launches",
        "Prepare 2-3 STAR stories about data engineering projects",
      ],
    },
    status: "upcoming",
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "int-demo-2",
    job_id: "job-4",
    round_name: "Technical Round",
    scheduled_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    interviewer_name: "",
    notes: "",
    prep_material: null,
    status: "upcoming",
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export function getDemoInterviewNotes(): InterviewNote[] {
  return demoInterviewNotes;
}

export function setDemoInterviewNotes(notes: InterviewNote[]): void {
  demoInterviewNotes = notes;
}

export function pushDemoInterviewNote(note: InterviewNote): InterviewNote {
  demoInterviewNotes = [note, ...demoInterviewNotes];
  return note;
}

export function removeDemoInterviewNote(noteId: string): boolean {
  const before = demoInterviewNotes.length;
  demoInterviewNotes = demoInterviewNotes.filter((n) => n.id !== noteId);
  return demoInterviewNotes.length < before;
}

// ── Reminders demo data ──────────────────────────────────────────

let demoReminders: Reminder[] = [
  {
    id: "rem-demo-1",
    job_id: "job-5",
    reminder_type: "follow_up_application",
    title: "Follow up with Anthropic",
    message: "It's been over a week since you applied for Operations Analyst at Anthropic. Consider sending a polite follow-up email.",
    due_at: new Date().toISOString(),
    is_read: false,
    is_dismissed: false,
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "rem-demo-2",
    job_id: "job-8",
    reminder_type: "offer_deadline",
    title: "Offer deadline — Airbnb",
    message: "You have a pending offer for Business Analyst at Airbnb. Don't forget to respond before the deadline!",
    due_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    is_read: false,
    is_dismissed: false,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "rem-demo-3",
    job_id: "job-6",
    reminder_type: "interview_upcoming",
    title: "Technical Round — coming up soon",
    message: "Your second round interview at Databricks is coming up. Review your prep material!",
    due_at: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    is_read: false,
    is_dismissed: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export function getDemoReminders(): Reminder[] {
  return demoReminders.filter((r) => !r.is_dismissed);
}

export function pushDemoReminder(rem: Reminder): Reminder {
  demoReminders = [rem, ...demoReminders];
  return rem;
}

export function updateDemoReminder(id: string, patch: Partial<Reminder>): Reminder | null {
  const idx = demoReminders.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  demoReminders[idx] = { ...demoReminders[idx], ...patch, updated_at: new Date().toISOString() };
  return demoReminders[idx];
}

export function removeDemoReminder(id: string): boolean {
  const before = demoReminders.length;
  demoReminders = demoReminders.filter((r) => r.id !== id);
  return demoReminders.length < before;
}

// ── Compensation demo data ───────────────────────────────────────

let demoCompensations: Compensation[] = [
  {
    id: "comp-demo-1",
    job_id: "job-8",
    base_salary: 135000,
    bonus: 15000,
    equity_value: 40000,
    signing_bonus: 10000,
    benefits_value: 8000,
    total_compensation: 208000,
    currency: "USD",
    pay_period: "annual",
    notes: "Offer from Airbnb — strong total comp, good equity vesting schedule",
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "comp-demo-2",
    job_id: "job-6",
    base_salary: 155000,
    bonus: 20000,
    equity_value: 60000,
    signing_bonus: 15000,
    benefits_value: 10000,
    total_compensation: 260000,
    currency: "USD",
    pay_period: "annual",
    notes: "Expected offer from Databricks — higher base and equity",
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export function getDemoCompensations(): Compensation[] {
  return [...demoCompensations];
}

export function pushDemoCompensation(comp: Compensation): Compensation {
  demoCompensations = [comp, ...demoCompensations];
  return comp;
}

export function updateDemoCompensation(id: string, patch: Partial<Compensation>): Compensation | null {
  const idx = demoCompensations.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  const updated = { ...demoCompensations[idx], ...patch, updated_at: new Date().toISOString() };
  // Recalculate total
  updated.total_compensation =
    (updated.base_salary || 0) +
    (updated.bonus || 0) +
    (updated.equity_value || 0) +
    (updated.signing_bonus || 0) +
    (updated.benefits_value || 0);
  demoCompensations[idx] = updated;
  return updated;
}

export function removeDemoCompensation(id: string): boolean {
  const before = demoCompensations.length;
  demoCompensations = demoCompensations.filter((c) => c.id !== id);
  return demoCompensations.length < before;
}

// ── Contacts CRM demo data ───────────────────────────────────────

let demoContacts: CRMContact[] = [
  {
    id: "contact-demo-1",
    job_id: "job-6",
    name: "Sarah Kim",
    role: "Technical Recruiter",
    company: "Databricks",
    email: "sarah.kim@databricks.com",
    phone: "",
    linkedin_url: "https://linkedin.com/in/sarahkim",
    relationship: "recruiter",
    notes: "Very responsive, helped schedule second round quickly.",
    last_contacted_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    interactions: [
      {
        id: "ix-demo-1",
        contact_id: "contact-demo-1",
        interaction_type: "email",
        summary: "Initial outreach about the Senior Data Engineer role",
        occurred_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "ix-demo-2",
        contact_id: "contact-demo-1",
        interaction_type: "phone",
        summary: "Phone screen — discussed role expectations and team structure",
        occurred_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "contact-demo-2",
    job_id: "job-8",
    name: "Marcus Rivera",
    role: "Hiring Manager, Host Growth",
    company: "Airbnb",
    email: "marcus.r@airbnb.com",
    phone: "(555) 321-0987",
    linkedin_url: "",
    relationship: "hiring_manager",
    notes: "Met during final round. Discussed team growth plans.",
    last_contacted_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    interactions: [
      {
        id: "ix-demo-3",
        contact_id: "contact-demo-2",
        interaction_type: "meeting",
        summary: "Final round interview — culture fit and team dynamics discussion",
        occurred_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "contact-demo-3",
    job_id: null,
    name: "Priya Patel",
    role: "Senior Engineer",
    company: "Stripe",
    email: "",
    phone: "",
    linkedin_url: "https://linkedin.com/in/priyapatel",
    relationship: "referral",
    notes: "College friend at Stripe. Offered to refer me for BI Engineer role.",
    last_contacted_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export function getDemoContacts(): CRMContact[] {
  return [...demoContacts];
}

export function pushDemoContact(contact: CRMContact): CRMContact {
  demoContacts = [contact, ...demoContacts];
  return contact;
}

export function updateDemoContact(id: string, patch: Partial<CRMContact>): CRMContact | null {
  const idx = demoContacts.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  demoContacts[idx] = { ...demoContacts[idx], ...patch, updated_at: new Date().toISOString() };
  return demoContacts[idx];
}

export function removeDemoContact(id: string): boolean {
  const before = demoContacts.length;
  demoContacts = demoContacts.filter((c) => c.id !== id);
  return demoContacts.length < before;
}

// ── Timeline demo data ───────────────────────────────────────────
// Timeline is auto-generated from jobs/interviews/etc, so we only need manual events

let demoTimelineEvents: TimelineEvent[] = [];

export function getDemoTimelineEvents(): TimelineEvent[] {
  return [...demoTimelineEvents];
}

export function pushDemoTimelineEvent(evt: TimelineEvent): TimelineEvent {
  demoTimelineEvents = [evt, ...demoTimelineEvents];
  return evt;
}

export function removeDemoTimelineEvent(id: string): boolean {
  const before = demoTimelineEvents.length;
  demoTimelineEvents = demoTimelineEvents.filter((e) => e.id !== id);
  return demoTimelineEvents.length < before;
}

// ── Document templates demo data ────────────────────────────────

let demoTemplates: DocTemplate[] = [
  {
    id: "tpl-tech-resume",
    name: "Tech Resume Template",
    template_type: "resume",
    category: "tech",
    is_default: true,
    content: `{{name}}
{{email}} | {{phone}}

PROFESSIONAL SUMMARY
Results-driven software engineer with expertise in building scalable systems and solving complex technical problems. Experience with {{skills}}.

EXPERIENCE
Senior Software Engineer at {{company}}
- Led development of critical features impacting {{impact}}
- Mentored junior developers and conducted code reviews
- Improved system performance by {{improvement}}%

TECHNICAL SKILLS
Programming Languages: TypeScript, Python, Go
Tools & Platforms: {{tools}}
Databases: PostgreSQL, MongoDB, Redis

EDUCATION
Bachelor's Degree in {{education}}`,
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "tpl-finance-cover",
    name: "Finance Cover Letter",
    template_type: "cover_letter",
    category: "finance",
    is_default: false,
    content: `Dear {{hiring_manager}},

I am writing to express my strong interest in the {{role}} position at {{company}}. With {{years}} years of experience in financial analysis and {{expertise}}, I am confident I can contribute significantly to your team.

In my current role at {{current_company}}, I have:
- Managed portfolios worth {{portfolio_value}}
- Reduced operational costs by {{savings}}%
- Led {{team_size}}-person team achieving {{achievement}}

I am particularly drawn to {{company}}'s {{reason}}, and I believe my background in {{skills}} positions me well to drive {{goal}}.

I would welcome the opportunity to discuss how my experience can benefit your organization.

Best regards,
{{name}}
{{phone}}
{{email}}`,
    created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "tpl-general-resume",
    name: "General Application Resume",
    template_type: "resume",
    category: "general",
    is_default: false,
    content: `{{name}}
{{location}} | {{phone}} | {{email}} | {{linkedin}}

OBJECTIVE
Seeking a {{role}} position where I can leverage {{key_skills}} to contribute to {{company}}'s growth.

PROFESSIONAL EXPERIENCE
{{title}} at {{current_company}} ({{start_year}} - Present)
- {{achievement_1}}
- {{achievement_2}}
- {{achievement_3}}

Previous Role at {{previous_company}} ({{years}})
- {{past_achievement}}

EDUCATION
{{degree}} in {{field}}
{{university}}, {{graduation_year}}

SKILLS
{{skills}}

CERTIFICATIONS
{{certifications}}`,
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export function getDemoTemplates(): DocTemplate[] {
  return [...demoTemplates];
}

export function pushDemoTemplate(tpl: DocTemplate): DocTemplate {
  demoTemplates = [tpl, ...demoTemplates];
  return tpl;
}

export function updateDemoTemplate(id: string, updates: Partial<DocTemplate>): DocTemplate | null {
  const idx = demoTemplates.findIndex((t) => t.id === id);
  if (idx < 0) return null;
  const updated = { ...demoTemplates[idx], ...updates, updated_at: new Date().toISOString() };
  demoTemplates[idx] = updated;
  return updated;
}

export function removeDemoTemplate(id: string): boolean {
  const before = demoTemplates.length;
  demoTemplates = demoTemplates.filter((t) => t.id !== id);
  return demoTemplates.length < before;
}

// ── Demo automation rules ────────────────────────────────────────

let demoAutomationRules: AutomationRule[] = [
  {
    id: "rule-auto-apply",
    name: "Auto-apply on submit",
    trigger: "application_sent",
    action: "move_to_status",
    action_config: { target_status: "applied" },
    is_active: true,
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "rule-auto-interviewing",
    name: "Move to interviewing",
    trigger: "interview_scheduled",
    action: "move_to_status",
    action_config: { target_status: "interviewing" },
    is_active: true,
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "rule-ghost-14d",
    name: "Ghost after 14 days",
    trigger: "no_response_days",
    action: "move_to_status",
    action_config: { days: 14, target_status: "ghosted" },
    is_active: true,
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export function getDemoAutomationRules(): AutomationRule[] {
  return demoAutomationRules;
}

export function pushDemoAutomationRule(rule: AutomationRule): AutomationRule {
  demoAutomationRules = [rule, ...demoAutomationRules];
  return rule;
}

export function updateDemoAutomationRule(id: string, updates: Partial<AutomationRule>): AutomationRule | null {
  const idx = demoAutomationRules.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  const updated = { ...demoAutomationRules[idx], ...updates, updated_at: new Date().toISOString() };
  demoAutomationRules[idx] = updated;
  return updated;
}

export function removeDemoAutomationRule(id: string): boolean {
  const before = demoAutomationRules.length;
  demoAutomationRules = demoAutomationRules.filter((r) => r.id !== id);
  return demoAutomationRules.length < before;
}

export function evaluateDemoRules(): Array<{ rule_id: string; job_id: string; suggested_action: string; reason: string }> {
  const suggestions: Array<{ rule_id: string; job_id: string; suggested_action: string; reason: string }> = [];
  const now = new Date();

  const activeRules = demoAutomationRules.filter((r) => r.is_active);

  for (const rule of activeRules) {
    const config = rule.action_config as Record<string, unknown>;

    // application_sent trigger
    if (rule.trigger === "application_sent") {
      for (const job of demoJobs) {
        if (job.status === "bookmarked" && job.applied_at) {
          const target = config.target_status as string;
          suggestions.push({
            rule_id: rule.id,
            job_id: job.id,
            suggested_action: `Move to ${target}`,
            reason: "Application has been sent",
          });
        }
      }
    }

    // interview_scheduled trigger
    if (rule.trigger === "interview_scheduled") {
      const jobsWithInterviews = new Set(demoInterviewNotes.map((i) => i.job_id));
      for (const job of demoJobs) {
        if (job.status === "applied" && jobsWithInterviews.has(job.id)) {
          const target = config.target_status as string;
          suggestions.push({
            rule_id: rule.id,
            job_id: job.id,
            suggested_action: `Move to ${target}`,
            reason: "Interview scheduled for this job",
          });
        }
      }
    }

    // no_response_days trigger
    if (rule.trigger === "no_response_days") {
      const daysThreshold = config.days as number;
      const target = config.target_status as string;
      for (const job of demoJobs) {
        if (job.status === "applied" && job.applied_at) {
          const appliedAt = new Date(job.applied_at);
          const daysSince = Math.floor((now.getTime() - appliedAt.getTime()) / (1000 * 60 * 60 * 24));
          if (daysSince >= daysThreshold) {
            suggestions.push({
              rule_id: rule.id,
              job_id: job.id,
              suggested_action: `Move to ${target}`,
              reason: `No response for ${daysSince} days`,
            });
          }
        }
      }
    }
  }

  return suggestions;
}

// ── Export report demo data ──────────────────────────────────────

export function computeDemoExportReport(jobs: Job[]) {
  const total = jobs.length;

  // Status breakdown
  const byStatus: Record<string, number> = {};
  const statusOrder = ["bookmarked", "applied", "interviewing", "offer", "rejected", "ghosted"];
  for (const status of statusOrder) {
    byStatus[status] = jobs.filter((j) => j.status === status).length;
  }

  // Source breakdown
  const bySource: Record<string, number> = {};
  for (const job of jobs) {
    bySource[job.source] = (bySource[job.source] || 0) + 1;
  }

  // Company breakdown (top companies)
  const byCompany: Record<string, number> = {};
  for (const job of jobs) {
    if (job.company) {
      byCompany[job.company] = (byCompany[job.company] || 0) + 1;
    }
  }
  const topCompanies = Object.entries(byCompany)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([company, count]) => ({ company, count }));

  // Average days in pipeline
  const durations: number[] = [];
  for (const job of jobs) {
    if (job.created_at && job.updated_at) {
      const created = new Date(job.created_at).getTime();
      const updated = new Date(job.updated_at).getTime();
      const days = Math.abs(updated - created) / (1000 * 60 * 60 * 24);
      durations.push(days);
    }
  }
  const avgDays = durations.length ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10 : null;

  // Weekly application rate (past 8 weeks)
  const now = Date.now();
  const WEEK = 7 * 24 * 60 * 60 * 1000;
  const weeklyActivity: Record<string, number> = {};

  for (let i = 0; i < 8; i++) {
    const weekStart = now - (8 - i) * WEEK;
    const weekEnd = weekStart + WEEK;
    const count = jobs.filter((j) => {
      const t = new Date(j.created_at).getTime();
      return t >= weekStart && t < weekEnd;
    }).length;
    weeklyActivity[`Week ${i + 1}`] = count;
  }

  return {
    total_jobs: total,
    by_status: byStatus,
    by_source: bySource,
    by_company: byCompany,
    top_companies: topCompanies,
    avg_days_in_pipeline: avgDays,
    weekly_application_rate: weeklyActivity,
  };
}

// ── Cover Letter demo data ───────────────────────────────────────

let demoCoverLetters: GeneratedCoverLetter[] = [];

export function getDemoCoverLetters(): GeneratedCoverLetter[] {
  return demoCoverLetters;
}

export function pushDemoCoverLetter(cl: GeneratedCoverLetter): GeneratedCoverLetter {
  demoCoverLetters = [cl, ...demoCoverLetters];
  return cl;
}

export function removeDemoCoverLetter(clId: string): void {
  demoCoverLetters = demoCoverLetters.filter((cl) => cl.id !== clId);
}

export function generateDemoCoverLetter(
  jobTitle: string,
  company: string,
  tone: CoverLetterTone
): GeneratedCoverLetter {
  const toneTemplates: Record<CoverLetterTone, { opening: string; body: string; closing: string }> = {
    professional: {
      opening: `I am writing to express my strong interest in the ${jobTitle || "position"} role at ${company || "your organization"}.`,
      body: "With my extensive background and proven track record of success, I am confident in my ability to contribute meaningfully to your team. My experience has equipped me with the skills and expertise necessary to excel in this role.",
      closing: "I would welcome the opportunity to discuss how my qualifications align with your needs. Thank you for considering my application.",
    },
    enthusiastic: {
      opening: `I am thrilled to apply for the ${jobTitle || "opportunity"} position at ${company || "your company"}!`,
      body: "I am genuinely passionate about this role and excited about the prospect of contributing to your team. My background has prepared me to make an immediate and meaningful impact. I am eager to bring my energy, skills, and dedication to this position.",
      closing: "I would love the chance to discuss how I can contribute to your team's success. I look forward to hearing from you!",
    },
    conversational: {
      opening: `I'd like to tell you about my interest in the ${jobTitle || "role"} at ${company || "your company"}.`,
      body: "I think we'd be a great fit together. I've spent considerable time developing expertise in areas that directly relate to this position, and I'm genuinely excited about what I could bring to your team. I believe my background and your needs align really well.",
      closing: "I'd appreciate the opportunity to discuss this further. Looking forward to connecting with you!",
    },
    formal: {
      opening: `I hereby submit my application for the ${jobTitle || "position"} at ${company || "your esteemed organization"}.`,
      body: "I possess the qualifications, experience, and professional acumen required for this role. Throughout my career, I have consistently demonstrated my ability to perform at the highest levels and deliver exceptional results. I am committed to applying my expertise to contribute to your organization's objectives.",
      closing: "I would be honored to discuss my suitability for this position. Thank you for your consideration of my candidacy.",
    },
  };

  const template = toneTemplates[tone];
  const content = [template.opening, template.body, template.closing].join("\n\n");

  return {
    id: `cl-${Date.now().toString(36)}`,
    job_title: jobTitle,
    company: company,
    content: content,
    tone: tone,
    created_at: new Date().toISOString(),
  };
}
