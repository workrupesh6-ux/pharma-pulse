/**
 * The pharma desk's coverage list — NSE-listed Indian pharmaceutical
 * companies, with the NSE trading symbol (without the exchange suffix).
 *
 * This is plain data shared by the quote action and the reading board query.
 */
export const PHARMA_SECTORS = [
  "Formulations",
  "API & CDMO",
  "MNC Pharma",
  "Biologics",
] as const;

export type PharmaSector = (typeof PHARMA_SECTORS)[number];

export type PharmaCompany = {
  /** NSE trading symbol, e.g. SUNPHARMA. */
  symbol: string;
  /** Registered company name as printed on the board. */
  name: string;
  sector: PharmaSector;
};

export const PHARMA_COMPANIES: readonly PharmaCompany[] = [
  { symbol: "SUNPHARMA", name: "Sun Pharmaceutical Industries", sector: "Formulations" },
  { symbol: "CIPLA", name: "Cipla", sector: "Formulations" },
  { symbol: "DRREDDY", name: "Dr. Reddy's Laboratories", sector: "Formulations" },
  { symbol: "DIVISLAB", name: "Divi's Laboratories", sector: "API & CDMO" },
  { symbol: "LUPIN", name: "Lupin", sector: "Formulations" },
  { symbol: "AUROPHARMA", name: "Aurobindo Pharma", sector: "Formulations" },
  { symbol: "TORNTPHARM", name: "Torrent Pharmaceuticals", sector: "Formulations" },
  { symbol: "ZYDUSLIFE", name: "Zydus Lifesciences", sector: "Formulations" },
  { symbol: "ALKEM", name: "Alkem Laboratories", sector: "Formulations" },
  { symbol: "MANKIND", name: "Mankind Pharma", sector: "Formulations" },
  { symbol: "GLENMARK", name: "Glenmark Pharmaceuticals", sector: "Formulations" },
  { symbol: "ABBOTINDIA", name: "Abbott India", sector: "MNC Pharma" },
  { symbol: "IPCALAB", name: "Ipca Laboratories", sector: "Formulations" },
  { symbol: "BIOCON", name: "Biocon", sector: "Biologics" },
  { symbol: "LAURUSLABS", name: "Laurus Labs", sector: "API & CDMO" },
  { symbol: "AJANTPHARM", name: "Ajanta Pharma", sector: "Formulations" },
  { symbol: "GRANULES", name: "Granules India", sector: "API & CDMO" },
  { symbol: "NATCOPHARM", name: "Natco Pharma", sector: "Formulations" },
  { symbol: "PPLPHARMA", name: "Piramal Pharma", sector: "API & CDMO" },
  { symbol: "SYNGENE", name: "Syngene International", sector: "Biologics" },
  { symbol: "SANOFI", name: "Sanofi India", sector: "MNC Pharma" },
  { symbol: "PFIZER", name: "Pfizer", sector: "MNC Pharma" },
  { symbol: "GLAXO", name: "GlaxoSmithKline Pharmaceuticals", sector: "MNC Pharma" },
  { symbol: "JBCHEPHARM", name: "JB Chemicals & Pharmaceuticals", sector: "Formulations" },
  { symbol: "ERIS", name: "Eris Lifesciences", sector: "Formulations" },
  { symbol: "CAPLIPOINT", name: "Caplin Point Laboratories", sector: "Formulations" },
  // Suven Pharmaceuticals renamed to Cohance Lifesciences in May 2025.
  { symbol: "COHANCE", name: "Cohance Lifesciences (formerly Suven Pharmaceuticals)", sector: "API & CDMO" },
  { symbol: "FDC", name: "FDC", sector: "Formulations" },
  { symbol: "INDOCO", name: "Indoco Remedies", sector: "Formulations" },
  { symbol: "MARKSANS", name: "Marksans Pharma", sector: "Formulations" },
  { symbol: "NEULANDLAB", name: "Neuland Laboratories", sector: "API & CDMO" },
  { symbol: "SHILPAMED", name: "Shilpa Medicare", sector: "API & CDMO" },
  { symbol: "APLLTD", name: "Alembic Pharmaceuticals", sector: "Formulations" },
  { symbol: "JUBLPHARMA", name: "Jubilant Pharmova", sector: "API & CDMO" },
  { symbol: "WOCKPHARMA", name: "Wockhardt", sector: "Formulations" },
  // Sequent Scientific renamed to Viyash Scientific in January 2026.
  { symbol: "VIYASH", name: "Viyash Scientific (formerly Sequent Scientific)", sector: "API & CDMO" },
  { symbol: "HIKAL", name: "Hikal", sector: "API & CDMO" },
  { symbol: "AARTIDRUGS", name: "Aarti Drugs", sector: "API & CDMO" },
  { symbol: "ORCHPHARMA", name: "Orchid Pharma", sector: "API & CDMO" },
  { symbol: "UNICHEMLAB", name: "Unichem Laboratories", sector: "Formulations" },
  { symbol: "SMSPHARMA", name: "SMS Pharmaceuticals", sector: "API & CDMO" },
  { symbol: "PANACEABIO", name: "Panacea Biotec", sector: "Biologics" },
];
