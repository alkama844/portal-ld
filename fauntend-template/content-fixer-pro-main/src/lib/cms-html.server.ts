/* Writes CMS edits back into the physical HTML files (dev / writable hosts only). */
import { parse, type HTMLElement } from 'node-html-parser';

export type PatchItem = { key: string; type: string; value: string };

function escapeText(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(value: string) {
  return escapeText(value).replace(/"/g, '&quot;');
}

function cmsHash(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) hash = ((hash * 33) ^ input.charCodeAt(i)) >>> 0;
  return 'c' + hash.toString(36);
}

function elementForKey(body: HTMLElement, key: string, page: string): HTMLElement | null {
  if (!key.includes('/') && !key.includes(':')) {
    return body.querySelector(`[data-cms-id="${key}"]`) ?? null;
  }
  const mapped = body.querySelector(`[data-cms-id="${cmsHash(`${page}|${key}`)}"]`);
  if (mapped) return mapped;
  let node: HTMLElement = body;
  for (const part of key.split('/')) {
    const [tagRaw, indexRaw] = part.split(':');
    const tag = (tagRaw ?? '').toLowerCase();
    if (!tag) return null;
    const wanted = parseInt(indexRaw ?? '0', 10);
    const kids = node.childNodes.filter(
      (child): child is HTMLElement =>
        (child as HTMLElement).nodeType === 1 &&
        (child as HTMLElement).rawTagName?.toLowerCase() === tag,
    );
    const found = kids[wanted];
    if (!found) return null;
    node = found;
  }
  return node === body ? null : node;
}

function applyToHtml(html: string, items: PatchItem[], page: string): { html: string; applied: number } {
  const root = parse(html, {
    comment: true,
    voidTag: { closingSlash: false },
    blockTextElements: { script: true, noscript: true, style: true, pre: true },
  });
  const body = root.querySelector('body');
  if (!body) return { html, applied: 0 };

  // Collect surgical string edits so untouched markup keeps its original formatting.
  type Edit = { start: number; end: number; text: string };
  const edits: Edit[] = [];

  function openTagEnd(source: string, start: number) {
    let quote = '';
    for (let i = start; i < source.length; i++) {
      const ch = source[i]!;
      if (quote) {
        if (ch === quote) quote = '';
      } else if (ch === '"' || ch === "'") quote = ch;
      else if (ch === '>') return i + 1;
    }
    return -1;
  }

  function setAttr(openTag: string, name: string, value: string) {
    const attr = `${name}="${escapeAttr(value)}"`;
    const re = new RegExp(`\\s${name}\\s*=\\s*("[^"]*"|'[^']*'|[^\\s>]+)`, 'i');
    if (re.test(openTag)) return openTag.replace(re, ` ${attr}`);
    const selfClosing = /\/>$/.test(openTag);
    return openTag.replace(selfClosing ? /\s*\/>$/ : />$/, ` ${attr}${selfClosing ? ' />' : '>'}`);
  }

  function removeAttr(openTag: string, name: string) {
    return openTag.replace(new RegExp(`\\s${name}\\s*=\\s*("[^"]*"|'[^']*'|[^\\s>]+)`, 'i'), '');
  }

  let applied = 0;
  for (const item of items) {
    const element = elementForKey(body, item.key, page);
    const range = element?.range;
    if (!element || !range) continue;
    const [start, end] = range;
    const tagEnd = openTagEnd(html, start);
    if (tagEnd < 0 || tagEnd > end) continue;
    let openTag = html.slice(start, tagEnd);

    if (item.type === 'src' || item.type === 'placeholder' || item.type === 'bg') {
      if (item.type === 'src') {
        openTag = setAttr(removeAttr(openTag, 'srcset'), 'src', item.value);
      } else if (item.type === 'placeholder') {
        openTag = setAttr(openTag, 'placeholder', item.value);
      } else {
        const style = (element.getAttribute('style') ?? '')
          .replace(/background-image\s*:[^;]*;?/gi, '')
          .trim();
        openTag = setAttr(
          openTag,
          'style',
          `${style}${style && !style.endsWith(';') ? ';' : ''}background-image:url('${item.value}');`,
        );
      }
      edits.push({ start, end: tagEnd, text: openTag });
    } else {
      const closeTag = `</${element.rawTagName}>`;
      const tail = html.slice(start, end);
      if (!tail.toLowerCase().endsWith(closeTag.toLowerCase())) continue;
      const innerStart = tagEnd;
      const innerEnd = end - closeTag.length;
      if (innerEnd < innerStart) continue;
      edits.push({
        start: innerStart,
        end: innerEnd,
        text: item.type === 'html' ? item.value : escapeText(item.value),
      });
    }
    applied++;
  }

  let output = html;
  edits
    .sort((a, b) => b.start - a.start)
    .forEach((edit) => {
      output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
    });
  return { html: output, applied };
}

/** Patch both `<page>.html` and `<page>2.html`. Silently no-ops on read-only hosts. */
export async function patchHtmlFiles(page: string, items: PatchItem[]): Promise<string[]> {
  const written: string[] = [];
  if (!/^[a-z0-9_-]+$/i.test(page)) return written;
  try {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const dir = path.join(process.cwd(), 'public');
    for (const file of [`${page}.html`, `${page}2.html`]) {
      const full = path.join(dir, file);
      try {
        const source = await fs.readFile(full, 'utf8');
        const { html, applied } = applyToHtml(source, items, page);
        if (applied > 0 && html !== source) {
          await fs.writeFile(full, html, 'utf8');
          written.push(file);
        }
      } catch {
        /* file missing or read-only: ignore */
      }
    }
  } catch {
    /* no filesystem access */
  }
  return written;
}
