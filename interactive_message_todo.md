# WhatsApp Interactive Message Rendering TODO

Last reviewed: 2026-08-04

## Purpose

Track WhatsApp interactive formats that the Chat Center does not yet render as
first-class, readable message bubbles. This is a rendering roadmap, not a
commitment to add every corresponding send capability.

The raw WhatsApp payload must remain unchanged in storage. Button, row, product,
Flow, and other stable identifiers may be required by chatbot routing, webhook
processing, auditing, and future features.

## Current support

SCRUM-93 added Chat Center display support for:

- Outgoing reply-button messages (`interactive.type = "button"`).
- Outgoing list messages (`interactive.type = "list"`).
- Incoming button selections (`button_reply`).
- Incoming list selections (`list_reply`).
- Incoming template-button replies (`type = "button"`).
- Readable conversation-list previews for those formats.
- Defensive raw-JSON fallback for malformed or unknown structured messages.

Historical reply buttons are intentionally read-only. The list opener only
shows a local read-only options panel and never sends a WhatsApp response.

## Rendering gaps in the formats already supported

- [ ] Render optional text headers on list and reply-button messages.
- [ ] Render optional image, video, and document headers on reply-button
      messages.
- [ ] Render optional footer text.
- [ ] Preserve WhatsApp formatting in header, body, footer, and descriptions.
- [ ] Add representative preview text when a body is missing but a valid header
      or media component is present.
- [ ] Confirm safe behavior when referenced media has expired or cannot be
      downloaded.

These enhancements can remain frontend-only if the stored payload already
contains the fields. Otherwise, update backend endpoint types and ingestion
before changing the frontend mirror.

## Remaining interactive message families

### 1. Single-product messages

Meta interactive type: `product`

- [ ] Add the outgoing payload contract to backend and mirrored frontend types.
- [ ] Render the product name, image, price, currency, retailer ID, and catalog
      context when available.
- [ ] Define a useful placeholder when product metadata cannot be resolved.
- [ ] Add a readable conversation preview such as `Product: <name>`.
- [ ] Keep any product/catalog action read-only in historical messages.
- [ ] Handle the related inbound `order` message as a structured order summary.

Dependencies:

- Product/catalog metadata lookup and authorization.
- A decision on snapshot-at-send-time data versus live catalog data.
- Backend and webhook tests for product and order payloads.

### 2. Multi-product messages

Meta interactive type: `product_list`

- [ ] Add the outgoing payload contract to backend and mirrored frontend types.
- [ ] Render catalog sections and product items in a local read-only panel.
- [ ] Support long lists, missing images, unavailable products, and multiple
      sections without breaking bubble layout.
- [ ] Add a concise preview containing the message body or product count.
- [ ] Handle the related inbound `order` message, including quantities,
      currency, and totals when supplied.

Dependencies:

- The same catalog metadata strategy used for single-product messages.
- Pagination or virtualization if stored product lists can be large.
- A defined display rule for products removed from the catalog after sending.

### 3. Catalog messages

Meta interactive type: `catalog_message`

- [ ] Verify availability and exact payload contract for the Meta Graph API
      version used by this project before implementation.
- [ ] Render the catalog prompt and a read-only `View catalog` action.
- [ ] Add a local catalog summary only if authorized product data is available.
- [ ] Add a readable conversation preview.
- [ ] Cover related inbound cart/order payloads without exposing raw JSON.

This item may share its UI and data layer with single- and multi-product
messages, but should not be implemented until catalog authorization and stale
product behavior are defined.

### 4. Location-request messages

Meta interactive type: `location_request_message`

- [ ] Add the outgoing request contract to backend and mirrored frontend types.
- [ ] Render the body and a visibly read-only `Send location` row in history.
- [ ] Render the customer's inbound location response with name, address,
      coordinates, and a safe map link when present.
- [ ] Do not request browser/device location from a historical message bubble.
- [ ] Add useful previews for both the request and the returned location.
- [ ] Define privacy, retention, logging, and authorization expectations for
      location data before enabling any send workflow.

### 5. WhatsApp Flows

Meta interactive type: `flow`

Typical inbound completion type: `interactive.type = "nfm_reply"`

- [ ] Add exact versioned outgoing Flow contracts to backend and mirrored
      frontend types.
- [ ] Render the Flow header/body/footer and a read-only Flow action row.
- [ ] Render a completed Flow as a concise summary rather than raw
      `response_json`.
- [ ] Store and display the Flow name/ID and completion status when available.
- [ ] Define field labels, ordering, masking, and redaction for submitted data.
- [ ] Add an expandable details view for large Flow responses.
- [ ] Never automatically render unknown Flow response values as HTML.
- [ ] Add previews that identify the Flow or summarize its outcome without
      leaking sensitive answers.

Dependencies:

- Backend webhook normalization for `nfm_reply` and Flow response data.
- Per-Flow schema/label metadata for human-readable summaries.
- Security review for personal, financial, authentication, and health data.
- Meta Flow status/version handling for draft, published, deprecated, and
  deleted Flows.

## Version- and region-gated formats to evaluate

The following formats have appeared in Cloud API capabilities or specialized
WhatsApp programs. Their availability and contracts can depend on Graph API
version, business eligibility, country, or payment provider. Re-check Meta's
current documentation before creating implementation tickets.

### CTA URL interactive messages

Common interactive type: `cta_url`

- [ ] Confirm that the project's Meta API version and account type support it.
- [ ] Render display text and the destination host clearly.
- [ ] Treat historical links as read-only by default; if navigation is later
      enabled, validate the URL and show that it opens an external site.
- [ ] Never use an unvalidated payload as an executable URL.

### Address collection messages

Common interactive type: `address_message`

- [ ] Confirm regional availability and the exact request/response contract.
- [ ] Design a redacted address summary for the conversation and preview.
- [ ] Define access controls and retention rules before rendering full address
      details.
- [ ] Coordinate backend ingestion because replies may use structured response
      payloads rather than a simple selected-title field.

### Payment/order messages

Common interactive types can include `order_details` and `order_status`.

- [ ] Confirm country, currency, payment-provider, and API-version support.
- [ ] Render itemization, discounts, tax, shipping, totals, payment status, and
      reference IDs without exposing payment credentials.
- [ ] Distinguish a WhatsApp order from an OpenBSP internal billing record.
- [ ] Require backend validation and security review before enabling actions.

### Interactive template variants

- [ ] Render outgoing template quick-reply buttons as read-only action rows.
- [ ] Render URL and phone-number buttons with clear action labels.
- [ ] Evaluate Flow, catalog, authentication/OTP, carousel, and other template
      button/card variants supported by the project's Meta API version.
- [ ] Reuse the normalizer and display model instead of adding template-specific
      `JSON.stringify` paths.
- [ ] Keep incoming template-button replies readable while preserving their
      original payload identifiers.

## Required implementation boundary for every new format

Each format must be treated as an end-to-end slice. A rendering ticket should
state explicitly which of the following layers are included:

1. Meta version and eligibility verification.
2. Backend endpoint/send type.
3. Webhook ingestion and normalization.
4. Stored structured-payload compatibility.
5. Mirrored frontend TypeScript type.
6. Shared Chat Center display normalizer.
7. Message-bubble component.
8. Conversation-list preview.
9. Responsive and light/dark-theme presentation.
10. Accessibility and keyboard behavior.
11. Localization of UI-owned labels.
12. Unit, integration, and browser tests.

Unless a ticket explicitly adds operator actions, historical controls must stay
read-only and must never call the WhatsApp send endpoint.

## Shared acceptance criteria

- [ ] Supported payloads never display as raw JSON.
- [ ] Unknown or malformed payloads retain a safe, readable JSON fallback.
- [ ] Timestamps, delivery/read status, agent attribution, and bubble alignment
      remain unchanged.
- [ ] Conversation previews do not expose IDs or large serialized payloads.
- [ ] Long content works at desktop and narrow breakpoints.
- [ ] Media and external links use the existing authenticated/safe rendering
      paths.
- [ ] Sensitive fields are masked or omitted from previews.
- [ ] Raw payload IDs remain available to routing and backend logic.
- [ ] Every supported inbound and outgoing shape has focused normalizer and
      preview tests.
- [ ] Meta contracts are checked again when the Graph API version is upgraded.

## Not part of the interactive-message roadmap

Reactions, stickers, contacts, ordinary location shares, media, replies/quotes,
edits, deletions, polls, and unsupported-message notices are useful Chat Center
formats, but they are not all `interactive` message-object variants. Track them
under a separate general WhatsApp message-rendering roadmap so this file keeps a
clear boundary.

## Official references

- [Meta interactive-message guide](https://developers.facebook.com/docs/whatsapp/guides/interactive-messages/)
- [Meta WhatsApp Cloud API Message API](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages)
- [Meta WhatsApp Flows documentation](https://developers.facebook.com/docs/whatsapp/flows/)
- [Meta commerce guide](https://developers.facebook.com/docs/whatsapp/guides/commerce-guides/share-products-with-customers/)

The first guide now points through legacy On-Premises documentation and notes
that On-Premises API was sunset on 2025-10-23. Use the current Cloud API Message
API and the project's selected Graph API version as the implementation source
of truth.
