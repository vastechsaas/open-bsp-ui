const uploadMessages = {
  carousel_upload_failed:
    "No se pudo guardar la imagen. Revisá la conexión y volvé a guardar.",
  carousel_storage_quota_exceeded:
    "Se alcanzó el límite de almacenamiento. Pedí más espacio y volvé a guardar.",
  carousel_image_reuse_failed:
    "No se pudo verificar la imagen existente. Volvé a elegir la imagen o contactá al administrador.",
  carousel_preview_failed:
    "La imagen se guardó, pero no se pudo preparar su vista previa. Volvé a guardar.",
  carousel_image_invalid: "Usá una imagen JPEG o PNG válida de hasta 5 MB.",
};

export class CarouselUploadError extends Error {
  readonly guidance: string;
  constructor(code: string) {
    super("Carousel image upload failed");
    this.guidance = Object.hasOwn(uploadMessages, code)
      ? uploadMessages[code as keyof typeof uploadMessages]
      : uploadMessages.carousel_upload_failed;
  }
}

/** Allowlisted guidance only; never display raw storage/server response text. */
export async function normalizeCarouselUploadError(error: unknown) {
  try {
    const response = (error as { context?: unknown })?.context;
    if (response instanceof Response) {
      const body = (await response.clone().json()) as {
        cause?: { code?: unknown };
      };
      if (typeof body?.cause?.code === "string") {
        return new CarouselUploadError(body.cause.code);
      }
    }
  } catch {
    // A network error, non-JSON body or older backend uses generic safe guidance.
  }
  return new CarouselUploadError("carousel_upload_failed");
}

export class CarouselCardUploadError extends Error {
  readonly guidance: string;
  readonly cardId: string;
  readonly cardNumber: number;
  constructor(cardId: string, cardNumber: number, error: unknown) {
    super("Carousel card image could not be saved");
    this.cardId = cardId;
    this.cardNumber = cardNumber;
    this.guidance =
      error instanceof CarouselUploadError
        ? error.guidance
        : uploadMessages.carousel_upload_failed;
  }
}
