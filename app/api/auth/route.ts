import { NextRequest, NextResponse } from "next/server";
import { getInstallUrl } from "@/lib/shopify";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const shop = req.nextUrl.searchParams.get("shop");
  if (!shop) {
    return NextResponse.json({ error: "Missing shop parameter" }, { status: 400 });
  }

  const state = crypto.randomBytes(16).toString("hex");
  const installUrl = getInstallUrl(shop, state);

  // OAuth grant screen cannot render inside Shopify's iframe. We must break
  // out to the top-level window. Return HTML that does a top-level redirect
  // (works whether we're in an iframe or not).
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
  <script>
    (function() {
      var url = ${JSON.stringify(installUrl)};
      if (window.top === window.self) {
        window.location.href = url;
      } else {
        // Break out of the Shopify iframe to show the OAuth grant screen
        window.top.location.href = url;
      }
    })();
  </script>
  <p style="font-family:sans-serif;padding:20px;color:#666;">Redirecting to install…</p>
</body>
</html>`;

  const res = new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });
  res.cookies.set("shopify_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "none", // required for cookie to survive the iframe→top redirect
    maxAge: 60 * 10,
  });
  return res;
}
