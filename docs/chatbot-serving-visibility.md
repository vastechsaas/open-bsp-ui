# Chatbot serving visibility

The flow list's former **Active** label represented `chatbot_flows.status`:
it meant a flow was not archived, including unpublished copies. It did not
identify which flow was activated for a number.

The list now separates **Available** from **Serving customers**:

- Node uses the selected `chatbot_node_bridges` flow/version with `engine=node`
  and `sync_status=active` on a connected number.
- Native uses `chatbot_flow_deployments`, unless the number's bridge selector
  suppresses native execution. This check includes selectors pointing to flows
  outside the displayed page.
- Engine, number and activated version appear beneath each serving badge.
  Draft/latest published versions remain separate. Existing sessions may still
  be pinned to an older version.
- Pending, failed, suspended and disabled bindings have distinct labels.
  Unavailable status requests show an error and Retry, never a false inactive
  or serving result.

These are confirmed activation records, not live Meta delivery/worker-health
checks. Per-conversation human ownership does not deactivate the entire flow.

Two batched authenticated Supabase queries cover only the displayed flow IDs.
Bindings are paginated internally; the flow list keeps its existing server-side
pagination. Queries include organization/user/page scope, cancellation, focus
refresh, ten-second polling and activation/deactivation/retry invalidation.
Only number display metadata is requested; credentials are not fetched.

No database migration, backend endpoint or Oracle change is required.
No activation, publishing or DKR flow data is modified by this UI feature.
