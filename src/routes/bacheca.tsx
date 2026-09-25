import { createFileRoute, redirect } from "@tanstack/react-router";
import { DEFAULT_BOARD_ID } from "@/lib/spaces-store";

export const Route = createFileRoute("/bacheca")({
  beforeLoad: () => {
    throw redirect({
      to: "/spazio/$spaceId",
      params: { spaceId: DEFAULT_BOARD_ID },
    });
  },
});
