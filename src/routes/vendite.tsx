import { createFileRoute, redirect } from "@tanstack/react-router";
import { DEFAULT_SALES_ID } from "@/lib/spaces-store";

export const Route = createFileRoute("/vendite")({
  beforeLoad: () => {
    throw redirect({
      to: "/spazio/$spaceId",
      params: { spaceId: DEFAULT_SALES_ID },
    });
  },
});
