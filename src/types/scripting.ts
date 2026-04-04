import type { ScriptingEngine } from "./brand";

export interface ScriptingEngineDef {
  id: ScriptingEngine;
  name: string;
  description: string;
  personalization: string;
  conditional: string;
  loop: string;
  fallback: string;
}

export const SCRIPTING_ENGINES: Record<string, ScriptingEngineDef> = {
  ampscript: {
    id: "ampscript",
    name: "AMPscript",
    description: "Salesforce Marketing Cloud",
    personalization: '%%=v(@firstName)=%%\n%%=Lookup("DataExtension","FieldName","Key","Value")=%%',
    conditional:
      '%%[ IF @tier == "VIP" THEN ]%%\n  <p>VIP Content Here</p>\n%%[ ELSE ]%%\n  <p>Standard Content Here</p>\n%%[ ENDIF ]%%',
    loop: '%%[ SET @rows = LookupRows("Products","Category","Featured")\nSET @rowCount = RowCount(@rows)\nIF @rowCount > 0 THEN\n  FOR @i = 1 TO @rowCount DO\n    SET @row = Row(@rows, @i)\n    SET @productName = Field(@row, "Name") ]%%\n    <p>%%=v(@productName)=%%</p>\n%%[ NEXT @i\nENDIF ]%%',
    fallback:
      '%%[ IF Empty(@firstName) THEN SET @firstName = "Friend" ENDIF ]%%',
  },
  liquid: {
    id: "liquid",
    name: "Liquid",
    description: "Shopify, Braze, HubSpot",
    personalization:
      "{{ subscriber.first_name }}\n{{ event.product_name }}",
    conditional:
      '{% if subscriber.tier == "VIP" %}\n  <p>VIP Content Here</p>\n{% else %}\n  <p>Standard Content Here</p>\n{% endif %}',
    loop: "{% for product in event.products %}\n  <p>{{ product.name }} - {{ product.price }}</p>\n{% endfor %}",
    fallback:
      '{{ subscriber.first_name | default: "Friend" }}',
  },
  handlebars: {
    id: "handlebars",
    name: "Handlebars",
    description: "Mandrill, Mailchimp Transactional",
    personalization: "{{firstName}}\n{{order.total}}",
    conditional:
      '{{#if isVIP}}\n  <p>VIP Content Here</p>\n{{else}}\n  <p>Standard Content Here</p>\n{{/if}}',
    loop: "{{#each products}}\n  <p>{{this.name}} - {{this.price}}</p>\n{{/each}}",
    fallback: "{{#if firstName}}{{firstName}}{{else}}Friend{{/if}}",
  },
  jinja: {
    id: "jinja",
    name: "Jinja2",
    description: "Python-based ESPs",
    personalization:
      "{{ first_name }}\n{{ order.total }}",
    conditional:
      '{% if tier == "VIP" %}\n  <p>VIP Content Here</p>\n{% else %}\n  <p>Standard Content Here</p>\n{% endif %}',
    loop: "{% for product in products %}\n  <p>{{ product.name }} - {{ product.price }}</p>\n{% endfor %}",
    fallback: '{{ first_name | default("Friend") }}',
  },
  merge_tags: {
    id: "merge_tags",
    name: "Merge Tags",
    description: "Mailchimp",
    personalization: "*|FNAME|*\n*|ORDER_TOTAL|*",
    conditional:
      '*|IF:FNAME|*\n  <p>Hi *|FNAME|*!</p>\n*|ELSE:|*\n  <p>Hi Friend!</p>\n*|END:IF|*',
    loop: "*|PRODUCT:LOOP|*\n  <p>*|PRODUCT:NAME|* - *|PRODUCT:PRICE|*</p>\n*|END:PRODUCT:LOOP|*",
    fallback: "*|FNAME|Friend|*",
  },
  vtl: {
    id: "vtl",
    name: "VTL / Velocity",
    description: "Oracle, Responsys",
    personalization:
      "${firstName}\n${order.total}",
    conditional:
      '#if($tier == "VIP")\n  <p>VIP Content Here</p>\n#else\n  <p>Standard Content Here</p>\n#end',
    loop: "#foreach($product in $products)\n  <p>${product.name} - ${product.price}</p>\n#end",
    fallback:
      '#if($firstName && $firstName != "")\n  ${firstName}\n#else\n  Friend\n#end',
  },
};
