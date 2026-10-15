/**
 * Heuristic Cambridge-style question segmentation for PDF.js extracted text.
 * This deliberately keeps subparts (a), (i), etc. inside their parent question.
 * Uncertain pages are preserved as review-required passages rather than discarded.
 */
const TOPIC_KEYWORDS = {
  physics: {
    "Kinematics": ["velocity", "speed", "displacement", "acceleration", "motion", "distance-time", "velocity-time"],
    "Dynamics": ["newton", "resultant force", "momentum", "impulse", "collision", "inertia"],
    "Forces & Moments": ["moment", "torque", "centre of mass", "equilibrium", "couple"],
    "Work, Energy & Power": ["work done", "kinetic energy", "gravitational potential", "power", "efficiency"],
    "Waves": ["wavelength", "frequency", "diffraction", "interference", "stationary wave", "polarisation", "refraction"],
    "Electricity": ["current", "resistance", "potential difference", "emf", "resistivity", "capacitor", "kirchhoff"],
    "Fields": ["gravitational field", "electric field", "magnetic field", "flux density", "orbital", "satellite"],
    "Quantum Physics": ["photon", "photoelectric", "work function", "de broglie", "quantum", "energy level"],
    "Nuclear Physics": ["radioactive", "half-life", "decay constant", "nucleus", "binding energy", "fission", "fusion"]
  },
  chemistry: {
    "Atomic Structure": ["proton", "neutron", "electron", "isotope", "ionisation energy", "atomic radius", "electron configuration"],
    "Chemical Bonding": ["covalent", "ionic", "metallic bond", "hydrogen bond", "intermolecular", "electronegativity", "shape of molecule"],
    "Energetics": ["enthalpy", "exothermic", "endothermic", "hess", "bond energy", "activation energy"],
    "Equilibria": ["equilibrium", "le chatelier", "equilibrium constant", "kc", "kp"],
    "Reaction Kinetics": ["rate of reaction", "reaction rate", "catalyst", "rate equation", "order of reaction"],
    "Organic Chemistry": ["alkane", "alkene", "nucleophilic", "electrophilic", "organic", "isomer", "functional group", "mechanism"],
    "Electrochemistry": ["electrode", "electrolysis", "redox", "oxidation", "reduction", "cell potential", "electrochemical"]
  },
  mathematics: {
    "Quadratics": ["quadratic", "discriminant", "completing the square", "roots of"],
    "Functions": ["function", "domain", "range", "composite", "inverse function", "f(x)"],
    "Differentiation": ["differentiate", "derivative", "gradient", "stationary point", "tangent", "dy/dx"],
    "Integration": ["integrate", "integration", "area under", "indefinite integral", "definite integral"],
    "Trigonometry": ["sine", "cosine", "tan", "trigonometric", "radian", "sin", "cos"],
    "Vectors": ["vector", "magnitude", "scalar product", "position vector", "direction vector"],
    "Probability": ["probability", "binomial", "normal distribution", "expected value", "variance", "standard deviation"],
    "Mechanics": ["acceleration", "velocity", "displacement", "force", "projectile", "friction", "momentum"]
  },
  "further-math": {
    "Matrices": ["matrix", "matrices", "determinant", "eigenvalue"],
    "Complex Numbers": ["complex number", "argand", "modulus", "argument", "imaginary"],
    "Polar Coordinates": ["polar coordinate", "r = ", "theta"],
    "Proof by Induction": ["induction", "prove that", "n = k"],
    "Differential Equations": ["differential equation", "dy/dx", "general solution"]
  },
  it: {
    "Data Processing": ["data processing", "validation", "verification", "information system"],
    "Hardware & Software": ["operating system", "hardware", "software", "cpu", "processor", "utility software"],
    "Networks": ["network", "protocol", "router", "topology", "internet", "lan", "wan"],
    "Spreadsheets": ["spreadsheet", "cell reference", "formula", "function", "workbook"],
    "Databases": ["database", "query", "primary key", "foreign key", "normalisation", "sql"]
  },
  "computer-science": {
    "Data Representation": ["binary", "hexadecimal", "two's complement", "character set", "floating point"],
    "Logic Gates": ["logic gate", "truth table", "boolean", "nand", "nor", "flip-flop"],
    "Algorithms": ["algorithm", "flowchart", "pseudocode", "trace table", "big o"],
    "Databases": ["database", "primary key", "foreign key", "sql", "normalisation"],
    "Networking": ["network", "protocol", "tcp", "ip address", "router", "packet switching"],
    "Processor Fundamentals": ["processor", "register", "fetch-decode-execute", "program counter", "alu"]
  },
  biology: {
    "Cell Structure": ["cell membrane", "organelle", "mitochond", "ribosome", "microscope", "cell structure"],
    "Biological Molecules": ["protein", "carbohydrate", "lipid", "amino acid", "dna", "rna", "monomer"],
    "Enzymes": ["enzyme", "active site", "substrate", "competitive inhibitor", "denaturation"],
    "Transport": ["diffusion", "osmosis", "active transport", "translocation", "water potential"],
    "Genetics": ["gene", "allele", "inheritance", "genotype", "phenotype", "meiosis", "mutation"],
    "Immunity": ["antibody", "antigen", "pathogen", "immune response", "vaccination", "phagocytosis"]
  },
  economics: {
    "Demand & Supply": ["demand", "supply", "equilibrium price", "market price", "subsidy", "tax"],
    "Elasticity": ["price elasticity", "income elasticity", "cross elasticity", "elasticity of demand"],
    "Market Failure": ["market failure", "externality", "public good", "merit good", "demerit good"],
    "Macroeconomic Policy": ["fiscal policy", "monetary policy", "interest rate", "government spending", "unemployment"],
    "International Trade": ["exchange rate", "balance of payments", "tariff", "trade", "protectionism"],
    "Inflation": ["inflation", "consumer price index", "price level", "deflation"]
  }
};

export function textItemsToLines(items, pageWidth = 595) {
  const rows = [];
  for (const item of items) {
    if (!item || typeof item.str !== "string" || !item.str.trim()) continue;
    const x = Number(item.transform?.[4] ?? 0);
    const y = Number(item.transform?.[5] ?? 0);
    let row = rows.find(r => Math.abs(r.y - y) <= 2.5);
    if (!row) { row = { y, items: [] }; rows.push(row); }
    row.items.push({ x, text: item.str });
  }
  return rows.sort((a,b) => b.y-a.y).map(row => {
    row.items.sort((a,b) => a.x-b.x);
    return { x: row.items[0]?.x ?? 0, y: row.y, text: row.items.map(x => x.text).join(" ").replace(/\s+/g," ").trim() };
  }).filter(row => row.text);
}

const isTopLevelHeader = (line, pageWidth) => {
  const text = line.text;
  const match = text.match(/^\s*(\d{1,2})\s+(?=\(?[A-Za-z]|[A-Z]|\()/);
  if (!match) return null;
  const number = Number(match[1]);
  if (number < 1 || number > 40) return null;
  // Question numbers usually sit in the left margin; ignore numbered instructions in body text.
  if (line.x > Math.min(125, pageWidth * 0.24)) return null;
  if (/^\s*\d{1,2}\s*(?:\/|\.|\d)/.test(text)) return null;
  return number;
};

export function segmentPages(pages, { subjectId = "other", minChars = 24 } = {}) {
  const all = [];
  let active = null;
  let lastQuestionNumber = 0;
  const flush = () => {
    if (!active) return;
    const prompt = active.lines.join("\n").replace(/[ \t]+\n/g,"\n").trim();
    if (prompt.length >= minChars) {
      all.push({
        questionNumber: active.questionNumber,
        prompt,
        sourcePage: active.startPage,
        sourceEndPage: active.endPage,
        sourcePages: [...new Set(active.pages)],
        marks: extractMarks(prompt),
        topic: classifyTopic(subjectId, prompt),
        recordType: active.headerFound ? "question" : "page-passage",
        reviewRequired: !active.headerFound || prompt.length < 45
      });
    }
    active = null;
  };
  for (const page of pages) {
    const lines = page.lines ?? [];
    const headers = lines.map((line, i) => ({ line, i, number: isTopLevelHeader(line, page.width ?? 595) }))
      .filter(x => x.number !== null);
    // Accept sequential/near-sequential numbering only. This filters most false positives
    // from numeric data, question references and page furniture.
    const accepted = [];
    let cursor = lastQuestionNumber;
    for (const h of headers) {
      const expected = cursor === 0 ? h.number <= 3 : h.number > cursor && h.number <= cursor + 3;
      if (expected && (accepted.length === 0 || h.i - accepted[accepted.length-1].i >= 2)) {
        accepted.push(h); cursor = h.number;
      }
    }
    const byIndex = new Map(accepted.map(h => [h.i, h]));
    lines.forEach((line, i) => {
      const header = byIndex.get(i);
      if (header) {
        flush();
        lastQuestionNumber = header.number;
        active = { questionNumber: header.number, startPage: page.pageNumber, endPage: page.pageNumber, pages: [page.pageNumber], lines: [line.text], headerFound: true };
      } else if (active) {
        active.lines.push(line.text); active.endPage = page.pageNumber; active.pages.push(page.pageNumber);
      } else {
        // Preserve front matter/instructions as a passage, but don't mix it into question records.
        if (!all.some(x => x.recordType === "page-passage" && x.sourcePage === page.pageNumber)) {
          active = { questionNumber: page.pageNumber, startPage: page.pageNumber, endPage: page.pageNumber, pages: [page.pageNumber], lines: [line.text], headerFound: false };
        } else if (active) active.lines.push(line.text);
      }
    });
    if (active) { active.endPage = page.pageNumber; active.pages.push(page.pageNumber); }
  }
  flush();
  return all;
}

export function extractMarks(text) {
  const values = [...text.matchAll(/\[(\d{1,2})\]/g)].map(m => Number(m[1])).filter(n => n > 0 && n <= 30);
  return values.length ? values.reduce((a,b) => a+b,0) : 0;
}

export function classifyTopic(subjectId, text) {
  const taxonomy = TOPIC_KEYWORDS[subjectId];
  if (!taxonomy) return "Unclassified";
  const lower = text.toLowerCase();
  let best = { topic: "Unclassified", score: 0 };
  for (const [topic, keywords] of Object.entries(taxonomy)) {
    const score = keywords.reduce((n, keyword) => n + (lower.includes(keyword.toLowerCase()) ? (keyword.length > 5 ? 2 : 1) : 0), 0);
    if (score > best.score) best = { topic, score };
  }
  return best.score >= 2 ? best.topic : "Unclassified";
}
