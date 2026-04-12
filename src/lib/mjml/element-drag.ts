/**
 * Element-level drag-and-drop + inline editing for email preview.
 *
 * Since the sandboxed iframe doesn't render DOM-manipulated elements,
 * we inject drag handles into the HTML STRING (like block labels).
 * Mouse-event-based drag is handled from the parent via contentDocument.
 *
 * In MJML-compiled HTML each component in a column is a <tr> inside
 * a column's <table role="presentation" width="100%"><tbody>.
 * Every component <td> has font-size:0px + word-break:break-word.
 *
 * Component types detected:
 *  - Text (headline/body): <td> > <div style="font-size:..."> → font size + color controls
 *  - Divider: <td> > <p style="border-top:..."> → thickness + color controls
 *  - Other (image, button): drag + delete only
 */

// ─── Styles ──────────────────────────────────────────────────

const TOOLBAR_STYLE = [
  "display:flex",
  "align-items:center",
  "justify-content:center",
  "gap:4px",
  "margin:0 auto",
  "width:fit-content",
  "font-size:9px",
  "font-family:system-ui,sans-serif",
  "user-select:none",
  "white-space:nowrap",
  "line-height:1.4",
  "opacity:0.8",
  "transition:opacity 0.15s",
].join(";");

const DRAG_BTN_STYLE = [
  "background:rgba(99,102,241,0.85)",
  "color:#fff",
  "padding:1px 8px",
  "border-radius:3px",
  "cursor:grab",
  "border:none",
  "font-size:9px",
  "font-family:system-ui,sans-serif",
].join(";");

const DELETE_BTN_STYLE = [
  "background:rgba(239,68,68,0.8)",
  "color:#fff",
  "padding:1px 7px",
  "border-radius:3px",
  "cursor:pointer",
  "border:none",
  "font-size:9px",
  "font-family:system-ui,sans-serif",
  "line-height:1.4",
].join(";");

const TEXT_BTN_STYLE = [
  "background:rgba(99,102,241,0.7)",
  "color:#fff",
  "padding:1px 6px",
  "border-radius:3px",
  "cursor:pointer",
  "border:none",
  "font-size:9px",
  "font-family:system-ui,sans-serif",
  "line-height:1.4",
].join(";");

const COLOR_INPUT_STYLE = [
  "width:18px",
  "height:18px",
  "padding:0",
  "border:1px solid rgba(255,255,255,0.5)",
  "border-radius:50%",
  "cursor:pointer",
  "background:transparent",
  "vertical-align:middle",
  "-webkit-appearance:none",
  "appearance:none",
].join(";");

const SEPARATOR_STYLE =
  "display:inline-block;width:1px;height:12px;background:rgba(255,255,255,0.25);";

const ROW_HIGHLIGHT =
  "outline:1px dashed rgba(99,102,241,0.3);outline-offset:-1px;";

// ─── HTML string injection ───────────────────────────────────

/**
 * Detect component type by peeking at content after the <td> style attribute.
 * Finds the closing > of the <td> tag, then checks the first child element.
 *  - "text": first child is <div> with font-size (text/heading component)
 *  - "divider": first child is <p> with border-top (mj-divider)
 *  - "other": images, buttons, spacers, etc.
 */
function detectComponentType(afterTd: string): "text" | "divider" | "button" | "other" {
  // Find the closing > of the <td> tag
  const closeIdx = afterTd.indexOf(">");
  if (closeIdx < 0) return "other";
  const content = afterTd.substring(closeIdx + 1);

  // Find the first HTML element tag after the <td>
  const firstTag = content.match(/<(\w+)[\s>]/);
  if (!firstTag) return "other";

  const tag = firstTag[1].toLowerCase();
  if (tag === "p" && /border-top/i.test(content.substring(0, 300))) return "divider";
  // MJML buttons compile to <table> with <a> inside — detect by looking for
  // a <td> with role="presentation" containing an <a> with background in style
  if (tag === "table" && /<a\s[^>]*style="[^"]*background:/i.test(content.substring(0, 600))) return "button";
  if (tag === "div") return "text";
  return "other";
}

/** Build toolbar controls for a text component (font size + color picker). */
function textControls(): string {
  let c = `<span style="${SEPARATOR_STYLE}"></span>`;
  c += `<span data-font-down="true" style="${TEXT_BTN_STYLE}" title="Decrease font size">A\u2212</span>`;
  c += `<span data-font-up="true" style="${TEXT_BTN_STYLE}" title="Increase font size">A+</span>`;
  c += `<span style="${SEPARATOR_STYLE}"></span>`;
  c += `<input type="color" data-text-color-picker="true" value="#000000" title="Text color" style="${COLOR_INPUT_STYLE}" />`;
  return c;
}

/** Build toolbar controls for a CTA button (font size + text color + bg color + border radius). */
function buttonControls(): string {
  let c = `<span style="${SEPARATOR_STYLE}"></span>`;
  c += `<span data-btn-font-down="true" style="${TEXT_BTN_STYLE}" title="Decrease font size">A\u2212</span>`;
  c += `<span data-btn-font-up="true" style="${TEXT_BTN_STYLE}" title="Increase font size">A+</span>`;
  c += `<span style="${SEPARATOR_STYLE}"></span>`;
  c += `<span style="font-size:8px;color:rgba(255,255,255,0.5);font-family:system-ui,sans-serif;">txt</span>`;
  c += `<input type="color" data-btn-text-color="true" value="#ffffff" title="Text color" style="${COLOR_INPUT_STYLE}" />`;
  c += `<span style="font-size:8px;color:rgba(255,255,255,0.5);font-family:system-ui,sans-serif;">bg</span>`;
  c += `<input type="color" data-btn-bg-color="true" value="#000000" title="Button background" style="${COLOR_INPUT_STYLE}" />`;
  c += `<span style="${SEPARATOR_STYLE}"></span>`;
  c += `<span data-btn-radius-down="true" style="${TEXT_BTN_STYLE}" title="Less rounded">\u25A1</span>`;
  c += `<span data-btn-radius-up="true" style="${TEXT_BTN_STYLE}" title="More rounded">\u25CF</span>`;
  return c;
}

/** Build toolbar controls for a divider component (thickness + style + color picker). */
function dividerControls(): string {
  let c = `<span style="${SEPARATOR_STYLE}"></span>`;
  c += `<span data-div-thinner="true" style="${TEXT_BTN_STYLE}" title="Thinner">\u2212</span>`;
  c += `<span data-div-thicker="true" style="${TEXT_BTN_STYLE}" title="Thicker">+</span>`;
  c += `<span style="${SEPARATOR_STYLE}"></span>`;
  c += `<span data-div-style="solid" style="${TEXT_BTN_STYLE}" title="Solid">\u2500</span>`;
  c += `<span data-div-style="dashed" style="${TEXT_BTN_STYLE}" title="Dashed">\u2504</span>`;
  c += `<span data-div-style="dotted" style="${TEXT_BTN_STYLE}" title="Dotted">\u2508</span>`;
  c += `<span style="${SEPARATOR_STYLE}"></span>`;
  c += `<input type="color" data-div-color-picker="true" value="#000000" title="Divider color" style="${COLOR_INPUT_STYLE}" />`;
  return c;
}

/**
 * Inject drag handles before ALL component rows in compiled MJML HTML.
 * Text rows get font size + color controls.
 * Divider rows get thickness + color controls.
 */
export function injectDragHandles(html: string): string {
  let result = html;

  const componentTrRegex =
    /<tr>\s*<td\s+[^>]*style="[^"]*font-size:\s*0px[^"]*word-break:\s*break-word[^"]*"/gi;

  const matches = [...result.matchAll(componentTrRegex)];

  for (let i = matches.length - 1; i >= 0; i--) {
    const match = matches[i];
    const trStartPos = match.index!;

    // Peek ahead to detect component type (need enough chars to see child element + style)
    const afterMatch = result.substring(
      trStartPos + match[0].length,
      trStartPos + match[0].length + 400
    );
    const type = detectComponentType(afterMatch);

    // Build toolbar controls based on type
    let controls = `<span data-drag-grip="true" style="${DRAG_BTN_STYLE}">\u2261 drag</span>`;

    if (type === "text") {
      controls += textControls();
    } else if (type === "button") {
      controls += buttonControls();
    } else if (type === "divider") {
      controls += dividerControls();
    }

    controls += `<span style="${SEPARATOR_STYLE}"></span>`;
    controls += `<span data-delete-btn="true" style="${DELETE_BTN_STYLE}" title="Delete element">\u2715</span>`;

    const handleRow =
      `<tr data-drag-handle="true"><td align="center" style="font-size:10px;padding:2px 0 0;">` +
      `<div style="${TOOLBAR_STYLE}">${controls}</div></td></tr>\n`;

    const newTr = `<tr data-draggable-row="true" style="${ROW_HIGHLIGHT}">`;

    result =
      result.substring(0, trStartPos) +
      handleRow +
      newTr +
      result.substring(trStartPos + 4);
  }

  return result;
}

// Keep backward compat alias
export const injectCtaHandles = injectDragHandles;

// ─── Helpers ────────────────────────────────────────────────

function findComponentRow(handle: HTMLElement): HTMLTableRowElement | null {
  let node: HTMLElement | null = handle;
  while (node && node.tagName !== "TR") {
    node = node.parentElement;
  }
  if (!node) return null;
  const next = node.nextElementSibling;
  if (next?.tagName === "TR" && next.hasAttribute("data-draggable-row")) {
    return next as HTMLTableRowElement;
  }
  return null;
}

function findHandleRow(draggableRow: HTMLTableRowElement): HTMLTableRowElement | null {
  const prev = draggableRow.previousElementSibling;
  if (prev?.tagName === "TR" && prev.hasAttribute("data-drag-handle")) {
    return prev as HTMLTableRowElement;
  }
  return null;
}

function getSiblingComponentRows(row: HTMLTableRowElement): HTMLTableRowElement[] {
  const tbody = row.parentElement;
  if (!tbody || tbody.tagName !== "TBODY") return [];
  return Array.from(tbody.children).filter(
    (el): el is HTMLTableRowElement =>
      el.tagName === "TR" && !el.hasAttribute("data-drag-handle")
  );
}

/** Find the main text <div> inside a component row. */
function findTextDiv(componentRow: HTMLElement): HTMLElement | null {
  const td = componentRow.querySelector("td");
  if (!td) return null;
  const div = td.querySelector(":scope > div[style]") as HTMLElement | null;
  if (div && /font-size/i.test(div.getAttribute("style") || "")) {
    return div;
  }
  return null;
}

/** Find the CTA <a> link inside a button component row. */
function findButtonLink(componentRow: HTMLElement): HTMLElement | null {
  return componentRow.querySelector("a[style*='background']") as HTMLElement | null;
}

/** Find the button's wrapping <td> (holds the background color too). */
function findButtonTd(componentRow: HTMLElement): HTMLElement | null {
  return componentRow.querySelector("td[style*='background']") as HTMLElement | null;
}

/** Find the divider <p> inside a component row. */
function findDividerLine(componentRow: HTMLElement): HTMLElement | null {
  const td = componentRow.querySelector("td");
  if (!td) return null;
  const p = td.querySelector(":scope > p[style*='border-top']") as HTMLElement | null;
  return p;
}

function parseFontSize(el: HTMLElement): number {
  const style = el.getAttribute("style") || "";
  const match = style.match(/font-size:\s*(\d+)px/i);
  return match ? parseInt(match[1], 10) : 16;
}

function setFontSize(el: HTMLElement, newSize: number): void {
  const style = el.getAttribute("style") || "";
  el.setAttribute(
    "style",
    style.replace(/font-size:\s*\d+px/i, `font-size:${newSize}px`)
  );
  el.querySelectorAll("h1,h2,h3,h4,h5,h6,p").forEach((child) => {
    const childStyle = child.getAttribute("style") || "";
    if (/font-size/i.test(childStyle)) {
      child.setAttribute(
        "style",
        childStyle.replace(/font-size:\s*\d+px/i, `font-size:${newSize}px`)
      );
    }
  });
}

function setTextColor(el: HTMLElement, color: string): void {
  const style = el.getAttribute("style") || "";
  if (/(?:^|;)\s*color\s*:/i.test(style)) {
    el.setAttribute("style", style.replace(/color:\s*[^;]+/i, `color:${color}`));
  } else {
    el.setAttribute("style", style + `;color:${color}`);
  }
  el.querySelectorAll("h1,h2,h3,h4,h5,h6,p,a,span").forEach((child) => {
    const childStyle = child.getAttribute("style") || "";
    if (/(?:^|;)\s*color\s*:/i.test(childStyle)) {
      child.setAttribute("style", childStyle.replace(/color:\s*[^;]+/i, `color:${color}`));
    }
  });
}

/** Parse border-radius from a button <a> or <td>. */
function parseBorderRadius(el: HTMLElement): number {
  const style = el.getAttribute("style") || "";
  const match = style.match(/border-radius:\s*(\d+)px/i);
  return match ? parseInt(match[1], 10) : 0;
}

/** Set border-radius on element, preserving other styles. */
function setBorderRadius(el: HTMLElement, px: number): void {
  const style = el.getAttribute("style") || "";
  if (/border-radius/i.test(style)) {
    el.setAttribute("style", style.replace(/border-radius:\s*\d+px/i, `border-radius:${px}px`));
  } else {
    el.setAttribute("style", style + `;border-radius:${px}px`);
  }
}

// Border-top regex that matches solid, dashed, or dotted
const BORDER_TOP_RE = /border-top:\s*(solid|dashed|dotted)\s+(\d+)px\s+([^;"]+)/i;

/** Parse border-top thickness from a divider <p>. */
function parseDividerThickness(el: HTMLElement): number {
  const match = (el.getAttribute("style") || "").match(BORDER_TOP_RE);
  return match ? parseInt(match[2], 10) : 2;
}

/** Parse current border style (solid/dashed/dotted). */
function parseDividerStyle(el: HTMLElement): string {
  const match = (el.getAttribute("style") || "").match(BORDER_TOP_RE);
  return match ? match[1] : "solid";
}

/** Set border-top thickness on a divider <p>, preserving style and color. */
function setDividerThickness(el: HTMLElement, px: number): void {
  const style = el.getAttribute("style") || "";
  el.setAttribute(
    "style",
    style.replace(BORDER_TOP_RE, (_, s, _t, c) => `border-top:${s} ${px}px ${c}`)
  );
}

/** Set border-top style (solid/dashed/dotted), preserving thickness and color. */
function setDividerStyle(el: HTMLElement, newStyle: string): void {
  const style = el.getAttribute("style") || "";
  el.setAttribute(
    "style",
    style.replace(BORDER_TOP_RE, (_, _s, t, c) => `border-top:${newStyle} ${t}px ${c}`)
  );
}

/** Set border-top color on a divider <p>, preserving style and thickness. */
function setDividerColor(el: HTMLElement, color: string): void {
  const style = el.getAttribute("style") || "";
  el.setAttribute(
    "style",
    style.replace(BORDER_TOP_RE, (_, s, t) => `border-top:${s} ${t}px ${color}`)
  );
}

/** Parse the current text color from a text div, returning a hex string. */
function parseCurrentTextColor(el: HTMLElement): string | null {
  const style = el.getAttribute("style") || "";
  const match = style.match(/(?:^|;)\s*color:\s*([^;]+)/i);
  if (!match) return null;
  return colorToHex(match[1].trim());
}

/** Convert a CSS color value to hex format for <input type="color">. */
function colorToHex(color: string): string | null {
  if (/^#[0-9a-f]{6}$/i.test(color)) return color.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(color)) {
    return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`.toLowerCase();
  }
  const rgb = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgb) {
    const r = parseInt(rgb[1]).toString(16).padStart(2, "0");
    const g = parseInt(rgb[2]).toString(16).padStart(2, "0");
    const b = parseInt(rgb[3]).toString(16).padStart(2, "0");
    return `#${r}${g}${b}`;
  }
  // Named colors fallback
  const named: Record<string, string> = {
    black: "#000000", white: "#ffffff", red: "#ff0000", blue: "#0000ff",
    green: "#008000", gray: "#808080", grey: "#808080",
  };
  return named[color.toLowerCase()] || null;
}

// ─── Drag + edit controller ─────────────────────────────────

interface DragState {
  sourceRow: HTMLTableRowElement;
  siblings: HTMLTableRowElement[];
}

export function setupDragListeners(
  doc: Document,
  onReorder: (html: string) => void
): () => void {
  let drag: DragState | null = null;
  let dropTarget: { row: HTMLTableRowElement; position: "before" | "after" } | null = null;

  // ── Click handler ──
  const onClick = (e: Event) => {
    const me = e as MouseEvent;
    const target = me.target as HTMLElement;

    // — Delete element —
    const deleteBtn = target.closest("[data-delete-btn]") as HTMLElement | null;
    if (deleteBtn) {
      const handleTr = deleteBtn.closest("[data-drag-handle]") as HTMLElement | null;
      if (!handleTr) return;
      const componentRow = handleTr.nextElementSibling as HTMLElement | null;
      if (!componentRow?.hasAttribute("data-draggable-row")) return;
      me.preventDefault();
      me.stopPropagation();
      handleTr.remove();
      componentRow.remove();
      onReorder(serializeCleanHtml(doc));
      return;
    }

    // — Font size down —
    const fontDown = target.closest("[data-font-down]") as HTMLElement | null;
    if (fontDown) {
      const handleTr = fontDown.closest("[data-drag-handle]") as HTMLElement | null;
      const componentRow = handleTr?.nextElementSibling as HTMLElement | null;
      if (!componentRow) return;
      const textDiv = findTextDiv(componentRow);
      if (!textDiv) return;
      me.preventDefault();
      setFontSize(textDiv, Math.max(10, parseFontSize(textDiv) - 2));
      onReorder(serializeCleanHtml(doc));
      return;
    }

    // — Font size up —
    const fontUp = target.closest("[data-font-up]") as HTMLElement | null;
    if (fontUp) {
      const handleTr = fontUp.closest("[data-drag-handle]") as HTMLElement | null;
      const componentRow = handleTr?.nextElementSibling as HTMLElement | null;
      if (!componentRow) return;
      const textDiv = findTextDiv(componentRow);
      if (!textDiv) return;
      me.preventDefault();
      setFontSize(textDiv, Math.min(72, parseFontSize(textDiv) + 2));
      onReorder(serializeCleanHtml(doc));
      return;
    }

    // — Text color picker: set initial value on click —
    const textColorInput = target.closest("[data-text-color-picker]") as HTMLInputElement | null;
    if (textColorInput) {
      const handleTr = textColorInput.closest("[data-drag-handle]") as HTMLElement | null;
      const componentRow = handleTr?.nextElementSibling as HTMLElement | null;
      if (!componentRow) return;
      const textDiv = findTextDiv(componentRow);
      if (!textDiv) return;
      // Read current color and set picker initial value
      const currentColor = parseCurrentTextColor(textDiv);
      if (currentColor) textColorInput.value = currentColor;
      return;
    }

    // — Button font size down —
    const btnFontDown = target.closest("[data-btn-font-down]") as HTMLElement | null;
    if (btnFontDown) {
      const handleTr = btnFontDown.closest("[data-drag-handle]") as HTMLElement | null;
      const componentRow = handleTr?.nextElementSibling as HTMLElement | null;
      if (!componentRow) return;
      const link = findButtonLink(componentRow);
      if (!link) return;
      me.preventDefault();
      setFontSize(link, Math.max(10, parseFontSize(link) - 2));
      onReorder(serializeCleanHtml(doc));
      return;
    }

    // — Button font size up —
    const btnFontUp = target.closest("[data-btn-font-up]") as HTMLElement | null;
    if (btnFontUp) {
      const handleTr = btnFontUp.closest("[data-drag-handle]") as HTMLElement | null;
      const componentRow = handleTr?.nextElementSibling as HTMLElement | null;
      if (!componentRow) return;
      const link = findButtonLink(componentRow);
      if (!link) return;
      me.preventDefault();
      setFontSize(link, Math.min(72, parseFontSize(link) + 2));
      onReorder(serializeCleanHtml(doc));
      return;
    }

    // — Button text color picker: set initial value on click —
    const btnTextColorInput = target.closest("[data-btn-text-color]") as HTMLInputElement | null;
    if (btnTextColorInput) {
      const handleTr = btnTextColorInput.closest("[data-drag-handle]") as HTMLElement | null;
      const componentRow = handleTr?.nextElementSibling as HTMLElement | null;
      if (!componentRow) return;
      const link = findButtonLink(componentRow);
      if (!link) return;
      const currentColor = parseCurrentTextColor(link);
      if (currentColor) btnTextColorInput.value = currentColor;
      return;
    }

    // — Button bg color picker: set initial value on click —
    const btnBgColorInput = target.closest("[data-btn-bg-color]") as HTMLInputElement | null;
    if (btnBgColorInput) {
      const handleTr = btnBgColorInput.closest("[data-drag-handle]") as HTMLElement | null;
      const componentRow = handleTr?.nextElementSibling as HTMLElement | null;
      if (!componentRow) return;
      const link = findButtonLink(componentRow);
      if (!link) return;
      const style = link.getAttribute("style") || "";
      const bgMatch = style.match(/background:\s*([^;]+)/i);
      if (bgMatch) {
        const hex = colorToHex(bgMatch[1].trim());
        if (hex) btnBgColorInput.value = hex;
      }
      return;
    }

    // — Button border radius down —
    const btnRadiusDown = target.closest("[data-btn-radius-down]") as HTMLElement | null;
    if (btnRadiusDown) {
      const handleTr = btnRadiusDown.closest("[data-drag-handle]") as HTMLElement | null;
      const componentRow = handleTr?.nextElementSibling as HTMLElement | null;
      if (!componentRow) return;
      const link = findButtonLink(componentRow);
      if (!link) return;
      me.preventDefault();
      const newRadius = Math.max(0, parseBorderRadius(link) - 4);
      setBorderRadius(link, newRadius);
      const btnTd = findButtonTd(componentRow);
      if (btnTd) setBorderRadius(btnTd, newRadius);
      onReorder(serializeCleanHtml(doc));
      return;
    }

    // — Button border radius up —
    const btnRadiusUp = target.closest("[data-btn-radius-up]") as HTMLElement | null;
    if (btnRadiusUp) {
      const handleTr = btnRadiusUp.closest("[data-drag-handle]") as HTMLElement | null;
      const componentRow = handleTr?.nextElementSibling as HTMLElement | null;
      if (!componentRow) return;
      const link = findButtonLink(componentRow);
      if (!link) return;
      me.preventDefault();
      const newRadius = Math.min(50, parseBorderRadius(link) + 4);
      setBorderRadius(link, newRadius);
      const btnTd = findButtonTd(componentRow);
      if (btnTd) setBorderRadius(btnTd, newRadius);
      onReorder(serializeCleanHtml(doc));
      return;
    }

    // — Divider thinner —
    const divThinner = target.closest("[data-div-thinner]") as HTMLElement | null;
    if (divThinner) {
      const handleTr = divThinner.closest("[data-drag-handle]") as HTMLElement | null;
      const componentRow = handleTr?.nextElementSibling as HTMLElement | null;
      if (!componentRow) return;
      const line = findDividerLine(componentRow);
      if (!line) return;
      me.preventDefault();
      setDividerThickness(line, Math.max(1, parseDividerThickness(line) - 1));
      onReorder(serializeCleanHtml(doc));
      return;
    }

    // — Divider thicker —
    const divThicker = target.closest("[data-div-thicker]") as HTMLElement | null;
    if (divThicker) {
      const handleTr = divThicker.closest("[data-drag-handle]") as HTMLElement | null;
      const componentRow = handleTr?.nextElementSibling as HTMLElement | null;
      if (!componentRow) return;
      const line = findDividerLine(componentRow);
      if (!line) return;
      me.preventDefault();
      setDividerThickness(line, Math.min(10, parseDividerThickness(line) + 1));
      onReorder(serializeCleanHtml(doc));
      return;
    }

    // — Divider style (solid/dashed/dotted) —
    const divStyleBtn = target.closest("[data-div-style]") as HTMLElement | null;
    if (divStyleBtn) {
      const newStyle = divStyleBtn.getAttribute("data-div-style");
      if (!newStyle) return;
      const handleTr = divStyleBtn.closest("[data-drag-handle]") as HTMLElement | null;
      const componentRow = handleTr?.nextElementSibling as HTMLElement | null;
      if (!componentRow) return;
      const line = findDividerLine(componentRow);
      if (!line) return;
      me.preventDefault();
      setDividerStyle(line, newStyle);
      onReorder(serializeCleanHtml(doc));
      return;
    }

    // — Divider color picker: set initial value on click —
    const divColorInput = target.closest("[data-div-color-picker]") as HTMLInputElement | null;
    if (divColorInput) {
      const handleTr = divColorInput.closest("[data-drag-handle]") as HTMLElement | null;
      const componentRow = handleTr?.nextElementSibling as HTMLElement | null;
      if (!componentRow) return;
      const line = findDividerLine(componentRow);
      if (!line) return;
      const match = (line.getAttribute("style") || "").match(BORDER_TOP_RE);
      if (match && match[3]) {
        const hex = colorToHex(match[3].trim());
        if (hex) divColorInput.value = hex;
      }
      return;
    }
  };

  // ── Drag handler ──
  const onMouseDown = (e: Event) => {
    const me = e as MouseEvent;
    if ((me.target as HTMLElement)?.closest("[data-delete-btn],[data-font-down],[data-font-up],[data-text-color-picker],[data-div-thinner],[data-div-thicker],[data-div-style],[data-div-color-picker],[data-btn-font-down],[data-btn-font-up],[data-btn-text-color],[data-btn-bg-color],[data-btn-radius-down],[data-btn-radius-up]")) return;

    const handle = (me.target as HTMLElement)?.closest("[data-drag-handle]") as HTMLElement | null;
    if (!handle) return;

    const sourceRow = findComponentRow(handle);
    if (!sourceRow) return;

    const siblings = getSiblingComponentRows(sourceRow);
    if (siblings.length < 2) return;

    me.preventDefault();
    drag = { sourceRow, siblings };
    sourceRow.style.outline = "2px solid #6366f1";
    sourceRow.style.opacity = "0.5";
    doc.body.style.cursor = "grabbing";
  };

  const onMouseMove = (e: Event) => {
    if (!drag) return;
    const me = e as MouseEvent;
    me.preventDefault();

    drag.siblings.forEach((s) => {
      if (s !== drag!.sourceRow) {
        s.style.borderTop = "";
        s.style.borderBottom = "";
      }
    });
    dropTarget = null;

    for (const sibling of drag.siblings) {
      if (sibling === drag.sourceRow) continue;
      const rect = sibling.getBoundingClientRect();
      if (me.clientY >= rect.top && me.clientY <= rect.bottom) {
        const midY = rect.top + rect.height / 2;
        const position = me.clientY < midY ? "before" : "after";
        dropTarget = { row: sibling, position };
        if (position === "before") {
          sibling.style.borderTop = "3px solid #6366f1";
        } else {
          sibling.style.borderBottom = "3px solid #6366f1";
        }
        break;
      }
    }
  };

  const onMouseUp = () => {
    if (!drag) return;
    const { sourceRow, siblings } = drag;

    sourceRow.style.outline = ROW_HIGHLIGHT;
    sourceRow.style.opacity = "1";
    doc.body.style.cursor = "";
    siblings.forEach((s) => {
      s.style.borderTop = "";
      s.style.borderBottom = "";
    });

    if (dropTarget && dropTarget.row !== sourceRow) {
      const tbody = sourceRow.parentElement!;
      const handleRow = findHandleRow(sourceRow);
      const targetHandleRow = findHandleRow(dropTarget.row);

      if (dropTarget.position === "before") {
        const insertRef = targetHandleRow || dropTarget.row;
        if (handleRow) tbody.insertBefore(handleRow, insertRef);
        tbody.insertBefore(sourceRow, insertRef);
      } else {
        const ref = dropTarget.row.nextSibling;
        if (handleRow) tbody.insertBefore(handleRow, ref);
        tbody.insertBefore(sourceRow, ref);
      }
      onReorder(serializeCleanHtml(doc));
    }

    drag = null;
    dropTarget = null;
  };

  // ── Column swap buttons for multi-column blocks ──
  const columnSwapElements: HTMLElement[] = [];

  const multiColRows = doc.querySelectorAll("table[role='presentation'] > tbody > tr");
  multiColRows.forEach((tr) => {
    const tds = Array.from(tr.children).filter(
      (el): el is HTMLTableCellElement =>
        el.tagName === "TD" && /width:\s*\d/.test(el.getAttribute("style") || "")
    );
    if (tds.length < 2) return;

    // Add swap buttons to each column
    tds.forEach((td, idx) => {
      const bar = doc.createElement("div");
      bar.setAttribute("data-col-swap", "true");
      bar.setAttribute("style", [
        "display:flex", "justify-content:center", "gap:4px",
        "padding:2px 0", "font-size:9px", "font-family:system-ui,sans-serif",
        "user-select:none",
      ].join(";"));

      if (idx > 0) {
        const left = doc.createElement("span");
        left.setAttribute("data-col-move", "left");
        left.setAttribute("data-col-idx", String(idx));
        left.setAttribute("style", TEXT_BTN_STYLE + ";cursor:pointer");
        left.textContent = "\u25C0";
        left.title = "Move column left";
        bar.appendChild(left);
      }
      if (idx < tds.length - 1) {
        const right = doc.createElement("span");
        right.setAttribute("data-col-move", "right");
        right.setAttribute("data-col-idx", String(idx));
        right.setAttribute("style", TEXT_BTN_STYLE + ";cursor:pointer");
        right.textContent = "\u25B6";
        right.title = "Move column right";
        bar.appendChild(right);
      }

      td.insertBefore(bar, td.firstChild);
      columnSwapElements.push(bar);
    });
  });

  // Column swap click handler
  const onColSwap = (e: Event) => {
    const target = e.target as HTMLElement;
    const btn = target.closest("[data-col-move]") as HTMLElement | null;
    if (!btn) return;

    const direction = btn.getAttribute("data-col-move");
    const idx = parseInt(btn.getAttribute("data-col-idx") || "0", 10);
    const tr = btn.closest("tr");
    if (!tr) return;

    const tds = Array.from(tr.children).filter(
      (el): el is HTMLTableCellElement =>
        el.tagName === "TD" && /width:\s*\d/.test(el.getAttribute("style") || "")
    );

    if (direction === "left" && idx > 0) {
      tr.insertBefore(tds[idx], tds[idx - 1]);
    } else if (direction === "right" && idx < tds.length - 1) {
      tr.insertBefore(tds[idx + 1], tds[idx]);
    }

    // Rebuild column swap buttons (indices changed)
    columnSwapElements.forEach((el) => el.remove());
    columnSwapElements.length = 0;

    e.preventDefault();
    e.stopPropagation();
    onReorder(serializeCleanHtml(doc));
  };

  // ── Color picker input handler ──
  const onColorInput = (e: Event) => {
    const target = e.target as HTMLInputElement;

    // Text color picker
    if (target.hasAttribute("data-text-color-picker")) {
      const color = target.value;
      const handleTr = target.closest("[data-drag-handle]") as HTMLElement | null;
      const componentRow = handleTr?.nextElementSibling as HTMLElement | null;
      if (!componentRow) return;
      const textDiv = findTextDiv(componentRow);
      if (!textDiv) return;
      setTextColor(textDiv, color);
      onReorder(serializeCleanHtml(doc));
      return;
    }

    // Divider color picker
    if (target.hasAttribute("data-div-color-picker")) {
      const color = target.value;
      const handleTr = target.closest("[data-drag-handle]") as HTMLElement | null;
      const componentRow = handleTr?.nextElementSibling as HTMLElement | null;
      if (!componentRow) return;
      const line = findDividerLine(componentRow);
      if (!line) return;
      setDividerColor(line, color);
      onReorder(serializeCleanHtml(doc));
      return;
    }

    // Button text color picker
    if (target.hasAttribute("data-btn-text-color")) {
      const color = target.value;
      const handleTr = target.closest("[data-drag-handle]") as HTMLElement | null;
      const componentRow = handleTr?.nextElementSibling as HTMLElement | null;
      if (!componentRow) return;
      const link = findButtonLink(componentRow);
      if (!link) return;
      setTextColor(link, color);
      onReorder(serializeCleanHtml(doc));
      return;
    }

    // Button background color picker
    if (target.hasAttribute("data-btn-bg-color")) {
      const color = target.value;
      const handleTr = target.closest("[data-drag-handle]") as HTMLElement | null;
      const componentRow = handleTr?.nextElementSibling as HTMLElement | null;
      if (!componentRow) return;
      const link = findButtonLink(componentRow);
      if (!link) return;
      // Update background on the <a> tag
      const style = link.getAttribute("style") || "";
      link.setAttribute("style", style.replace(/background:\s*[^;]+/i, `background:${color}`));
      // Also update the wrapping <td> which has a matching background
      const btnTd = findButtonTd(componentRow);
      if (btnTd) {
        const tdStyle = btnTd.getAttribute("style") || "";
        btnTd.setAttribute("style", tdStyle.replace(/background:\s*[^;]+/i, `background:${color}`));
      }
      onReorder(serializeCleanHtml(doc));
      return;
    }
  };

  doc.addEventListener("click", onClick);
  doc.addEventListener("click", onColSwap);
  doc.addEventListener("input", onColorInput);
  doc.addEventListener("mousedown", onMouseDown);
  doc.addEventListener("mousemove", onMouseMove);
  doc.addEventListener("mouseup", onMouseUp);

  return () => {
    doc.removeEventListener("click", onClick);
    doc.removeEventListener("click", onColSwap);
    doc.removeEventListener("input", onColorInput);
    doc.removeEventListener("mousedown", onMouseDown);
    doc.removeEventListener("mousemove", onMouseMove);
    doc.removeEventListener("mouseup", onMouseUp);
    columnSwapElements.forEach((el) => el.remove());
  };
}

// ─── Serialization ───────────────────────────────────────────

export function serializeCleanHtml(doc: Document): string {
  const clone = doc.documentElement.cloneNode(true) as HTMLElement;

  // Remove injected UI elements
  clone
    .querySelectorAll("[data-block-label],[data-drag-handle],[data-col-swap]")
    .forEach((el) => el.remove());

  // Clean up draggable row attributes
  clone.querySelectorAll("[data-draggable-row]").forEach((el) => {
    el.removeAttribute("data-draggable-row");
    const style = el.getAttribute("style") || "";
    const cleaned = style
      .replace(/outline:[^;]*;?/g, "")
      .replace(/outline-offset:[^;]*;?/g, "")
      .replace(/opacity:[^;]*;?/g, "")
      .replace(/border-top:[^;]*;?/g, "")
      .replace(/border-bottom:[^;]*;?/g, "")
      .trim();
    if (cleaned) {
      el.setAttribute("style", cleaned);
    } else {
      el.removeAttribute("style");
    }
  });

  const doctype = "<!doctype html>";
  return `${doctype}\n${clone.outerHTML}`;
}
