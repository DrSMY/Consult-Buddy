import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export default defineTool({
  name: "list_recent_consultations",
  title: "List recent consultations",
  description:
    "List the signed-in clinician's most recent consultations, optionally filtered by program.",
  inputSchema: {
    program: z
      .enum(["peptides", "weight-loss"])
      .optional()
      .describe("Filter by program."),
    limit: z.number().int().min(1).max(50).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ program, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return {
        content: [{ type: "text", text: "Not authenticated" }],
        isError: true,
      };
    }
    let query = supabaseForUser(ctx)
      .from("consultations")
      .select(
        "id, patient_name, program, status, created_at, updated_at",
      )
      .order("updated_at", { ascending: false })
      .limit(limit ?? 20);
    if (program) query = query.eq("program", program);
    const { data, error } = await query;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { rows: data ?? [] },
    };
  },
});
