import { createFileRoute } from "@tanstack/react-router";
import homeHtml from "../../public/index.html?raw";

// The site is a static HTML site living in /public (same structure as the
// original codebase). This route only serves public/index.html at "/".
export const Route = createFileRoute("/")({
  server: {
    handlers: {
      GET: () =>
        new Response(homeHtml, {
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
    },
  },
});
