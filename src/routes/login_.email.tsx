import { createFileRoute, redirect } from "@tanstack/react-router";

// Keep bookmarks and links from older builds working without a second form.
export const Route = createFileRoute("/login_/email")({
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/login",
      search: { redirect: search.redirect },
      replace: true,
    });
  },
});
