import type { PharmaSector } from "./pharmaData";

/**
 * Coverage classification.
 *
 * The NSE equity master tells us what is listed, but not what a company does,
 * so the desk has to make the call itself. These are deliberately blunt
 * heuristics: a name has to carry an unmistakable pharmaceutical word, and it
 * is thrown out if it also reads as a hospital, a diagnostic lab, a device
 * maker or a holding shell. Two rules keep the roster honest:
 *
 *   1. Names that fail every check are simply not tracked — the desk would
 *      rather miss a company than print a cement maker under a pharma desk.
 *   2. The curated seed list (src/convex/pharmaData.ts) always wins. It is
 *      never filtered, and its desk assignment is never overridden, which is
 *      how names such as Dabur India stay on the Ayurveda desk even though
 *      their registered names contain no pharmaceutical keyword.
 *
 * Note the deliberate exclusion of "healthcare" and "wellness" from the
 * discovery signals. Hospital chains, diagnostic networks and distributors
 * print those words too — Fortis Healthcare, Max Healthcare and Aster DM
 * Healthcare all match on the first, and none of them make medicine. Those
 * words still appear in the curated seed, where each name was checked by hand.
 *
 * Everything the sync discovers is also re-checked against the live quote feed
 * before it is trusted, so a renamed or delisted ticker drops off by itself.
 */

/** Names that may match a pharmaceutical word but are out of scope for this desk. */
const OUT_OF_SCOPE: readonly RegExp[] = [
  /\bhospitals?\b/,
  /\bdiagnostics?\b/,
  /\bpathlabs?\b/,
  /\bpath labs?\b/,
  /\bimaging\b/,
  /\bscans?\b/,
  /\bdevices?\b/,
  /\bsurgicals?\b/,
  /\bimplants?\b/,
  /\bclinical research\b/,
  /\bcontract research\b/,
  /\bveterinary\b/,
  /\banimal health\b/,
  /\bpet care\b/,
  /\bnursing\b/,
  /\bpolyclinic\b/,
  /\bclinics?\b/,
  /\bmedicare\b/,
  /\bdialysis\b/,
  /\beye care\b/,
  /\bequipments?\b/,
  /\binstruments?\b/,
  /\bholdings?\b/,
  /\bfinance\b/,
  /\bcapital\b/,
  /\bsecurities\b/,
  /\binvestments?\b/,
  /\bventures?\b/,
  /\btrading\b/,
  /\bdistributors?\b/,
  /\bfoods?\b/,
  /\bagro\b/,
  /\bfertilisers?\b/,
  /\bfertilizers?\b/,
  /\bpesticides?\b/,
  /\bbeverages?\b/,
  /\bdairy\b/,
  /\bcosmetics?\b/,
  /\btoiletries\b/,
];

/**
 * An unmistakable pharmaceutical signal. A discovered name has to carry one of
 * these; there is no soft tier, because every softer word also describes
 * someone who is not a drug maker.
 */
const IN_SCOPE: readonly RegExp[] = [
  /pharma/,
  /pharmaceut/,
  /\bdrugs?\b/,
  /formulations?/,
  /\bmedicines?\b/,
  /\bremedies\b/,
  /ayurved/,
  /\bherbal\b/,
  /life ?sciences?/,
  /biosciences?/,
  /biotech/,
  /biologics?\b/,
  /biologicals/,
  /\bvaccines?\b/,
  /\bserum\b/,
  /\bsera\b/,
  /parenteral/,
  /\bbulk drugs?\b/,
  /homeopath/,
];

/** Parents whose Indian arm prints as a multinational desk name. */
const MNC_MARKERS: readonly string[] = [
  "abbott",
  "astrazeneca",
  "bayer",
  "boehringer",
  "bristol",
  "fresenius",
  "glaxo",
  "gsk",
  "johnson",
  "lilly",
  "merck",
  "novartis",
  "novo nordisk",
  "pfizer",
  "procter",
  "reckitt",
  "roche",
  "sanofi",
  "teva",
  "viatris",
];

const WELLNESS_MARKERS: readonly string[] = [
  "ayurved",
  "herbal",
  "wellness",
  "homeopath",
  "natural",
  "siddha",
  "unani",
];

const BIOLOGICS_MARKERS: readonly string[] = [
  "biologic",
  "biotech",
  "bioscience",
  "vaccine",
  "serum",
  "plasma",
  "immune",
  "stem cell",
  "genomic",
  "gene",
];

const API_CDMO_MARKERS: readonly string[] = [
  "bulk drug",
  "active pharma",
  "intermediate",
  "cdmo",
  "contract development",
  "contract manufacturing",
  "life science",
  "lifescience",
  "fine chem",
  "speciality chemical",
  "specialty chemical",
  "organics",
  "peptide",
];

/**
 * Which desk a name belongs on, judged from the name alone. Exported because
 * the screener in tvScreener.ts files its own rows with the same markers, so a
 * name never lands on one desk when it is discovered and another when it is
 * screened.
 */
export function deskForName(name: string): PharmaSector {
  // Normalised here rather than at the call site: the classifier hands over an
  // already-lowercased name, but the screener passes its own display-case
  // company name, and every marker is lowercase.
  const needle = name.toLowerCase();
  const has = (markers: readonly string[]) => markers.some((marker) => needle.includes(marker));

  if (has(MNC_MARKERS)) return "MNC Pharma";
  if (has(WELLNESS_MARKERS)) return "Ayurveda & Wellness";
  if (has(BIOLOGICS_MARKERS)) return "Biologics";
  if (has(API_CDMO_MARKERS)) return "API & CDMO";
  return "Formulations";
}

/**
 * The desk a listed company belongs on, or `null` when it is not a
 * pharmaceutical manufacturer and should stay off the roster.
 */
export function classifyListing(name: string): PharmaSector | null {
  const needle = name.toLowerCase();

  if (OUT_OF_SCOPE.some((pattern) => pattern.test(needle))) return null;
  if (!IN_SCOPE.some((pattern) => pattern.test(needle))) return null;

  return deskForName(needle);
}
