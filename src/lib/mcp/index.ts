import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listUpcomingAppointments from "./tools/list-upcoming-appointments";
import listRecentConsultations from "./tools/list-recent-consultations";
import getConsultation from "./tools/get-consultation";
import searchClinicalDocuments from "./tools/search-clinical-documents";

// Build the direct Supabase issuer at module-eval time. See knowledge:
// mcp-js rejects any token whose issuer doesn't match the value the discovery
// document publishes, so we must NOT use SUPABASE_URL (which may be a proxy).
const projectRef =
  import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "peptidoc-mcp",
  title: "PeptiDOC MCP",
  version: "0.1.0",
  instructions:
    "Read-only tools for the PeptiDOC clinical consultation platform. Use `list_upcoming_appointments` and `list_recent_consultations` to browse a clinician's workload, `get_consultation` to inspect a full record (intake, AI recommendations, doctor notes), and `search_clinical_documents` to look up peptide protocols and patient guides.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listUpcomingAppointments,
    listRecentConsultations,
    getConsultation,
    searchClinicalDocuments,
  ],
});
