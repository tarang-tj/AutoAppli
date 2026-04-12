'use client';

import { useState, useMemo } from 'react';
import { Filter, SlidersHorizontal, X, Star, ArrowUpDown, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Job, RemoteType, JobType, ExperienceLevel } from '@/types';

export interface SmartFiltersState {
  salaryMin?: number;
  salaryMax?: number;
  remoteTypes: RemoteType[];
  jobTypes: JobType[];
  experienceLevels: ExperienceLevel[];
  minPriority: number;
  skills: string[];
  tags: string[];
  hasDeadline: boolean;
}

export interface SmartFiltersContextType {
  filters: SmartFiltersState;
  setFilter: (key: keyof SmartFiltersState, value: any) => void;
  sortBy: 'priority' | 'salary' | 'deadline' | 'dateAdded' | 'company';
  setSortBy: (sort: 'priority' | 'salary' | 'deadline' | 'dateAdded' | 'company') => void;
  sortDir: 'asc' | 'desc';
  setSortDir: (dir: 'asc' | 'desc') => void;
  clearAll: () => void;
  activeFilterCount: number;
  applyFilters: (jobs: Job[]) => Job[];
}

const REMOTE_OPTIONS: { label: string; value: RemoteType }[] = [
  { label: 'Remote', value: 'remote' },
  { label: 'Hybrid', value: 'hybrid' },
  { label: 'Onsite', value: 'onsite' },
];

const JOB_TYPE_OPTIONS: { label: string; value: JobType }[] = [
  { label: 'Full-time', value: 'full_time' },
  { label: 'Part-time', value: 'part_time' },
  { label: 'Contract', value: 'contract' },
  { label: 'Internship', value: 'internship' },
  { label: 'Freelance', value: 'freelance' },
];

const EXPERIENCE_LEVEL_OPTIONS: { label: string; value: ExperienceLevel }[] = [
  { label: 'Intern', value: 'intern' },
  { label: 'Entry', value: 'entry' },
  { label: 'Mid', value: 'mid' },
  { label: 'Senior', value: 'senior' },
  { label: 'Lead', value: 'lead' },
];

const SORT_OPTIONS = [
  { label: 'Priority (High First)', value: 'priority' as const },
  { label: 'Salary (High First)', value: 'salary' as const },
  { label: 'Deadline (Soonest First)', value: 'deadline' as const },
  { label: 'Date Added (Newest First)', value: 'dateAdded' as const },
  { label: 'Company (A-Z)', value: 'company' as const },
];

export function useSmartFilters(): SmartFiltersContextType {
  const [filters, setFilters] = useState<SmartFiltersState>({
    salaryMin: undefined,
    salaryMax: undefined,
    remoteTypes: [],
    jobTypes: [],
    experienceLevels: [],
    minPriority: 0,
    skills: [],
    tags: [],
    hasDeadline: false,
  });

  const [sortBy, setSortBy] = useState<'priority' | 'salary' | 'deadline' | 'dateAdded' | 'company'>('dateAdded');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const setFilter = (key: keyof SmartFiltersState, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearAll = () => {
    setFilters({
      salaryMin: undefined,
      salaryMax: undefined,
      remoteTypes: [],
      jobTypes: [],
      experienceLevels: [],
      minPriority: 0,
      skills: [],
      tags: [],
      hasDeadline: false,
    });
    setSortBy('dateAdded');
    setSortDir('desc');
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.salaryMin !== undefined) count++;
    if (filters.salaryMax !== undefined) count++;
    if (filters.remoteTypes.length > 0) count++;
    if (filters.jobTypes.length > 0) count++;
    if (filters.experienceLevels.length > 0) count++;
    if (filters.minPriority > 0) count++;
    if (filters.skills.length > 0) count++;
    if (filters.tags.length > 0) count++;
    if (filters.hasDeadline) count++;
    return count;
  }, [filters]);

  const applyFilters = (jobs: Job[]): Job[] => {
    let filtered = [...jobs];

    // Apply filters
    if (filters.salaryMin !== undefined) {
      filtered = filtered.filter((j) => (j.salary_max ?? 0) >= filters.salaryMin!);
    }
    if (filters.salaryMax !== undefined) {
      filtered = filtered.filter((j) => (j.salary_min ?? 0) <= filters.salaryMax!);
    }
    if (filters.remoteTypes.length > 0) {
      filtered = filtered.filter((j) => filters.remoteTypes.includes(j.remote_type || 'unknown'));
    }
    if (filters.jobTypes.length > 0) {
      filtered = filtered.filter((j) => filters.jobTypes.includes(j.job_type!));
    }
    if (filters.experienceLevels.length > 0) {
      filtered = filtered.filter((j) => filters.experienceLevels.includes(j.experience_level!));
    }
    if (filters.minPriority > 0) {
      filtered = filtered.filter((j) => (j.priority ?? 0) >= filters.minPriority);
    }
    if (filters.skills.length > 0) {
      filtered = filtered.filter((j) => {
        const jobSkills = (j.skills ?? []).map((s) => s.toLowerCase());
        return filters.skills.every((skill) => jobSkills.some((s) => s.includes(skill.toLowerCase())));
      });
    }
    if (filters.tags.length > 0) {
      filtered = filtered.filter((j) => {
        const jobTags = (j.tags ?? []).map((t) => t.toLowerCase());
        return filters.tags.every((tag) => jobTags.some((t) => t.includes(tag.toLowerCase())));
      });
    }
    if (filters.hasDeadline) {
      filtered = filtered.filter((j) => j.deadline !== undefined && j.deadline !== null && j.deadline !== '');
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'priority':
          comparison = (b.priority ?? 0) - (a.priority ?? 0);
          break;
        case 'salary':
          const aSalary = Math.max(a.salary_min ?? 0, a.salary_max ?? 0);
          const bSalary = Math.max(b.salary_min ?? 0, b.salary_max ?? 0);
          comparison = bSalary - aSalary;
          break;
        case 'deadline':
          const aDeadline = a.deadline || '9999-12-31';
          const bDeadline = b.deadline || '9999-12-31';
          comparison = aDeadline.localeCompare(bDeadline);
          break;
        case 'dateAdded':
          const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
          const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
          comparison = bDate - aDate;
          break;
        case 'company':
          comparison = (a.company || '').localeCompare(b.company || '');
          break;
      }

      return sortDir === 'desc' ? -comparison : comparison;
    });

    return filtered;
  };

  return {
    filters,
    setFilter,
    sortBy,
    setSortBy,
    sortDir,
    setSortDir,
    clearAll,
    activeFilterCount,
    applyFilters,
  };
}

interface SmartFiltersProps {
  filters: SmartFiltersState;
  setFilter: (key: keyof SmartFiltersState, value: any) => void;
  sortBy: 'priority' | 'salary' | 'deadline' | 'dateAdded' | 'company';
  setSortBy: (sort: 'priority' | 'salary' | 'deadline' | 'dateAdded' | 'company') => void;
  sortDir: 'asc' | 'desc';
  setSortDir: (dir: 'asc' | 'desc') => void;
  clearAll: () => void;
  activeFilterCount: number;
}

export function SmartFilters({
  filters,
  setFilter,
  sortBy,
  setSortBy,
  sortDir,
  setSortDir,
  clearAll,
  activeFilterCount,
}: SmartFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleRemoteTypeToggle = (value: RemoteType) => {
    const updated = filters.remoteTypes.includes(value)
      ? filters.remoteTypes.filter((t) => t !== value)
      : [...filters.remoteTypes, value];
    setFilter('remoteTypes', updated);
  };

  const handleJobTypeToggle = (value: JobType) => {
    const updated = filters.jobTypes.includes(value)
      ? filters.jobTypes.filter((t) => t !== value)
      : [...filters.jobTypes, value];
    setFilter('jobTypes', updated);
  };

  const handleExperienceLevelToggle = (value: ExperienceLevel) => {
    const updated = filters.experienceLevels.includes(value)
      ? filters.experienceLevels.filter((l) => l !== value)
      : [...filters.experienceLevels, value];
    setFilter('experienceLevels', updated);
  };

  const handleSkillsInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    setFilter('skills', value);
  };

  const handleTagsInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
      .split(/[,;]/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    setFilter('tags', value);
  };

  const handlePriorityClick = (rating: number) => {
    setFilter('minPriority', filters.minPriority === rating ? 0 : rating);
  };

  return (
    <div className="w-full space-y-4">
      {/* Filter Toggle and Sort Controls */}
      <div className="flex flex-wrap items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          variant="outline"
          size="sm"
          className="border-zinc-700 hover:bg-zinc-800 text-zinc-100"
        >
          <Filter className="w-4 h-4 mr-2" />
          Filters
          {activeFilterCount > 0 && <Badge className="ml-2 bg-blue-600 text-white">{activeFilterCount}</Badge>}
          {isOpen ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
        </Button>

        <div className="flex items-center gap-2 flex-1 min-w-[200px] justify-end">
          <SlidersHorizontal className="w-4 h-4 text-zinc-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-zinc-100 text-sm hover:border-zinc-600"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <Button
            onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}
            variant="outline"
            size="sm"
            className="border-zinc-700 hover:bg-zinc-800"
          >
            <ArrowUpDown className="w-4 h-4 text-zinc-400" />
          </Button>

          {activeFilterCount > 0 && (
            <Button
              onClick={clearAll}
              variant="ghost"
              size="sm"
              className="text-zinc-400 hover:text-red-400 hover:bg-zinc-800"
            >
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Collapsible Filter Panel */}
      {isOpen && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-6">
          {/* Salary Range */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Salary Range</label>
            <div className="flex gap-4">
              <Input
                type="number"
                placeholder="Min"
                value={filters.salaryMin ?? ''}
                onChange={(e) => setFilter('salaryMin', e.target.value ? Number(e.target.value) : undefined)}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-500"
              />
              <Input
                type="number"
                placeholder="Max"
                value={filters.salaryMax ?? ''}
                onChange={(e) => setFilter('salaryMax', e.target.value ? Number(e.target.value) : undefined)}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-500"
              />
            </div>
          </div>

          {/* Remote Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Remote Type</label>
            <div className="flex flex-wrap gap-2">
              {REMOTE_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  onClick={() => handleRemoteTypeToggle(opt.value)}
                  variant={filters.remoteTypes.includes(opt.value) ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    'border-zinc-700',
                    filters.remoteTypes.includes(opt.value)
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  )}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Job Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Job Type</label>
            <div className="flex flex-wrap gap-2">
              {JOB_TYPE_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  onClick={() => handleJobTypeToggle(opt.value)}
                  variant={filters.jobTypes.includes(opt.value) ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    'border-zinc-700',
                    filters.jobTypes.includes(opt.value)
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  )}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Experience Level */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Experience Level</label>
            <div className="flex flex-wrap gap-2">
              {EXPERIENCE_LEVEL_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  onClick={() => handleExperienceLevelToggle(opt.value)}
                  variant={filters.experienceLevels.includes(opt.value) ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    'border-zinc-700',
                    filters.experienceLevels.includes(opt.value)
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  )}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Priority Stars */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Minimum Priority</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handlePriorityClick(star)}
                  className={cn(
                    'transition-colors',
                    filters.minPriority >= star ? 'text-yellow-400' : 'text-zinc-600 hover:text-yellow-400'
                  )}
                >
                  <Star className="w-6 h-6 fill-current" />
                </button>
              ))}
            </div>
          </div>

          {/* Skills */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Skills (comma or semicolon separated)</label>
            <Input
              type="text"
              placeholder="e.g., React, TypeScript, Node.js"
              value={filters.skills.join(', ')}
              onChange={handleSkillsInput}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-500"
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Tags (comma or semicolon separated)</label>
            <Input
              type="text"
              placeholder="e.g., startup, remote-first, visa-sponsor"
              value={filters.tags.join(', ')}
              onChange={handleTagsInput}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-500"
            />
          </div>

          {/* Has Deadline */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.hasDeadline}
                onChange={(e) => setFilter('hasDeadline', e.target.checked)}
                className="w-4 h-4 rounded bg-zinc-800 border-zinc-700"
              />
              <span className="text-sm font-medium text-zinc-300">Has Deadline</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
