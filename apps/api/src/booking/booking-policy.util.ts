export const DEFAULT_POLICY = {
  depositPercent: 30,
  fullRefundDaysBefore: 45,
  lateCancelDaysBefore: 30,
  midCancelPercentDue: 30,
  lateCancelPercentDue: 50,
};

type PolicyNumbers = typeof DEFAULT_POLICY;

// the numbers frozen onto a booking when it is created
export function snapshotPolicy(policy?: PolicyNumbers | null) {
  const p = policy ?? DEFAULT_POLICY;
  return {
    depositPercent: p.depositPercent,
    fullRefundDaysBefore: p.fullRefundDaysBefore,
    lateCancelDaysBefore: p.lateCancelDaysBefore,
    midCancelPercentDue: p.midCancelPercentDue,
    lateCancelPercentDue: p.lateCancelPercentDue,
  };
}
