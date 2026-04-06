"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { GeneratedDocument } from "@/types";
import { Download, FileText } from "lucide-react";

export function ResumePreview({ document }: { document: GeneratedDocument | null }) {
  if (!document) {
    return (<Card className="bg-zinc-900 border-zinc-800 h-full min-h-[400px] flex items-center justify-center">
      <CardContent className="text-center"><FileText className="h-12 w-12 mx-auto text-zinc-700 mb-3" /><p className="text-zinc-500">Your tailored resume will appear here</p><p className="text-zinc-600 text-sm mt-1">Upload a resume and paste a job description to get started</p></CardContent>
    </Card>);
  }
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-white text-lg">Generated Resume</CardTitle>
        <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-300" onClick={() => window.open(document.download_url, "_blank")}>
          <Download className="h-4 w-4 mr-2" />Download PDF
        </Button>
      </CardHeader>
      <CardContent>
        <div className="bg-zinc-800 rounded-lg p-4 min-h-[400px]">
          <iframe src={document.download_url} className="w-full h-[500px] rounded" title="Resume Preview" />
        </div>
      </CardContent>
    </Card>
  );
}
