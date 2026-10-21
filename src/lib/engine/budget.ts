/**
 * Pure engine functions for event budget estimation and what-if calculations.
 * Strict Rule: All mathematical calculations live ONLY here, never computed by LLMs.
 */

export type BudgetTier = "intimate" | "grand" | "royal";

export interface BudgetEstimateInput {
  guestCount: number;
  tier: BudgetTier;
  ceremonyCount: number;
}

export interface BudgetEstimateResult {
  cateringCost: number;
  decorCost: number;
  venueCost: number;
  contingencyCost: number;
  totalEstimatedCost: number;
  perGuestCost: number;
}

const TIER_MULTIPLIERS: Record<BudgetTier, { perPlate: number; decorBase: number; venueBase: number }> = {
  intimate: { perPlate: 1200, decorBase: 150000, venueBase: 200000 },
  grand: { perPlate: 2500, decorBase: 450000, venueBase: 600000 },
  royal: { perPlate: 4800, decorBase: 1200000, venueBase: 1800000 },
};

/**
 * Computes deterministic budget estimate breakdown based on guests, tier, and ceremony count.
 * Includes a pure 10% contingency buffer standard for Indian multi-day celebrations.
 */
export function calculateBudgetEstimate({
  guestCount,
  tier,
  ceremonyCount,
}: BudgetEstimateInput): BudgetEstimateResult {
  const safeGuests = Math.max(10, Math.min(5000, Math.round(guestCount || 0)));
  const safeCeremonies = Math.max(1, Math.min(10, Math.round(ceremonyCount || 1)));
  const config = TIER_MULTIPLIERS[tier] || TIER_MULTIPLIERS.grand;

  // Catering scales directly with guest count and number of feast ceremonies
  const cateringCost = safeGuests * config.perPlate * Math.max(1, safeCeremonies * 0.7);

  // Decor scales with base tier and ceremony multiplicity (e.g. Mandap + Haldi floral + Sangeet stage)
  const decorCost = config.decorBase * (1 + (safeCeremonies - 1) * 0.35);

  // Venue booking estimate
  const venueCost = config.venueBase * (1 + (safeCeremonies - 1) * 0.25);

  // 10% contingency reserve for unforeseen delays or extra attendees
  const subtotal = cateringCost + decorCost + venueCost;
  const contingencyCost = Math.round(subtotal * 0.1);

  const totalEstimatedCost = Math.round(subtotal + contingencyCost);
  const perGuestCost = Math.round(totalEstimatedCost / safeGuests);

  return {
    cateringCost: Math.round(cateringCost),
    decorCost: Math.round(decorCost),
    venueCost: Math.round(venueCost),
    contingencyCost,
    totalEstimatedCost,
    perGuestCost,
  };
}
