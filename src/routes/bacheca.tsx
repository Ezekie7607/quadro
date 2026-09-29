import { createFileRoute } from "@tanstack/react-router";
import { LegacySpaceRedirect } from "@/components/legacy-redirect";

export const Route = createFileRoute("/bacheca")({
  component: () => <LegacySpaceRedirect type="board" />,
});
