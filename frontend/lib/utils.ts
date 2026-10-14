import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Custom type-scale tokens (05 §4.2) are font sizes, not colors; without this, cn("text-body-sm", "text-text-muted") drops the size.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["body", "body-lg", "body-sm", "caption", "display-lg", "display-xl", "h1", "h2", "h3", "metric", "overline"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
