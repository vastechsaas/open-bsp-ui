//===================================
// Subset of open-bsp-api/.../_shared/types/whatsapp_endpoint_types.ts
// Only the outgoing media components used by template parameters are needed
// UI-side; the full endpoint-send message types are not used.
//===================================

export type OutgoingImage = {
  type: "image";
  image: ({ id: string } | { link: string }) & { caption?: string };
};

export type OutgoingVideo = {
  type: "video";
  video: ({ id: string } | { link: string }) & { caption?: string };
};

export type OutgoingDocument = {
  type: "document";
  document: ({ id: string } | { link: string }) & {
    caption?: string;
    filename?: string;
  };
};

export type OutgoingInteractive = {
  type: "interactive";
  interactive:
    | {
        type: "button";
        body: { text: string };
        action: {
          buttons: Array<{
            type: "reply";
            reply: { id: string; title: string };
          }>;
        };
      }
    | {
        type: "list";
        body: { text: string };
        action: {
          button: string;
          sections: Array<{
            title: string;
            rows: Array<{
              id: string;
              title: string;
              description?: string;
            }>;
          }>;
        };
      };
};
