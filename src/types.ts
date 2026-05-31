export interface Domain {
  name: string;
  sld: string;
  tld: string;
}

export interface RegistrarPrice {
  registrar: string;
  price: number | null;
  currency: string;
  purchaseUrl: string;
}

export interface WhoisInfo {
  registrar?: string;
  registrant?: string;
  email?: string;
  created?: string;
  expires?: string;
  updated?: string;
  nameservers?: string[];
  status?: string[];
  raw?: string;
}

export type AvailabilityStatus = 'available' | 'taken' | 'unknown' | 'checking' | 'error';

export interface CheckResult {
  domain: Domain;
  status: AvailabilityStatus;
  prices: RegistrarPrice[];
  whois?: WhoisInfo;
  seoScore: SeoScore;
  checkedAt: Date;
  error?: string;
}

export interface SeoScore {
  total: number;
  breakdown: {
    length: number;
    tld: number;
    hyphenNumbers: number;
    pronounceability: number;
    brandability: number;
    keywords: number;
  };
  maxBreakdown: {
    length: number;
    tld: number;
    hyphenNumbers: number;
    pronounceability: number;
    brandability: number;
    keywords: number;
  };
}

export type SortField = 'name' | 'status' | 'price' | 'seo';
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  primary: { field: SortField; direction: SortDirection };
  secondary?: { field: SortField; direction: SortDirection };
}

export type StatusFilter = 'all' | 'available' | 'taken';

export interface FilterConfig {
  status: StatusFilter;
  maxPrice: number | null;
  minSeo: number | null;
}

export interface PipelineOptions {
  keywords?: string[];
  concurrency?: number;
  skipWhois?: boolean;
  skipPricing?: boolean;
}

export interface ColumnConfig {
  price: boolean;
  seo: boolean;
  registered: boolean;
}

export type PipelineEvent =
  | { type: 'start'; total: number }
  | { type: 'progress'; domain: string; done: number; total: number }
  | { type: 'result'; result: CheckResult }
  | { type: 'complete'; results: CheckResult[] }
  | { type: 'error'; domain: string; error: string };

export type PipelineEventHandler = (event: PipelineEvent) => void;
