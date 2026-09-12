import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import path from "path";

/**
 * The widgets page must describe the widgets that actually exist.
 *
 * It is a hand-written list beside a directory of Liquid blocks, which is
 * exactly the shape of thing that drifts: someone adds a twelfth block and the
 * gallery silently keeps advertising eleven, or a block is renamed and the
 * page tells merchants to look for a name the theme editor no longer shows.
 * Both failures are invisible in the admin and only surface as a support
 * message from a merchant who cannot find the block.
 */

const repoRoot = path.resolve(__dirname, "..");
const read = (rel: string) => readFileSync(path.join(repoRoot, rel), "utf8");
const gallery = read("components/WidgetGallery.tsx");
const blocksDir = path.join(repoRoot, "extensions/rivu-reviews/blocks");

/** Every block's `"name"`, exactly as the theme editor lists it. */
function blockNames(): { file: string; name: string }[] {
  return readdirSync(blocksDir)
    .filter((f) => f.endsWith(".liquid"))
    .map((file) => {
      const src = readFileSync(path.join(blocksDir, file), "utf8");
      const match = src.match(/"name"\s*:\s*"([^"]+)"/);
      if (!match) throw new Error(`${file} has no schema name`);
      return { file, name: match[1] };
    });
}

describe("the gallery matches the blocks that ship", () => {
  it("names every block, spelled the way the theme editor spells it", () => {
    // The card tells the merchant "Add block → Apps → <name>". If that string
    // is not character-for-character what Shopify shows, the instruction is
    // worse than none.
    // Unquoted: the embed's name is JSX text in its own row, the rest are
    // string literals in the list. Both have to be present and spelled right.
    for (const { file, name } of blockNames()) {
      expect(gallery, `${file} (${name}) is missing from the gallery`).toContain(name);
    }
  });

  it("advertises no block that does not exist", () => {
    const real = new Set(blockNames().map((b) => b.name));
    const advertised = [...gallery.matchAll(/blockName:\s*"([^"]+)"/g)].map((m) => m[1]);
    expect(advertised.length).toBeGreaterThan(0);
    for (const name of advertised) {
      expect(real, `gallery offers "${name}", which has no block`).toContain(name);
    }
  });

  it("covers every section block, and leaves the embed out of the grid", () => {
    // The embed is not something a merchant places on a page — it is the
    // prerequisite, and it has its own row above the grid.
    const all = blockNames();
    const sections = all.filter((b) => b.file !== "app-embed.liquid");
    const advertised = [...gallery.matchAll(/blockName:\s*"([^"]+)"/g)].map((m) => m[1]);
    expect(advertised.sort()).toEqual(sections.map((b) => b.name).sort());
    expect(advertised).not.toContain("Rivu App Embed");
  });

  it("draws a preview for every widget it lists", () => {
    // PREVIEWS is typed against the widget keys, so a missing one is a
    // compile error — this checks the previews are real components rather
    // than the same placeholder repeated.
    const widgets = [...gallery.matchAll(/blockName:\s*"/g)];
    const previews = new Set(
      [...gallery.matchAll(/<(Preview\w+) \/>/g)].map((m) => m[1])
    );
    expect(widgets).toHaveLength(10);
    // One per widget, plus the embed's own row above the grid.
    expect(previews.size).toBe(widgets.length + 1);
    expect(previews).toContain("PreviewAppEmbed");
  });
});

describe("the Pro gate", () => {
  it("marks the photo gallery Pro, matching what the script enforces", () => {
    // rivu-showcase.js refuses the gallery layout below Pro. A card that does
    // not say so sells a widget that renders an upgrade notice instead.
    const showcase = read("public/rivu-showcase.js");
    expect(showcase).toContain('opts.layout === "gallery" && plan !== "pro"');

    const galleryCard = gallery.slice(
      gallery.indexOf('key: "photo-gallery"'),
      gallery.indexOf('key: "trust-badge"')
    );
    expect(galleryCard).toContain("pro: true");
  });

  it("marks nothing else Pro, since every other block works free", () => {
    expect([...gallery.matchAll(/pro:\s*true/g)]).toHaveLength(1);
  });
});

describe("the links go somewhere real", () => {
  it("opens the theme editor rather than a deep link built on the extension uid", () => {
    // The uid in shopify.extension.toml is malformed — the final segment is
    // twenty characters where Shopify expects twelve — so an addAppBlockId
    // deep link would resolve to nothing and drop the merchant into an editor
    // with no explanation. Revisit this when the uid is fixed.
    const uid = read("extensions/rivu-reviews/shopify.extension.toml").match(
      /uid\s*=\s*"([^"]+)"/
    )?.[1];
    expect(uid).toBeTruthy();
    const malformed = !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(uid!);
    expect(malformed, "uid is valid now — addAppBlockId deep links are worth adding").toBe(true);
    // The parameter, not the word — it is named in the comment explaining why
    // it is not used.
    expect(gallery).not.toContain("addAppBlockId=");
  });

  it("targets the theme editor with `_top`, since the admin runs us in an iframe", () => {
    // Without target="_top" the theme editor loads inside Rivu's iframe and
    // Shopify's frame-ancestors policy blanks it.
    expect(gallery).toContain('target="_top"');
  });
});
