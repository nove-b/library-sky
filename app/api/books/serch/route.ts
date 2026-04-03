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
  page?: number;
  pageCount?: number;
}

async function fetchFromRakuten(
  searchField: "title" | "keyword",
  query: string,
  page: number,
  author?: string,
  publisher?: string
): Promise<RakutenBooksResponse> {
  const params = new URLSearchParams({
    applicationId: RAKUTEN_APP_ID || "",
    accessKey: RAKUTEN_ACCESS_KEY || "",
    [searchField]: query,
    hits: "20",
    page: String(page),
    format: "json",
  });

  if (author) params.set("author", author);
  if (publisher) params.set("publisherName", publisher);

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

  return response.json() as Promise<RakutenBooksResponse>;
}

async function searchBooksOnRakuten(query: string, page = 1, author?: string, publisher?: string) {
  // title検索
  const data = await fetchFromRakuten("title", query, page, author, publisher);

  if ((data.Items ?? []).length > 0) {
    return parseRakutenBooksResponse(data, page, false);
  }

  // 0件のときだけキーワード曖昧検索フォールバック
  const fuzzyData = await fetchFromRakuten("keyword", query, page, author, publisher);
  return parseRakutenBooksResponse(fuzzyData, page, true);
}

function parseRakutenBooksResponse(data: RakutenBooksResponse, page: number, isFuzzy: boolean) {
  const sourceItems = data.Items ?? [];
  const pageCount = data.pageCount ?? 1;

  const sanitizeImageUrl = (url: string) => url.replace(/\?_ex=\d+x\d+$/, "");

  const items = sourceItems.map((entry, index) => {
    const item = entry.Item;

    const title = item.title || "Unknown";
    const author = item.author || "Unknown";
    const asin = item.isbn || `rakuten-books-${index}`;
    const affiliateUrl = item.affiliateUrl || item.itemUrl || "";
    const publisher = item.publisherName || "";

    const imageUrl = sanitizeImageUrl(
      item.largeImageUrl || item.mediumImageUrl || item.smallImageUrl || ""
    );

    const price = item.itemPrice
      ? `¥${item.itemPrice.toLocaleString("ja-JP")}`
      : "";

    return { title, asin, price, imageUrl, author, affiliateUrl, publisher };
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
    currentPage: page,
    hasMore: page < pageCount,
    isFuzzy,
  };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("query");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const fuzzy = searchParams.get("fuzzy") === "1";
  const filterAuthor = searchParams.get("author")?.trim() || undefined;
  const filterPublisher = searchParams.get("publisher")?.trim() || undefined;

  if (!query) {
    return NextResponse.json(
      { error: "query parameter is required" },
      { status: 400 }
    );
  }

  try {
    let results;
    if (fuzzy) {
      // フロントから明示的なページネーション
      const data = await fetchFromRakuten("keyword", query, page, filterAuthor, filterPublisher);
      results = parseRakutenBooksResponse(data, page, true);
    } else {
      results = await searchBooksOnRakuten(query, page, filterAuthor, filterPublisher);
    }
    return NextResponse.json(results);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "楽天ブックスAPIからの取得に失敗しました。";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
