import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RAKUTEN_APP_ID = process.env.RAKUTEN_APP_ID;
const RAKUTEN_ACCESS_KEY = process.env.RAKUTEN_ACCESS_KEY;
const RAKUTEN_AFFILIATE_ID = process.env.RAKUTEN_AFFILIATE_ID;
const RAKUTEN_BOOKS_ENDPOINT =
  "https://openapi.rakuten.co.jp/services/api/BooksBook/Search/20170404";

interface RakutenBookItem {
  title?: string;
  author?: string;
  isbn?: string;
  largeImageUrl?: string;
  mediumImageUrl?: string;
  smallImageUrl?: string;
  itemUrl?: string;
  affiliateUrl?: string;
  itemPrice?: number;
  publisherName?: string;
}

interface RakutenBooksResponse {
  Items?: Array<{ Item: RakutenBookItem }>;
  count?: number;
  hits?: number;
}

async function searchBooksOnRakuten(query: string) {
  const params = new URLSearchParams({
    applicationId: RAKUTEN_APP_ID || "",
    accessKey: RAKUTEN_ACCESS_KEY || "",
    title: query,
    hits: "20",
    format: "json",
  });

  if (RAKUTEN_AFFILIATE_ID) {
    params.set("affiliateId", RAKUTEN_AFFILIATE_ID);
  }

  const rakutenOrigin = "https://library-sky.com";

  const response = await fetch(
    `${RAKUTEN_BOOKS_ENDPOINT}?${params.toString()}`,
    {
      headers: {
        Origin: rakutenOrigin,
        Referer: `${rakutenOrigin}/`,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `楽天ブックスAPI responded with status ${response.status}: ${errorText}`
    );
  }

  const data: RakutenBooksResponse = await response.json();
  return parseRakutenBooksResponse(data);
}

function parseRakutenBooksResponse(data: RakutenBooksResponse) {
  const sourceItems = data.Items ?? [];

  const sanitizeImageUrl = (url: string) => url.replace(/\?_ex=\d+x\d+$/, "");

  const items = sourceItems.map((entry, index) => {
    const item = entry.Item;

    const title = item.title || "Unknown";
    const author = item.author || "Unknown";
    const asin = item.isbn || `rakuten-books-${index}`;
    const affiliateUrl = item.affiliateUrl || item.itemUrl || "";

    const imageUrl = sanitizeImageUrl(
      item.largeImageUrl || item.mediumImageUrl || item.smallImageUrl || ""
    );

    const price = item.itemPrice
      ? `¥${item.itemPrice.toLocaleString("ja-JP")}`
      : "";

    return { title, asin, price, imageUrl, author, affiliateUrl };
  });

  // タイトルを正規化（句読点と余白を削除）して重複判定
  const normalizeTitle = (t: string) =>
    t.replace(/[！!?？\s　]/g, "").toLowerCase();

  const seen = new Set<string>();
  const dedupedItems: typeof items = [];
  for (const item of items) {
    const normalized = normalizeTitle(item.title);
    if (!seen.has(normalized)) {
      seen.add(normalized);
      dedupedItems.push(item);
    }
  }

  return {
    success: dedupedItems.length > 0,
    count: dedupedItems.length,
    items: dedupedItems,
  };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("query");

  if (!query) {
    return NextResponse.json(
      { error: "query parameter is required" },
      { status: 400 }
    );
  }

  try {
    const results = await searchBooksOnRakuten(query);
    return NextResponse.json(results);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "楽天ブックスAPIからの取得に失敗しました。";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
