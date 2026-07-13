// Pure, deterministic functions for the Finance Operations layer. Nothing in
// this file calls a database or an LLM -- every "agent" capability here is
// rule-based (keyword matching, arithmetic, date math) so it's fully unit
// -testable and safe to run without ever reading confidential document
// content. See docs in AgentCapabilitiesPanel for the boundary this respects.

import type { FinanceTransaction, FunctionalClassification, ReviewStatus } from "./types";

// --- CSV parsing -----------------------------------------------------------

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((candidate) => candidate.some((cell) => cell.trim().length > 0));
}

const dateHeaderCandidates = ["transaction date", "date", "trans date"];
const postedHeaderCandidates = ["posted date", "post date"];
const descriptionHeaderCandidates = ["description", "memo", "payee", "details"];
const amountHeaderCandidates = ["amount"];
const debitHeaderCandidates = ["debit", "withdrawal"];
const creditHeaderCandidates = ["credit", "deposit"];
const externalIdHeaderCandidates = ["transaction id", "reference", "reference number", "check number"];

function findColumn(headers: string[], candidates: string[]): number {
  const normalized = headers.map((header) => header.trim().toLowerCase());

  return normalized.findIndex((header) => candidates.includes(header));
}

function normalizeDate(value: string): string | null {
  const trimmed = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const usMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);

  if (usMatch) {
    const [, month, day, yearRaw] = usMatch;
    const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;

    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return null;
}

function parseAmount(value: string): number | null {
  const cleaned = value.trim().replace(/[$,]/g, "");

  if (!cleaned) {
    return null;
  }

  const negative = cleaned.startsWith("(") && cleaned.endsWith(")");
  const numeric = Number(negative ? cleaned.slice(1, -1) : cleaned);

  if (!Number.isFinite(numeric)) {
    return null;
  }

  return negative ? -numeric : numeric;
}

export type ParsedCsvRow = {
  amount: number;
  description: string;
  externalTransactionId: string | null;
  postedDate: string | null;
  rowNumber: number;
  transactionDate: string;
  transactionType: "debit" | "credit";
};

export type CsvParseError = {
  message: string;
  rowNumber: number;
};

export type CsvParseResult = {
  errors: CsvParseError[];
  rows: ParsedCsvRow[];
};

/**
 * Accepts the common bank/credit-card export shapes: a single signed "Amount"
 * column, or separate "Debit"/"Credit" columns. Header matching is
 * case-insensitive and tolerant of a handful of common synonyms -- anything
 * else is reported as a per-row error rather than silently skipped or
 * guessed at.
 */
export function parseTransactionCsv(text: string): CsvParseResult {
  const table = parseCsv(text);
  const errors: CsvParseError[] = [];

  if (table.length === 0) {
    return { errors: [{ message: "The file is empty.", rowNumber: 0 }], rows: [] };
  }

  const [headers, ...dataRows] = table;
  const dateColumn = findColumn(headers, dateHeaderCandidates);
  const postedColumn = findColumn(headers, postedHeaderCandidates);
  const descriptionColumn = findColumn(headers, descriptionHeaderCandidates);
  const amountColumn = findColumn(headers, amountHeaderCandidates);
  const debitColumn = findColumn(headers, debitHeaderCandidates);
  const creditColumn = findColumn(headers, creditHeaderCandidates);
  const externalIdColumn = findColumn(headers, externalIdHeaderCandidates);

  if (dateColumn === -1) {
    return { errors: [{ message: "No recognizable date column found (expected \"Date\" or \"Transaction Date\").", rowNumber: 0 }], rows: [] };
  }

  if (descriptionColumn === -1) {
    return { errors: [{ message: "No recognizable description column found.", rowNumber: 0 }], rows: [] };
  }

  if (amountColumn === -1 && debitColumn === -1 && creditColumn === -1) {
    return { errors: [{ message: "No recognizable amount, debit, or credit column found.", rowNumber: 0 }], rows: [] };
  }

  const rows: ParsedCsvRow[] = [];

  dataRows.forEach((cells, index) => {
    const rowNumber = index + 2; // account for header row, 1-indexed
    const transactionDate = normalizeDate(cells[dateColumn] ?? "");

    if (!transactionDate) {
      errors.push({ message: `Unrecognized date "${cells[dateColumn] ?? ""}".`, rowNumber });
      return;
    }

    const description = (cells[descriptionColumn] ?? "").trim();

    if (!description) {
      errors.push({ message: "Missing description.", rowNumber });
      return;
    }

    let amount: number | null = null;
    let transactionType: "debit" | "credit" = "debit";

    if (amountColumn !== -1) {
      amount = parseAmount(cells[amountColumn] ?? "");
      transactionType = (amount ?? 0) < 0 ? "debit" : "credit";
      amount = amount === null ? null : Math.abs(amount);
    } else {
      const debitValue = debitColumn !== -1 ? parseAmount(cells[debitColumn] ?? "") : null;
      const creditValue = creditColumn !== -1 ? parseAmount(cells[creditColumn] ?? "") : null;

      if (debitValue) {
        amount = Math.abs(debitValue);
        transactionType = "debit";
      } else if (creditValue) {
        amount = Math.abs(creditValue);
        transactionType = "credit";
      }
    }

    if (amount === null || amount === 0) {
      errors.push({ message: "Missing or unparseable amount.", rowNumber });
      return;
    }

    rows.push({
      amount,
      description,
      externalTransactionId: externalIdColumn !== -1 ? (cells[externalIdColumn]?.trim() || null) : null,
      postedDate: postedColumn !== -1 ? normalizeDate(cells[postedColumn] ?? "") : null,
      rowNumber,
      transactionDate,
      transactionType,
    });
  });

  return { errors, rows };
}

// --- Dedupe ------------------------------------------------------------

function normalizeDescriptionForKey(description: string): string {
  return description.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Prefers the source's own external_transaction_id when present (most
 * reliable). Falls back to a composite of date + amount + normalized
 * description, scoped per financial_account_id by the caller (the unique
 * index is (financial_account_id, dedupe_key), not on dedupe_key alone).
 */
export function dedupeKeyFor(input: {
  amount: number;
  description: string;
  externalTransactionId?: string | null;
  transactionDate: string;
}): string {
  if (input.externalTransactionId) {
    return `ext:${input.externalTransactionId.trim()}`;
  }

  return `composite:${input.transactionDate}:${input.amount.toFixed(2)}:${normalizeDescriptionForKey(input.description)}`;
}

// --- Rule-based suggestions (no document content is ever read) -------------

const documentFilenameKeywords: Record<string, string[]> = {
  bank_statement: ["bank", "statement", "checking", "savings"],
  board_record: ["board", "minutes", "resolution"],
  donation_report: ["donation", "giving", "gift", "contribution"],
  filing_receipt: ["receipt", "confirmation"],
  formation_document: ["articles", "incorporation", "formation", "bylaws"],
  governing_document: ["bylaws", "policy", "governance"],
  payroll_report: ["payroll", "gusto", "adp", "paystub", "w2", "w-2"],
};

export type DocumentClassificationSuggestion = {
  category: string;
  confidence: number;
  reason: string;
};

/**
 * Filename-only heuristic -- never reads file content. A human still picks
 * the final category on upload; this only pre-fills a suggestion.
 */
export function classifyDocumentByFilename(fileName: string): DocumentClassificationSuggestion | null {
  const normalized = fileName.toLowerCase();

  for (const [category, keywords] of Object.entries(documentFilenameKeywords)) {
    const matched = keywords.find((keyword) => normalized.includes(keyword));

    if (matched) {
      return { category, confidence: 0.6, reason: `Filename contains "${matched}".` };
    }
  }

  return null;
}

export function suggestReportingPeriod(transactionDates: readonly string[]): { end: string; start: string } | null {
  if (transactionDates.length === 0) {
    return null;
  }

  const sorted = [...transactionDates].sort();

  return { end: sorted[sorted.length - 1], start: sorted[0] };
}

export function identifyMissingMonthlyDocuments(
  uploadedCategories: readonly string[],
  expectedCategories: readonly string[] = ["bank_statement", "payroll_report", "donation_report", "board_record"],
): string[] {
  const uploaded = new Set(uploadedCategories);

  return expectedCategories.filter((category) => !uploaded.has(category));
}

const categoryKeywords: Record<string, string[]> = {
  "Bank Fees": ["fee", "service charge", "overdraft"],
  Insurance: ["insurance", "premium"],
  Payroll: ["payroll", "gusto", "adp", "salary", "wages"],
  "Payroll Taxes": ["irs", "941", "eftps", "payroll tax"],
  "Postage & Shipping": ["usps", "ups", "fedex", "postage"],
  "Professional Services": ["accountant", "cpa", "legal", "attorney", "bookkeeping"],
  Rent: ["rent", "lease"],
  Software: ["subscription", "saas", "software", "license"],
  Travel: ["airline", "hotel", "uber", "lyft", "travel"],
  Utilities: ["electric", "utility", "internet", "phone bill"],
};

export function suggestTransactionCategory(description: string): { category: string; confidence: number } | null {
  const normalized = description.toLowerCase();

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      return { category, confidence: 0.55 };
    }
  }

  return null;
}

const payrollKeywords = ["payroll", "gusto", "adp", "paychex", "salary", "wages", "941", "eftps"];

export function detectPayrollTransaction(description: string): boolean {
  const normalized = description.toLowerCase();

  return payrollKeywords.some((keyword) => normalized.includes(keyword));
}

/**
 * Flags transactions worth a human's attention: unusually large relative to
 * the account's own recent activity, or missing both a category and any
 * review action after import. Pure statistics over already-imported rows --
 * no external data, no AI call.
 */
/**
 * Leave-one-out comparison: each transaction is measured against the mean
 * and standard deviation of every *other* transaction in the set, not
 * including itself. A naive whole-set mean/stddev lets one large outlier
 * inflate its own baseline enough to hide from the very threshold it's
 * being measured against, which defeats the point in a small sample.
 */
export function flagUnusualTransactions(
  transactions: readonly Pick<FinanceTransaction, "amount" | "id" | "reviewStatus">[],
): string[] {
  if (transactions.length < 4) {
    return [];
  }

  const flagged: string[] = [];

  transactions.forEach((candidate, index) => {
    const others = transactions.filter((_, otherIndex) => otherIndex !== index).map((transaction) => transaction.amount);
    const mean = others.reduce((sum, amount) => sum + amount, 0) / others.length;
    const variance = others.reduce((sum, amount) => sum + (amount - mean) ** 2, 0) / others.length;
    const stdDev = Math.sqrt(variance);
    const threshold = mean + 2.5 * stdDev;

    if (stdDev > 0 && candidate.amount > threshold) {
      flagged.push(candidate.id);
    }
  });

  return flagged;
}

export function draftMissingInformationQuestions(input: {
  missingDocuments: readonly string[];
  openQuestions: readonly string[];
  uncategorizedTransactionCount: number;
}): string[] {
  const questions: string[] = [...input.openQuestions];

  input.missingDocuments.forEach((doc) => {
    questions.push(`Can you provide: ${doc}?`);
  });

  if (input.uncategorizedTransactionCount > 0) {
    questions.push(`${input.uncategorizedTransactionCount} transaction(s) don't have an approved category yet -- can you confirm how they should be classified?`);
  }

  return questions;
}

// --- Draft workpaper generation (approved transactions only) ---------------

export type CategoryTotal = { category: string; total: number };

export type WorkpaperResult = {
  missingDataWarnings: string[];
  rows: CategoryTotal[];
  total: number;
};

function approvedOnly(transactions: readonly FinanceTransaction[]): FinanceTransaction[] {
  return transactions.filter((transaction) => transaction.reviewStatus === "approved");
}

function sumByField(
  transactions: readonly FinanceTransaction[],
  field: (transaction: FinanceTransaction) => string | null,
): CategoryTotal[] {
  const totals = new Map<string, number>();

  transactions.forEach((transaction) => {
    const key = field(transaction) ?? "Uncategorized";

    totals.set(key, (totals.get(key) ?? 0) + transaction.amount);
  });

  return Array.from(totals.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((left, right) => right.total - left.total);
}

export function generateProfitAndLoss(transactions: readonly FinanceTransaction[]): WorkpaperResult {
  const approved = approvedOnly(transactions);
  const revenue = approved.filter((transaction) => transaction.transactionType === "credit");
  const expense = approved.filter((transaction) => transaction.transactionType === "debit");
  const revenueTotal = revenue.reduce((sum, transaction) => sum + transaction.amount, 0);
  const expenseTotal = expense.reduce((sum, transaction) => sum + transaction.amount, 0);
  const warnings: string[] = [];

  if (transactions.some((transaction) => transaction.reviewStatus !== "approved")) {
    warnings.push("Some imported transactions are not yet Approved and are excluded from this total.");
  }

  return {
    missingDataWarnings: warnings,
    rows: [
      { category: "Total Revenue", total: revenueTotal },
      { category: "Total Expense", total: -expenseTotal },
      { category: "Net", total: revenueTotal - expenseTotal },
    ],
    total: revenueTotal - expenseTotal,
  };
}

export function generateRevenueSummary(transactions: readonly FinanceTransaction[]): WorkpaperResult {
  const approved = approvedOnly(transactions).filter((transaction) => transaction.transactionType === "credit");

  return {
    missingDataWarnings: approved.length === 0 ? ["No approved revenue transactions found for this period."] : [],
    rows: sumByField(approved, (transaction) => transaction.approvedCategory),
    total: approved.reduce((sum, transaction) => sum + transaction.amount, 0),
  };
}

export function generateContributionSummary(transactions: readonly FinanceTransaction[]): WorkpaperResult {
  const approved = approvedOnly(transactions).filter(
    (transaction) => transaction.transactionType === "credit" && transaction.approvedCategory?.toLowerCase().includes("contribution"),
  );

  return {
    missingDataWarnings: approved.length === 0 ? ["No transactions are categorized as contributions yet."] : [],
    rows: sumByField(approved, (transaction) => transaction.fundOrRestriction),
    total: approved.reduce((sum, transaction) => sum + transaction.amount, 0),
  };
}

export function generateExpenseDetail(transactions: readonly FinanceTransaction[]): WorkpaperResult {
  const approved = approvedOnly(transactions).filter((transaction) => transaction.transactionType === "debit");

  return {
    missingDataWarnings: approved.length === 0 ? ["No approved expense transactions found for this period."] : [],
    rows: sumByField(approved, (transaction) => transaction.approvedCategory),
    total: approved.reduce((sum, transaction) => sum + transaction.amount, 0),
  };
}

export function generateFunctionalExpenseAllocation(transactions: readonly FinanceTransaction[]): WorkpaperResult {
  const approved = approvedOnly(transactions).filter((transaction) => transaction.transactionType === "debit");
  const unclassified = approved.filter((transaction) => !transaction.functionalClassification).length;

  return {
    missingDataWarnings: unclassified > 0 ? [`${unclassified} approved expense transaction(s) have no functional classification.`] : [],
    rows: sumByField(approved, (transaction) => functionalLabel(transaction.functionalClassification)),
    total: approved.reduce((sum, transaction) => sum + transaction.amount, 0),
  };
}

function functionalLabel(value: FunctionalClassification | null): string | null {
  if (!value) {
    return null;
  }

  return value === "management_and_general" ? "Management & General" : value === "fundraising" ? "Fundraising" : "Program";
}

export function generatePayrollSummary(transactions: readonly FinanceTransaction[]): WorkpaperResult {
  const payroll = approvedOnly(transactions).filter(
    (transaction) => transaction.transactionType === "debit" && detectPayrollTransaction(transaction.description),
  );

  return {
    missingDataWarnings: payroll.length === 0 ? ["No approved transactions were detected as payroll-related."] : [],
    rows: sumByField(payroll, (transaction) => transaction.approvedCategory ?? "Payroll"),
    total: payroll.reduce((sum, transaction) => sum + transaction.amount, 0),
  };
}

export function generateYearEndCashReconciliation(transactions: readonly FinanceTransaction[]): WorkpaperResult {
  const approved = approvedOnly(transactions);
  const net = approved.reduce((sum, transaction) => sum + (transaction.transactionType === "credit" ? transaction.amount : -transaction.amount), 0);

  return {
    missingDataWarnings: [
      "Beginning and ending statement balances are not extracted automatically in this preview -- enter them manually to complete the reconciliation.",
    ],
    rows: [{ category: "Net Change From Approved Transactions", total: net }],
    total: net,
  };
}

/**
 * A cash-only skeleton, not a real balance sheet -- there is no asset,
 * liability, or equity tracking in this schema (by design; this isn't a
 * general ledger). Exists so the Balance Sheet section isn't empty, with a
 * loud warning about exactly what it omits.
 */
export function generateBalanceSheetSkeleton(transactions: readonly FinanceTransaction[]): WorkpaperResult {
  const approved = approvedOnly(transactions);
  const netCash = approved.reduce((sum, transaction) => sum + (transaction.transactionType === "credit" ? transaction.amount : -transaction.amount), 0);

  return {
    missingDataWarnings: [
      "This is a cash-only skeleton, not a complete balance sheet -- it does not track fixed assets, receivables, payables, loans, or equity. An accountant must add those manually.",
    ],
    rows: [{ category: "Net Cash Position (Approved Transactions Only)", total: netCash }],
    total: netCash,
  };
}

export function generateRestrictedFundWorksheet(transactions: readonly FinanceTransaction[]): WorkpaperResult {
  const restricted = approvedOnly(transactions).filter((transaction) => transaction.fundOrRestriction);

  return {
    missingDataWarnings: restricted.length === 0 ? ["No approved transactions are tagged with a fund or restriction."] : [],
    rows: sumByField(restricted, (transaction) => transaction.fundOrRestriction),
    total: restricted.reduce((sum, transaction) => sum + (transaction.transactionType === "credit" ? transaction.amount : -transaction.amount), 0),
  };
}

export function generateUncategorizedTransactionsReport(transactions: readonly FinanceTransaction[]): WorkpaperResult {
  const uncategorized = transactions.filter((transaction) => !transaction.approvedCategory);

  return {
    missingDataWarnings: uncategorized.length > 0 ? [`${uncategorized.length} transaction(s) have no approved category.`] : [],
    rows: [{ category: "Uncategorized Transactions", total: uncategorized.length }],
    total: uncategorized.reduce((sum, transaction) => sum + transaction.amount, 0),
  };
}
