type NullableId = string | null | undefined;

export const queryKeys = {
  agents: {
    all: (orgId: NullableId) => [orgId, "agents"] as const,
    detail: (orgId: NullableId, id: NullableId) =>
      [orgId, "agents", id] as const,
    current: (orgId: NullableId) => [orgId, "agents", "current"] as const,
    invitations: () => ["invitations"] as const,
  },
  apiKeys: {
    all: (orgId: NullableId) => [orgId, "api_keys"] as const,
    detail: (orgId: NullableId, id: NullableId) =>
      [orgId, "api_keys", id] as const,
  },
  contacts: {
    all: (orgId: NullableId) => [orgId, "contacts"] as const,
    page: (orgId: NullableId, params: object) =>
      [orgId, "contacts", "page", params] as const,
    detail: (orgId: NullableId, id: NullableId) =>
      [orgId, "contacts", id] as const,
    byAddress: (orgId: NullableId, address: NullableId) =>
      [orgId, "contacts_addresses", address, "contact"] as const,
    addresses: (orgId: NullableId, contactId: NullableId) =>
      [orgId, "contacts", contactId, "addresses"] as const,
    addressDetail: (orgId: NullableId, address: NullableId) =>
      [orgId, "contacts_addresses", address] as const,
  },
  organizations: {
    all: () => ["organizations"] as const,
    detail: (id: NullableId) => ["organizations", id] as const,
    addresses: (orgId: NullableId) =>
      [orgId, "organizations_addresses"] as const,
    addressDetail: (orgId: NullableId, address: NullableId) =>
      [orgId, "organizations_addresses", address] as const,
  },
  webhooks: {
    all: (orgId: NullableId) => [orgId, "webhooks"] as const,
    detail: (orgId: NullableId, id: NullableId) =>
      [orgId, "webhooks", id] as const,
  },
  onboardingTokens: {
    all: (orgId: NullableId, service: string) =>
      [orgId, "onboarding_tokens", service] as const,
  },
  billing: {
    products: () => ["billing", "products"] as const,
    usage: (orgId: NullableId, interval: string) =>
      [orgId, "billing", "usage", interval] as const,
    subscription: (orgId: NullableId) =>
      [orgId, "billing", "subscription"] as const,
    tierLimits: (orgId: NullableId) =>
      [orgId, "billing", "tier_limits"] as const,
    planProducts: (orgId: NullableId) =>
      [orgId, "billing", "plan_products"] as const,
  },
  conversationQueues: {
    config: (orgId: NullableId) => [orgId, "conversation_queues"] as const,
  },
  routingQueues: {
    all: (orgId: NullableId) => [orgId, "routing_queues"] as const,
    options: (orgId: NullableId) =>
      [orgId, "routing_queues", "options"] as const,
    transferableOptions: (orgId: NullableId, conversationId: NullableId) =>
      [
        orgId,
        "routing_queues",
        "transferable_options",
        conversationId,
      ] as const,
    page: (orgId: NullableId, params: object) =>
      [orgId, "routing_queues", "page", params] as const,
  },
  privateNotes: {
    mentionableHumans: (orgId: NullableId, search: string) =>
      [orgId, "private_notes", "mentionable_humans", search] as const,
    mentionedConversationsRoot: (orgId: NullableId) =>
      [orgId, "private_notes", "mentioned_conversations"] as const,
    mentionedConversations: (orgId: NullableId, search: string) =>
      [orgId, "private_notes", "mentioned_conversations", search] as const,
  },
  quickReplies: {
    all: (orgId: NullableId) => [orgId, "quick_replies"] as const,
    library: (orgId: NullableId) =>
      [orgId, "quick_replies", "library"] as const,
    page: (orgId: NullableId, params: object) =>
      [orgId, "quick_replies", "page", params] as const,
  },
  dashboard: {
    metrics: (orgId: NullableId, days: number) =>
      [orgId, "dashboard", days] as const,
  },
  campaigns: {
    all: (orgId: NullableId) => [orgId, "campaigns"] as const,
    page: (orgId: NullableId, params: object) =>
      [orgId, "campaigns", "page", params] as const,
    detail: (orgId: NullableId, id: NullableId) =>
      [orgId, "campaigns", id] as const,
    audience: (orgId: NullableId, id: NullableId) =>
      [orgId, "campaigns", id, "audience"] as const,
  },
  chatbotFlows: {
    all: (orgId: NullableId) => [orgId, "chatbot_flows"] as const,
    page: (orgId: NullableId, params: object) =>
      [orgId, "chatbot_flows", "page", params] as const,
    draft: (orgId: NullableId, flowId: NullableId) =>
      [orgId, "chatbot_flows", flowId, "draft"] as const,
    versions: (orgId: NullableId, flowId: NullableId) =>
      [orgId, "chatbot_flows", flowId, "versions"] as const,
    deployments: (orgId: NullableId, flowId: NullableId) =>
      [orgId, "chatbot_flows", flowId, "deployments"] as const,
    webhookCredentials: (orgId: NullableId) =>
      [orgId, "chatbot_flows", "webhook_credentials"] as const,
  },
  members: {
    all: (orgId: NullableId) => [orgId, "members"] as const,
    page: (orgId: NullableId, params: object) =>
      [orgId, "members", "page", params] as const,
  },
  platform: {
    root: () => ["platform"] as const,
    access: (
      scope: "global" | "tenant",
      organizationId: NullableId,
      requestId: string,
    ) => ["platform", "access", scope, organizationId, requestId] as const,
    authorization: () => ["platform", "authorization"] as const,
    overview: () => ["platform", "overview"] as const,
    organizations: (params: object) =>
      ["platform", "organizations", params] as const,
    tenant: (organizationId: NullableId) =>
      ["platform", "tenant", organizationId] as const,
    organizationQueues: (organizationId: NullableId) =>
      ["platform", "tenant", organizationId, "routing-queues"] as const,
    organizationQueuesPage: (organizationId: NullableId, params: object) =>
      ["platform", "tenant", organizationId, "routing-queues", params] as const,
    organizationAgents: (organizationId: NullableId) =>
      ["platform", "tenant", organizationId, "agents"] as const,
    organizationAgentsPage: (organizationId: NullableId, params: object) =>
      ["platform", "tenant", organizationId, "agents", params] as const,
    whatsappHealth: (organizationId: NullableId) =>
      ["platform", "tenant", organizationId, "waba-health"] as const,
    whatsappHealthPage: (organizationId: NullableId, params: object) =>
      ["platform", "tenant", organizationId, "waba-health", params] as const,
    whatsappHealthDetail: (
      organizationId: NullableId,
      phoneNumberId: NullableId,
    ) =>
      [
        "platform",
        "tenant",
        organizationId,
        "waba-health",
        "detail",
        phoneNumberId,
      ] as const,
    reports: (organizationId: NullableId, month: string) =>
      ["platform", "reports", organizationId, month] as const,
  },
};
