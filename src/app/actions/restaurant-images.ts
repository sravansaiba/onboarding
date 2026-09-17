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

function resolveFolder(imageType: string): string {
  if (imageType === "logo" || imageType === "logo_url") return "logo";
  if (imageType === "background" || imageType === "background_image_url") return "background";
  return "certificates";
}

export async function uploadRestaurantAsset(
  domainName: string,
  imageType: string,
  file: File
): Promise<StoredAsset> {
  const admin = getSupabaseAdmin();
  const cleanDomain = domainName.toLowerCase().trim().replace(/[^a-z0-9-]+/g, "-");
  const folder = resolveFolder(imageType);
  const originalName = file.name || `${imageType}.bin`;
  const storagePath = `${cleanDomain}/${folder}/${Date.now()}_${safeFileName(originalName)}`;
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

export async function deleteRestaurantAsset(storagePathOrUrl?: string | null) {
  if (!storagePathOrUrl) return;

  const admin = getSupabaseAdmin();
  let path = storagePathOrUrl.trim();

  // If full Supabase URL was passed, extract the relative path inside images bucket
  if (path.includes(`/${IMAGE_BUCKET}/`)) {
    path = path.split(`/${IMAGE_BUCKET}/`)[1];
  } else if (path.startsWith("http")) {
    const parts = path.split("/");
    path = parts.slice(parts.indexOf(IMAGE_BUCKET) + 1).join("/");
  }

  if (!path) return;

  try {
    await admin.storage.from(IMAGE_BUCKET).remove([path]);
    await admin.from("restaurant_images").delete().eq("storage_path", path);
  } catch (error) {
    console.error("Error deleting asset from Supabase storage:", error);
  }
}

export async function listRestaurantImages(restaurantId: string): Promise<StoredAsset[]> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("restaurant_images")
    .select("storage_path, original_name, image_type, file_size")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((item) => {
    const { data: urlData } = admin.storage.from(IMAGE_BUCKET).getPublicUrl(item.storage_path);
    return {
      image_type: item.image_type,
      storage_path: item.storage_path,
      original_name: item.original_name,
      file_size: item.file_size,
      public_url: urlData.publicUrl,
    };
  });
}
