import { getSupabaseAdmin } from "./supabase/server";

export type StoredAsset = {
  image_type: string;
  storage_path: string;
  original_name: string;
  public_url: string;
  file_size: number;
};

const IMAGE_BUCKET = "images";

function safeFileName(name: string): string {
  const [base, ...rest] = name.split(".");
  const extension = rest.length ? `.${rest.pop()}` : "";
  return `${base || "file"}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80)
    .concat(extension.toLowerCase());
}

export async function uploadRestaurantAsset(domainName: string, imageType: string, file: File): Promise<StoredAsset> {
  const admin = getSupabaseAdmin();
  const originalName = file.name || `${imageType}.bin`;
  const storagePath = `${domainName}/${imageType}/${Date.now()}_${safeFileName(originalName)}`;
  const bytes = await file.arrayBuffer();

  const { error } = await admin.storage.from(IMAGE_BUCKET).upload(storagePath, bytes, {
    contentType: file.type || "application/octet-stream",
    upsert: true,
  });

  if (error) throw new Error(error.message);

  const { data } = admin.storage.from(IMAGE_BUCKET).getPublicUrl(storagePath);
  return {
    image_type: imageType,
    storage_path: storagePath,
    original_name: originalName,
    public_url: data.publicUrl,
    file_size: file.size,
  };
}

export async function insertRestaurantImageRecords(restaurantId: string, assets: StoredAsset[]) {
  if (assets.length === 0) return;

  const admin = getSupabaseAdmin();
  const { error } = await admin.from("restaurant_images").insert(
    assets.map((asset) => ({
      restaurant_id: restaurantId,
      storage_path: asset.storage_path,
      original_name: asset.original_name,
      image_type: asset.image_type,
      file_size: asset.file_size,
    }))
  );

  if (error) throw new Error(error.message);
}
