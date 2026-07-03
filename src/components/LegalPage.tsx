import { useEffect, type ReactNode } from "react";
import LegalLinks from "./LegalLinks";

export default function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${title} | Social Connect`;

    return () => {
      document.title = previousTitle;
    };
  }, [title]);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-[900px] items-center justify-between gap-4 px-5 py-4">
          <a href="/login" className="flex items-center gap-3">
            <img
              src="/SocialConnectSmall.png"
              alt="Social Connect"
              className="h-10 w-10 object-contain"
            />
            <span className="text-[18px] font-semibold">Social Connect</span>
          </a>
          <a
            href="/login"
            className="text-[14px] text-muted-foreground hover:text-foreground"
          >
            Return to login
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-[900px] px-5 py-10">
        <div className="mb-10 border-b border-border pb-8">
          <h1 className="text-[32px] font-semibold tracking-tight">{title}</h1>
          <p className="mt-3 text-[14px] text-muted-foreground">
            Effective date: {updated}
          </p>
        </div>

        <article className="space-y-8 text-[15px] leading-7 text-muted-foreground [&_a]:text-primary [&_a]:underline [&_h2]:mb-3 [&_h2]:text-[21px] [&_h2]:font-semibold [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_p+p]:mt-3 [&_strong]:text-foreground [&_ul]:space-y-2">
          {children}
        </article>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-[900px] flex-col items-center gap-3 px-5 py-6">
          <LegalLinks />
          <p className="text-center text-[12px] text-muted-foreground">
            © 2026 Vastech Technologies. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
