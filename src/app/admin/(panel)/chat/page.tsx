import { Suspense } from "react";
import { requireAdminPage, can } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { ChatConsole } from "@/components/admin/chat-console";
import { getGeneralSettings } from "@/server/settings";

export const metadata = { title: "Live Chat" };

export default async function ChatPage() {
  const ctx = await requireAdminPage("chat.read");
  const [agents, settings] = await Promise.all([
    db.user.findMany({
      where: { isActive: true, roles: { some: { role: { permissions: { some: { permission: { key: "chat.reply" } } } } } } },
      select: { id: true, displayName: true },
      orderBy: { displayName: "asc" },
    }),
    getGeneralSettings(),
  ]);
  return (
    <div>
      <PageHeader title="Live Chat" description={settings.chatEnabled ? "Visitor messages are saved 24/7. Messages appear here in realtime (or within seconds via auto-refresh)." : "Chat is currently disabled on the website (Settings)."} />
      <Suspense>
        <ChatConsole me={{ id: ctx.userId, name: ctx.displayName }} canReply={can(ctx, "chat.reply")} agents={agents.map((a) => ({ id: a.id, name: a.displayName }))} />
      </Suspense>
    </div>
  );
}
