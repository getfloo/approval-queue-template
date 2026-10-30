// Fills an empty dev database with sample requests so the queue has something in it.
// Run it with the dev database's credentials: floo run --service web -- npm run seed
// It is not in the production image and nothing runs it automatically.
import { like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { requests } from "../db/schema";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("Missing DATABASE_URL. Run: floo run --service web -- npm run seed");
}

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000);
const people = {
  maya: { requestedById: "seed-maya", requestedByName: "Maya Chen" },
  jordan: { requestedById: "seed-jordan", requestedByName: "Jordan Ellis" },
  priya: { requestedById: "seed-priya", requestedByName: "Priya Raman" },
  sam: { requestedById: "seed-sam", requestedByName: "Sam Okafor" },
};
const admin = { decidedById: "seed-alex", decidedByName: "Alex Morgan", decidedVia: "app" };

const samples: (typeof requests.$inferInsert)[] = [
  {
    ...people.maya, requestedVia: "app", createdAt: hoursAgo(3),
    title: "15% discount for Northwind renewal", category: "discount", amount: 4200,
    justification: "Northwind is renewing 40 seats for two years if we match last year's rate. The discount is on the second year only.",
  },
  {
    ...people.jordan, requestedVia: "app", createdAt: hoursAgo(6),
    title: "Second monitor for the support desk", category: "purchase", amount: 289.99,
    justification: "Two support agents share one screen during handoffs. A second 27 inch monitor halves the time spent switching tabs.",
  },
  {
    ...people.priya, requestedVia: "app", createdAt: hoursAgo(20),
    title: "Read access to the billing database", category: "access",
    justification: "I am reconciling the Q3 invoices with finance and need to query payment records directly for two weeks.",
  },
  {
    ...people.sam, requestedVia: "app", createdAt: hoursAgo(26),
    title: "Time off: 18 to 22 November", category: "time_off", amount: 5,
    justification: "Family trip, planned since summer. Jordan has agreed to cover my on-call shift.",
  },
  {
    requestedById: "seed-renewals-agent", requestedByName: "renewals-agent", requestedVia: "api", createdAt: hoursAgo(30),
    title: "Extend trial for Fabrikam by 14 days", category: "other",
    justification: "Fabrikam's admin was out for a week of their trial. Usage resumed yesterday and their champion asked for more time.",
  },
  {
    ...people.maya, requestedVia: "app", createdAt: hoursAgo(72),
    title: "Conference ticket for DataConf", category: "purchase", amount: 650,
    justification: "Three of our target accounts are speaking. I would run the booth with Sam on the second day.",
    status: "approved", ...admin, decidedAt: hoursAgo(50), decisionComment: "Approved. Please share notes with the team after.",
  },
  {
    ...people.jordan, requestedVia: "app", createdAt: hoursAgo(96),
    title: "Admin role in the CRM", category: "access",
    justification: "I keep asking others to merge duplicate contacts. Admin would let me do it myself.",
    status: "rejected", ...admin, decidedAt: hoursAgo(90), decisionComment: "Admin also grants billing settings. I have added you to the data hygiene group instead, which can merge contacts.",
  },
  {
    ...people.priya, requestedVia: "app", createdAt: hoursAgo(120),
    title: "30% discount for a nonprofit customer", category: "discount", amount: 1800,
    justification: "Hope Kitchen is a registered nonprofit with 12 seats. Our nonprofit policy allows up to 30%.",
    status: "approved", ...admin, decidedAt: hoursAgo(118), decisionComment: "Within policy.",
  },
];

const client = postgres(url, { max: 1 });
try {
  const db = drizzle(client);
  const existing = await db.select({ id: requests.id }).from(requests).where(like(requests.requestedById, "seed-%")).limit(1);
  if (existing.length > 0) {
    console.log("Sample requests are already there. Nothing to do.");
  } else {
    await db.insert(requests).values(samples);
    console.log(`Added ${samples.length} sample requests. Sign in as an admin and open /queue.`);
  }
} finally {
  await client.end();
}
