import * as crypto from 'crypto';

const DAY_MS = 24 * 60 * 60 * 1000;

function clampDate(date: Date, min: Date, max: Date) {
  return new Date(
    Math.min(Math.max(date.getTime(), min.getTime()), max.getTime()),
  );
}

export function generateInvoiceNumber(): string {
  const year = new Date().getFullYear().toString().slice(-2);
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `INV${year}${month}-${random}`;
}

// Due dates are placeholders until the real schedule is decided.
export function buildMilestones(
  bookingId: string,
  eventDate: Date,
  depositPercent: number,
  now: Date = new Date(),
) {
  return [
    {
      bookingId,
      type: 'SIGN_AGREEMENT' as const,
      title: 'Sign service agreement',
      dueDate: clampDate(new Date(now.getTime() + 3 * DAY_MS), now, eventDate),
    },
    {
      bookingId,
      type: 'PAY_DEPOSIT' as const,
      title: `Pay ${depositPercent}% deposit`,
      dueDate: clampDate(new Date(now.getTime() + 7 * DAY_MS), now, eventDate),
    },
    {
      bookingId,
      type: 'FINALIZE_SELECTIONS' as const,
      title: 'Finalize selections',
      dueDate: clampDate(
        new Date(eventDate.getTime() - 30 * DAY_MS),
        now,
        eventDate,
      ),
    },
  ];
}
