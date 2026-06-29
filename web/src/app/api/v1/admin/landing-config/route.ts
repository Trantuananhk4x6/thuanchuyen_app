import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { prisma } from "@/lib/db/prisma";
import { DEFAULT_LANDING_CONFIG } from "@/lib/landing/defaults";
import type { LandingConfigData } from "@/types/landing";
import { revalidatePath } from "next/cache";

async function getOrCreateConfig() {
  return prisma.landingConfig.upsert({
    where: { key: "main" },
    create: {
      key: "main",
      navBrand:      DEFAULT_LANDING_CONFIG.navBrand,
      navItems:      DEFAULT_LANDING_CONFIG.navItems,
      heroBadge:     DEFAULT_LANDING_CONFIG.heroBadge,
      heroTitle:     DEFAULT_LANDING_CONFIG.heroTitle,
      heroHighlight: DEFAULT_LANDING_CONFIG.heroHighlight,
      heroSubtitle:  DEFAULT_LANDING_CONFIG.heroSubtitle,
      heroFeatures:  DEFAULT_LANDING_CONFIG.heroFeatures,
      socialVisible: DEFAULT_LANDING_CONFIG.socialVisible,
      socialTitle:   DEFAULT_LANDING_CONFIG.socialTitle,
      socialSub:     DEFAULT_LANDING_CONFIG.socialSub,
      sections:      DEFAULT_LANDING_CONFIG.sections,
      footerGroups:  DEFAULT_LANDING_CONFIG.footerGroups,
      footerCopy:    DEFAULT_LANDING_CONFIG.footerCopy,
    },
    update: {},
  });
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, "ADMIN");
  if ("error" in auth) return auth.error;

  const config = await getOrCreateConfig();
  return ok({ config });
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req, "ADMIN");
  if ("error" in auth) return auth.error;

  const body: Partial<LandingConfigData> = await req.json().catch(() => null);
  if (!body) return Errors.validation("Body không hợp lệ");

  const allowed: (keyof LandingConfigData)[] = [
    "navBrand", "navItems",
    "heroBadge", "heroTitle", "heroHighlight", "heroSubtitle", "heroFeatures",
    "socialVisible", "socialTitle", "socialSub",
    "sections",
    "footerGroups", "footerCopy",
  ];

  const update: Record<string, unknown> = { updatedBy: auth.payload.userId };
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  const config = await prisma.landingConfig.upsert({
    where:  { key: "main" },
    create: {
      key: "main",
      ...update,
    },
    update,
  });

  // Bust the Next.js cache so the login page revalidates immediately
  revalidatePath("/login");

  return ok({ config });
}
