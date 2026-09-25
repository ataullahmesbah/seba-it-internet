import { corporateSchema } from "@/features/public-schemas";
import { createCorporateInquiry } from "@/server/leads";
import { handlePublicForm } from "@/server/public-form";

export async function POST(req: Request) {
  return handlePublicForm(req, { schema: corporateSchema, limit: "corporate", formToggle: "corporate", run: createCorporateInquiry });
}
