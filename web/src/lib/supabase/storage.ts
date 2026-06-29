import { createServiceClient } from "./client";

const KYC_BUCKET = "kyc-documents";
const AVATAR_BUCKET = "avatars";

export type UploadResult = { path: string; signedUrl?: string };

/**
 * Tạo signed URL để client upload trực tiếp lên Supabase Storage.
 * Server không cần xử lý binary — client upload thẳng, gửi URL lại cho server.
 */
export async function createUploadSignedUrl(
  bucket: string,
  path: string,
  expiresInSeconds = 300,
): Promise<string> {
  const supabase = createServiceClient();
  if (!supabase) throw new Error("Supabase Storage chưa được cấu hình");
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUploadUrl(path);

  if (error || !data) throw new Error(`Storage upload URL error: ${error?.message}`);
  return data.signedUrl;
}

/**
 * Tạo signed URL để đọc file (KYC docs — private).
 */
export async function createDownloadSignedUrl(
  bucket: string,
  path: string,
  expiresInSeconds = 3600,
): Promise<string> {
  const supabase = createServiceClient();
  if (!supabase) throw new Error("Supabase Storage chưa được cấu hình");
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data) throw new Error(`Storage download URL error: ${error?.message}`);
  return data.signedUrl;
}

export async function kycUploadUrl(driverProfileId: string, docType: string) {
  const path = `${driverProfileId}/${docType}-${Date.now()}.jpg`;
  const signedUrl = await createUploadSignedUrl(KYC_BUCKET, path);
  return { path, signedUrl };
}

export async function kycDownloadUrl(path: string) {
  return createDownloadSignedUrl(KYC_BUCKET, path, 3600);
}

export async function avatarUploadUrl(userId: string) {
  const path = `${userId}/avatar-${Date.now()}.jpg`;
  const signedUrl = await createUploadSignedUrl(AVATAR_BUCKET, path);
  return { path, signedUrl };
}

export function publicUrl(bucket: string, path: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}
