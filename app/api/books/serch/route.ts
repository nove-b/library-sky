import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GOOGLE_BOOKS_API_KEY = process.env.GOOGLE_BOOKS_API_KEY;
const GOOGLE_BOOKS_ENDPOINT = "https://www.googleapis.com/books/v1/volumes";

interface GoogleBooksVolumeInfo {
  title?: string;
  authors?: string[];
  publishedDate?: string;
  imageLinks?: {
    thumbnail?: string;
    smallThumbnail?: string;
  };
  industryIdentifiers?: Array<{
    type: string;
    identifier: string;
  }>;
  infoLink?: string;
}

interface GoogleBooksSaleInfo {
  listPrice?: {
    amount?: number;
    currencyCode?: string;
  };
}

interface GoogleBooksItem {
  id?: string;
  volumeInfo?: GoogleBooksVolumeInfo;
  saleInfo?: GoogleBooksSaleInfo;
}

interface GoogleBooksResponse {
  items?: GoogleBooksItem[];
}

async function searchBooksOnGoogle(query: string) {
  // タイトルに特化した検索クエリを作成
  const searchQuery = `intitle:${query}`;

  const params = new URLSearchParams({
    q: searchQuery,
    maxResults: "20",
    langRestrict: "ja",
    orderBy: "relevance",
    printType: "books",
  });

  if (GOOGLE_BOOKS_API_KEY) {
    params.set("key", GOOGLE_BOOKS_API_KEY);
  }

  const response = await fetch(`${GOOGLE_BOOKS_ENDPOINT}?${params.toString()}`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Books API responded with status ${response.status}: ${errorText}`);
  }

  const data: GoogleBooksResponse = await response.json();
  return parseGoogleBooksResponse(data);
}

function parseGoogleBooksResponse(data: GoogleBooksResponse) {
  const sourceItems = data.items ?? [];
  const items = sourceItems.map((item, index) => {
    const volumeInfo = item.volumeInfo || {};
    const saleInfo = item.saleInfo || {};

    const title = volumeInfo.title || "Unknown";
    const authors = volumeInfo.authors || [];
    const author = authors.length > 0 ? authors.join(", ") : "Unknown";

    const identifiers = volumeInfo.industryIdentifiers || [];
    const isbn13 = identifiers.find(id => id.type === "ISBN_13")?.identifier;
    const isbn10 = identifiers.find(id => id.type === "ISBN_10")?.identifier;
    const asin = isbn13 || isbn10 || item.id || `google-books-${index}`;

    const imageUrl = volumeInfo.imageLinks?.thumbnail || volumeInfo.imageLinks?.smallThumbnail || "";

    const price = saleInfo.listPrice?.amount
      ? `¥${saleInfo.listPrice.amount.toLocaleString("ja-JP")}`
      : "";

    return {
      title,
      asin,
      price,
      imageUrl: imageUrl.replace("http://", "https://"),
      author,
    };
  });

  return { success: items.length > 0, count: items.length, items };
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
    const results = await searchBooksOnGoogle(query);
    return NextResponse.json(results);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch books from Google Books API.";
    return NextResponse.json(
      { error: message },
      { status: 502 }
    );
  }
}
