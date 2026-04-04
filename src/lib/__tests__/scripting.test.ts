import { describe, it, expect } from "vitest";
import { renderForTestUser } from "@/lib/email/scripting";

const userData = {
  FirstName: "Jane",
  LastName: "Doe",
  Email: "jane@example.com",
  City: "NYC",
  Status: "VIP",
};

describe("renderForTestUser", () => {
  describe("AMPscript", () => {
    it("replaces %%=v(@field)=%% tags", () => {
      const html = "Hello %%=v(@FirstName)=%%!";
      expect(renderForTestUser(html, "ampscript", userData)).toBe("Hello Jane!");
    });

    it("resolves IF/THEN/ELSE conditionals", () => {
      const html =
        '%%[IF @Status == "VIP" THEN]%%Welcome back, VIP!%%[ELSE]%%Welcome!%%[ENDIF]%%';
      expect(renderForTestUser(html, "ampscript", userData)).toBe(
        "Welcome back, VIP!"
      );
    });

    it("returns ELSE block when condition is false", () => {
      const html =
        '%%[IF @Status == "Standard" THEN]%%Standard%%[ELSE]%%Other%%[ENDIF]%%';
      expect(renderForTestUser(html, "ampscript", userData)).toBe("Other");
    });
  });

  describe("Liquid", () => {
    it("replaces {{ subscriber.field }} tags", () => {
      const html = "Hi {{ subscriber.FirstName }}!";
      expect(renderForTestUser(html, "liquid", userData)).toBe("Hi Jane!");
    });

    it("uses default value when field is missing", () => {
      const html = '{{ subscriber.Company | default: "Friend" }}';
      expect(renderForTestUser(html, "liquid", userData)).toBe("Friend");
    });
  });

  describe("Handlebars", () => {
    it("replaces {{field}} tags", () => {
      const html = "Dear {{FirstName}} {{LastName}},";
      expect(renderForTestUser(html, "handlebars", userData)).toBe(
        "Dear Jane Doe,"
      );
    });

    it("resolves {{#if}} blocks", () => {
      const html = "{{#if City}}In {{City}}{{else}}Location unknown{{/if}}";
      expect(renderForTestUser(html, "handlebars", userData)).toBe("In NYC");
    });

    it("uses else block when field is missing", () => {
      const html = "{{#if Company}}{{Company}}{{else}}No company{{/if}}";
      expect(renderForTestUser(html, "handlebars", userData)).toBe("No company");
    });
  });

  describe("Jinja", () => {
    it("replaces {{ field }} tags", () => {
      const html = "Hello {{ FirstName }}!";
      expect(renderForTestUser(html, "jinja", userData)).toBe("Hello Jane!");
    });

    it("uses default filter", () => {
      const html = '{{ Company | default("Valued Customer") }}';
      expect(renderForTestUser(html, "jinja", userData)).toBe("Valued Customer");
    });
  });

  describe("Merge tags", () => {
    it("replaces *|FIELD|* tags", () => {
      const html = "Hi *|FirstName|*!";
      expect(renderForTestUser(html, "merge_tags", userData)).toBe("Hi Jane!");
    });
  });

  describe("VTL", () => {
    it("replaces ${field} tags", () => {
      const html = "Hello ${FirstName}!";
      expect(renderForTestUser(html, "vtl", userData)).toBe("Hello Jane!");
    });

    it("resolves #if conditionals", () => {
      const html = '#if($Status == "VIP")VIP!#else Regular#end';
      expect(renderForTestUser(html, "vtl", userData)).toBe("VIP!");
    });
  });

  describe("none", () => {
    it("returns HTML unchanged", () => {
      const html = "<div>No scripting</div>";
      expect(renderForTestUser(html, "none", userData)).toBe(html);
    });
  });
});
