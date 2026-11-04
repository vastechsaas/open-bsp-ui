import { Megaphone } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import type { CampaignHistoryItem } from "@/queries/useConversationHistory";

function CampaignLinks({ links }: { links: CampaignHistoryItem["links"] }) {
  return links.map((link, index) => (
    <a
      key={index}
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block break-words text-primary underline"
    >
      {link.label}
    </a>
  ));
}

export default function CampaignHistoryMessage({
  preview,
  timestamp,
}: {
  preview: CampaignHistoryItem;
  timestamp: string;
}) {
  const { translate: t, currentLanguage } = useTranslation();
  const label = t("Mensaje de campaña");
  return (
    <aside
      aria-label={label}
      className="mb-2 ml-auto mr-3 w-fit max-w-[min(32rem,calc(100%-1.5rem))] rounded-md border border-l-2 border-l-primary bg-card px-3 py-2 text-sm text-card-foreground"
    >
      <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
        <Megaphone className="size-3.5" aria-hidden />
        {label}
      </div>
      <div className="mb-1 break-words text-xs text-muted-foreground">
        {preview.name}
      </div>
      {preview.header && (
        <p className="whitespace-pre-wrap break-words font-medium">
          {preview.header}
        </p>
      )}
      {preview.body && (
        <p className="whitespace-pre-wrap break-words">{preview.body}</p>
      )}
      {preview.cards.length > 0 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {preview.cards.map((card, index) => (
            <div
              key={index}
              className="w-40 shrink-0 overflow-hidden rounded-md border"
            >
              {card.image_url && (
                <img
                  src={card.image_url}
                  alt=""
                  loading="lazy"
                  className="aspect-square w-full object-cover"
                />
              )}
              <div className="space-y-1 p-2 text-xs">
                {card.text && (
                  <p className="whitespace-pre-wrap break-words">{card.text}</p>
                )}
                <CampaignLinks links={card.links} />
              </div>
            </div>
          ))}
        </div>
      )}
      {preview.footer && (
        <p className="whitespace-pre-wrap break-words text-xs text-muted-foreground">
          {preview.footer}
        </p>
      )}
      <CampaignLinks links={preview.links} />
      <time
        dateTime={timestamp}
        className="mt-1 block text-right text-xs text-muted-foreground"
      >
        {new Date(timestamp).toLocaleTimeString(currentLanguage, {
          hour: "numeric",
          minute: "2-digit",
        })}
      </time>
    </aside>
  );
}
