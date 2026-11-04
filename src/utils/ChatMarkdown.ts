import { Remarkable } from "remarkable";
import { linkify } from "remarkable/dist/cjs/linkify.js";

const markdown = new Remarkable({
  breaks: true,
  html: false,
  linkTarget: "_blank",
  typographer: true,
}).use(linkify);

const openLink = markdown.renderer.rules.link_open;
markdown.renderer.rules.link_open = (...args) =>
  openLink(...args).replace(/>$/, ' rel="noopener noreferrer">');

// Preserve URL paths and query parameters when converting WhatsApp markup.
const protectedText =
  /(`{3}[\s\S]*?`{3}|`[^`\n]+`|(?:https?:\/\/|www\.)[^\s<>`]+)/gi;

export function renderChatMarkdown(content: string): string {
  const text = content
    .split(protectedText)
    .map((part, index) =>
      index % 2 === 1
        ? part
        : part
            .replace(/\*([^*]+?)\*/g, "**$1**")
            .replace(/_([^_]+?)_/g, "*$1*")
            .replace(/~([^~]+?)~/g, "~~$1~~"),
    )
    .join("");
  return markdown.render(text);
}
