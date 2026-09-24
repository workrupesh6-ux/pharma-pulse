/**
 * The pharma desk's coverage list — every NSE-listed pharmaceutical company
 * that the desk tracks, with the NSE trading symbol (no exchange suffix).
 *
 * How the list is built: symbols are taken from NSE's own equity master file
 * (the official list of equity-series listings) and kept only where the
 * company actually manufactures pharmaceuticals, bulk drugs, biologics or
 * ayurvedic products. Each symbol is verified to return a live NSE quote
 * before it lands here, so a delisted or renamed ticker never reaches the
 * board. Hospital, diagnostic-lab and medical-device listings are out of
 * scope — this desk follows pharma manufacturers.
 *
 * This is plain data shared by the quote action and the reading board query.
 */
export const PHARMA_SECTORS = [
  "Formulations",
  "API & CDMO",
  "MNC Pharma",
  "Biologics",
  "Ayurveda & Wellness",
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
  { symbol: "LUPIN", name: "Lupin", sector: "Formulations" },
  { symbol: "AUROPHARMA", name: "Aurobindo Pharma", sector: "Formulations" },
  { symbol: "TORNTPHARM", name: "Torrent Pharmaceuticals", sector: "Formulations" },
  { symbol: "ZYDUSLIFE", name: "Zydus Lifesciences", sector: "Formulations" },
  { symbol: "ALKEM", name: "Alkem Laboratories", sector: "Formulations" },
  { symbol: "MANKIND", name: "Mankind Pharma", sector: "Formulations" },
  { symbol: "GLENMARK", name: "Glenmark Pharmaceuticals", sector: "Formulations" },
  { symbol: "IPCALAB", name: "Ipca Laboratories", sector: "Formulations" },
  { symbol: "GRANULES", name: "Granules India", sector: "Formulations" },
  { symbol: "NATCOPHARM", name: "NATCO Pharma", sector: "Formulations" },
  { symbol: "AJANTPHARM", name: "Ajanta Pharma", sector: "Formulations" },
  { symbol: "CAPLIPOINT", name: "Caplin Point Laboratories", sector: "Formulations" },
  { symbol: "EMCURE", name: "Emcure Pharmaceuticals", sector: "Formulations" },
  { symbol: "ERIS", name: "Eris Lifesciences", sector: "Formulations" },
  { symbol: "FDC", name: "FDC", sector: "Formulations" },
  { symbol: "INDOCO", name: "Indoco Remedies", sector: "Formulations" },
  { symbol: "MARKSANS", name: "Marksans Pharma", sector: "Formulations" },
  { symbol: "APLLTD", name: "Alembic Pharmaceuticals", sector: "Formulations" },
  { symbol: "WOCKPHARMA", name: "Wockhardt", sector: "Formulations" },
  { symbol: "GLAND", name: "Gland Pharma", sector: "Formulations" },
  { symbol: "STAR", name: "Strides Pharma Science", sector: "Formulations" },
  { symbol: "AARTIPHARM", name: "Aarti Pharmalabs", sector: "Formulations" },
  { symbol: "BAJAJHCARE", name: "Bajaj HealthCare", sector: "Formulations" },
  { symbol: "AHCL", name: "Anlon Healthcare", sector: "Formulations" },
  { symbol: "AKUMS", name: "Akums Drugs and Pharmaceuticals", sector: "Formulations" },
  { symbol: "ALIVUS", name: "Alivus Life Sciences", sector: "Formulations" },
  { symbol: "AAREYDRUGS", name: "Aarey Drugs & Pharmaceuticals", sector: "Formulations" },
  { symbol: "BALAXI", name: "Balaxi Pharmaceuticals", sector: "Formulations" },
  { symbol: "BALPHARMA", name: "Bal Pharma", sector: "Formulations" },
  { symbol: "BPLPHARMA", name: "Bharat Parenterals", sector: "Formulations" },
  { symbol: "FERMENTA", name: "Fermenta Biotech", sector: "Formulations" },
  { symbol: "FREDUN", name: "Fredun Pharmaceuticals", sector: "Formulations" },
  { symbol: "GUJTHEM", name: "Gujarat Themis Biosyn", sector: "Formulations" },
  { symbol: "INDSWFTLAB", name: "Ind-Swift Laboratories", sector: "Formulations" },
  { symbol: "INNOVACAP", name: "Innova Captab", sector: "Formulations" },
  { symbol: "IOLCP", name: "IOL Chemicals and Pharmaceuticals", sector: "Formulations" },
  { symbol: "JAGSNPHARM", name: "Jagsonpal Pharmaceuticals", sector: "Formulations" },
  { symbol: "JENBURPH", name: "Jenburkt Pharmaceuticals", sector: "Formulations" },
  { symbol: "KOPRAN", name: "Kopran", sector: "Formulations" },
  { symbol: "LINCOLN", name: "Lincoln Pharmaceuticals", sector: "Formulations" },
  { symbol: "MAKERSL", name: "Makers Laboratories", sector: "Formulations" },
  { symbol: "MOREPENLAB", name: "Morepen Laboratories", sector: "Formulations" },
  { symbol: "NECLIFE", name: "Nectar Lifesciences", sector: "Formulations" },
  { symbol: "ORTINGLOBE", name: "Ortin Global", sector: "Formulations" },
  { symbol: "PARNAXLAB", name: "Parnax Lab", sector: "Formulations" },
  { symbol: "ARVEE", name: "Arvee Laboratories (India)", sector: "Formulations" },
  { symbol: "RPGLIFE", name: "RPG Life Sciences", sector: "Formulations" },
  { symbol: "SAKAR", name: "Sakar Healthcare", sector: "Formulations" },
  { symbol: "SAIPARENT", name: "Sai Parenteral's", sector: "Formulations" },
  { symbol: "SENORES", name: "Senores Pharmaceuticals", sector: "Formulations" },
  { symbol: "SHUKRAPHAR", name: "Shukra Pharmaceuticals", sector: "Formulations" },
  { symbol: "SUDEEPPHRM", name: "Sudeep Pharma", sector: "Formulations" },
  { symbol: "SUNLOC", name: "Sunil Healthcare", sector: "Formulations" },
  { symbol: "SUVEN", name: "Suven Life Sciences", sector: "Formulations" },
  { symbol: "SUPRIYA", name: "Supriya Lifescience", sector: "Formulations" },
  { symbol: "SYNCOMF", name: "Syncom Formulations (India)", sector: "Formulations" },
  { symbol: "THEMISMED", name: "Themis Medicare", sector: "Formulations" },
  { symbol: "VAISHALI", name: "Vaishali Pharma", sector: "Formulations" },
  { symbol: "VENUSREM", name: "Venus Remedies", sector: "Formulations" },
  { symbol: "WANBURY", name: "Wanbury", sector: "Formulations" },
  { symbol: "WINDLAS", name: "Windlas Biotech", sector: "Formulations" },
  { symbol: "ZIMLAB", name: "ZIM Laboratories", sector: "Formulations" },
  { symbol: "BIOFILCHEM", name: "Biofil Chemicals and Pharmaceuticals", sector: "Formulations" },
  { symbol: "BETA", name: "Beta Drugs", sector: "Formulations" },
  { symbol: "ABBOTINDIA", name: "Abbott India", sector: "MNC Pharma" },
  { symbol: "ASTRAZEN", name: "AstraZeneca Pharma India", sector: "MNC Pharma" },
  { symbol: "GLAXO", name: "GlaxoSmithKline Pharmaceuticals", sector: "MNC Pharma" },
  { symbol: "NOVARTIND", name: "Novartis India", sector: "MNC Pharma" },
  { symbol: "PFIZER", name: "Pfizer", sector: "MNC Pharma" },
  { symbol: "SANOFI", name: "Sanofi India", sector: "MNC Pharma" },
  { symbol: "SANOFICONR", name: "Sanofi Consumer Healthcare India", sector: "MNC Pharma" },
  { symbol: "PGHL", name: "Procter & Gamble Health", sector: "MNC Pharma" },
  { symbol: "DIVISLAB", name: "Divi's Laboratories", sector: "API & CDMO" },
  { symbol: "LAURUSLABS", name: "Laurus Labs", sector: "API & CDMO" },
  { symbol: "ORCHPHARMA", name: "Orchid Pharma", sector: "API & CDMO" },
  { symbol: "HIKAL", name: "Hikal", sector: "API & CDMO" },
  { symbol: "NEULANDLAB", name: "Neuland Laboratories", sector: "API & CDMO" },
  { symbol: "SHILPAMED", name: "Shilpa Medicare", sector: "API & CDMO" },
  { symbol: "SMSPHARMA", name: "SMS Pharmaceuticals", sector: "API & CDMO" },
  { symbol: "AARTIDRUGS", name: "Aarti Drugs", sector: "API & CDMO" },
  { symbol: "AARTIIND", name: "Aarti Industries", sector: "API & CDMO" },
  // Suven Pharmaceuticals was renamed to Cohance Lifesciences in May 2025.
  { symbol: "COHANCE", name: "Cohance Lifesciences (formerly Suven Pharmaceuticals)", sector: "API & CDMO" },
  // Sequent Scientific was renamed to Viyash Scientific in January 2026.
  { symbol: "VIYASH", name: "Viyash Scientific (formerly Sequent Scientific)", sector: "API & CDMO" },
  { symbol: "JUBLPHARMA", name: "Jubilant Pharmova", sector: "API & CDMO" },
  { symbol: "PPLPHARMA", name: "Piramal Pharma", sector: "API & CDMO" },
  { symbol: "ANUHPHR", name: "Anuh Pharma", sector: "API & CDMO" },
  { symbol: "ALKYLAMINE", name: "Alkyl Amines Chemicals", sector: "API & CDMO" },
  { symbol: "ADVENZYMES", name: "Advanced Enzyme Technologies", sector: "API & CDMO" },
  { symbol: "TATVA", name: "Tatva Chintan Pharma Chem", sector: "API & CDMO" },
  { symbol: "VINATIORGA", name: "Vinati Organics", sector: "API & CDMO" },
  { symbol: "MANORG", name: "Mangalam Organics", sector: "API & CDMO" },
  { symbol: "SIGACHI", name: "Sigachi Industries", sector: "API & CDMO" },
  { symbol: "NGLFINE", name: "NGL Fine-Chem", sector: "API & CDMO" },
  { symbol: "SYMBIOTEC", name: "Symbiotec Pharmalab", sector: "API & CDMO" },
  { symbol: "GUFICBIO", name: "Gufic Biosciences", sector: "API & CDMO" },
  { symbol: "SOLARA", name: "Solara Active Pharma Sciences", sector: "API & CDMO" },
  { symbol: "BLUEJET", name: "Blue Jet Healthcare", sector: "API & CDMO" },
  { symbol: "DCAL", name: "Dishman Carbogen Amcis", sector: "API & CDMO" },
  { symbol: "SAILIFE", name: "Sai Life Sciences", sector: "API & CDMO" },
  { symbol: "BIOCON", name: "Biocon", sector: "Biologics" },
  { symbol: "PANACEABIO", name: "Panacea Biotec", sector: "Biologics" },
  { symbol: "HESTERBIO", name: "Hester Biosciences", sector: "Biologics" },
  { symbol: "SYNGENE", name: "Syngene International", sector: "Biologics" },
  { symbol: "ZOTA", name: "Zota Health Care", sector: "Biologics" },
  { symbol: "DABUR", name: "Dabur India", sector: "Ayurveda & Wellness" },
  { symbol: "AMRUTANJAN", name: "Amrutanjan Health Care", sector: "Ayurveda & Wellness" },
  { symbol: "SGRL", name: "Shree Ganesh Remedies", sector: "Ayurveda & Wellness" },
  { symbol: "ALBERTDAVD", name: "Albert David", sector: "Ayurveda & Wellness" },
  { symbol: "ZYDUSWELL", name: "Zydus Wellness", sector: "Ayurveda & Wellness" },
  { symbol: "TTKHLTCARE", name: "TTK Healthcare", sector: "Ayurveda & Wellness" },
];
