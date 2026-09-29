import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useSpacesStore, type SpaceType } from "@/lib/spaces-store";

/**
 * The old /bacheca, /vendite and /note addresses: land on the first space of
 * that type, or on Home when there is none. Pointing at the seed ids sent
 * people to "Non c’è più" once the starting space was gone. Runs in the
 * browser because only it knows the spaces (the shell mounts pages after the
 * stores have loaded).
 */
export function LegacySpaceRedirect({ type }: { type: SpaceType }) {
  const navigate = useNavigate();
  const target = useSpacesStore((s) => s.spaces.find((space) => space.type === type)?.id);

  useEffect(() => {
    if (target) void navigate({ to: "/spazio/$spaceId", params: { spaceId: target }, replace: true });
    else void navigate({ to: "/", replace: true });
  }, [navigate, target]);

  return null;
}
