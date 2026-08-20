// POST /api/babies/:id/photos — 실제 사진 업로드 (multipart, O-01 검증)
// 실서비스: presigned S3 + 서버측 얼굴 검출·블러 점수·동일인 판별·안전 필터

import { NextResponse } from "next/server";
import { requireUser, ok, err, handleError } from "@/server/http";
import { savePhoto, validatePhoto, photoCount, MAX_PHOTOS } from "@/server/uploads";
import { trackEvent } from "@/server/db";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = await ctx.params;
    const owner = auth.db
      .prepare("SELECT user_id FROM baby_profiles WHERE id = ?")
      .get(id) as { user_id: string } | undefined;
    if (!owner || owner.user_id !== auth.userId) return err(404, "NOT_FOUND", "아기 프로필 없음");

    const form = await req.formData();
    const files = form.getAll("photos").filter((f): f is File => f instanceof File);
    if (files.length === 0) return err(400, "NO_FILES", "photos 필드에 파일이 필요합니다");

    const accepted: string[] = [];
    const rejected: { name: string; reason: string }[] = [];
    for (const f of files) {
      const v = validatePhoto(f.type, f.size);
      if (!v.ok) {
        rejected.push({ name: f.name, reason: v.reason });
        continue;
      }
      if (photoCount(id) >= MAX_PHOTOS) {
        rejected.push({ name: f.name, reason: `최대 ${MAX_PHOTOS}장 초과` });
        continue;
      }
      savePhoto(id, Buffer.from(await f.arrayBuffer()), f.type);
      accepted.push(f.name);
    }
    trackEvent(auth.db, "photos_upload", auth.userId, {
      baby: id, accepted: accepted.length, rejected: rejected.length,
    });
    return ok({ accepted: accepted.length, rejected, total: photoCount(id) });
  } catch (e) {
    return handleError(e);
  }
}
