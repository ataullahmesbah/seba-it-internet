import { contactSchema } from "@/features/public-schemas";
import { createContactMessage } from "@/server/leads";
import { handlePublicForm } from "@/server/public-form";

export async function POST(req: Request) {
  return handlePublicForm(req, { schema: contactSchema, limit: "contact", formToggle: "contact", run: createContactMessage });
}
