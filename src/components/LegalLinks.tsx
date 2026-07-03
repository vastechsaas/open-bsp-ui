const links = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/data-deletion", label: "Data Deletion" },
];

export default function LegalLinks({ className = "" }: { className?: string }) {
  return (
    <nav
      aria-label="Legal"
      className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[12px] text-muted-foreground ${className}`}
    >
      {links.map((link) => (
        <a key={link.href} href={link.href} className="hover:text-foreground">
          {link.label}
        </a>
      ))}
    </nav>
  );
}
