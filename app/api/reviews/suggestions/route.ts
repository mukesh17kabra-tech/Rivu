import { NextRequest, NextResponse } from "next/server";
import { getSuggestions } from "@/lib/review-suggestions";

function withCors(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  return res;
}

export async function GET(req: NextRequest) {
  const rating = Number(req.nextUrl.searchParams.get("rating"));
  const productTitle = req.nextUrl.searchParams.get("productTitle") || "this product";

  if (!rating || rating < 1 || rating > 5) {
    return withCors(NextResponse.json({ error: "Invalid rating" }, { status: 400 }));
  }

  const suggestions = getSuggestions(rating, productTitle);
  return withCors(NextResponse.json({ suggestions }));
}
