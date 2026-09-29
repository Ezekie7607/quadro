import { createFileRoute } from "@tanstack/react-router";
import { LegacySpaceRedirect } from "@/components/legacy-redirect";

export const Route = createFileRoute("/vendite")({
  component: () => <LegacySpaceRedirect type="sales" />,
});
