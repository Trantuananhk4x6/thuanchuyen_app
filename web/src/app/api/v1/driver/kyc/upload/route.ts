import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { createServiceClient } from "@/lib/supabase/client";

const ALLOWED_DOC_TYPES = ["CCCD_FRONT", "CCCD_BACK", "DRIVER_LICENSE", "VEHICLE_REGISTRATION", "SELFIE"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return Errors.validation("Dữ liệu form không hợp lệ");
  }

  const file = formData.get("file") as File | null;
  const docType = formData.get("type") as string | null;

  if (!file) return Errors.validation("Thiếu file ảnh");
  if (!docType || !ALLOWED_DOC_TYPES.includes(docType)) return Errors.validation("Loại giấy tờ không hợp lệ");
  if (file.size > MAX_FILE_SIZE) return Errors.validation("File quá lớn (tối đa 10MB)");
  if (!file.type.startsWith("image/")) return Errors.validation("Chỉ chấp nhận file ảnh (jpg, png, webp...)");

  const supabase = createServiceClient();
  if (!supabase) return Errors.internal("Storage chưa được cấu hình");

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `kyc/${auth.payload.userId}/${docType}_${Date.now()}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(path, buffer, { contentType: file.type, upsert: true });

  if (uploadError) return Errors.internal(uploadError.message);

  const { data: { publicUrl } } = supabase.storage.from("documents").getPublicUrl(path);

  return ok({ url: publicUrl });
}
