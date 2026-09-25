import { createFileRoute, redirect } from "@tanstack/react-router";
import { DEFAULT_NOTES_ID } from "@/lib/spaces-store";

export const Route = createFileRoute("/note")({
  beforeLoad: () => {
    throw redirect({
      to: "/spazio/$spaceId",
      params: { spaceId: DEFAULT_NOTES_ID },
    });
  },
});
