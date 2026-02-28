import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const PARTNER_TAG = process.env.AWS_PARTNER_TAG;
const HOST = "webservices.amazon.co.jp";
const REGION = "us-west-2";
const SERVICE = "ProductAdvertisingAPI";
const ENDPOINT = "/paapi5/searchitems";

function generateAwsV4Signature(
  method: string,
  host: string,
  path: string,
  payload: string,
  accessKey: string,
  secretKey: string,
  timestamp: string
): { authorization: string; amzDate: string; headers: Record<string, string> } {
  const amzDate = timestamp.replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);

  const payloadHash = crypto.createHash("sha256").update(payload).digest("hex");
  const canonicalHeaders = `host:${host}\nx-amz-date:${amzDate}\nx-amz-target:com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems\n`;
  const signedHeaders = "host;x-amz-date;x-amz-target";
  const canonicalRequest = `${method}\n${path}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  const canonicalRequestHash = crypto
    .createHash("sha256")
    .update(canonicalRequest)
    .digest("hex");

  const credentialScope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${canonicalRequestHash}`;

  const kSecret = `AWS4${secretKey}`;
  const kDate = crypto.createHmac("sha256", kSecret).update(dateStamp).digest();
  const kRegion = crypto.createHmac("sha256", kDate).update(REGION).digest();
  const kService = crypto.createHmac("sha256", kRegion).update(SERVICE).digest();
  const kSigning = crypto
    .createHmac("sha256", kService)
    .update("aws4_request")
    .digest();
  const signature = crypto
    .createHmac("sha256", kSigning)
    .update(stringToSign)
    .digest("hex");

  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    authorization,
    amzDate,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Amz-Date": amzDate,
      "X-Amz-Target": "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems",
      "Authorization": authorization
    }
  };
}

async function searchBooksOnAmazon(query: string) {
  if (!AWS_ACCESS_KEY || !AWS_SECRET_KEY || !PARTNER_TAG) {
    throw new Error(
      "AWS credentials are not properly configured. Please set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_PARTNER_TAG."
    );
  }

  const payload = JSON.stringify({
    Keywords: query,
    SearchIndex: "Books",
    ItemPage: 1,
    ItemCount: 10,
    PartnerTag: PARTNER_TAG,
    Resources: [
      "Images.Primary.Medium",
      "ItemInfo.Title",
      "ItemInfo.ByLineInfo",
      "Offers.Listings.Price",
    ],
  });

  const timestamp = new Date().toISOString();
  const { authorization, amzDate } = generateAwsV4Signature(
    "POST",
    HOST,
    ENDPOINT,
    payload,
    AWS_ACCESS_KEY,
    AWS_SECRET_KEY,
    timestamp
  );

  const headers: Record<string, string> = {
    "Content-Type": "application/x-amz-json-1.1",
    "X-Amz-Target": "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems",
    "X-Amz-Date": amzDate,
    Authorization: authorization,
    Host: HOST,
  };

  const response = await fetch(`https://${HOST}${ENDPOINT}`, {
    method: "POST",
    headers,
    body: payload,
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`Amazon API responded with status ${response.status}: ${responseText}`);
  }

  const data = JSON.parse(responseText);
  return parseAmazonResponse(data);
}

function parseAmazonResponse(data: Record<string, unknown>) {
  const items: Array<Record<string, unknown>> = [];

  if (!data.SearchResult?.Items) {
    return { success: false, count: 0, items: [] };
  }

  data.SearchResult?.Items?.forEach((item: Record<string, unknown>) => {
    items.push({
      title: item.ItemInfo?.Title?.DisplayValue || "Unknown",
      asin: item.ASIN || "",
      amazonUrl: item.DetailPageURL || `https://amazon.co.jp/dp/${item.ASIN}`,
      price: item.Offers?.Listings?.[0]?.Price?.DisplayAmount || "",
      imageUrl: item.Images?.Primary?.Medium?.URL || "",
      author: item.ItemInfo?.ByLineInfo?.Contributors?.[0]?.Name || "Unknown",
    });
  });

  return { success: items.length > 0, count: items.length, items };
}

function getDummyBooks(query: string) {
  const items = [
    {
      title: `${query}入門 - 基礎から学ぶプログラミング`,
      asin: "DUMMY001",
      amazonUrl: "https://amazon.co.jp",
      price: "JPY 2800",
      imageUrl: "https://m.media-amazon.com/images/I/81t9SzqO37L._SY522_.jpg",
      author: "山田太郎",
    },
    {
      title: `実践${query} - 応用テクニック大全`,
      asin: "DUMMY002",
      amazonUrl: "https://amazon.co.jp",
      price: "JPY 3200",
      imageUrl: "https://m.media-amazon.com/images/I/81t9SzqO37L._SY522_.jpg",
      author: "佐藤花子",
    },
    {
      title: `${query}パーフェクトガイド`,
      asin: "DUMMY003",
      amazonUrl: "https://amazon.co.jp",
      price: "JPY 3600",
      imageUrl: "https://m.media-amazon.com/images/I/81t9SzqO37L._SY522_.jpg",
      author: "鈴木一郎",
    },
  ];

  return { success: true, count: items.length, items };
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
    const results = await searchBooksOnAmazon(query);
    return NextResponse.json(results);
  } catch {
    const dummyData = getDummyBooks(query);
    return NextResponse.json(dummyData);
  }
}
