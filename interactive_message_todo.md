# WhatsApp Interactive Message Rendering TODO

Last reviewed: 2026-08-04

Project contract baseline: WhatsApp Graph API v24.0

Status legend:

- `[x]` Implemented in Chat Center.
- `[~]` Partially implemented; the safe stored-data presentation exists, but a
  separately scoped enrichment or workflow is still required.
- `[ ]` Not implemented.

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

SCRUM-101 expanded that support with:

- Product, product-list, and catalog message presentation using stored payload
  data only.
- Location requests and inbound location responses with validated stored URLs.
- WhatsApp Flows and privacy-safe `nfm_reply` completion summaries.
- Structured inbound order summaries with conditional same-currency totals.
- Text headers, footers, and typed unavailable-media placeholders for existing
  button/list messages.
- Family-specific normalizers, one shared preview resolver, localized labels,
  and accessible read-only details dialogs.

Still excluded and not implemented: live Meta catalog enrichment, operator send
workflows, new chatbot nodes, Flow answer display, CTA URL messages, address
collection, payment formats, full authenticated media-header persistence, and
third-party chat libraries.

## Rendering gaps in the formats already supported

- [x] Render optional text headers on list and reply-button messages.
- [~] Render optional image, video, and document headers on reply-button
  messages. Typed unavailable-media placeholders are implemented; full
  authenticated media artifacts remain future work.
- [x] Render optional footer text.
- [~] Preserve WhatsApp formatting in header, body, footer, and descriptions.
  Header, body, and footer formatting is implemented; list descriptions
  remain safe plain text.
- [ ] Add representative preview text when a body is missing but a valid header
      or media component is present.
- [x] Confirm safe behavior when referenced media has expired or cannot be
      downloaded by displaying a typed unavailable-media placeholder.

These enhancements can remain frontend-only if the stored payload already
contains the fields. Otherwise, update backend endpoint types and ingestion
before changing the frontend mirror.

## Core interactive message families and remaining gaps

### 1. Single-product messages

Meta interactive type: `product`

- [x] Add the outgoing payload contract to backend and mirrored frontend types.
- [~] Render the product name, image, price, currency, retailer ID, and catalog
  context when available. Stored catalog and retailer references are shown;
  name, image, price, and currency require future catalog enrichment.
- [x] Define a useful placeholder when product metadata cannot be resolved.
- [~] Add a readable conversation preview such as `Product: <name>`. A neutral
  localized `Product message` preview is implemented without live metadata.
- [x] Keep any product/catalog action read-only in historical messages.
- [x] Handle the related inbound `order` message as a structured order summary.

Dependencies:

- Product/catalog metadata lookup and authorization.
- A decision on snapshot-at-send-time data versus live catalog data.
- Backend and webhook tests for product and order payloads.

### 2. Multi-product messages

Meta interactive type: `product_list`

- [x] Add the outgoing payload contract to backend and mirrored frontend types.
- [x] Render catalog sections and stored retailer references in a local
      read-only panel.
- [~] Support long lists, missing images, unavailable products, and multiple
  sections without breaking bubble layout.
- [x] Add a concise preview containing the message body.
- [x] Handle the related inbound `order` message, including quantities,
      currency, and totals when supplied.

Dependencies:

- The same catalog metadata strategy used for single-product messages.
- Pagination or virtualization if stored product lists can be large.
- A defined display rule for products removed from the catalog after sending.

### 3. Catalog messages

Meta interactive type: `catalog_message`

- [x] Verify availability and exact payload contract for the Meta Graph API
      version used by this project before implementation.
- [x] Render the catalog prompt and a read-only `View catalog` action.
- [ ] Add a local catalog summary only if authorized product data is available.
- [x] Add a readable conversation preview.
- [x] Cover related inbound order payloads without exposing raw JSON.

The stored-data presentation shares its UI and data layer with single- and
multi-product messages. Live catalog summaries remain blocked on catalog
authorization and stale-product behavior.

### 4. Location-request messages

Meta interactive type: `location_request_message`

- [x] Add the outgoing request contract to backend and mirrored frontend types.
- [x] Render the body and a visibly read-only `Send location` row in history.
- [x] Render the customer's inbound location response with name, address,
      coordinates, and a safe map link when present.
- [x] Do not request browser/device location from a historical message bubble.
- [x] Add useful previews for both the request and the returned location.
- [ ] Define privacy, retention, logging, and authorization expectations for
      location data before enabling any send workflow.

### 5. WhatsApp Flows

Meta interactive type: `flow`

Typical inbound completion type: `interactive.type = "nfm_reply"`

- [x] Add exact versioned outgoing Flow contracts to backend and mirrored
      frontend types.
- [x] Render the Flow header/body/footer and a read-only Flow action row.
- [x] Render a completed Flow as a concise summary rather than raw
      `response_json`.
- [~] Store and display the Flow name/ID and completion status when available.
  Completion name/body and `Response received` are displayed; payload IDs
  remain intentionally hidden from bubbles and previews.
- [ ] Define field labels, ordering, masking, and redaction for submitted data.
- [ ] Add an expandable details view for large Flow responses.
- [x] Never automatically render unknown Flow response values as HTML.
- [x] Add previews that identify the Flow or summarize its outcome without
      leaking sensitive answers.

Remaining dependencies:

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

- [x] Supported payloads never display as raw JSON.
- [x] Unknown or malformed payloads retain a safe, readable JSON fallback.
- [x] Timestamps, delivery/read status, agent attribution, and bubble alignment
      remain unchanged.
- [x] Conversation previews do not expose IDs or large serialized payloads.
- [x] Long content works at desktop and narrow breakpoints.
- [~] Media and external links use the existing authenticated/safe rendering
  paths.
- [x] Sensitive fields are masked or omitted from previews.
- [x] Raw payload IDs remain available to routing and backend logic.
- [x] Every supported inbound and outgoing shape has focused normalizer and
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
