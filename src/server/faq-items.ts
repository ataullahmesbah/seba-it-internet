import "server-only";
import { sanitizeBasic } from "@/lib/sanitize";
import type { AppLocale } from "@/lib/i18n";
import type { FaqDTO } from "@/server/public-data";

/** Convert FAQ DTOs into sanitized accordion items (answers may contain safe basic rich text). */
export function toFaqItems(faqs: FaqDTO[], locale: AppLocale, categoryName?: (id: string | null) => string) {
  return faqs.map((f) => {
    const answer = locale === "bn" ? f.answerBn : f.answerEn;
    const html = /<[a-z][\s\S]*>/i.test(answer) ? sanitizeBasic(answer) : `<p>${answer.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>")}</p>`;
    return { id: f.id, question: locale === "bn" ? f.questionBn : f.questionEn, answerHtml: html, category: categoryName?.(f.categoryId) };
  });
}
