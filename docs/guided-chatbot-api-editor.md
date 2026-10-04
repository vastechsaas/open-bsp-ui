# Guided chatbot API editor

The API node offers **Guided** and **Advanced** views of the same saved
configuration. This is a frontend-only change: no migration, new credential
system, runtime format or Node deployment is needed.

## Guided setup

1. Enter an HTTPS URL and HTTP method. Select an existing protected credential,
   or save an API key with its header name (for example `X-Api-Key`) or a Bearer
   token. Bearer mode adds the `Authorization: Bearer` prefix automatically.
   Saved credentials already contain their header configuration; selecting one
   does not reinterpret or reveal its secret.
2. For POST/PUT/PATCH requests, add field/value rows. Choose fixed text, a
   chatbot variable, a number, boolean or null. **Customer phone** uses the
   existing `{{customer_phone}}` variable; no separate phone prompt is needed.
3. Paste a non-sensitive sample JSON response to choose response fields from
   a dropdown. Save each result into an output variable. Choose a single value
   or a formatted list, insert sample item fields and preview the message.
   Put the output variable in a following Message node to send it to customers.
4. Select the next node for success and API failure. These selectors edit the
   same canvas connections and enforce its existing cycle/connection rules.

Sample response discovery and previews run locally, never call the API and do
not persist the sample. There is no new live **Test API** endpoint in this slice.
Actual API behavior is tested through the existing runtime. Simulation still
uses mock responses, not network requests.

## Compatibility and Advanced mode

- Opening the editor or changing modes does not rewrite saved configuration.
- Nested JSON, root arrays, malformed bodies, duplicate JSON keys and unquoted
  template expressions remain in Advanced; they are not flattened or discarded.
- Raw JSON, public headers, timeouts and retries remain available in Advanced.
  Guided edits preserve those settings and existing protected credential IDs.
- The guided body uses the existing JSON-template execution rules; variables
  remain string substitutions, not a new structured-expression language.
- Protected credentials use the existing server-side tenant authorization and
  secret storage. Plain API keys are not copied into graph configuration.
- No active DKR flow or deployment is changed by installing this UI.

Feature branch: `codex/guided-chatbot-api-editor`, from `meta_vista_frontend`.

## Validation

- Focused API editor/formatter checks: 10 passed.
- Complete frontend validation: 279 tests passed, database types matched,
  TypeScript and production build passed.
- Existing lint baseline: 373 warnings, zero errors. Changed files have no
  lint warnings. No dependency installation, type generation or migration ran.
- Live API calls and authenticated browser/staging verification were not run.
