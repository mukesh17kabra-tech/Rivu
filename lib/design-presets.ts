import { CUSTOM_SCOPE_CLASS } from "./widget-css";

/**
 * Ready-made layouts for the Pro custom builder.
 *
 * A blank HTML box plus a blank CSS box is not a feature a merchant can use —
 * the original starter template referenced classes like `.rivu-heading` that
 * nothing defined, so it rendered unstyled and looked broken. Each preset here
 * is a matched pair: markup and the stylesheet that makes it look finished.
 *
 * Every selector is written *without* the scope prefix; prepareCustomCss adds
 * it on save. Presets stay editable — they're a starting point, not a theme.
 */

export type DesignPreset = {
  key: string;
  label: string;
  description: string;
  html: string;
  css: string;
};

export const DESIGN_PRESETS: DesignPreset[] = [
  {
    key: "editorial",
    label: "Editorial",
    description: "Large score, generous space, thin rules. Suits fashion and lifestyle.",
    html: `<div class="rv-ed">
  <p class="rv-ed-label">{{title}}</p>

  <div class="rv-ed-head">
    <span class="rv-ed-score">{{average}}</span>
    <div class="rv-ed-meta">
      {{stars}}
      <span class="rv-ed-count">{{count}}</span>
    </div>
    <div class="rv-ed-cta">{{write_button}}</div>
  </div>

  {{review_list}}
</div>`,
    css: `.rv-ed {
  font-family: inherit;
}
.rv-ed-label {
  margin: 0 0 22px;
  font-size: 11px;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: #9a9aa2;
}
.rv-ed-head {
  display: flex;
  align-items: center;
  gap: 22px;
  flex-wrap: wrap;
  padding-bottom: 26px;
  border-bottom: 1px solid #e8e8ec;
  margin-bottom: 26px;
}
.rv-ed-score {
  font-size: 62px;
  font-weight: 300;
  line-height: 1;
  letter-spacing: -.04em;
}
.rv-ed-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.rv-ed-count {
  font-size: 13px;
  color: #8a8a94;
}
.rv-ed-cta {
  margin-left: auto;
}`,
  },
  {
    key: "card-split",
    label: "Card split",
    description: "Tinted panel with the score, bars alongside. Familiar from large retailers.",
    html: `<div class="rv-sp">
  <div class="rv-sp-panel">
    <span class="rv-sp-score">{{average}}</span>
    {{stars}}
    <span class="rv-sp-count">{{count}}</span>
    {{write_button}}
  </div>

  <div class="rv-sp-bars">
    <p class="rv-sp-title">{{title}}</p>
    {{breakdown}}
  </div>
</div>

{{review_list}}`,
    css: `.rv-sp {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
  border: 1px solid #e6e6eb;
  border-radius: 14px;
  overflow: hidden;
  margin-bottom: 28px;
}
.rv-sp-panel {
  flex: 0 0 240px;
  min-width: 200px;
  padding: 28px 24px;
  background: #f7f7f9;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
}
.rv-sp-score {
  font-size: 46px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -.03em;
}
.rv-sp-count {
  font-size: 13px;
  color: #82828e;
  margin-bottom: 4px;
}
.rv-sp-bars {
  flex: 1;
  min-width: 260px;
  padding: 28px 26px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.rv-sp-title {
  margin: 0 0 16px;
  font-size: 15px;
  font-weight: 700;
}
@media (max-width: 640px) {
  .rv-sp-panel { flex: 1 1 100%; }
}`,
  },
  {
    key: "compact-bar",
    label: "Compact bar",
    description: "One slim row above the reviews. Best when space is tight.",
    html: `<div class="rv-cb">
  <div class="rv-cb-left">
    <span class="rv-cb-score">{{average}}</span>
    {{stars}}
    <span class="rv-cb-count">{{count}}</span>
  </div>
  {{write_button}}
</div>

{{review_list}}`,
    css: `.rv-cb {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 14px;
  padding: 14px 18px;
  background: #f7f7f9;
  border-radius: 10px;
  margin-bottom: 22px;
}
.rv-cb-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.rv-cb-score {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -.02em;
}
.rv-cb-count {
  font-size: 13px;
  color: #82828e;
}`,
  },
];

/** Documentation shown above the CSS field. */
export const CSS_SCOPE_NOTE =
  `Every selector you write is automatically limited to the review widget, so ` +
  `it can't affect the rest of your store. Writing "body" or ":root" targets ` +
  `the widget itself. Rules are applied inside .${CUSTOM_SCOPE_CLASS}.`;
