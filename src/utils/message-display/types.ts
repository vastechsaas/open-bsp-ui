import type { Json } from "@/supabase/db_types";

export type StructuredContent = {
  type: "data";
  kind: string;
  data: Json;
  text?: string;
};

export type MessageContent =
  | StructuredContent
  | { type: "text"; text: string }
  | { type: "file" }
  | { type: "parts" };

export type InteractiveHeader =
  | { kind: "text"; text: string }
  | {
      kind: "media";
      mediaType: "image" | "video" | "document";
      filename?: string;
    };

export type InteractiveFrame = {
  header?: InteractiveHeader;
  body?: string;
  footer?: string;
};

export type InteractiveReplyButton = {
  id: string;
  title: string;
};

export type InteractiveListRow = InteractiveReplyButton & {
  description?: string;
};

export type InteractiveListSection = {
  title: string;
  rows: InteractiveListRow[];
};

export type ProductSection = {
  title: string;
  productRetailerIds: string[];
};

export type OrderItem = {
  productRetailerId: string;
  quantity: string;
  itemPrice: string;
  currency: string;
};

export type PreviewValue =
  | { kind: "content"; text: string }
  | { kind: "label"; text: string };

type DisplayBase = {
  preview: PreviewValue;
};

export type StructuredMessageDisplay =
  | (DisplayBase & { kind: "text"; text: string })
  | (DisplayBase &
      InteractiveFrame & {
        kind: "interactive_buttons";
        body: string;
        buttons: InteractiveReplyButton[];
      })
  | (DisplayBase &
      InteractiveFrame & {
        kind: "interactive_list";
        body: string;
        buttonText: string;
        sections: InteractiveListSection[];
      })
  | (DisplayBase & { kind: "selected_reply"; text: string })
  | (DisplayBase &
      InteractiveFrame & {
        kind: "product";
        catalogId: string;
        productRetailerId: string;
      })
  | (DisplayBase &
      InteractiveFrame & {
        kind: "product_list";
        body: string;
        catalogId: string;
        sections: ProductSection[];
        productCount: number;
      })
  | (DisplayBase &
      InteractiveFrame & {
        kind: "catalog";
        body: string;
        thumbnailProductRetailerId?: string;
      })
  | (DisplayBase &
      InteractiveFrame & {
        kind: "location_request";
        body: string;
      })
  | (DisplayBase & {
      kind: "location";
      name: string;
      address: string;
      latitude: number;
      longitude: number;
      url?: string;
    })
  | (DisplayBase &
      InteractiveFrame & {
        kind: "flow";
        body: string;
        cta: string;
        flowName?: string;
      })
  | (DisplayBase & {
      kind: "flow_response";
      name: string;
      body: string;
    })
  | (DisplayBase & {
      kind: "order";
      text: string;
      catalogId: string;
      items: OrderItem[];
      total?: { amount: number; currency: string };
    })
  | (DisplayBase & { kind: "media_placeholder" })
  | (DisplayBase & { kind: "json"; data: Json });

export type TranslatePreview = (key: string) => string;
