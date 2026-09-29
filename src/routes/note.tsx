import { createFileRoute } from "@tanstack/react-router";
import { LegacySpaceRedirect } from "@/components/legacy-redirect";

export const Route = createFileRoute("/note")({
  component: () => <LegacySpaceRedirect type="notes" />,
});
