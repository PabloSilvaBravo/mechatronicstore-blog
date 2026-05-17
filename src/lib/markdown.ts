import { marked } from "marked";

/**
 * Render markdown a HTML. Para body_es del tutorial.
 */
marked.setOptions({ gfm: true, breaks: false });

export function renderMarkdown(md: string): string {
  if (!md) return "";
  return marked.parse(md, { async: false }) as string;
}
