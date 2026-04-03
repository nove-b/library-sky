export type ReadingStatus = "want" | "reading" | "completed" | "dropped";

export interface Book {
  title: string;
  author: string;
  imageUrl: string;
  price?: string;
  asin: string;
  affiliateUrl?: string;
  publisher?: string;
}

export interface BookLog {
  uri: string;
  cid: string;
  title: string;
  author: string;
  imageUrl: string;
  affiliateUrl?: string;
  status: ReadingStatus;
  rating: number;
  comment: string;
  createdAt: string;
  postUri: string;
  likeCount?: number;
  replyCount?: number;
  repostCount?: number;
}

export interface UserProfile {
  handle: string;
  displayName: string;
  avatarUrl: string;
}

export interface BlueskySession {
  handle: string;
  displayName: string;
  avatarUrl: string;
  did: string;
  accessJwt: string;
  refreshJwt: string;
  service: string;
}
