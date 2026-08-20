// GET /api/jobs/:id/stream — SSE 진행률 (설계서 §4.1 G-01)
// 실서비스: Redis pub/sub 구독. BE-1: 500ms tick 폴링을 서버에서 수행해 스트림으로.

import { NextResponse } from "next/server";
import { requireUser, err } from "@/server/http";
import { jobView } from "@/server/jobs";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const owner = auth.db.prepare("SELECT user_id FROM jobs WHERE id = ?").get(id) as
    | { user_id: string }
    | undefined;
  if (!owner || owner.user_id !== auth.userId) return err(404, "NOT_FOUND", "잡 없음");

  const db = auth.db;
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      const deadline = Date.now() + 30_000;
      try {
        for (;;) {
          const view = jobView(db, id);
          send(view);
          if (view.status === "done" || view.status === "failed" || Date.now() > deadline) break;
          await new Promise((r) => setTimeout(r, 500));
        }
      } finally {
        controller.close();
      }
    },
  });
  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
