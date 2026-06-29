export type NavItem = {
  id: string;
  label: string;
  href: string;
  badge?: string;
  external: boolean;
  visible: boolean;
  order: number;
};

export type GeoType = "ai" | "payment" | "realtime" | "notification";

export type HeroFeature = {
  id: string;
  geoType: GeoType;
  title: string;
  desc: string;
  visible: boolean;
  order: number;
};

export type SectionType = "events" | "posts" | "how_it_works" | "stats";

export type SectionConfig = {
  id: string;
  type: SectionType;
  visible: boolean;
  order: number;
  title: string;
  subtitle: string;
  limit: number;
  ctaLabel?: string;
  ctaHref?: string;
};

export type FooterLink = {
  id: string;
  label: string;
  href: string;
  external?: boolean;
};

export type FooterGroup = {
  id: string;
  label: string;
  links: FooterLink[];
};

export type LandingConfigData = {
  navBrand: string;
  navItems: NavItem[];
  heroBadge: string;
  heroTitle: string;
  heroHighlight: string;
  heroSubtitle: string;
  heroFeatures: HeroFeature[];
  socialVisible: boolean;
  socialTitle: string;
  socialSub: string;
  sections: SectionConfig[];
  footerGroups: FooterGroup[];
  footerCopy: string;
};

/* Serialisable shape returned by the API / passed as props */
export type BlogPostSummary = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  coverImage: string | null;
  category: string;
  tags: string[];
  readTime: number;
  publishedAt: Date | null;
};

export type EventSummary = {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  type: string;
  startsAt: Date;
  endsAt: Date;
};
