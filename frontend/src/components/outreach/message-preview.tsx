"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { OutreachMessage } from "@/types";
import { Copy, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export function MessagePreview({ message }: { message: OutreachMessage | null }) {
  const handleCopy = () => {
    if (!message) return;
    const text = message.subject ? `Subject: ${message.subject}\n\n${message.body}` : message.body;
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  if (!message) {
    return (<Card className="bg-zinc-900 border-zinc-800 min-h-[300px] flex items-center justify-center">
      <CardContent className="text-center"><MessageSquare aria-hidden="true" className="h-12 w-12 mx-auto text-zinc-700 mb-3" /><p className="text-zinc-500">Your generated message will appear here</p></CardContent>
    </Card>);
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-white text-lg capitalize">{message.message_type} to {message.recipient_name}</CardTitle>
        <Button variant="outline" size="sm" onClick={handleCopy} aria-label={`Copy ${message.message_type} to ${message.recipient_name}`} className="border-zinc-700 text-zinc-300"><Copy aria-hidden="true" className="h-4 w-4 mr-2" />Copy</Button>
      </CardHeader>
      <CardContent>
        {message.subject && (<div className="mb-3 pb-3 border-b border-zinc-800"><p className="text-xs text-zinc-500 mb-1">Subject</p><p className="text-sm text-white">{message.subject}</p></div>)}
        <div className="bg-zinc-800 rounded-lg p-4"><p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">{message.body}</p></div>
      </CardContent>
    </Card>
  );
}
