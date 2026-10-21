const DAY_MS = 24 * 60 * 60 * 1000;

export interface PolicyNumbers {
  depositPercent: number;
  fullRefundDaysBefore: number;
  lateCancelDaysBefore: number;
  midCancelPercentDue: number;
  lateCancelPercentDue: number;
}

const DEFAULTS: PolicyNumbers = {
  depositPercent: 30,
  fullRefundDaysBefore: 45,
  lateCancelDaysBefore: 30,
  midCancelPercentDue: 30,
  lateCancelPercentDue: 50,
};

// tolerant of older snapshots that lack newer fields
export function pickPolicy(
  source?: Partial<PolicyNumbers> | null,
): PolicyNumbers {
  return {
    depositPercent: source?.depositPercent ?? DEFAULTS.depositPercent,
    fullRefundDaysBefore:
      source?.fullRefundDaysBefore ?? DEFAULTS.fullRefundDaysBefore,
    lateCancelDaysBefore:
      source?.lateCancelDaysBefore ?? DEFAULTS.lateCancelDaysBefore,
    midCancelPercentDue:
      source?.midCancelPercentDue ?? DEFAULTS.midCancelPercentDue,
    lateCancelPercentDue:
      source?.lateCancelPercentDue ?? DEFAULTS.lateCancelPercentDue,
  };
}

export type CancellationTierValue =
  'EARLY' | 'MID' | 'LATE' | 'VENDOR_CANCELLED';

export function resolveTier(daysBefore: number, p: PolicyNumbers) {
  if (daysBefore > p.fullRefundDaysBefore) return 'EARLY' as const;
  if (daysBefore > p.lateCancelDaysBefore) return 'MID' as const;
  return 'LATE' as const;
}

export function computeSettlement(input: {
  cancelledBy: 'HOST' | 'VENDOR';
  eventDate: Date;
  now: Date;
  confirmedAmount: number;
  planPaid: number; // paid on deposit / balance / full invoices
  additionalPaid: number; // paid on additional-charge invoices
  policy: PolicyNumbers;
}) {
  const {
    cancelledBy,
    eventDate,
    now,
    confirmedAmount,
    planPaid,
    additionalPaid,
    policy,
  } = input;
  const daysBeforeEvent = (eventDate.getTime() - now.getTime()) / DAY_MS;
  const totalPaid = planPaid + additionalPaid;

  if (cancelledBy === 'VENDOR') {
    return {
      tier: 'VENDOR_CANCELLED' as CancellationTierValue,
      daysBeforeEvent,
      percentOwed: 0,
      planPaid,
      additionalPaid,
      totalPaid,
      amountOwed: 0,
      planRefund: planPaid,
      refundAmount: totalPaid,
      amountStillDue: 0,
    };
  }

  const tier = resolveTier(daysBefore(daysBeforeEvent), policy);
  const pct =
    tier === 'EARLY'
      ? policy.depositPercent
      : tier === 'MID'
        ? policy.midCancelPercentDue
        : policy.lateCancelPercentDue;
  // the deposit is non-refundable, so the amount owed is never below it
  const percentOwed = Math.max(policy.depositPercent, pct);
  const fullOwed = Math.round((confirmedAmount * percentOwed) / 100);

  // early window: only what was actually paid up to the deposit is kept, nothing more is charged
  const amountOwed = tier === 'EARLY' ? Math.min(fullOwed, planPaid) : fullOwed;
  const planRefund = Math.max(0, planPaid - amountOwed);
  const amountStillDue =
    tier === 'EARLY' ? 0 : Math.max(0, amountOwed - planPaid);

  return {
    tier: tier as CancellationTierValue,
    daysBeforeEvent,
    percentOwed,
    planPaid,
    additionalPaid,
    totalPaid,
    amountOwed,
    planRefund,
    refundAmount: planRefund + additionalPaid,
    amountStillDue,
  };
}

function daysBefore(n: number) {
  return n;
}
