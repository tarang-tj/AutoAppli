"use client";
import { KanbanBoard } from "@/components/dashboard/kanban-board";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiPost } from "@/lib/api";
import { useJobs } from "@/hooks/use-jobs";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function DashboardPage() {
  const { mutate } = useJobs();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreating(true);
    const form = new FormData(e.currentTarget);
    try {
      await apiPost("/jobs", {
        company: form.get("company"),
        title: form.get("title"),
        url: form.get("url") || undefined,
        description: form.get("description") || undefined,
      });
      toast.success("Job added to tracker");
      setOpen(false);
      (e.target as HTMLFormElement).reset();
      mutate();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add job");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Job Tracker</h1>
          <p className="text-zinc-400 text-sm mt-1">Track and manage your job applications</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button className="bg-blue-600 hover:bg-blue-700" />}>
            <Plus className="h-4 w-4 mr-2" />
            Add Job
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-700">
            <DialogHeader>
              <DialogTitle className="text-white">Add New Job</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-zinc-300">Company *</Label>
                <Input name="company" required className="bg-zinc-800 border-zinc-700 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Job Title *</Label>
                <Input name="title" required className="bg-zinc-800 border-zinc-700 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">URL</Label>
                <Input name="url" type="url" className="bg-zinc-800 border-zinc-700 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Job Description</Label>
                <Textarea name="description" rows={4} className="bg-zinc-800 border-zinc-700 text-white" />
              </div>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={creating}>
                {creating ? "Adding..." : "Add Job"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <KanbanBoard />
    </div>
  );
}
