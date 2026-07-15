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
  name: "search_clinical_documents",
  title: "Search clinical knowledge base",
  description:
    "Search the clinic's knowledge base (protocols, patient guides, references) by keyword in title or content.",
  inputSchema: {
    query: z.string().min(1).describe("Keyword to search for."),
    document_type: z
      .string()
      .optional()
      .describe("Optional document_type filter (e.g. 'protocol', 'guide')."),
    limit: z.number().int().min(1).max(25).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, document_type, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return {
        content: [{ type: "text", text: "Not authenticated" }],
        isError: true,
      };
    }
    const like = `%${query.replace(/[%_]/g, (m) => `\\${m}`)}%`;
    let q = supabaseForUser(ctx)
      .from("clinical_documents")
      .select("id, title, document_type, peptide_name, created_at")
      .or(`title.ilike.${like},content.ilike.${like}`)
      .order("created_at", { ascending: false })
      .limit(limit ?? 15);
    if (document_type) q = q.eq("document_type", document_type);
    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { rows: data ?? [] },
    };
  },
});
