"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export function JdInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader><CardTitle className="text-white text-lg">Job Description</CardTitle></CardHeader>
      <CardContent>
        <Textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder="Paste the full job description here..." rows={10} className="bg-zinc-800 border-zinc-700 text-white resize-none" />
        <p className="text-xs text-zinc-500 mt-2 text-right">{value.length.toLocaleString()} characters</p>
      </CardContent>
    </Card>
  );
}
