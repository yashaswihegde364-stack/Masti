import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

export const subscriptionRouter = Router();
subscriptionRouter.use(requireAuth);

/**
 * No live payment processor is wired up yet (see docs/ROADMAP.md) — this
 * just reports the free tier so the paywall screen has something real to
 * render against. Stripe/RevenueCat integration replaces the body of
 * these two handlers without changing the response shape the app expects.
 */
subscriptionRouter.get("/", async (req: AuthedRequest, res) => {
  const { rows } = await pool.query(
    `select status, plan, current_period_end from subscriptions
     where user_id = $1 order by created_at desc limit 1`,
    [req.userId]
  );

  res.json(rows[0] ?? { status: "free", plan: null, current_period_end: null });
});

subscriptionRouter.post("/checkout", async (_req: AuthedRequest, res) => {
  res.status(501).json({
    error: "Payment processor not yet wired up.",
    nextStep: "Integrate Stripe or RevenueCat here — see docs/ROADMAP.md.",
  });
});
