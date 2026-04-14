"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiGet, apiPatch } from "@/lib/api";
import { toast } from "sonner";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  ExternalLink,
  Eye,
  FileText,
  Loader2,
  MapPin,
  MessageSquare,
  PenTool,
  Send,
  Sparkles,
  Trash2,
  Users,
  X,
  Star,
} from "lucide-react";
import type {
  Job,
  JobStatus,
  RemoteType,
  JobType,
  ExperienceLevel,
} from "@/types";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: JobStatus[] = [
  "bookmarked",
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "ghosted",
];

const REMOTE_OPTIONS: RemoteType[] = ["remote", "hybrid", "onsite", "unknown"];
const JOB_TYPE_OPTIONS: JobType[] = [
  "full_time",
  "part_time",
  "contract",
  "internship",
  "freelance",
];
const EXPERIENCE_OPTIONS: ExperienceLevel[] = [
  "intern",
  "entry",
  "mid",
  "senior",
  "lead",
  "director",
  "vp",
  "c_level",
];

const STATUS_COLORS: Record<JobStatus, string> = {
  bookmarked: "bg-blue-900 text-blue-100",
  applied: "bg-purple-900 text-purple-100",
  interviewing: "bg-orange-900 text-orange-100",
  offer: "bg-green-900 text-green-100",
  rejected: "bg-red-900 text-red-100",
  ghosted: "bg-gray-700 text-gray-200",
};

const getStatusLabel = (status: string) => {
  return status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ");
};

const getRemoteLabel = (remote: string) => {
  const labels: Record<string, string> = {
    remote: "Remote",
    hybrid: "Hybrid",
    onsite: "On-site",
    unknown: "Unknown",
  };
  return labels[remote] || remote;
};

const getJobTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    full_time: "Full-time",
    part_time: "Part-time",
    contract: "Contract",
    internship: "Internship",
    freelance: "Freelance",
  };
  return labels[type] || type;
};

const getExperienceLabel = (exp: string) => {
  const labels: Record<string, string> = {
    intern: "Intern",
    entry: "Entry Level",
    mid: "Mid-level",
    senior: "Senior",
    lead: "Lead",
    director: "Director",
    vp: "VP",
    c_level: "C-Level",
  };
  return labels[exp] || exp;
};

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedDescription, setExpandedDescription] = useState(false);

  // Edit state
  const [editValues, setEditValues] = useState<Partial<Job>>({});

  // Chip editors
  const [skillInput, setSkillInput] = useState("");
  const [tagInput, setTagInput] = useState("");

  const fetchJob = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiGet<Job>(`/jobs/${jobId}`);
      setJob(data);
      setEditValues(data);
    } catch (error) {
      console.error("Failed to fetch job:", error);
      toast.error("Failed to load job details");
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  const updateField = async (field: string, value: any) => {
    if (!job) return;

    const payload = { [field]: value };

    try {
      setSaving(true);
      const updated = await apiPatch<Job>(`/jobs/${jobId}`, payload);
      setJob(updated);
      setEditValues(updated);
      toast.success(`${field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, " ")} updated`);
    } catch (error) {
      console.error(`Failed to update ${field}:`, error);
      toast.error(`Failed to update ${field}`);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = (newStatus: string | null) => {
    if (newStatus) updateField("status", newStatus);
  };

  const handleSalaryMinChange = (value: string) => {
    const num = value ? parseInt(value) : null;
    updateField("salary_min", num);
  };

  const handleSalaryMaxChange = (value: string) => {
    const num = value ? parseInt(value) : null;
    updateField("salary_max", num);
  };

  const handleCurrencyChange = (value: string) => {
    updateField("salary_currency", value);
  };

  const handleLocationChange = (value: string) => {
    updateField("location", value || null);
  };

  const handleRemoteChange = (value: string | null) => {
    if (value) updateField("remote_type", value);
  };

  const handleJobTypeChange = (value: string | null) => {
    if (value) updateField("job_type", value);
  };

  const handleExperienceChange = (value: string | null) => {
    if (value) updateField("experience_level", value);
  };

  const handleDepartmentChange = (value: string) => {
    updateField("department", value || null);
  };

  const handleRecruiterNameChange = (value: string) => {
    updateField("recruiter_name", value || null);
  };

  const handleRecruiterEmailChange = (value: string) => {
    updateField("recruiter_email", value || null);
  };

  const handleApplicationEmailChange = (value: string) => {
    updateField("application_email", value || null);
  };

  const handleCompanyWebsiteChange = (value: string) => {
    updateField("company_website", value || null);
  };

  const handleDeadlineChange = (value: string) => {
    updateField("deadline", value || null);
  };

  const handleNextStepChange = (value: string) => {
    updateField("next_step", value || null);
  };

  const handleNextStepDateChange = (value: string) => {
    updateField("next_step_date", value || null);
  };

  const handleNotesChange = (value: string) => {
    updateField("notes", value || null);
  };

  const addSkill = async () => {
    if (!skillInput.trim() || !job) return;
    const newSkills = [...(job.skills || []), skillInput.trim()];
    setSkillInput("");
    await updateField("skills", newSkills);
  };

  const removeSkill = async (index: number) => {
    if (!job) return;
    const newSkills = job.skills?.filter((_, i) => i !== index) || [];
    await updateField("skills", newSkills);
  };

  const addTag = async () => {
    if (!tagInput.trim() || !job) return;
    const newTags = [...(job.tags || []), tagInput.trim()];
    setTagInput("");
    await updateField("tags", newTags);
  };

  const removeTag = async (index: number) => {
    if (!job) return;
    const newTags = job.tags?.filter((_, i) => i !== index) || [];
    await updateField("tags", newTags);
  };

  const handlePriorityChange = async (newPriority: number) => {
    await updateField("priority", newPriority);
  };

  const handleExcitementChange = async (newExcitement: number) => {
    await updateField("excitement", newExcitement);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-zinc-950 p-6">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard")}
            className="text-zinc-400 hover:text-zinc-100"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="mt-8 text-center">
            <p className="text-zinc-400">Job not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header with back button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard")}
          className="text-zinc-400 hover:text-zinc-100 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        {/* Title and company header */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-1">{job.title}</h1>
              <p className="text-lg text-zinc-400">{job.company}</p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={job.status} onValueChange={handleStatusChange}>
                <SelectTrigger
                  className={cn(
                    "w-40 border-0",
                    STATUS_COLORS[job.status as JobStatus]
                  )}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {getStatusLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* AI Quick Actions */}
        <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">
            AI Actions for this role
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/resume?company=${encodeURIComponent(job.company)}&title=${encodeURIComponent(job.title)}`}
              className="inline-flex items-center gap-2 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-sm font-medium text-violet-300 hover:bg-violet-500/20 transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              Tailor Resume
            </Link>
            <Link
              href={`/cover-letter?company=${encodeURIComponent(job.company)}&title=${encodeURIComponent(job.title)}`}
              className="inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-300 hover:bg-amber-500/20 transition-colors"
            >
              <PenTool className="h-4 w-4" />
              Cover Letter
            </Link>
            <Link
              href={`/outreach?company=${encodeURIComponent(job.company)}&title=${encodeURIComponent(job.title)}&recruiter=${encodeURIComponent(job.recruiter_name ?? "")}`}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/20 transition-colors"
            >
              <Send className="h-4 w-4" />
              Outreach Message
            </Link>
            <Link
              href={`/interviews?jobId=${jobId}&company=${encodeURIComponent(job.company)}&title=${encodeURIComponent(job.title)}`}
              className="inline-flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-300 hover:bg-rose-500/20 transition-colors"
            >
              <MessageSquare className="h-4 w-4" />
              Interview Prep
            </Link>
            <Link
              href={`/outreach?company=${encodeURIComponent(job.company)}&title=${encodeURIComponent(job.title)}&purpose=thank_you`}
              className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-sm font-medium text-cyan-300 hover:bg-cyan-500/20 transition-colors"
            >
              <FileText className="h-4 w-4" />
              Thank-You Note
            </Link>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-3 gap-6">
          {/* Main content - 2 columns */}
          <div className="col-span-2 space-y-6">
            {/* Salary Section */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Salary & Compensation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-zinc-400 text-sm">Minimum Salary</Label>
                    <Input
                      type="number"
                      value={job.salary_min ?? ""}
                      onChange={(e) => handleSalaryMinChange(e.target.value)}
                      placeholder="0"
                      className="bg-zinc-800 border-zinc-700 text-white mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-400 text-sm">Maximum Salary</Label>
                    <Input
                      type="number"
                      value={job.salary_max ?? ""}
                      onChange={(e) => handleSalaryMaxChange(e.target.value)}
                      placeholder="0"
                      className="bg-zinc-800 border-zinc-700 text-white mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-400 text-sm">Currency</Label>
                    <Input
                      value={job.salary_currency ?? "USD"}
                      onChange={(e) => handleCurrencyChange(e.target.value)}
                      placeholder="USD"
                      className="bg-zinc-800 border-zinc-700 text-white mt-1"
                      maxLength={3}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Location & Job Details */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Location & Job Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-zinc-400 text-sm">Location</Label>
                  <Input
                    value={job.location ?? ""}
                    onChange={(e) => handleLocationChange(e.target.value)}
                    placeholder="e.g., San Francisco, CA"
                    className="bg-zinc-800 border-zinc-700 text-white mt-1"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-zinc-400 text-sm">Remote Type</Label>
                    <Select value={job.remote_type ?? "unknown"} onValueChange={handleRemoteChange}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {REMOTE_OPTIONS.map((type) => (
                          <SelectItem key={type} value={type}>
                            {getRemoteLabel(type)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-zinc-400 text-sm">Job Type</Label>
                    <Select value={job.job_type ?? "full_time"} onValueChange={handleJobTypeChange}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {JOB_TYPE_OPTIONS.map((type) => (
                          <SelectItem key={type} value={type}>
                            {getJobTypeLabel(type)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-zinc-400 text-sm">Experience Level</Label>
                    <Select value={job.experience_level ?? "entry"} onValueChange={handleExperienceChange}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPERIENCE_OPTIONS.map((level) => (
                          <SelectItem key={level} value={level}>
                            {getExperienceLabel(level)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Skills Section */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Skills Required</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSkill();
                      }
                    }}
                    placeholder="Add a skill..."
                    className="bg-zinc-800 border-zinc-700 text-white flex-1"
                  />
                  <Button
                    onClick={addSkill}
                    size="sm"
                    className="bg-blue-900 hover:bg-blue-800 text-white"
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(job.skills || []).map((skill, idx) => (
                    <Badge
                      key={idx}
                      className="bg-blue-900 text-blue-100 hover:bg-blue-800 cursor-pointer pl-3 pr-2 py-1"
                      onClick={() => removeSkill(idx)}
                    >
                      {skill}
                      <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Tags Section */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Tags</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    placeholder="Add a tag..."
                    className="bg-zinc-800 border-zinc-700 text-white flex-1"
                  />
                  <Button
                    onClick={addTag}
                    size="sm"
                    className="bg-purple-900 hover:bg-purple-800 text-white"
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(job.tags || []).map((tag, idx) => (
                    <Badge
                      key={idx}
                      className="bg-purple-900 text-purple-100 hover:bg-purple-800 cursor-pointer pl-3 pr-2 py-1"
                      onClick={() => removeTag(idx)}
                    >
                      {tag}
                      <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Ratings Section */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">My Assessment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-zinc-400 text-sm mb-2 block">Priority Level</Label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => handlePriorityChange(star)}
                        className="transition-colors"
                      >
                        <Star
                          className={cn(
                            "h-6 w-6",
                            star <= (job.priority || 0)
                              ? "fill-yellow-500 text-yellow-500"
                              : "text-zinc-600 hover:text-zinc-500"
                          )}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-zinc-400 text-sm mb-2 block">Excitement Level</Label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => handleExcitementChange(star)}
                        className="transition-colors"
                      >
                        <Star
                          className={cn(
                            "h-6 w-6",
                            star <= (job.excitement || 0)
                              ? "fill-pink-500 text-pink-500"
                              : "text-zinc-600 hover:text-zinc-500"
                          )}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Next Steps Section */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Next Steps
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-zinc-400 text-sm">Next Step</Label>
                  <Input
                    value={job.next_step ?? ""}
                    onChange={(e) => handleNextStepChange(e.target.value)}
                    placeholder="e.g., Follow up with recruiter"
                    className="bg-zinc-800 border-zinc-700 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-zinc-400 text-sm">Next Step Date</Label>
                  <Input
                    type="date"
                    value={job.next_step_date?.split("T")[0] ?? ""}
                    onChange={(e) => handleNextStepDateChange(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-zinc-400 text-sm">Application Deadline</Label>
                  <Input
                    type="date"
                    value={job.deadline?.split("T")[0] ?? ""}
                    onChange={(e) => handleDeadlineChange(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-white mt-1"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Notes Section */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={job.notes ?? ""}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  placeholder="Add personal notes about this job..."
                  className="bg-zinc-800 border-zinc-700 text-white min-h-[150px] resize-none"
                />
              </CardContent>
            </Card>

            {/* Job Description Section */}
            {job.description && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white">Job Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <div
                      className={cn(
                        "text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap",
                        !expandedDescription && "line-clamp-5"
                      )}
                    >
                      {job.description}
                    </div>
                    {job.description.length > 500 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedDescription(!expandedDescription)}
                        className="mt-3 text-blue-400 hover:text-blue-300"
                      >
                        {expandedDescription ? "Show less" : "Show more"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - 1 column */}
          <div className="space-y-6">
            {/* Contact Information */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Contact Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-zinc-400 text-xs">Department</Label>
                  <Input
                    value={job.department ?? ""}
                    onChange={(e) => handleDepartmentChange(e.target.value)}
                    placeholder="e.g., Engineering"
                    className="bg-zinc-800 border-zinc-700 text-white text-sm mt-1"
                  />
                </div>
                <div>
                  <Label className="text-zinc-400 text-xs">Recruiter Name</Label>
                  <Input
                    value={job.recruiter_name ?? ""}
                    onChange={(e) => handleRecruiterNameChange(e.target.value)}
                    placeholder="Name"
                    className="bg-zinc-800 border-zinc-700 text-white text-sm mt-1"
                  />
                </div>
                <div>
                  <Label className="text-zinc-400 text-xs">Recruiter Email</Label>
                  <Input
                    value={job.recruiter_email ?? ""}
                    onChange={(e) => handleRecruiterEmailChange(e.target.value)}
                    placeholder="email@example.com"
                    className="bg-zinc-800 border-zinc-700 text-white text-sm mt-1"
                  />
                </div>
                <div>
                  <Label className="text-zinc-400 text-xs">Application Email</Label>
                  <Input
                    value={job.application_email ?? ""}
                    onChange={(e) => handleApplicationEmailChange(e.target.value)}
                    placeholder="apply@example.com"
                    className="bg-zinc-800 border-zinc-700 text-white text-sm mt-1"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Company Information */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white text-sm">Company Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-zinc-400 text-xs">Company Website</Label>
                  <Input
                    value={job.company_website ?? ""}
                    onChange={(e) => handleCompanyWebsiteChange(e.target.value)}
                    placeholder="https://example.com"
                    className="bg-zinc-800 border-zinc-700 text-white text-sm mt-1"
                  />
                </div>
                {job.company_logo_url && (
                  <div className="flex justify-center">
                    <img
                      src={job.company_logo_url}
                      alt={job.company}
                      className="h-12 w-12 rounded object-contain"
                    />
                  </div>
                )}
                {job.url && (
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center w-full rounded-md border border-zinc-700 px-3 py-2 text-sm font-medium text-blue-400 hover:text-blue-300 hover:bg-zinc-800 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Job Posting
                  </a>
                )}
              </CardContent>
            </Card>

            {/* Timeline Information */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white text-sm">Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {job.created_at && (
                  <div>
                    <p className="text-zinc-400 text-xs">Added</p>
                    <p className="text-zinc-100">
                      {new Date(job.created_at).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {job.updated_at && (
                  <div>
                    <p className="text-zinc-400 text-xs">Updated</p>
                    <p className="text-zinc-100">
                      {new Date(job.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {job.applied_at && (
                  <div>
                    <p className="text-zinc-400 text-xs">Applied</p>
                    <p className="text-zinc-100">
                      {new Date(job.applied_at).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Job Metadata */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white text-sm">Metadata</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <p className="text-zinc-400 text-xs">Source</p>
                  <p className="text-zinc-100">{job.source}</p>
                </div>
                {job.referral_source && (
                  <div>
                    <p className="text-zinc-400 text-xs">Referral Source</p>
                    <p className="text-zinc-100">{job.referral_source}</p>
                  </div>
                )}
                {job.fit_score !== undefined && (
                  <div>
                    <p className="text-zinc-400 text-xs">Fit Score</p>
                    <p className="text-zinc-100">{job.fit_score}%</p>
                  </div>
                )}
                <div>
                  <p className="text-zinc-400 text-xs">Job ID</p>
                  <p className="text-zinc-100 font-mono text-xs break-all">
                    {job.id}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
