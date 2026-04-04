import type { ScriptingEngine } from "@/types/brand";

/**
 * Best-effort dynamic tag replacement for test sends.
 * Replaces personalization tags with test user data.
 * NOT a full ESP parser — handles common patterns only.
 */
export function renderForTestUser(
  html: string,
  engine: ScriptingEngine,
  userData: Record<string, string>
): string {
  let rendered = html;

  switch (engine) {
    case "ampscript":
      // Replace %%=v(@field)=%% patterns
      rendered = rendered.replace(
        /%%=v\(@(\w+)\)=%%/g,
        (_, field) => userData[field] || userData[field.toLowerCase()] || ""
      );
      // Simple IF/THEN/ELSE/ENDIF
      rendered = resolveConditionals(
        rendered,
        userData,
        /%%\[\s*IF\s+@(\w+)\s*==\s*"([^"]*?)"\s*THEN\s*\]%%([\s\S]*?)(?:%%\[\s*ELSE\s*\]%%([\s\S]*?))?%%\[\s*ENDIF\s*\]%%/gi
      );
      break;

    case "liquid":
      // Replace {{ subscriber.field }} and {{ event.field }}
      rendered = rendered.replace(
        /\{\{\s*(?:subscriber|event|user)\.(\w+)(?:\s*\|\s*default:\s*"([^"]*)")?\s*\}\}/g,
        (_, field, fallback) =>
          userData[field] || userData[field.toLowerCase()] || fallback || ""
      );
      // Simple if/else/endif
      rendered = resolveConditionals(
        rendered,
        userData,
        /\{%\s*if\s+(?:subscriber|user)\.(\w+)\s*==\s*"([^"]*?)"\s*%\}([\s\S]*?)(?:\{%\s*else\s*%\}([\s\S]*?))?\{%\s*endif\s*%\}/gi
      );
      break;

    case "handlebars":
      // Replace {{field}}
      rendered = rendered.replace(
        /\{\{(\w+)\}\}/g,
        (match, field) => {
          if (["#if", "/if", "#each", "/each", "else", "#unless", "/unless"].some(k => field.startsWith(k))) return match;
          return userData[field] || userData[field.toLowerCase()] || "";
        }
      );
      // {{#if field}}...{{else}}...{{/if}}
      rendered = rendered.replace(
        /\{\{#if\s+(\w+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/gi,
        (_, field, ifBlock, elseBlock) => {
          const val = userData[field] || userData[field.toLowerCase()];
          return val ? ifBlock : (elseBlock || "");
        }
      );
      break;

    case "jinja":
      // Replace {{ field }}
      rendered = rendered.replace(
        /\{\{\s*(\w+)(?:\s*\|\s*default\("([^"]*)"\))?\s*\}\}/g,
        (_, field, fallback) =>
          userData[field] || userData[field.toLowerCase()] || fallback || ""
      );
      // {% if field == "value" %}...{% else %}...{% endif %}
      rendered = resolveConditionals(
        rendered,
        userData,
        /\{%\s*if\s+(\w+)\s*==\s*"([^"]*?)"\s*%\}([\s\S]*?)(?:\{%\s*else\s*%\}([\s\S]*?))?\{%\s*endif\s*%\}/gi
      );
      break;

    case "merge_tags":
      // Replace *|FIELD|*
      rendered = rendered.replace(
        /\*\|(\w+)\|(?:([^*]*))?\*/g,
        (_, field, fallback) =>
          userData[field] ||
          userData[field.toLowerCase()] ||
          fallback ||
          ""
      );
      break;

    case "vtl":
      // Replace ${field}
      rendered = rendered.replace(
        /\$\{(\w+)\}/g,
        (_, field) => userData[field] || userData[field.toLowerCase()] || ""
      );
      // #if($field == "value")...#else...#end
      rendered = resolveConditionals(
        rendered,
        userData,
        /#if\s*\(\$(\w+)\s*==\s*"([^"]*?)"\)([\s\S]*?)(?:#else([\s\S]*?))?#end/gi
      );
      break;

    case "none":
    default:
      break;
  }

  return rendered;
}

function resolveConditionals(
  html: string,
  userData: Record<string, string>,
  pattern: RegExp
): string {
  return html.replace(pattern, (_, field, value, ifBlock, elseBlock) => {
    const userVal = userData[field] || userData[field.toLowerCase()] || "";
    if (userVal.toLowerCase() === value.toLowerCase()) {
      return ifBlock || "";
    }
    return elseBlock || "";
  });
}
