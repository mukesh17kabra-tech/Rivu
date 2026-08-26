import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

/**
 * The Shopify CLI version is part of the build, not an incidental detail.
 *
 * `npx shopify app deploy` with nothing pinned downloads whatever is newest.
 * Shopify released CLI 4.x, npx started fetching it, and deploy began failing
 * with "At least one specification (.toml OR .json) file is required" — on a
 * repository where nothing had changed. A build that depends on what the
 * registry served that morning is not reproducible.
 */

const repoRoot = path.resolve(__dirname, "..");
const pkg = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8"));

describe("the Shopify CLI is pinned", () => {
  it("is a devDependency, so npx resolves it locally", () => {
    const version = pkg.devDependencies?.["@shopify/cli"];
    expect(version, "@shopify/cli is not in devDependencies").toBeTruthy();
  });

  it("is pinned exactly, with no range", () => {
    // "^3.94.3" would float to 4.x on the next clean install and reintroduce
    // exactly the failure this pin exists to stop.
    const version = pkg.devDependencies["@shopify/cli"] as string;
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("stays on the major version this extension deploys with", () => {
    // Moving to 4.x is a deliberate migration, not an install-time accident:
    // it rejects this extension's configuration, which needs fixing first.
    const version = pkg.devDependencies["@shopify/cli"] as string;
    expect(version.startsWith("3.")).toBe(true);
  });

  it("has a deploy script, so the pinned binary is the one that runs", () => {
    // `npx shopify app deploy` typed by hand can still miss the local copy in
    // some shells; an npm script cannot.
    expect(pkg.scripts?.deploy).toBe("shopify app deploy");
  });
});

describe("the theme extension configuration", () => {
  const toml = readFileSync(
    path.join(repoRoot, "extensions/rivu-reviews/shopify.extension.toml"),
    "utf8"
  );

  it("declares a name and a type", () => {
    expect(toml).toMatch(/name\s*=/);
    expect(toml).toMatch(/type\s*=\s*"theme"/);
  });

  /**
   * Documents a known defect rather than asserting it is fixed.
   *
   * The uid's last group is 20 hex characters where a UUID has 12. CLI 3.x
   * accepts it, 4.x does not. It is left alone on purpose: the uid is how
   * Shopify identifies this extension, and changing it on a published app
   * risks registering a new extension and orphaning the one merchants already
   * have installed. That migration needs to be done deliberately, verified
   * against a test app first — not as a side effect of unblocking a deploy.
   */
  it("has the malformed uid this pin exists to work around", () => {
    const uid = toml.match(/uid\s*=\s*"([^"]+)"/)?.[1];
    expect(uid, "no uid in the extension toml").toBeTruthy();

    const isValidUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(uid!);

    // When this starts failing, the uid has been corrected — at which point
    // the CLI pin can be revisited and this test replaced with the opposite
    // assertion.
    expect(
      isValidUuid,
      "uid now looks valid — revisit the CLI 3.x pin and update this test"
    ).toBe(false);
  });
});
