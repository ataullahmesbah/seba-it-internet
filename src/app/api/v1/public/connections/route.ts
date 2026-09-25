import { connectionSchema } from "@/features/public-schemas";
import { createConnectionRequest } from "@/server/leads";
import { handlePublicForm } from "@/server/public-form";

export async function POST(req: Request) {
  return handlePublicForm(req, { schema: connectionSchema, limit: "connection", formToggle: "connection", run: createConnectionRequest });
}
