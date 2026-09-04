import membershipsJson from "@/content/memberships.json";

export interface MembershipTierEntry {
  id?: string;
  slug: string;
  name: string;
  price_eur: number;
  season: string;
  badge: string;
  icon: "Users" | "Smile" | "GraduationCap" | "Shield" | "Handshake";
  target: string;
  description: string;
  benefits: string[];
  status: "active" | "inactive";
}

export const membershipCatalogue: MembershipTierEntry[] = membershipsJson as MembershipTierEntry[];

export function getMembershipTier(slug: string): MembershipTierEntry | undefined {
  return membershipCatalogue.find((m) => m.slug === slug);
}

export function getAllActiveMembershipTiers(): MembershipTierEntry[] {
  return membershipCatalogue.filter((m) => m.status === "active");
}
