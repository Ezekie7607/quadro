import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { AppShell } from "@/components/app-shell";
import appCss from "../styles.css?url";

// Runs before the first paint: "Calmo" and "Fitta" apply from the first frame
// instead of after the settings store rehydrates. Read-only, and a broken
// value just leaves the defaults in place.
const PREPAINT_SETTINGS = `try{var r=document.documentElement,s=JSON.parse(localStorage.getItem("quadro-settings-v1")||"null");s=s&&s.state||{};r.dataset.density=s.density==="compact"?"compact":"comfortable";r.dataset.motion=s.motion==="reduce"||matchMedia("(prefers-reduced-motion: reduce)").matches?"reduce":"full"}catch(e){}`;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      {
        name: "description",
        content: `${APP_NAME}: bacheca, vendite e note. ${APP_TAGLINE}`,
      },
      { name: "theme-color", content: "#f2efe6" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg?v=quadro" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Oswald:wght@200;300;400;500;600&display=swap",
      },
    ],
    scripts: [{ children: PREPAINT_SETTINGS }],
  }),
  component: () => (
    <html lang="it" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="bg-background text-foreground">
        <PreviewHostBridge />
        <AuthProvider>
          <AppShell>
            <Outlet />
          </AppShell>
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
