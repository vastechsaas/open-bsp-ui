# Chat Center contact lookup batching

The conversation list, header and customer details panel share one cache entry
per signed-in user, organization and contact address. The loader combines
concurrent reads into one authenticated `contacts_addresses` lookup with the
linked contact fields. It requests only addresses needed by the current chat
surfaces, with a maximum of 50 addresses per batch and one batch in flight.
Existing row-level security remains in force.

- Opening 39 conversations with duplicate header/panel lookups is one batch in
  the regression test, instead of 78 independent address and contact reads.
- Fresh entries are reused for 60 seconds. There is no new polling.
- Existing contact update events invalidate cached addresses linked to that
  contact. Inserts can also recheck cached unlinked addresses. Local contact
  mutations target the edited contact and explicitly affected addresses.
- Focus and reconnect recover stale entries in batches. Address-only changes
  that do not emit a contacts event are picked up on stale recovery or reopen.
- Abandoned queued reads are discarded. Shared requests are cancelled after
  their last observer leaves. Transient retries are bounded per batch, not per
  contact, and recently failed reads are cooled down on focus/reconnect.

The change does not alter conversation access, live messages, history loading,
the Contact Manager's server pagination, or database schema and policies.

## Rollout checks

Verify the published frontend bundle, then refresh Chat Center in one signed-in
tab. In the browser Network panel, filter for `contacts_addresses`: list reads
should use an `address=in.(...)` filter, with no pair of reads per row. Opening
the header/details for an already cached address should not repeat the lookup.
An edit to an existing contact should refresh only its affected addresses.

An older tab can continue to run the old frontend until refreshed. Proxy logs
can distinguish the new batched reads from old per-address requests.
