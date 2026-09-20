/* One-off/idempotent stamper: gives every CMS-editable element in public/*.html
 * a permanent data-cms-id so saved content can never land on the wrong element
 * after the markup changes. Run: bun scripts/cms-stamp-ids.mjs
 *
 * The id is derived from the element's CURRENT positional key, so previously
 * saved rows (which use positional keys) still resolve to the same element,
 * and index.html / index2.html get identical ids for matching elements.
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'node-html-parser';

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const SKIP_TAGS = new Set(['script', 'style', 'noscript', 'svg', 'iframe', 'head', 'html', 'body']);
const INLINE = new Set(['a', 'span', 'strong', 'em', 'b', 'i', 'small', 'br', 'u', 'sup', 'sub', 'mark', 'code']);

export function cmsHash(input) {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) hash = ((hash * 33) ^ input.charCodeAt(i)) >>> 0;
  return 'c' + hash.toString(36);
}

function pageNameOf(file) {
  return file.replace(/\.html?$/i, '').replace(/2$/, '').toLowerCase() || 'index';
}

function elementChildren(node) {
  return node.childNodes.filter((child) => child.nodeType === 1);
}

function directText(element) {
  return element.childNodes
    .filter((child) => child.nodeType === 3)
    .map((child) => child.rawText)
    .join('')
    .trim();
}

function isEditable(element) {
  const tag = (element.rawTagName || '').toLowerCase();
  if (!tag || SKIP_TAGS.has(tag)) return false;
  if (element.closest('[data-cms-ignore]')) return false;
  if (tag === 'img') return true;
  if (tag === 'input' || tag === 'textarea') return !!element.getAttribute('placeholder');
  if (/background-image/i.test(element.getAttribute('style') || '')) return true;
  const kids = elementChildren(element);
  if (kids.length === 0) return (element.text || '').trim().length > 0;
  if (!directText(element)) return false;
  return kids.every((child) => INLINE.has((child.rawTagName || '').toLowerCase()));
}

function walk(node, prefix, out) {
  const kids = elementChildren(node);
  const counters = new Map();
  for (const child of kids) {
    const tag = (child.rawTagName || '').toLowerCase();
    const index = counters.get(tag) ?? 0;
    counters.set(tag, index + 1);
    const key = `${prefix}${prefix ? '/' : ''}${tag}:${index}`;
    if (isEditable(child)) out.push({ element: child, key });
    if (!SKIP_TAGS.has(tag)) walk(child, key, out);
  }
}

const files = (await readdir(PUBLIC_DIR)).filter((file) => file.endsWith('.html'));
let stamped = 0;

for (const file of files) {
  const full = path.join(PUBLIC_DIR, file);
  const source = await readFile(full, 'utf8');
  const root = parse(source, {
    comment: true,
    voidTag: { closingSlash: false },
    blockTextElements: { script: true, noscript: true, style: true, pre: true },
  });
  const body = root.querySelector('body');
  if (!body) continue;

  const page = pageNameOf(file);
  const found = [];
  walk(body, '', found);

  const used = new Set();
  const edits = [];
  for (const { element, key } of found) {
    if (element.getAttribute('data-cms-id')) {
      used.add(element.getAttribute('data-cms-id'));
      continue;
    }
    let id = cmsHash(`${page}|${key}`);
    while (used.has(id)) id = cmsHash(`${id}|x`);
    used.add(id);
    const range = element.range;
    if (!range) continue;
    const [start] = range;
    const openTagEnd = source.indexOf('>', start);
    if (openTagEnd < 0) continue;
    const openTag = source.slice(start, openTagEnd + 1);
    const selfClosing = /\/>$/.test(openTag);
    const patched = openTag.replace(
      selfClosing ? /\s*\/>$/ : />$/,
      ` data-cms-id="${id}"${selfClosing ? ' />' : '>'}`,
    );
    edits.push({ start, end: openTagEnd + 1, text: patched });
  }

  if (!edits.length) continue;
  let output = source;
  edits
    .sort((a, b) => b.start - a.start)
    .forEach((edit) => {
      output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
    });
  await writeFile(full, output, 'utf8');
  stamped += edits.length;
  console.log(`${file}: stamped ${edits.length} elements`);
}

console.log(`Done. ${stamped} new ids.`);
