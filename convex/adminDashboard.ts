import { query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { requireAdminAccess } from "./adminAuth";

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing", "past_due"]);

export const getExecutiveSummary = query({
  args: {},
  handler: async (ctx) => {
    await requireAdminAccess(ctx);
    const now = Date.now();
    const year = new Date(now).getUTCFullYear();
    const yearStart = Date.UTC(year, 0, 1);
    const previousYearStart = Date.UTC(year - 1, 0, 1);
    const previousYearToDate = Date.UTC(
      year - 1,
      new Date(now).getUTCMonth(),
      new Date(now).getUTCDate() + 1,
    );
    const livemode = stripeLiveMode();

    const [
      events,
      registrations,
      registrationChildren,
      households,
      children,
      volunteerSubmissions,
      volunteerMemberships,
      volunteerCommitments,
      donations,
      subscriptions,
    ] = await Promise.all([
      ctx.db.query("events").collect(),
      ctx.db.query("registrations").collect(),
      ctx.db.query("registrationChildren").collect(),
      ctx.db.query("households").collect(),
      ctx.db.query("children").collect(),
      ctx.db.query("volunteerSubmissions").collect(),
      ctx.db.query("volunteerMemberships").collect(),
      ctx.db.query("volunteerEventCommitments").collect(),
      ctx.db.query("donations").collect(),
      ctx.db.query("stripeSubscriptions").collect(),
    ]);

    const eventById = new Map(events.map((event) => [event._id, event]));
    const registrationById = new Map(
      registrations.map((registration) => [registration._id, registration]),
    );
    const attendance = registrationChildren
      .filter((child) => child.status === "active" && child.checkedInAt)
      .map((child) => {
        const event = eventById.get(child.eventId);
        const registration = registrationById.get(child.registrationId);
        return event && registration
          ? {
              childKey: attendanceKey(child, registration),
              eventId: event._id,
              eventStartsAt: event.startsAt,
              householdId: registration.householdId,
            }
          : null;
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));

    const firstAttendanceByChild = new Map<string, number>();
    for (const row of attendance) {
      const first = firstAttendanceByChild.get(row.childKey);
      if (first === undefined || row.eventStartsAt < first) {
        firstAttendanceByChild.set(row.childKey, row.eventStartsAt);
      }
    }

    const ytdAttendance = attendance.filter((row) => row.eventStartsAt >= yearStart);
    const previousYtdAttendance = attendance.filter(
      (row) =>
        row.eventStartsAt >= previousYearStart &&
        row.eventStartsAt < previousYearToDate,
    );
    const ytdUniqueKids = new Set(ytdAttendance.map((row) => row.childKey));
    const previousYtdUniqueKids = new Set(
      previousYtdAttendance.map((row) => row.childKey),
    );
    const ytdFirstTimeKids = [...firstAttendanceByChild.values()].filter(
      (timestamp) => timestamp >= yearStart,
    ).length;
    const previousYtdFirstTimeKids = [...firstAttendanceByChild.values()].filter(
      (timestamp) =>
        timestamp >= previousYearStart && timestamp < previousYearToDate,
    ).length;
    const ytdFamiliesServed = new Set(
      ytdAttendance.map((row) => row.householdId),
    ).size;

    const paidDonations = donations.filter(
      (donation) =>
        donation.status === "paid" &&
        Boolean(donation.livemode) === livemode,
    );
    const ytdDonations = paidDonations.filter(
      (donation) => donation.occurredAt >= yearStart,
    );
    const previousYtdDonations = paidDonations.filter(
      (donation) =>
        donation.occurredAt >= previousYearStart &&
        donation.occurredAt < previousYearToDate,
    );
    const activeSubscriptions = subscriptions.filter(
      (subscription) =>
        Boolean(subscription.livemode) === livemode &&
        ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status) &&
        !subscription.cancelAtPeriodEnd,
    );

    const upcomingEvents = events
      .filter(
        (event) =>
          event.startsAt >= now &&
          event.status !== "cancelled" &&
          event.status !== "completed",
      )
      .sort((a, b) => a.startsAt - b.startsAt);
    const recentEvents = events
      .filter((event) => event.startsAt < now && event.status !== "cancelled")
      .sort((a, b) => b.startsAt - a.startsAt);

    const eventRows = [...upcomingEvents.slice(0, 4), ...recentEvents.slice(0, 2)]
      .filter(
        (event, index, rows) =>
          rows.findIndex((candidate) => candidate._id === event._id) === index,
      )
      .map((event) => eventSummary(event, registrations, registrationChildren, volunteerCommitments));

    const months = recentMonths(now, 6);
    const monthlyTrend = months.map((month) => {
      const monthAttendance = attendance.filter(
        (row) => row.eventStartsAt >= month.start && row.eventStartsAt < month.end,
      );
      const firstTime = [...firstAttendanceByChild.values()].filter(
        (timestamp) => timestamp >= month.start && timestamp < month.end,
      ).length;
      const giving = paidDonations
        .filter(
          (donation) =>
            donation.occurredAt >= month.start && donation.occurredAt < month.end,
        )
        .reduce((total, donation) => total + donation.amountInCents, 0);
      return {
        label: month.label,
        attendance: monthAttendance.length,
        uniqueKids: new Set(monthAttendance.map((row) => row.childKey)).size,
        firstTimeKids: firstTime,
        givingInCents: giving,
      };
    });

    const recentActivity = [
      ...registrationChildren
        .filter((child) => child.checkedInAt)
        .map((child) => {
          const event = eventById.get(child.eventId);
          return event
            ? {
                id: `attendance-${child._id}`,
                kind: "attendance" as const,
                title: `${child.firstName} ${child.lastName} checked in`,
                detail: event.title,
                occurredAt: child.checkedInAt!,
                href: `/admin/events/${event.slug}`,
              }
            : null;
        })
        .filter((row): row is NonNullable<typeof row> => Boolean(row)),
      ...paidDonations.map((donation) => ({
        id: `donation-${donation._id}`,
        kind: "giving" as const,
        title: `${donation.donorFirstName ?? "A donor"} ${donation.donorLastName ?? ""}`.trim(),
        detail: `${formatCurrency(donation.amountInCents)} gift`,
        occurredAt: donation.occurredAt,
        href: "/admin/giving",
      })),
      ...volunteerSubmissions.map((submission) => ({
        id: `volunteer-${submission._id}`,
        kind: "volunteer" as const,
        title: `${submission.firstName} ${submission.lastName}`,
        detail:
          submission.status === "approved"
            ? "Approved volunteer"
            : "Volunteer application",
        occurredAt: submission.updatedAt,
        href: `/admin/volunteers/${submission._id}`,
      })),
    ]
      .sort((a, b) => b.occurredAt - a.occurredAt)
      .slice(0, 8);

    return {
      generatedAt: now,
      year,
      givingMode: livemode ? ("live" as const) : ("test" as const),
      metrics: {
        upcomingEvents: upcomingEvents.length,
        completedEventsYtd: events.filter(
          (event) =>
            event.startsAt >= yearStart &&
            event.startsAt < now &&
            event.status !== "cancelled",
        ).length,
        totalFamilies: households.length,
        newFamiliesYtd: households.filter(
          (household) => household.createdAt >= yearStart,
        ).length,
        familiesServedYtd: ytdFamiliesServed,
        savedChildren: children.filter((child) => !child.archivedAt).length,
        attendanceYtd: ytdAttendance.length,
        attendancePreviousYtd: previousYtdAttendance.length,
        uniqueKidsServedYtd: ytdUniqueKids.size,
        uniqueKidsServedPreviousYtd: previousYtdUniqueKids.size,
        firstTimeKidsYtd: ytdFirstTimeKids,
        firstTimeKidsPreviousYtd: previousYtdFirstTimeKids,
        activeVolunteers: volunteerMemberships.filter(
          (membership) => membership.status === "active",
        ).length,
        pendingVolunteers: volunteerSubmissions.filter(
          (submission) =>
            submission.status === "new" || submission.status === "pending",
        ).length,
        givingYtdInCents: ytdDonations.reduce(
          (total, donation) => total + donation.amountInCents,
          0,
        ),
        givingPreviousYtdInCents: previousYtdDonations.reduce(
          (total, donation) => total + donation.amountInCents,
          0,
        ),
        donorsYtd: new Set(
          ytdDonations.map((donation) => donation.normalizedEmail),
        ).size,
        recurringDonors: new Set(
          activeSubscriptions.map(
            (subscription) => subscription.normalizedEmail,
          ),
        ).size,
      },
      eventRows,
      monthlyTrend,
      recentActivity,
    };
  },
});

export const listGiving = query({
  args: {},
  handler: async (ctx) => {
    await requireAdminAccess(ctx);
    const livemode = stripeLiveMode();
    const [donations, subscriptions] = await Promise.all([
      ctx.db.query("donations").collect(),
      ctx.db.query("stripeSubscriptions").collect(),
    ]);
    const paid = donations
      .filter(
        (donation) =>
          donation.status === "paid" &&
          Boolean(donation.livemode) === livemode,
      )
      .sort((a, b) => b.occurredAt - a.occurredAt);
    const donorMap = new Map<
      string,
      {
        email: string;
        name: string;
        totalInCents: number;
        giftCount: number;
        lastGiftAt: number;
        recurring: boolean;
      }
    >();
    for (const donation of paid) {
      const existing = donorMap.get(donation.normalizedEmail);
      const name =
        [donation.donorFirstName, donation.donorLastName].filter(Boolean).join(" ") ||
        donation.normalizedEmail;
      donorMap.set(donation.normalizedEmail, {
        email: donation.normalizedEmail,
        name: existing?.name ?? name,
        totalInCents: (existing?.totalInCents ?? 0) + donation.amountInCents,
        giftCount: (existing?.giftCount ?? 0) + 1,
        lastGiftAt: Math.max(existing?.lastGiftAt ?? 0, donation.occurredAt),
        recurring: false,
      });
    }
    for (const subscription of subscriptions) {
      if (
        Boolean(subscription.livemode) !== livemode ||
        !ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status) ||
        subscription.cancelAtPeriodEnd
      ) {
        continue;
      }
      const existing = donorMap.get(subscription.normalizedEmail);
      if (existing) existing.recurring = true;
      else {
        donorMap.set(subscription.normalizedEmail, {
          email: subscription.normalizedEmail,
          name: subscription.normalizedEmail,
          totalInCents: 0,
          giftCount: 0,
          lastGiftAt: subscription.updatedAt,
          recurring: true,
        });
      }
    }
    return {
      mode: livemode ? ("live" as const) : ("test" as const),
      totalInCents: paid.reduce(
        (total, donation) => total + donation.amountInCents,
        0,
      ),
      giftCount: paid.length,
      averageGiftInCents:
        paid.length > 0
          ? Math.round(
              paid.reduce(
                (total, donation) => total + donation.amountInCents,
                0,
              ) / paid.length,
            )
          : 0,
      donors: [...donorMap.values()].sort(
        (a, b) => b.totalInCents - a.totalInCents || b.lastGiftAt - a.lastGiftAt,
      ),
      gifts: paid.slice(0, 100).map((donation) => ({
        id: donation._id,
        name:
          [donation.donorFirstName, donation.donorLastName]
            .filter(Boolean)
            .join(" ") || donation.normalizedEmail,
        email: donation.normalizedEmail,
        amountInCents: donation.amountInCents,
        frequency: donation.frequency,
        occurredAt: donation.occurredAt,
        receiptUrl: donation.receiptUrl,
      })),
    };
  },
});

export const listFamilies = query({
  args: {},
  handler: async (ctx) => {
    await requireAdminAccess(ctx);
    const [households, children, registrations, registrationChildren, events] =
      await Promise.all([
        ctx.db.query("households").collect(),
        ctx.db.query("children").collect(),
        ctx.db.query("registrations").collect(),
        ctx.db.query("registrationChildren").collect(),
        ctx.db.query("events").collect(),
      ]);
    const eventById = new Map(events.map((event) => [event._id, event]));
    const registrationById = new Map(
      registrations.map((registration) => [registration._id, registration]),
    );
    return households
      .map((household) => {
        const householdChildren = children.filter(
          (child) => child.householdId === household._id && !child.archivedAt,
        );
        const householdRegistrations = registrations.filter(
          (registration) =>
            registration.householdId === household._id &&
            registration.status !== "cancelled",
        );
        const attendedRows = registrationChildren.filter((child) => {
          if (!child.checkedInAt) return false;
          const registration = registrationById.get(child.registrationId);
          return registration?.householdId === household._id;
        });
        const attendedEvents = new Set(
          attendedRows.map((child) => child.eventId),
        );
        const firstVisitAt = [...attendedEvents]
          .map((eventId) => eventById.get(eventId)?.startsAt)
          .filter((timestamp): timestamp is number => Boolean(timestamp))
          .sort((a, b) => a - b)[0];
        return {
          id: household._id,
          parentName: `${household.parentFirstName} ${household.parentLastName}`,
          email: household.email,
          mobilePhone: household.mobilePhone,
          childCount: householdChildren.length,
          registrationCount: householdRegistrations.length,
          attendedEventCount: attendedEvents.size,
          attendanceCount: attendedRows.length,
          firstVisitAt,
          createdAt: household.createdAt,
        };
      })
      .sort(
        (a, b) =>
          b.attendanceCount - a.attendanceCount || b.createdAt - a.createdAt,
      );
  },
});

function attendanceKey(
  child: Doc<"registrationChildren">,
  registration: Doc<"registrations">,
) {
  return child.childId
    ? `child:${child.childId}`
    : `legacy:${registration.householdId}:${child.firstName.trim().toLowerCase()}:${child.lastName.trim().toLowerCase()}:${child.birthDate}`;
}

function eventSummary(
  event: Doc<"events">,
  registrations: Doc<"registrations">[],
  children: Doc<"registrationChildren">[],
  commitments: Doc<"volunteerEventCommitments">[],
) {
  const eventRegistrations = registrations.filter(
    (registration) => registration.eventId === event._id,
  );
  const activeChildren = children.filter(
    (child) => child.eventId === event._id && child.status === "active",
  );
  return {
    id: event._id,
    slug: event.slug,
    title: event.title,
    startsAt: event.startsAt,
    status: event.status,
    capacity: event.capacity,
    registered: eventRegistrations
      .filter((registration) => registration.status === "confirmed")
      .reduce((total, registration) => total + registration.seatCount, 0),
    waitlisted: eventRegistrations
      .filter(
        (registration) =>
          registration.status === "waitlisted" ||
          registration.status === "offered",
      )
      .reduce((total, registration) => total + registration.seatCount, 0),
    checkedIn: activeChildren.filter((child) => child.checkedInAt).length,
    volunteers: commitments.filter(
      (commitment) =>
        commitment.eventId === event._id && commitment.status === "committed",
    ).length,
  };
}

function recentMonths(now: number, count: number) {
  const date = new Date(now);
  const rows = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const start = Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth() - offset,
      1,
    );
    const end = Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth() - offset + 1,
      1,
    );
    rows.push({
      start,
      end,
      label: new Intl.DateTimeFormat("en-US", {
        month: "short",
      }).format(start),
    });
  }
  return rows;
}

function stripeLiveMode() {
  return process.env.STRIPE_LIVE_MODE === "true";
}

function formatCurrency(amountInCents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amountInCents / 100);
}
