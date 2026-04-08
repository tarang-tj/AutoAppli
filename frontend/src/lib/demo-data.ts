import type {
  Job,
  Resume,
  OutreachMessage,
  JobSearchResult,
  UserProfile,
  SavedTailoredDocument,
  GeneratedDocument,
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

const demoOutreachMessages: OutreachMessage[] = [
  {
    id: "msg-1",
    message_type: "email",
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
  return demoOutreachMessages;
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
