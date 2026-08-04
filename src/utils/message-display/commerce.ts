import type {
  OrderItem,
  ProductSection,
  StructuredMessageDisplay,
} from "./types";
import { isRecord, readInteractiveFrame, readString } from "./guards";

function readProductSections(value: unknown): ProductSection[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;

  const sections = value.map((section) => {
    if (
      !isRecord(section) ||
      !Array.isArray(section.product_items) ||
      section.product_items.length === 0
    ) {
      return null;
    }

    const title = readString(section.title);
    const productRetailerIds = section.product_items.map((item) =>
      isRecord(item) ? readString(item.product_retailer_id) : null,
    );
    return title && productRetailerIds.every((id) => id !== null)
      ? { title, productRetailerIds: productRetailerIds as string[] }
      : null;
  });

  return sections.every((section) => section !== null)
    ? (sections as ProductSection[])
    : null;
}

export function normalizeCommerceInteractive(
  data: Record<string, unknown>,
): StructuredMessageDisplay | null {
  if (data.type === "product") {
    const frame = readInteractiveFrame(data);
    if (!frame || !isRecord(data.action)) return null;

    const catalogId = readString(data.action.catalog_id);
    const productRetailerId = readString(data.action.product_retailer_id);
    if (!catalogId || !productRetailerId) return null;

    return {
      ...frame,
      kind: "product",
      catalogId,
      productRetailerId,
      preview: frame.body
        ? { kind: "content", text: frame.body }
        : { kind: "label", text: "Mensaje de producto" },
    };
  }

  if (data.type === "product_list") {
    const frame = readInteractiveFrame(data);
    if (!frame?.body || !isRecord(data.action)) return null;

    const catalogId = readString(data.action.catalog_id);
    const sections = readProductSections(data.action.sections);
    if (!catalogId || !sections) return null;

    return {
      ...frame,
      kind: "product_list",
      body: frame.body,
      catalogId,
      sections,
      productCount: sections.reduce(
        (count, section) => count + section.productRetailerIds.length,
        0,
      ),
      preview: { kind: "content", text: frame.body },
    };
  }

  if (data.type === "catalog_message") {
    const frame = readInteractiveFrame(data);
    if (
      !frame?.body ||
      !isRecord(data.action) ||
      data.action.name !== "catalog_message"
    ) {
      return null;
    }

    const parameters = data.action.parameters;
    if (parameters !== undefined && !isRecord(parameters)) return null;
    const thumbnailProductRetailerId = isRecord(parameters)
      ? parameters.thumbnail_product_retailer_id === undefined
        ? undefined
        : readString(parameters.thumbnail_product_retailer_id)
      : undefined;
    if (thumbnailProductRetailerId === null) return null;

    return {
      ...frame,
      kind: "catalog",
      body: frame.body,
      thumbnailProductRetailerId,
      preview: { kind: "content", text: frame.body },
    };
  }

  return null;
}

export function normalizeOrder(
  data: Record<string, unknown>,
): StructuredMessageDisplay | null {
  const catalogId = readString(data.catalog_id);
  const text = readString(data.text);
  if (!catalogId || !text || !Array.isArray(data.product_items)) return null;

  const items = data.product_items.map((item) => {
    if (!isRecord(item)) return null;
    const productRetailerId = readString(item.product_retailer_id);
    const quantity = readString(item.quantity);
    const itemPrice = readString(item.item_price);
    const currency = readString(item.currency);
    return productRetailerId && quantity && itemPrice && currency
      ? { productRetailerId, quantity, itemPrice, currency }
      : null;
  });
  if (items.length === 0 || !items.every((item) => item !== null)) return null;

  const validItems = items as OrderItem[];
  const currency = validItems[0].currency;
  const numeric = validItems.map((item) => ({
    price: Number(item.itemPrice),
    quantity: Number(item.quantity),
  }));
  const canTotal =
    validItems.every((item) => item.currency === currency) &&
    numeric.every(
      (item) =>
        Number.isFinite(item.price) &&
        item.price >= 0 &&
        Number.isFinite(item.quantity) &&
        item.quantity > 0,
    );

  return {
    kind: "order",
    text,
    catalogId,
    items: validItems,
    total: canTotal
      ? {
          amount: numeric.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0,
          ),
          currency,
        }
      : undefined,
    preview: { kind: "label", text: "Pedido recibido" },
  };
}
