/**
 * Seeds demo/test data into Supabase for local development.
 *
 * Usage: npm run seed
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.
 *
 * Every account created here is flagged is_demo = true (or is a clearly
 * named test-* account) so it can never be confused with a real,
 * independently-verified beta user.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

// dotenv's bare "dotenv/config" import only loads .env by default — our
// secrets live in .env.local (the Next.js convention), so it must be named
// explicitly or every var below comes back undefined.
config({ path: ".env.local" });

const SEED_PASSWORD = "AscendDemo123!";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

// supabase-js always constructs a Realtime client, even though this script
// only ever does plain REST/Auth-admin calls. On Node 20 (no native global
// WebSocket) that constructor throws unless a `transport` is supplied — so
// hand it an inert stand-in; it's never actually opened or used here.
class NoopWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
  close() {}
  send() {}
  addEventListener() {}
  removeEventListener() {}
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: NoopWebSocket as unknown as never },
});

interface SeedFounder {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  country: string;
  category: string;
  businessName: string;
  bio: string;
  isDemo: boolean;
  revenueVisibility: "exact" | "range" | "private";
  // Monthly revenue in cents, oldest to newest. Empty = unverified/no history.
  history: number[];
}

const FOUNDERS: SeedFounder[] = [
  {
    email: "thomas.dubois@demo.ascend.app",
    username: "thomasdubois",
    firstName: "Thomas",
    lastName: "Dubois",
    country: "FR",
    category: "saas",
    businessName: "Cadence",
    bio: "Je construis la couche analytique des équipes SaaS européennes.",
    isDemo: true,
    revenueVisibility: "exact",
    history: [14200000, 15100000, 16400000, 17200000, 17900000, 18254000],
  },
  {
    email: "lucas.martin@demo.ascend.app",
    username: "lucasmartin",
    firstName: "Lucas",
    lastName: "Martin",
    country: "FR",
    category: "ecommerce",
    businessName: "Maison Verte",
    bio: "Produits pour la maison durables, livrés partout en Europe.",
    isDemo: true,
    revenueVisibility: "exact",
    history: [8200000, 8900000, 9700000, 10800000, 11200000, 14123000],
  },
  {
    email: "emma.laurent@demo.ascend.app",
    username: "emmalaurent",
    firstName: "Emma",
    lastName: "Laurent",
    country: "FR",
    category: "saas",
    businessName: "Fluent Ops",
    bio: "Automatisation des opérations pour les équipes distantes agiles.",
    isDemo: true,
    revenueVisibility: "range",
    history: [10900000, 11200000, 11500000, 11900000, 12300000, 12689000],
  },
  {
    email: "julien.moreau@demo.ascend.app",
    username: "julienmoreau",
    firstName: "Julien",
    lastName: "Moreau",
    country: "FR",
    category: "agency",
    businessName: "Studio Moreau",
    bio: "Design de marque et produit pour des startups ambitieuses.",
    isDemo: true,
    revenueVisibility: "exact",
    history: [7100000, 7600000, 8000000, 8700000, 9300000, 9820000],
  },
  {
    email: "sofia.rossi@demo.ascend.app",
    username: "sofiarossi",
    firstName: "Sofia",
    lastName: "Rossi",
    country: "IT",
    category: "consulting",
    businessName: "Rossi Consulting",
    bio: "Directrice financière à temps partagé pour jeunes fondateurs.",
    isDemo: true,
    revenueVisibility: "range",
    history: [6200000, 6500000, 6900000, 7400000, 7900000, 8410000],
  },
  {
    email: "alex.martin@demo.ascend.app",
    username: "alexmartin",
    firstName: "Alex",
    lastName: "Martin",
    country: "FR",
    category: "saas",
    businessName: "Alto",
    bio: "Je construis le futur de la collaboration asynchrone.",
    isDemo: true,
    revenueVisibility: "range",
    history: [1720000, 1890000, 2010000, 2240000, 2350000, 2482000],
  },
  {
    email: "test.verified@ascend.app",
    username: "test_verified",
    firstName: "Vera",
    lastName: "Verified",
    country: "US",
    category: "saas",
    businessName: "Testbed Software",
    bio: "Compte de test : vérifié, revenus en croissance.",
    isDemo: true,
    revenueVisibility: "exact",
    history: [500000, 620000, 700000, 810000, 890000, 1050000],
  },
  {
    email: "test.decrease@ascend.app",
    username: "test_decrease",
    firstName: "Dana",
    lastName: "Decline",
    country: "US",
    category: "ecommerce",
    businessName: "Testbed Goods",
    bio: "Compte de test : vérifié, revenus en baisse.",
    isDemo: true,
    revenueVisibility: "exact",
    history: [900000, 850000, 780000, 700000, 640000, 590000],
  },
  {
    email: "test.unverified@ascend.app",
    username: "test_unverified",
    firstName: "Uma",
    lastName: "Unverified",
    country: "US",
    category: "app",
    businessName: "Testbed App",
    bio: "Compte de test : aucune source de revenus connectée.",
    isDemo: true,
    revenueVisibility: "private",
    history: [],
  },
];

function monthsAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - n);
  return d.toISOString().slice(0, 10);
}

async function seedFounder(founder: SeedFounder) {
  const { data: existing } = await admin.auth.admin.listUsers();
  let userId = existing.users.find((u) => u.email === founder.email)?.id;

  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email: founder.email,
      password: SEED_PASSWORD,
      email_confirm: true,
    });
    if (error || !data.user) throw new Error(`Auth create failed for ${founder.email}: ${error?.message}`);
    userId = data.user.id;
  }

  await admin.from("profiles").upsert(
    {
      id: userId,
      username: founder.username,
      first_name: founder.firstName,
      last_name: founder.lastName,
      country: founder.country,
      bio: founder.bio,
      onboarding_step: "done",
      is_demo: founder.isDemo,
      revenue_verified: founder.history.length > 0,
    },
    { onConflict: "id" },
  );

  await admin.from("businesses").upsert(
    { user_id: userId, name: founder.businessName, category: founder.category },
    { onConflict: "user_id" },
  );

  await admin
    .from("privacy_settings")
    .upsert({ user_id: userId, revenue_visibility: founder.revenueVisibility }, { onConflict: "user_id" });

  if (founder.history.length === 0) {
    console.log(`✓ ${founder.username} (no revenue history)`);
    return;
  }

  const { data: source } = await admin
    .from("revenue_sources")
    .upsert(
      {
        user_id: userId,
        provider: "stripe",
        status: "connected",
        external_account_id: `acct_demo_${founder.username}`,
        is_test_mode: true,
        connected_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" },
    )
    .select()
    .single();

  await admin
    .from("verifications")
    .upsert(
      { revenue_source_id: source!.id, status: "verified", verified_at: new Date().toISOString(), last_checked_at: new Date().toISOString() },
      { onConflict: "revenue_source_id" },
    );

  const months = founder.history.length;
  for (let i = 0; i < months; i++) {
    const period = monthsAgo(months - 1 - i);
    await admin.from("revenue_snapshots").upsert(
      {
        user_id: userId,
        revenue_source_id: source!.id,
        period,
        amount_cents: founder.history[i],
        currency: "EUR",
        is_verified: true,
      },
      { onConflict: "user_id,period" },
    );
  }

  await admin.from("user_achievements").upsert(
    { user_id: userId, achievement_id: "first-verified-revenue" },
    { onConflict: "user_id,achievement_id" },
  );

  console.log(`✓ ${founder.username} — ${founder.history.length} months seeded`);
}

async function main() {
  console.log("Seeding ASCEND demo data...\n");
  for (const founder of FOUNDERS) {
    await seedFounder(founder);
  }

  console.log("\nCapturing a baseline leaderboard snapshot for rank-movement demos...");
  const { error } = await admin.rpc("capture_leaderboard_snapshot", {
    p_snapshot_date: monthsAgo(1),
  });
  if (error) console.warn("Snapshot capture failed:", error.message);

  console.log(`\nDone. All demo accounts share the password: ${SEED_PASSWORD}`);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
