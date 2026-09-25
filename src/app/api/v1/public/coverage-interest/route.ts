import { coverageInterestSchema } from "@/features/public-schemas";
import { createCoverageInterest } from "@/server/leads";
import { handlePublicForm } from "@/server/public-form";

export async function POST(req: Request) {
  return handlePublicForm(req, {
    schema: coverageInterestSchema,
    limit: "coverageInterest",
    formToggle: "coverageInterest",
    run: createCoverageInterest,
  });
}
