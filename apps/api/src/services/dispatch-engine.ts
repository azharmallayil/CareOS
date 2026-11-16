import { FastifyInstance } from "fastify";

export interface ActiveWorkOrderSummary {
  id: string;
  workOrderNumber: string;
  status: string;
  priority: string;
  customerName?: string | undefined;
  siteName?: string | undefined;
  siteCity?: string | undefined;
  latitude?: number | undefined;
  longitude?: number | undefined;
  distanceKm?: number | undefined;
}

export interface NearbyAddonOpportunity {
  workOrderNumber: string;
  siteName: string;
  siteCity?: string | undefined;
  distanceKm: number;
  description: string;
}

export interface TechnicianSkillDetail {
  skillCode: string;
  skillName: string;
  proficiencyLevel?: string | undefined;
  certified?: boolean | undefined;
}

export interface TechnicianCandidate {
  id: string;
  userId?: string | undefined;
  fullName: string;
  email: string;
  phone?: string | undefined;
  status: string;
  maxActiveWorkOrders: number;
  currentWorkload: number;
  avgRating: number;
  skills: string[];
  skillDetails?: TechnicianSkillDetail[] | undefined;
  territories: string[];
  workingToday: boolean;
  onLeave: boolean;
  lastLocation?: {
    lat: number;
    lng: number;
    updatedAt: string;
  } | undefined;
  activeWorkOrders?: ActiveWorkOrderSummary[] | undefined;
}

export interface RecommendationScore {
  technicianId: string;
  userId?: string | undefined;
  fullName: string;
  email: string;
  phone?: string | undefined;
  avgRating: number;
  status: string;
  totalScore: number;
  isEligible: boolean;
  isAvailable: boolean;
  currentWorkload: number;
  maxActiveWorkOrders: number;
  distanceKm?: number | null | undefined;
  skills: TechnicianSkillDetail[];
  territories: string[];
  activeWorkOrders: ActiveWorkOrderSummary[];
  isNearbyAddon: boolean;
  nearbyAddonOpportunity?: NearbyAddonOpportunity | null | undefined;
  scoreBreakdown: {
    skillScore: number;       // 0 - 30
    territoryScore: number;   // 0 - 25
    availabilityScore: number;// 0 - 20
    workloadScore: number;    // 0 - 15
    proximityScore: number;   // 0 - 10
    routeAddonScore?: number | undefined; // 0 - 20
  };
  reasons: string[];
}

export interface TicketDispatchContext {
  ticketId: string;
  categoryCode?: string | undefined;
  requiredSkill?: string | undefined;
  priority: "low" | "medium" | "high" | "critical";
  scheduledDate: string;
  customerSite?: {
    name?: string | undefined;
    postalCode?: string | undefined;
    latitude?: number | undefined;
    longitude?: number | undefined;
    city?: string | undefined;
  } | undefined;
}

export const APPROVED_REJECTION_REASONS = [
  "out_of_territory",
  "skill_mismatch",
  "schedule_conflict",
  "vehicle_breakdown",
  "emergency",
  "other",
] as const;

export type RejectionReason = typeof APPROVED_REJECTION_REASONS[number];

/**
 * Calculates great-circle distance between two points in km using Haversine formula
 */
export function calculateHaversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Computes ranked recommendations using ONLY reliable and verified data
 */
export function computeTechnicianRecommendations(
  technicians: TechnicianCandidate[],
  context: TicketDispatchContext
): RecommendationScore[] {
  const scores: RecommendationScore[] = technicians.map((tech) => {
    const reasons: string[] = [];
    const skillDetails: TechnicianSkillDetail[] = tech.skillDetails || tech.skills.map((s) => ({
      skillCode: s,
      skillName: s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      certified: true,
    }));

    const activeWOs: ActiveWorkOrderSummary[] = (tech.activeWorkOrders || []).map((wo) => {
      let woDist: number | undefined = undefined;
      if (
        wo.latitude &&
        wo.longitude &&
        context.customerSite?.latitude &&
        context.customerSite?.longitude
      ) {
        woDist = Math.round(
          calculateHaversineKm(
            wo.latitude,
            wo.longitude,
            context.customerSite.latitude,
            context.customerSite.longitude
          ) * 10
        ) / 10;
      }
      return { ...wo, distanceKm: woDist };
    });

    // Check direct location distance to customer site
    let distanceKm: number | null = null;
    if (
      tech.lastLocation &&
      context.customerSite?.latitude &&
      context.customerSite?.longitude
    ) {
      distanceKm = Math.round(
        calculateHaversineKm(
          tech.lastLocation.lat,
          tech.lastLocation.lng,
          context.customerSite.latitude,
          context.customerSite.longitude
        ) * 10
      ) / 10;
    }

    // Filter hard blocks: suspended, inactive, or on leave
    if (tech.status !== "active") {
      return {
        technicianId: tech.id,
        userId: tech.userId,
        fullName: tech.fullName,
        email: tech.email,
        phone: tech.phone,
        avgRating: tech.avgRating,
        status: tech.status,
        totalScore: 0,
        isEligible: false,
        isAvailable: false,
        currentWorkload: tech.currentWorkload,
        maxActiveWorkOrders: tech.maxActiveWorkOrders,
        distanceKm,
        skills: skillDetails,
        territories: tech.territories,
        activeWorkOrders: activeWOs,
        isNearbyAddon: false,
        nearbyAddonOpportunity: null,
        scoreBreakdown: {
          skillScore: 0,
          territoryScore: 0,
          availabilityScore: 0,
          workloadScore: 0,
          proximityScore: 0,
          routeAddonScore: 0,
        },
        reasons: [`Technician is currently ${tech.status}`],
      };
    }

    if (tech.onLeave) {
      return {
        technicianId: tech.id,
        userId: tech.userId,
        fullName: tech.fullName,
        email: tech.email,
        phone: tech.phone,
        avgRating: tech.avgRating,
        status: "on_leave",
        totalScore: 0,
        isEligible: false,
        isAvailable: false,
        currentWorkload: tech.currentWorkload,
        maxActiveWorkOrders: tech.maxActiveWorkOrders,
        distanceKm,
        skills: skillDetails,
        territories: tech.territories,
        activeWorkOrders: activeWOs,
        isNearbyAddon: false,
        nearbyAddonOpportunity: null,
        scoreBreakdown: {
          skillScore: 0,
          territoryScore: 0,
          availabilityScore: 0,
          workloadScore: 0,
          proximityScore: 0,
          routeAddonScore: 0,
        },
        reasons: ["Technician is on approved leave for this date"],
      };
    }

    // 1. Skill Match (0 - 30)
    let skillScore = 0;
    if (context.requiredSkill) {
      if (tech.skills.includes(context.requiredSkill)) {
        skillScore = 30;
        reasons.push(`Direct certified skill match: ${context.requiredSkill}`);
      } else {
        skillScore = 5;
        reasons.push(`Missing certified skill: ${context.requiredSkill}`);
      }
    } else {
      // General skill match by category code
      skillScore = 25;
      if (tech.skills.length > 0) {
        reasons.push(`Certified across ${tech.skills.length} technical competencies`);
      } else {
        reasons.push("General field technician profile");
      }
    }

    // 2. Territory Match (0 - 25)
    let territoryScore = 15; // default fallback
    if (context.customerSite?.city) {
      const territoryMatch = tech.territories.some(
        (t) => t.toLowerCase() === context.customerSite!.city!.toLowerCase()
      );
      if (territoryMatch) {
        territoryScore = 25;
        reasons.push(`Assigned territory matches ${context.customerSite.city}`);
      }
    }

    // 3. Availability (0 - 20)
    let availabilityScore = 0;
    if (tech.workingToday) {
      availabilityScore = 20;
      reasons.push("On active working shift scheduled today");
    } else {
      availabilityScore = 5;
      reasons.push("Non-standard shift / off-day");
    }

    // 4. Workload Balance (0 - 15)
    let workloadScore = 0;
    const remainingSlots = Math.max(0, tech.maxActiveWorkOrders - tech.currentWorkload);
    if (remainingSlots <= 0) {
      workloadScore = 0;
      reasons.push(`At maximum workload capacity (${tech.currentWorkload}/${tech.maxActiveWorkOrders} tasks)`);
    } else if (tech.currentWorkload === 0) {
      workloadScore = 15;
      reasons.push("Free & available for immediate dispatch (0 active tasks)");
    } else {
      const loadRatio = remainingSlots / tech.maxActiveWorkOrders;
      workloadScore = Math.round(loadRatio * 15);
      reasons.push(`Capacity available: ${remainingSlots} open slots (${tech.currentWorkload} active tasks)`);
    }

    // 5. Proximity (0 - 10)
    let proximityScore = 5; // neutral
    if (distanceKm !== null) {
      if (distanceKm <= 5) {
        proximityScore = 10;
        reasons.push(`Near site: 📍 ${distanceKm} km away`);
      } else if (distanceKm <= 15) {
        proximityScore = 8;
        reasons.push(`Within service zone: 📍 ${distanceKm} km away`);
      } else if (distanceKm <= 30) {
        proximityScore = 5;
        reasons.push(`Moderate transit: 📍 ${distanceKm} km away`);
      } else {
        proximityScore = 2;
        reasons.push(`Extended distance: 📍 ${distanceKm} km away`);
      }
    }

    // 6. SMART ROUTE BUNDLING / PROXIMITY ADD-ON OPPORTUNITY (0 - 20 Bonus points)
    // If technician has an active work order nearby (< 15 km or same site/city),
    // they can add on this task to save travel time and avoid sending two techs to the same area.
    let isNearbyAddon = false;
    let nearbyAddonOpportunity: NearbyAddonOpportunity | null = null;
    let routeAddonScore = 0;

    if (remainingSlots > 0 && activeWOs.length > 0) {
      // Find the closest active work order to this customer's site
      let closestWo: ActiveWorkOrderSummary | null = null;
      let minDistance = Infinity;

      for (const wo of activeWOs) {
        if (wo.distanceKm !== undefined && wo.distanceKm < minDistance) {
          minDistance = wo.distanceKm;
          closestWo = wo;
        } else if (
          wo.siteCity &&
          context.customerSite?.city &&
          wo.siteCity.toLowerCase() === context.customerSite.city.toLowerCase() &&
          !closestWo
        ) {
          closestWo = wo;
          minDistance = 5.0; // estimated within same city
        }
      }

      if (closestWo && minDistance <= 15) {
        isNearbyAddon = true;
        routeAddonScore = 20;
        const distStr = minDistance === 5.0 && !closestWo.distanceKm ? "same city" : `${minDistance} km away`;
        const siteLabel = closestWo.siteName || closestWo.siteCity || "nearby site";

        nearbyAddonOpportunity = {
          workOrderNumber: closestWo.workOrderNumber,
          siteName: siteLabel,
          siteCity: closestWo.siteCity,
          distanceKm: minDistance,
          description: `Assigned to ${closestWo.workOrderNumber} at ${siteLabel} (${distStr}). Add-on this task to bundle stops and avoid deploying a second technician!`,
        };

        reasons.unshift(
          `⚡ Proximity Add-on Opportunity: Active nearby at ${siteLabel} (${distStr})`
        );
      }
    }

    const totalScore =
      skillScore +
      territoryScore +
      availabilityScore +
      workloadScore +
      proximityScore +
      routeAddonScore;

    return {
      technicianId: tech.id,
      userId: tech.userId,
      fullName: tech.fullName,
      email: tech.email,
      phone: tech.phone,
      avgRating: Number(tech.avgRating) || 5.0,
      status: tech.status,
      totalScore,
      isEligible: remainingSlots > 0 && tech.workingToday,
      isAvailable: remainingSlots > 0 && tech.workingToday,
      currentWorkload: tech.currentWorkload,
      maxActiveWorkOrders: tech.maxActiveWorkOrders,
      distanceKm,
      skills: skillDetails,
      territories: tech.territories,
      activeWorkOrders: activeWOs,
      isNearbyAddon,
      nearbyAddonOpportunity,
      scoreBreakdown: {
        skillScore,
        territoryScore,
        availabilityScore,
        workloadScore,
        proximityScore,
        routeAddonScore,
      },
      reasons,
    };
  });

  // Sort descending by totalScore (smart route add-ons and top scores bubble to top)
  return scores.sort((a, b) => {
    // Put eligible candidates first
    if (a.isEligible !== b.isEligible) {
      return a.isEligible ? -1 : 1;
    }
    // Put route add-on opportunities first among eligible
    if (a.isNearbyAddon !== b.isNearbyAddon) {
      return a.isNearbyAddon ? -1 : 1;
    }
    return b.totalScore - a.totalScore;
  });
}
