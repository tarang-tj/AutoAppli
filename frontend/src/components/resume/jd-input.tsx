"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export function JdInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle id="jd-input-title" className="text-white text-lg">
          Job Description
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          id="jd-input"
          name="job_description"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste the full job description here…"
          rows={10}
          aria-labelledby="jd-input-title"
          aria-describedby="jd-input-count"
          className="bg-zinc-800 border-zinc-700 text-white resize-none"
        />
        <p
          id="jd-input-count"
          className="text-xs text-zinc-500 mt-2 text-right tabular-nums"
        >
          {value.length.toLocaleString()} characters
        </p>
      </CardContent>
    </Card>
  );
}
