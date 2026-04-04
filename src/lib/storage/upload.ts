import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { nanoid } from "nanoid";

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function uploadImage(
  file: Buffer,
  contentType: string,
  extension: string
): Promise<string> {
  const supabase = getAdminClient();
  const key = `${nanoid()}.${extension}`;

  const { error } = await supabase.storage
    .from("uploads")
    .upload(key, file, {
      contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from("uploads").getPublicUrl(key);
  return data.publicUrl;
}
