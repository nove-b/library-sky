# Amazon Product API 本検索エンドポイント

このプロジェクトには Amazon Product Advertising API を使用て本を検索する API エンドポイントが含まれています。

## セットアップ

### 1. 依存パッケージのインストール

```bash
pnpm add axios aws4
```

または既にインストール済みの場合：
```bash
pnpm install
```

Note: `xml2js` パッケージをインストールすることをお勧めします（本格的な XML パースのため）：
```bash
pnpm add xml2js
```

### 2. AWS 認証情報の取得

Amazon Product Advertising API を使用するには以下のものが必要です：

1. **AWS アクセスキー** - AWS Console から取得
2. **AWS シークレットキー** - AWS Console から取得  
3. **Partner Tag** - Amazon Associates プログラムに登録して取得

詳細は [Amazon Product Advertising API](https://webservices.amazon.com/paapi5/documentation/) を参照してください。

### 3. 環境変数の設定

`.env.local` ファイルを作成して以下の内容を追加します：

```env
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_PARTNER_TAG=your_partner_tag_here
```

`.env.local.example` をコピーして編集することもできます：

```bash
cp .env.local.example .env.local
```

## 使用方法

### API エンドポイント

```
GET /api/books/search?query=<検索キーワード>
```

### リクエスト例

```bash
curl "http://localhost:3000/api/books/search?query=JavaScript"
```

### レスポンス例

```json
{
  "success": true,
  "count": 10,
  "items": [
    {
      "title": "JavaScript: The Definitive Guide",
      "asin": "B095G92KMS",
      "url": "https://www.amazon.com/...",
      "price": "$39.99",
      "imageUrl": "https://images.amazon.com/...",
      "author": "David Flanagan"
    }
  ]
}
```

## API レスポンス

- **success** (boolean): リクエストが成功したかどうか
- **count** (number): 返された本の数
- **items** (array): 検索結果の本の配列
  - **title** (string): 本のタイトル
  - **asin** (string): Amazon ASIN コード
  - **url** (string): Amazon 商品ページへのリンク
  - **price** (string): 価格
  - **imageUrl** (string): 本の表紙画像 URL
  - **author** (string): 著者名

## エラーハンドリング

環境変数が設定されていない場合、以下のエラーレスポンスが返されます：

```json
{
  "error": "AWS credentials are not properly configured. Please set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_PARTNER_TAG in your environment variables."
}
```

## 開発サーバーの起動

```bash
pnpm dev
```

`http://localhost:3000/api/books/search?query=<キーワード>` でエンドポイントテストができます。

## 注意事項

- 現在、簡易的な XML パースを使用しています。本番環境では `xml2js` などのライブラリを使用することをお勧めします
- API リクエスト数には制限がある場合があります（Amazon の利用規約を確認してください）
- 価格やその他の情報は定期的に更新されます

## カスタマイズ

検索結果をフィルタリングしたり、並べ替えたい場合は `app/api/books/search/route.ts` の `searchBooksOnAmazon` 関数を修正できます。
