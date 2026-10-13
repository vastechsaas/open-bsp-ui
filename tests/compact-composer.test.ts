import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ComposerModeSelect from "../src/components/ComposerModeSelect.tsx";

const source = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const footer = source("src/components/ChatFooter.tsx");
const note = source("src/components/PrivateNoteComposer.tsx");

void test("inline selector renders an accessible compact reply control, not two tabs", () => {
  const html = renderToStaticMarkup(
    createElement(ComposerModeSelect, {
      privateNoteMode: false,
      onChange: () => assert.fail("rendering must not change the mode"),
      translate: (key) => key,
    }),
  );
  assert.match(html, /aria-haspopup="menu"/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /aria-label="Modo de mensaje: Responder"/);
  assert.equal((html.match(/<button/g) || []).length, 1);
  assert.doesNotMatch(html, /role="tab"/);
});

void test("private-note selector exposes its mode even when the mobile text is hidden", () => {
  const html = renderToStaticMarkup(
    createElement(ComposerModeSelect, {
      privateNoteMode: true,
      onChange: () => assert.fail("rendering must not change the mode"),
      translate: (key) => key,
    }),
  );
  assert.match(html, /aria-label="Modo de mensaje: Nota privada"/);
  assert.match(html, /dark:text-amber-100/);
  assert.match(html, /hidden sm:inline/);
});

void test("both modes share the inline selector and retain separate drafts and tools", () => {
  assert.doesNotMatch(footer, /composerModeTabs/);
  assert.match(footer, /key=\{activeConvId\}/);
  assert.match(footer, /onChange=\{setPrivateNoteMode\}/);
  assert.match(footer, /modeSelector=\{composerModeSelect\}/);
  assert.match(note, /flex items-end gap-1[\s\S]*?\{modeSelector\}/);
  assert.match(footer, /textDrafts\.get/);
  assert.match(note, /privateNoteDrafts\.get/);
  for (const tool of [
    "<VoiceRecorder",
    "<TemplatePicker",
    "quickReplyPickerOpen",
    'type="file"',
  ])
    assert.ok(footer.includes(tool), tool);
  assert.match(note, /selectedHumans\.map/);
  assert.match(note, /confirmTransfer/);
});

void test("mode selection only changes local mode and closes the upward menu", () => {
  const selector = source("src/components/ComposerModeSelect.tsx");
  assert.match(selector, /placement="topLeft"/);
  assert.match(selector, /autoFocus/);
  assert.match(
    selector,
    /selectedKeys: \[privateNoteMode \? "note" : "reply"\]/,
  );
  assert.match(selector, /onChange\(key === "note"\);\s*setOpen\(false\)/);
  assert.doesNotMatch(selector, /mutate|pushMessage|setDraft|saveDraft/);
});

void test("closed history and ownership/assignment fences still precede the customer editor", () => {
  const readOnly = footer.indexOf("!canComposePrivateNote(conv.status)");
  const nodeFence = footer.indexOf(
    "nodeHumanSendingBlocked(nodeLifecycle.mapping.data)",
  );
  const notes = footer.indexOf("if (activeConvId && conv && privateNoteMode)");
  const assignment = footer.indexOf("isAgent && !customerReplyAllowed");
  const editor = footer.indexOf("contentEditable={inCSWindow}");
  assert.ok(
    readOnly < nodeFence &&
      nodeFence < notes &&
      notes < assignment &&
      assignment < editor,
  );
  assert.match(footer, /aria-multiline="true"/);
  assert.match(footer, /max-h-40 overflow-y-auto/);
});

void test("private notes clearly identify the audience and grow within a bounded height", () => {
  assert.match(note, /aria-describedby=\{`note-visibility-/);
  assert.match(note, /Solo tu equipo puede ver esta nota/);
  assert.match(note, /Nota interna · Solo para tu equipo/);
  assert.match(note, /aria-label=\{t\("Agregar nota"\)\}/);
  assert.match(
    note,
    /Math\.min\(160, Math\.max\(40, textarea\.scrollHeight\)\)/,
  );
});

void test("private-note text aligns with 40px controls without inline baseline or placeholder growth", () => {
  assert.match(note, /className="block max-h-40 min-h-10/);
  assert.match(note, /\[field-sizing:fixed\]/);
  assert.match(note, /text-\[15px\] leading-6/);
  assert.match(note, /placeholder:whitespace-nowrap/);
  assert.match(
    note,
    /draft\.text \? Math\.min\(160, Math\.max\(40, textarea\.scrollHeight\)\) : 40/,
  );
});

void test("header density is scoped without resizing either sidebar or changing views", () => {
  const css = source("src/global.css");
  assert.match(
    css,
    /\.messages-workspace-header \.conversation-header,\s*\.messages-workspace \.messages-chat-header\s*\{\s*height: 52px;\s*padding-block: 6px;/,
  );
  const filter = source("src/components/ChatFilter.tsx");
  assert.match(filter, /queue\.label/);
  assert.match(filter, /queues\.map/);
  assert.match(filter, /min-h-10/);
  assert.match(
    css,
    /\.composer-mode-menu \.ant-dropdown-menu\s*\{\s*background: var\(--popover\)/,
  );
});

void test("all compact composer copy has translations in every supported non-source language", () => {
  for (const lang of ["en", "pt", "fr", "sw"]) {
    const labels = JSON.parse(source(`public/locales/${lang}.json`)) as Record<
      string,
      string
    >;
    for (const key of [
      "Responder",
      "Modo de mensaje",
      "Agregar nota",
      "Solo tu equipo puede ver esta nota",
      "Nota interna · Solo para tu equipo",
    ])
      assert.ok(labels[key], `${lang}: ${key}`);
  }
});
