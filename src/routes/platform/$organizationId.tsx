import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/platform/$organizationId")({
  component: Outlet,
});
