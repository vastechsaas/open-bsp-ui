import { supabase } from "@/supabase/client";
import type { CarouselMediaAsset } from "@/supabase/types/whatsapp_template_types";

export async function uploadCarouselImage(
  organizationId: string,
  resource: "template" | "campaign",
  draftId: string,
  cardId: string,
  file: File,
) {
  const form = new FormData();
  form.set("organization_id", organizationId);
  form.set("resource", resource);
  form.set("draft_id", draftId);
  form.set("card_id", cardId);
  form.set("file", file);
  const { data, error } = (await supabase.functions.invoke(
    "whatsapp-management/carousel-media",
    { method: "POST", body: form },
  )) as unknown as {
    data: { asset: CarouselMediaAsset; preview_url: string } | null;
    error: Error | null;
  };
  if (error) throw error;
  if (!data) throw new Error("Carousel upload returned no image reference");
  return data;
}

export async function carouselPreviewUrl(asset: CarouselMediaAsset) {
  const { data, error } = await supabase.storage
    .from("media")
    .createSignedUrl(asset.storage_uri.replace("internal://media/", ""), 3600);
  if (error) throw error;
  return data.signedUrl;
}
