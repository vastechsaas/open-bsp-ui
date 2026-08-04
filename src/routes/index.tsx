import LegalLinks from "@/components/LegalLinks";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Building2,
  Check,
  ContactRound,
  FileText,
  Inbox,
  LockKeyhole,
  MessageCircle,
  MoreVertical,
  Search,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

const features = [
  {
    icon: Inbox,
    title: "One shared inbox",
    description:
      "Keep every WhatsApp conversation organized and visible to the right people.",
  },
  {
    icon: UsersRound,
    title: "Built for teams",
    description:
      "Work together from one workspace with clear ownership and shared context.",
  },
  {
    icon: ContactRound,
    title: "Customer contacts",
    description:
      "Keep customer details and conversation history together when your team needs them.",
  },
  {
    icon: FileText,
    title: "Message templates",
    description:
      "Create, manage, and send WhatsApp templates without leaving your workspace.",
  },
  {
    icon: Building2,
    title: "Business profiles",
    description:
      "Sync and maintain the public details customers see on your WhatsApp profile.",
  },
  {
    icon: LockKeyhole,
    title: "Role-based access",
    description:
      "Give owners, administrators, supervisors, and members the access their responsibilities require.",
  },
];

const steps = [
  {
    number: "01",
    title: "Sign in",
    description:
      "Create your secure Social Connect workspace in a few moments.",
  },
  {
    number: "02",
    title: "Connect WhatsApp",
    description:
      "Link your WhatsApp Business account through the guided Meta connection flow.",
  },
  {
    number: "03",
    title: "Start collaborating",
    description:
      "Bring your team in and manage customer conversations from one place.",
  },
];

function LandingPage() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title =
      "Social Connect | WhatsApp business conversations in one place";

    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <div className="min-h-dvh overflow-x-hidden bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-[72px] max-w-[1180px] items-center justify-between gap-4 px-5 lg:px-8">
          <a
            href="/"
            className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Social Connect home"
          >
            <img
              src="/SocialConnectSmall.png"
              alt=""
              className="h-11 w-11 rounded-xl object-contain"
            />
            <span className="text-[18px] font-semibold tracking-tight">
              Social Connect
            </span>
          </a>

          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-7 text-[14px] text-muted-foreground md:flex"
          >
            <a className="hover:text-foreground" href="#features">
              Features
            </a>
            <a className="hover:text-foreground" href="#how-it-works">
              How it works
            </a>
            <a className="hover:text-foreground" href="#security">
              Security
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/login"
              className="rounded-full px-3 py-2 text-[14px] font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:px-4"
            >
              Sign in
            </Link>
            <Link
              to="/login"
              className="rounded-full bg-primary px-4 py-2.5 text-[14px] font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:px-5"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative isolate">
          <div
            aria-hidden="true"
            className="absolute -left-24 top-24 -z-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="absolute -right-28 top-10 -z-10 h-80 w-80 rounded-full bg-primary/10 blur-3xl"
          />

          <div className="mx-auto grid max-w-[1180px] items-center gap-14 px-5 py-16 sm:py-20 lg:grid-cols-[0.88fr_1.12fr] lg:px-8 lg:py-24">
            <div className="max-w-[620px]">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-[13px] font-medium text-primary">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Your WhatsApp workspace
              </div>
              <h1 className="text-[42px] font-semibold leading-[1.08] tracking-[-0.035em] sm:text-[54px] lg:text-[62px]">
                Run your WhatsApp business conversations from one place.
              </h1>
              <p className="mt-6 max-w-[570px] text-[17px] leading-7 text-muted-foreground sm:text-[19px] sm:leading-8">
                Connect your WhatsApp Business account, manage customer chats,
                collaborate with your team, and keep templates and profiles up
                to date.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-[15px] font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  Get started
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <a
                  href="#features"
                  className="inline-flex items-center justify-center rounded-full border border-border px-6 py-3.5 text-[15px] font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Explore features
                </a>
              </div>
              <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-[13px] text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                  Guided connection
                </span>
                <span className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                  Team-ready workspace
                </span>
              </div>
            </div>

            <ProductPreview />
          </div>
        </section>

        <section
          id="features"
          className="scroll-mt-24 border-y border-border bg-muted/35"
        >
          <div className="mx-auto max-w-[1180px] px-5 py-20 lg:px-8 lg:py-24">
            <SectionHeading
              eyebrow="Everything in one workspace"
              title="The tools your team needs to manage WhatsApp"
              description="Move from scattered customer conversations to one organized workspace designed for daily business messaging."
            />
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ icon: Icon, title, description }) => (
                <article
                  key={title}
                  className="rounded-3xl border border-border bg-card p-6 transition-colors hover:border-primary/40 sm:p-7"
                >
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="text-[18px] font-semibold">{title}</h3>
                  <p className="mt-2 text-[14px] leading-6 text-muted-foreground">
                    {description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-24">
          <div className="mx-auto max-w-[1180px] px-5 py-20 lg:px-8 lg:py-24">
            <SectionHeading
              eyebrow="Simple setup"
              title="From account to conversation in three steps"
              description="Social Connect keeps onboarding focused so your team can spend its time helping customers."
            />
            <ol className="mt-12 grid gap-5 lg:grid-cols-3">
              {steps.map((step) => (
                <li
                  key={step.number}
                  className="relative rounded-3xl border border-border p-6 sm:p-8"
                >
                  <span className="text-[13px] font-semibold tracking-[0.18em] text-primary">
                    {step.number}
                  </span>
                  <h3 className="mt-5 text-[22px] font-semibold">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-[15px] leading-7 text-muted-foreground">
                    {step.description}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          id="security"
          className="scroll-mt-24 px-5 pb-20 lg:px-8 lg:pb-24"
        >
          <div className="mx-auto grid max-w-[1180px] gap-10 overflow-hidden rounded-[32px] border border-border bg-muted/45 p-7 sm:p-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:p-14">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <ShieldCheck className="h-6 w-6" aria-hidden="true" />
              </div>
              <h2 className="mt-6 text-[30px] font-semibold leading-tight tracking-[-0.02em] sm:text-[38px]">
                Designed around your organization
              </h2>
              <p className="mt-4 text-[15px] leading-7 text-muted-foreground">
                Connect through the WhatsApp Business Platform while keeping
                workspace access aligned with each team member&apos;s role.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <TrustItem
                title="Organization separation"
                description="Customer conversations and configuration remain scoped to the correct workspace."
              />
              <TrustItem
                title="Permission controls"
                description="Owner, administrator, supervisor, and member roles keep sensitive actions restricted."
              />
              <TrustItem
                title="Managed connection"
                description="A guided Meta flow connects the WhatsApp Business account to Social Connect."
              />
              <TrustItem
                title="Additional channels"
                description="Instagram can be connected as an additional channel when your workflow needs it."
              />
            </div>
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto flex max-w-[900px] flex-col items-center px-5 py-20 text-center lg:py-24">
            <MessageCircle
              className="h-9 w-9 text-primary"
              aria-hidden="true"
            />
            <h2 className="mt-6 text-[34px] font-semibold leading-tight tracking-[-0.025em] sm:text-[44px]">
              Give every conversation a better home.
            </h2>
            <p className="mt-4 max-w-[620px] text-[16px] leading-7 text-muted-foreground">
              Bring your WhatsApp Business conversations, customer context, and
              team together in Social Connect.
            </p>
            <Link
              to="/login"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-[15px] font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Get started
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-[1180px] flex-col items-center justify-between gap-5 px-5 py-7 sm:flex-row lg:px-8">
          <a href="/" className="flex items-center gap-2.5">
            <img
              src="/SocialConnectSmall.png"
              alt=""
              className="h-9 w-9 rounded-lg object-contain"
            />
            <span className="text-[14px] font-semibold">Social Connect</span>
          </a>
          <LegalLinks />
          <p className="text-[12px] text-muted-foreground">
            © 2026 Vastech Technologies
          </p>
        </div>
      </footer>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-[700px]">
      <p className="text-[13px] font-semibold uppercase tracking-[0.15em] text-primary">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-[32px] font-semibold leading-tight tracking-[-0.025em] sm:text-[42px]">
        {title}
      </h2>
      <p className="mt-4 text-[16px] leading-7 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function TrustItem({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background p-5">
      <div className="flex items-center gap-2">
        <Check className="h-4 w-4 text-primary" aria-hidden="true" />
        <h3 className="text-[15px] font-semibold">{title}</h3>
      </div>
      <p className="mt-2 text-[13px] leading-5 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function ProductPreview() {
  const conversations = [
    {
      initials: "AR",
      name: "Amina Rahman",
      message: "Thanks, that works perfectly.",
      time: "10:42",
      active: true,
    },
    {
      initials: "JM",
      name: "James Miller",
      message: "Can you share the details?",
      time: "10:18",
      active: false,
    },
    {
      initials: "SK",
      name: "Sara Khan",
      message: "I need help with my order.",
      time: "09:55",
      active: false,
    },
  ];

  return (
    <div className="relative mx-auto w-full max-w-[650px]">
      <div className="absolute -inset-4 -z-10 rounded-[36px] bg-primary/10 blur-2xl" />
      <div className="overflow-hidden rounded-[28px] border border-border bg-card shadow-2xl shadow-primary/10">
        <div className="flex h-11 items-center gap-2 border-b border-border px-4">
          <span className="h-2.5 w-2.5 rounded-full bg-primary/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/20" />
          <span className="ml-auto text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
            Social Connect
          </span>
        </div>

        <div className="flex h-[430px] sm:h-[470px]">
          <div className="hidden w-[46%] border-r border-border bg-background sm:block">
            <div className="border-b border-border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-muted-foreground">Inbox</p>
                  <p className="text-[16px] font-semibold">Conversations</p>
                </div>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-full bg-muted px-3 py-2 text-muted-foreground">
                <Search className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="text-[11px]">Search conversations</span>
              </div>
            </div>
            <div className="p-2">
              {conversations.map((conversation) => (
                <div
                  key={conversation.name}
                  className={`flex gap-3 rounded-2xl p-3 ${
                    conversation.active ? "bg-primary/10" : ""
                  }`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold">
                    {conversation.initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[12px] font-semibold">
                        {conversation.name}
                      </p>
                      <span className="text-[9px] text-muted-foreground">
                        {conversation.time}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-[10px] text-muted-foreground">
                      {conversation.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col bg-muted/50">
            <div className="flex h-16 items-center gap-3 border-b border-border bg-background px-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
                AR
              </span>
              <div>
                <p className="text-[13px] font-semibold">Amina Rahman</p>
                <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  WhatsApp
                </p>
              </div>
              <MoreVertical
                className="ml-auto h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
            </div>

            <div className="flex flex-1 flex-col justify-end gap-3 overflow-hidden p-4 sm:p-5">
              <div className="max-w-[82%] self-start rounded-2xl rounded-bl-md bg-background px-4 py-3 shadow-sm">
                <p className="text-[11px] leading-5">
                  Hi! Could you help me update the delivery address for my
                  order?
                </p>
                <p className="mt-1 text-right text-[8px] text-muted-foreground">
                  10:40
                </p>
              </div>
              <div className="max-w-[84%] self-end rounded-2xl rounded-br-md bg-primary/15 px-4 py-3">
                <p className="text-[11px] leading-5">
                  Of course. I&apos;ve updated it and sent a confirmation to
                  your email.
                </p>
                <p className="mt-1 flex items-center justify-end gap-1 text-[8px] text-muted-foreground">
                  10:41 <Check className="h-2.5 w-2.5 text-primary" />
                </p>
              </div>
              <div className="max-w-[75%] self-start rounded-2xl rounded-bl-md bg-background px-4 py-3 shadow-sm">
                <p className="text-[11px] leading-5">
                  Thanks, that works perfectly.
                </p>
                <p className="mt-1 text-right text-[8px] text-muted-foreground">
                  10:42
                </p>
              </div>
            </div>

            <div className="border-t border-border bg-background p-3">
              <div className="flex items-center rounded-full border border-border bg-background px-4 py-2.5">
                <span className="text-[10px] text-muted-foreground">
                  Write a message...
                </span>
                <ArrowRight className="ml-auto h-3.5 w-3.5 text-primary" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
