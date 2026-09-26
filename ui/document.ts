import { readFile } from "node:fs/promises";
import { Marked, Renderer, TextRenderer } from "marked";

// Only these source documents are published. URLs never become filesystem paths.
const documents = new Map([
  ["rules", "specification/model/CALCULUS_RULES.md"],
  ["foundations", "specification/model/FOUNDATIONS.md"],
  ["recursive-strategies", "specification/model/RECURSIVE_STRATEGIES.md"],
  ["homeostasis", "specification/model/HOMEOSTASIS.md"],
  ["historical-replay", "specification/model/HISTORICAL_REPLAY.md"],
  ["strategy-valuation-risk", "specification/model/STRATEGY_VALUATION_RISK.md"],
  ["sensitivities", "specification/model/SENSITIVITIES.md"],
  ["epistemology", "specification/model/EPISTEMOLOGY.md"],
  ["layers-and-interfaces", "specification/model/LAYERS_AND_INTERFACES.md"],
  ["intent", "specification/INTENT.md"],
  ["product", "specification/PRODUCT.md"],
  ["methodology", "specification/METHODOLOGY.md"],
  ["model-families", "specification/domains/MODEL_FAMILIES.md"],
  ["oil", "specification/domains/OIL.md"],
  ["requirements", "specification/requirements/REQUIREMENTS.md"],
  ["scenarios", "specification/scenarios/SCENARIOS.md"],
  ["analytical-kernel", "design/ANALYTICAL_KERNEL.md"],
  ["causal-risk-control", "design/CAUSAL_RISK_CONTROL.md"],
  ["recursive-hedging", "design/RECURSIVE_HEDGING.md"],
  ["explorable-demo", "design/EXPLORABLE_DEMO.md"],
  ["data-provenance", "data/README.md"],
  ["sources", "docs/SOURCES.md"],
]);
const sourceRoutes = new Map([...documents].map(([slug, source]) => [`/${source}`, `/definition/${slug}`]));
const escapeHtml = (text: string) => text.replace(/[&<>"']/g, character =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);

function documentLink(href: string, source: string): string | undefined {
  if (href.startsWith("#")) return href;
  if (/^https?:\/\//i.test(href)) return href;
  // Do not turn a protocol-relative or other protocol URL into a local route.
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href)) return undefined;
  const resolved = new URL(href, `https://documents.invalid/${source}`);
  const route = sourceRoutes.get(decodeURIComponent(resolved.pathname));
  return route ? route + resolved.hash : undefined;
}

function renderDocument(markdown: string, source: string, route: string): string {
  const headings: { id: string; depth: number; label: string }[] = [];
  const usedIds = new Set<string>();
  const textRenderer = new TextRenderer();
  const readingMinutes = Math.max(1, Math.ceil(markdown.split(/\s+/).length / 220));
  const category = source.startsWith("specification/") ? "Specification"
    : source.startsWith("design/") ? "Design" : "Reference";
  let title = "Trade Calculus";
  let hasTitle = false;
  const marked = new Marked({
    gfm: true,
    renderer: {
      html({ text }) { return escapeHtml(text); },
      image({ text }) { return escapeHtml(text); },
      heading({ tokens, depth }) {
        const label = this.parser.parseInline(tokens, textRenderer);
        const base = label.toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, "").trim().replace(/\s+/g, "-") || "section";
        let id = base;
        for (let suffix = 1; usedIds.has(id); suffix++) id = `${base}-${suffix}`;
        usedIds.add(id);
        headings.push({ id, depth, label });
        const heading = `<h${depth} id="${escapeHtml(id)}">${this.parser.parseInline(tokens)}</h${depth}>`;
        if (depth === 1 && !hasTitle) {
          title = label;
          hasTitle = true;
          return `<header class="document-heading"><p class="eyebrow">Trade Calculus / ${category}</p>
            ${heading}<div class="document-meta"><span class="poc-label">Experimental PoC</span>
            <span>${readingMinutes} min read</span></div></header>\n`;
        }
        return heading + "\n";
      },
      link({ href, title: linkTitle, tokens }) {
        const label = this.parser.parseInline(tokens);
        const destination = documentLink(href, source);
        if (!destination) return `<span class="workspace-reference" title="${escapeHtml(href)}">${label}<small>workspace reference</small></span>`;
        const hint = linkTitle ? ` title="${escapeHtml(linkTitle)}"` : "";
        const external = /^https?:/.test(destination) ? ' rel="noreferrer"' : "";
        return `<a href="${escapeHtml(destination)}"${hint}${external}>${label}</a>`;
      },
      table(token) {
        return `<div class="document-table" role="region" aria-label="Document table" tabindex="0">${Renderer.prototype.table.call(this, token)}</div>\n`;
      },
    },
  });
  const body = marked.parse(markdown, { async: false });
  const contents = headings.filter(heading => heading.depth <= 3).map(heading =>
    `<li class="toc-level-${heading.depth}"><a href="#${escapeHtml(heading.id)}">${escapeHtml(heading.depth === 1 ? "Overview" : heading.label)}</a></li>`).join("\n");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} · Trade Calculus</title>
  <link rel="icon" href="data:,">
  <link rel="stylesheet" href="/document.css">
</head>
<body>
  <a class="skip-link" href="#document">Skip to document</a>
  <header class="reader-bar">
    <a class="reader-brand" href="/"><span aria-hidden="true">∫</span>Trade Calculus</a>
    <a class="return-link" href="/">← Return to demo</a>
  </header>
  <div class="reader-layout">
    <aside class="reader-sidebar">
      <a class="collection-link" href="/definition/rules">Specification library <span aria-hidden="true">↗</span></a>
      <details class="contents" open>
        <summary>On this page</summary>
        <nav aria-label="Document sections"><ol>${contents}</ol></nav>
      </details>
      <a class="source-link" href="${route}?raw=1">View Markdown source ↗</a>
    </aside>
    <main id="document" tabindex="-1">
      <article class="document">${body}</article>
      <footer class="document-footer"><span>Source <code>${escapeHtml(source)}</code></span><a href="#document">Back to top ↑</a></footer>
    </main>
  </div>
</body>
</html>`;
}

export async function publishedDocument(pathname: string, raw: boolean): Promise<string | undefined> {
  const source = documents.get(pathname.slice("/definition/".length));
  if (!pathname.startsWith("/definition/") || !source) return undefined;
  const markdown = await readFile(new URL(`../${source}`, import.meta.url), "utf8");
  return raw ? markdown : renderDocument(markdown, source, pathname);
}
