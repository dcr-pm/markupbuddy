/**
 * Element-level drag-and-drop for CTA buttons in the email preview.
 *
 * Since the sandboxed iframe doesn't render DOM-manipulated elements,
 * we inject drag handles into the HTML STRING (like block labels).
 * Mouse-event-based drag is handled from the parent via contentDocument.
 *
 * In MJML-compiled HTML each component in a column is a <tr> inside
 * a column's <table role="presentation" width="100%"><tbody>.
 */

// ─── Styles ──────────────────────────────────────────────────

const HANDLE_STYLE = [
  "position:relative",
  "display:block",
  "text-align:center",
  "margin:-4px auto 4px",
  "background:rgba(99,102,241,0.9)",
  "color:#fff",
  "padding:3px 12px",
  "border-radius:4px",
  "font-size:10px",
  "font-family:system-ui,sans-serif",
  "cursor:grab",
  "z-index:10000",
  "user-select:none",
  "white-space:nowrap",
  "line-height:1.4",
  "width:fit-content",
].join(";");

const ROW_HIGHLIGHT =
  "outline:2px dashed rgba(99,102,241,0.4);outline-offset:-2px;";

const DROP_LINE_STYLE = [
  "display:none",
  "height:3px",
  "background:#6366f1",
  "border-radius:2px",
  "margin:2px 0",
].join(";");

// ─── HTML string injection ───────────────────────────────────

/**
 * Inject drag handles into CTA button rows in compiled HTML.
 * Inserts a <div> handle inside the CTA's parent <td>, before
 * the button's inner <table>. This renders correctly because
 * it's part of the initial HTML written via doc.write().
 */
export function injectCtaHandles(html: string): string {
  let result = html;

  // Find CTA component rows: a <tr> containing a <td> with a button-style <table>
  // We insert a new <tr> with the drag handle BEFORE the CTA's <tr>.
  // This avoids the font-size:0 issue in the CTA's own <td>.

  // Match the <tr> that contains a button <td>
  // Pattern: <tr> ... <td align="center" ... word-break ... > ... <table ... border-collapse:separate
  const ctaTrRegex =
    /<tr>\s*<td\s+align="center"[^>]*style="[^"]*word-break:\s*break-word[^"]*"[^>]*>\s*<table[^>]*style="[^"]*border-collapse:\s*separate[^"]*"/gi;

  const matches = [...result.matchAll(ctaTrRegex)];

  // Process in reverse so indices stay valid
  for (let i = matches.length - 1; i >= 0; i--) {
    const match = matches[i];
    const trStartPos = match.index!;

    // Build a handle <tr> with its own <td> that has font-size set
    const handleRow = `<tr data-drag-handle="true"><td align="center" style="font-size:10px;padding:4px 0 0;"><div style="${HANDLE_STYLE}">\u2725 Drag to reorder</div></td></tr>\n`;

    // Mark the CTA <tr> as draggable
    const newTr = `<tr data-draggable-row="true" style="${ROW_HIGHLIGHT}">`;

    // Replace <tr> with marked <tr> and prepend the handle row
    result =
      result.substring(0, trStartPos) +
      handleRow +
      newTr +
      result.substring(trStartPos + 4); // skip the original "<tr>"
  }

  return result;
}

// ─── Drag controller (mouse events from parent) ─────────────

/**
 * Find the draggable CTA <tr> associated with a drag handle.
 * The handle is in its own <tr data-drag-handle>, and the CTA is
 * the next sibling <tr data-draggable-row>.
 */
function findComponentRow(handle: HTMLElement): HTMLTableRowElement | null {
  // Walk up to the handle's <tr>
  let node: HTMLElement | null = handle;
  while (node && node.tagName !== "TR") {
    node = node.parentElement;
  }
  if (!node) return null;

  // The CTA row is the next sibling <tr>
  const next = node.nextElementSibling;
  if (next?.tagName === "TR" && next.hasAttribute("data-draggable-row")) {
    return next as HTMLTableRowElement;
  }
  return null;
}

/** Find the handle <tr> that precedes a draggable row. */
function findHandleRow(draggableRow: HTMLTableRowElement): HTMLTableRowElement | null {
  const prev = draggableRow.previousElementSibling;
  if (prev?.tagName === "TR" && prev.hasAttribute("data-drag-handle")) {
    return prev as HTMLTableRowElement;
  }
  return null;
}

/** Get sibling component <tr>s in the same column tbody (excluding drag handle rows). */
function getSiblingComponentRows(row: HTMLTableRowElement): HTMLTableRowElement[] {
  const tbody = row.parentElement;
  if (!tbody || tbody.tagName !== "TBODY") return [];
  return Array.from(tbody.children).filter(
    (el): el is HTMLTableRowElement =>
      el.tagName === "TR" && !el.hasAttribute("data-drag-handle")
  );
}

interface DragState {
  sourceRow: HTMLTableRowElement;
  siblings: HTMLTableRowElement[];
}

/**
 * Set up mouse-based drag listeners on the iframe document.
 * Returns a cleanup function.
 */
export function setupDragListeners(
  doc: Document,
  onReorder: (html: string) => void
): () => void {
  let drag: DragState | null = null;
  let dropTarget: { row: HTMLTableRowElement; position: "before" | "after" } | null = null;

  const onMouseDown = (e: Event) => {
    const me = e as MouseEvent;
    const handle = (me.target as HTMLElement)?.closest("[data-drag-handle]") as HTMLElement | null;
    if (!handle) return;

    const sourceRow = findComponentRow(handle);
    if (!sourceRow) return;

    const siblings = getSiblingComponentRows(sourceRow);
    if (siblings.length < 2) return;

    me.preventDefault();
    drag = { sourceRow, siblings };

    sourceRow.style.outline = "2px solid #6366f1";
    sourceRow.style.opacity = "0.6";
  };

  const onMouseMove = (e: Event) => {
    if (!drag) return;
    const me = e as MouseEvent;
    me.preventDefault();

    // Reset all sibling highlights
    drag.siblings.forEach((s) => {
      if (s !== drag!.sourceRow) {
        s.style.borderTop = "";
        s.style.borderBottom = "";
      }
    });

    dropTarget = null;

    // Find which sibling we're hovering
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

    // Reset all styles
    sourceRow.style.outline = ROW_HIGHLIGHT;
    sourceRow.style.opacity = "1";
    siblings.forEach((s) => {
      s.style.borderTop = "";
      s.style.borderBottom = "";
    });

    if (dropTarget && dropTarget.row !== sourceRow) {
      const tbody = sourceRow.parentElement!;
      const handleRow = findHandleRow(sourceRow);

      if (dropTarget.position === "before") {
        // Insert handle + source BEFORE the target
        if (handleRow) tbody.insertBefore(handleRow, dropTarget.row);
        tbody.insertBefore(sourceRow, dropTarget.row);
      } else {
        // Insert handle + source AFTER the target
        const ref = dropTarget.row.nextSibling;
        if (handleRow) tbody.insertBefore(handleRow, ref);
        tbody.insertBefore(sourceRow, ref);
      }

      // Serialize clean HTML and fire callback
      onReorder(serializeCleanHtml(doc));
    }

    drag = null;
    dropTarget = null;
  };

  doc.addEventListener("mousedown", onMouseDown);
  doc.addEventListener("mousemove", onMouseMove);
  doc.addEventListener("mouseup", onMouseUp);

  return () => {
    doc.removeEventListener("mousedown", onMouseDown);
    doc.removeEventListener("mousemove", onMouseMove);
    doc.removeEventListener("mouseup", onMouseUp);
  };
}

// ─── Serialization ───────────────────────────────────────────

/**
 * Serialize the iframe document back to clean HTML,
 * stripping all injected overlays.
 */
export function serializeCleanHtml(doc: Document): string {
  const clone = doc.documentElement.cloneNode(true) as HTMLElement;

  // Remove injected elements
  clone
    .querySelectorAll("[data-block-label],[data-drag-handle]")
    .forEach((el) => el.remove());

  // Clean up draggable row attributes and restore original styles
  clone.querySelectorAll("[data-draggable-row]").forEach((el) => {
    el.removeAttribute("data-draggable-row");
    // Remove the outline styles we added, keep any original styles
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
