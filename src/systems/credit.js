/**
 * Story Phase 16: GRAND SASHBACK REWARDS and the GRAND CURRENCY CONVERTER. The
 * supernatural bank's two worst products. Rules only (the `appraise` and
 * `currencyConverter` commands play them at the counter). Neither ever touches
 * the purse: tokens are story variables, the converter pays out in Coffin
 * Sock, and nothing here can be farmed.
 *
 * data/story/credit.json:
 *
 *   "sashback": {
 *     "base": 520, "min": 300, "max": 999,
 *     "scoreVar": "credit_last_score", "classValue": "credit_last_class",
 *     "notes": [ { "id": "top", "prompt": "...", "options": [{ "text": "...", "points": 90 }] }, ... ],
 *     "classes": [ { "min": 800, "label": "RAUNCHY / EXCELLENT" }, ... ],   // highest first
 *     "bonuses": [ { "min": 800, "tokens": 50000 }, ... ],                    // highest first
 *     "issuedVar": "sashback_tokens_issued", "cardsVar": "sashback_cards"
 *   },
 *   "converter": {
 *     "convertedVar": "converter_tokens_converted", "usesVar": "converter_uses",
 *     "policyFlag": "converter_air_quality_policy", "policyLimit": 1000,
 *     "blasts": [ { "min": 1, "level": "puff" }, { "min": 100, "level": "blast" }, { "min": 5000, "level": "catastrophe" } ]
 *   }
 *
 * This is not credit scoring: the fouler and more historic the sash, the
 * higher the number. That's the joke.
 */

export function creditDef(content, id) {
  const d = content?.credit?.get?.(id);
  if (!d) throw new Error(`No credit definition "${id}" (data/story/credit.json)`);
  return d;
}

/** A sash's score from the notes picked (option indexes, one per note) and the applicant's own bias. */
export function appraisalScore(def, picks, bias = 0) {
  let score = def.base ?? 500;
  (def.notes ?? []).forEach((n, i) => {
    score += n.options?.[picks[i] ?? 0]?.points ?? 0;
  });
  score += bias;
  return Math.max(def.min ?? 300, Math.min(def.max ?? 999, Math.round(score)));
}

/** The class a score earns ("RAUNCHY / EXCELLENT"). */
export function creditClass(def, score) {
  return (def.classes ?? []).find((c) => score >= c.min)?.label ?? 'UNRATED';
}

/** The welcome bonus a score earns, in Grand Tokens (the customer's, never the captain's). */
export function welcomeBonus(def, score) {
  return (def.bonuses ?? []).find((b) => score >= b.min)?.tokens ?? 0;
}

/**
 * The converter: how many of the offered tokens actually go in (the policy
 * limit, once it's posted, caps it) and how bad the payout is.
 */
export function conversion(def, session, offered) {
  const limited = def.policyFlag && session.story.has(def.policyFlag) ? Math.min(offered, def.policyLimit ?? offered) : offered;
  const amount = Math.max(0, Math.floor(limited));
  const blast = [...(def.blasts ?? [])].sort((a, b) => b.min - a.min).find((b) => amount >= b.min)?.level ?? null;
  return { amount, capped: amount < offered, blast };
}
