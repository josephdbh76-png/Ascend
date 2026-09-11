export const BUSINESS_CATEGORIES = [
  { value: "saas", label: "SaaS" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "agency", label: "Agency" },
  { value: "ai", label: "AI" },
  { value: "creator", label: "Creator" },
  { value: "consulting", label: "Consulting" },
  { value: "marketplace", label: "Marketplace" },
  { value: "app", label: "App" },
  { value: "other", label: "Other" },
] as const;

export type BusinessCategory = (typeof BUSINESS_CATEGORIES)[number]["value"];

export const COUNTRIES = [
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "FR", label: "France" },
  { value: "DE", label: "Germany" },
  { value: "ES", label: "Spain" },
  { value: "IT", label: "Italy" },
  { value: "NL", label: "Netherlands" },
  { value: "CA", label: "Canada" },
  { value: "AU", label: "Australia" },
  { value: "SG", label: "Singapore" },
  { value: "AE", label: "United Arab Emirates" },
  { value: "IN", label: "India" },
  { value: "BR", label: "Brazil" },
  { value: "JP", label: "Japan" },
  { value: "OTHER", label: "Other" },
] as const;

export const RESERVED_USERNAMES = [
  "admin",
  "ascend",
  "api",
  "settings",
  "login",
  "signup",
  "logout",
  "dashboard",
  "leaderboard",
  "profile",
  "challenges",
  "achievements",
  "support",
  "help",
  "about",
  "privacy",
  "terms",
  "founder",
  "founders",
  "beta",
  "root",
  "null",
  "undefined",
  "you",
  "me",
];

export const REVENUE_VISIBILITY = {
  EXACT: "exact",
  RANGE: "range",
  PRIVATE: "private",
} as const;

export type RevenueVisibility = (typeof REVENUE_VISIBILITY)[keyof typeof REVENUE_VISIBILITY];

export const VERIFICATION_STATUS = {
  UNVERIFIED: "unverified",
  VERIFIED: "verified",
  ERROR: "error",
  DISCONNECTED: "disconnected",
} as const;

export type VerificationStatus = (typeof VERIFICATION_STATUS)[keyof typeof VERIFICATION_STATUS];

export const ACHIEVEMENT_DEFINITIONS = [
  { id: "first-verified-revenue", name: "First Verified Revenue", description: "Connected and verified your first revenue source.", rarity: "common", icon: "check-circle" },
  { id: "revenue-1k", name: "€1K Month", description: "Reached €1,000 in monthly revenue.", rarity: "common", icon: "trending-up", threshold: 100000 },
  { id: "revenue-5k", name: "€5K Month", description: "Reached €5,000 in monthly revenue.", rarity: "common", icon: "trending-up", threshold: 500000 },
  { id: "revenue-10k", name: "€10K Month", description: "Reached €10,000 in monthly revenue.", rarity: "rare", icon: "trending-up", threshold: 1000000 },
  { id: "revenue-25k", name: "€25K Month", description: "Reached €25,000 in monthly revenue.", rarity: "rare", icon: "trending-up", threshold: 2500000 },
  { id: "revenue-50k", name: "€50K Month", description: "Reached €50,000 in monthly revenue.", rarity: "epic", icon: "trending-up", threshold: 5000000 },
  { id: "revenue-100k", name: "€100K Month", description: "Reached €100,000 in monthly revenue.", rarity: "legendary", icon: "trending-up", threshold: 10000000 },
  { id: "top-100", name: "Top 100", description: "Ranked in the global top 100.", rarity: "rare", icon: "medal" },
  { id: "top-50", name: "Top 50", description: "Ranked in the global top 50.", rarity: "epic", icon: "medal" },
  { id: "top-10", name: "Top 10", description: "Ranked in the global top 10.", rarity: "legendary", icon: "medal" },
  { id: "founding-member", name: "Founding Member", description: "Joined ASCEND during the founding cohort.", rarity: "epic", icon: "gem" },
] as const;

export const TROPHY_DEFINITIONS = [
  { id: "global-1", name: "Global #1", description: "Ranked #1 worldwide on ASCEND.", icon: "crown" },
  { id: "category-champion", name: "Category Champion", description: "Ranked #1 in your business category.", icon: "shield" },
  { id: "founder-of-the-month", name: "Founder of the Month", description: "Highest growth of the month.", icon: "star" },
  { id: "growth-champion", name: "Growth Champion", description: "Fastest-growing founder of the season.", icon: "flame" },
  { id: "revenue-100k-trophy", name: "€100K Month", description: "Crossed €100,000 in monthly revenue.", icon: "trophy" },
  { id: "founding-member-trophy", name: "Founding Member", description: "One of ASCEND's first 500 members.", icon: "gem" },
] as const;

export const CHALLENGE_DEFINITIONS = [
  { id: "first-10k-month", title: "First €10K Month", description: "Reach €10,000 in monthly revenue for the first time.", type: "revenue_threshold", target: 1000000 },
  { id: "growth-30", title: "+30% Growth", description: "Grow your monthly revenue by 30% or more.", type: "growth_threshold", target: 30 },
  { id: "consistency-30", title: "30-Day Consistency", description: "Keep your revenue source connected and verified for 30 days straight.", type: "consistency", target: 30 },
  { id: "international-customer", title: "First International Customer", description: "Coming soon — track your first customer outside your home country.", type: "coming_soon", target: 1 },
  { id: "launch-something-new", title: "Launch Something New", description: "Coming soon — log a new product or feature launch.", type: "coming_soon", target: 1 },
] as const;

export const FOUNDING_MEMBER_LIMIT = 500;

export const CURRENT_SEASON = {
  number: 1,
  name: "ASCEND SEASON 01",
  label: "September 2026",
  startsAt: "2026-09-01T00:00:00.000Z",
  endsAt: "2026-11-30T23:59:59.000Z",
};
