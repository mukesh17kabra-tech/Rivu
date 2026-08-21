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
 *
 * IMPORTANT: {{stars}} and {{breakdown}} each expand to *several sibling
 * elements*, not one — five <svg>s and five bar rows respectively. Dropping
 * either straight into a flex container makes every star its own flex item, so
 * the rating renders as a vertical column of stars. Both must sit inside a
 * wrapper element that the stylesheet controls. {{write_button}} is a single
 * <button> and needs no wrapper.
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
      <span class="rv-ed-stars">{{stars}}</span>
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
  align-items: flex-start;
  gap: 7px;
}
/* {{stars}} is five separate <svg>s — without this wrapper the column above
   would stack them one per row instead of laying them out side by side. */
.rv-ed-stars {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.rv-ed-count {
  font-size: 13px;
  color: #8a8a94;
}
.rv-ed-cta {
  margin-left: auto;
}

/* Review list: no boxes at all. Reviews are separated by a hairline rule and
   the name sits above the text, like a magazine's letters page. */
.rv-card {
  background: none;
  border: none;
  border-radius: 0;
  box-shadow: none;
  padding: 26px 0;
  border-bottom: 1px solid #eeeef1;
}
.rv-card-inner {
  display: block;
}
.rv-card-avatar {
  display: none;
}
.rv-card-author {
  font-size: 13px;
  letter-spacing: .04em;
  text-transform: uppercase;
}
.rv-card-title {
  font-size: 19px;
  font-style: normal;
  font-weight: 400;
  letter-spacing: -.01em;
  margin: 10px 0 8px;
}
.rv-card-body {
  font-size: 15px;
  line-height: 1.75;
  max-width: 62ch;
}
@media (max-width: 560px) {
  .rv-ed-score { font-size: 48px; }
  .rv-ed-cta { margin-left: 0; flex-basis: 100%; }
}`,
  },
  {
    key: "card-split",
    label: "Card split",
    description: "Tinted panel with the score, bars alongside. Familiar from large retailers.",
    html: `<div class="rv-sp">
  <div class="rv-sp-panel">
    <span class="rv-sp-score">{{average}}</span>
    <span class="rv-sp-stars">{{stars}}</span>
    <span class="rv-sp-count">{{count}}</span>
    {{write_button}}
  </div>

  <div class="rv-sp-bars">
    <p class="rv-sp-title">{{title}}</p>
    <div class="rv-sp-breakdown">{{breakdown}}</div>
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
/* The panel is a flex column, so the five star <svg>s need their own row. */
.rv-sp-stars {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.rv-sp-count {
  font-size: 13px;
  color: #82828e;
  margin-bottom: 4px;
}
.rv-sp-breakdown {
  display: block;
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

/* Review list: two columns of soft cards, so it reads as a grid rather than a
   single stack. .rv-list is the widget's own container; CSS columns keep cards
   of different heights from leaving gaps the way a fixed grid would. */
.rv-list {
  display: block;
  gap: 0;
}
.rv-card {
  border: 1px solid #ececf1;
  border-radius: 12px;
  box-shadow: none;
  padding: 20px;
  margin-bottom: 16px;
  break-inside: avoid;
}
.rv-card-author {
  font-size: 13px;
}
.rv-card-title {
  font-style: normal;
  font-size: 15px;
}
.rv-avatar {
  width: 34px;
  height: 34px;
  font-size: 12px;
}

@media (min-width: 860px) {
  .rv-list {
    column-count: 2;
    column-gap: 16px;
  }
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
    <span class="rv-cb-stars">{{stars}}</span>
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
/* Without the wrapper the row's 10px gap would land between every star. */
.rv-cb-stars {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

/* Review list: dense rows with a coloured spine instead of cards, so a long
   list stays scannable rather than turning into a wall of boxes. */
.rv-list {
  gap: 0;
}
.rv-card {
  background: none;
  border: none;
  border-left: 3px solid #ececf1;
  border-radius: 0;
  box-shadow: none;
  padding: 14px 0 14px 16px;
  margin-bottom: 4px;
  transition: border-color .15s;
}
.rv-card:hover {
  border-left-color: #c9c9d2;
}
.rv-card-inner {
  gap: 10px;
}
.rv-avatar {
  width: 28px;
  height: 28px;
  font-size: 11px;
}
.rv-card-title {
  font-style: normal;
  font-size: 14px;
  margin-bottom: 4px;
}
.rv-card-body {
  font-size: 13px;
  line-height: 1.6;
}
.rv-card-stars {
  margin-bottom: 6px;
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
