import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) {
      throw new Error("ANTHROPIC_API_KEY is not set in environment variables.");
    }
    client = new Anthropic({ apiKey: key });
  }
  return client;
}

export async function generateText({
  system,
  userMessage,
  maxTokens = 4096,
  temperature = 0.7,
}: {
  system: string;
  userMessage: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const anthropic = getClient();
  const message = await anthropic.messages.create({
    model: process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514",
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: userMessage }],
    temperature,
  });

  const block = message.content[0];
  if (block.type !== "text") {
    throw new Error("Unexpected Claude response block type");
  }
  return block.text;
}
