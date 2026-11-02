export const STAGES = [
  { id: "student", label: "Student", hint: "Aid, repayment, and first-budget basics" },
  { id: "early-career", label: "Early career", hint: "Pay, deposits, credit, and taxes" },
  { id: "adult-learner", label: "Adult learner", hint: "Education costs alongside work and family" },
];

const CITATIONS = {
  cfpbBudget: { agency: "CFPB", title: "CFPB — Budgeting tools", url: "https://www.consumerfinance.gov/consumer-tools/budgeting/" },
  cfpbStudent: { agency: "CFPB", title: "CFPB — Student loans", url: "https://www.consumerfinance.gov/consumer-tools/student-loans/" },
  cfpbCredit: { agency: "CFPB", title: "CFPB — Credit reports and scores", url: "https://www.consumerfinance.gov/consumer-tools/credit-reports-and-scores/" },
  fdicInsurance: { agency: "FDIC", title: "FDIC — Deposit insurance", url: "https://www.fdic.gov/resources/deposit-insurance/" },
  ftcScams: { agency: "FTC", title: "FTC — Scam alerts", url: "https://consumer.ftc.gov/features/scam-alerts" },
  irsCredits: { agency: "IRS", title: "IRS — Credits and deductions", url: "https://www.irs.gov/credits-and-deductions" },
  irsW2: { agency: "IRS", title: "IRS — Form W-2", url: "https://www.irs.gov/forms-pubs/about-form-w-2" },
  irs1099: { agency: "IRS", title: "IRS — Form 1099", url: "https://www.irs.gov/forms-pubs/about-form-1099-nec" },
  edRepay: { agency: "ED", title: "Federal Student Aid — Repayment plans", url: "https://studentaid.gov/manage-loans/repayment/plans" },
  edCalculator: { agency: "ED", title: "Federal Student Aid — Loan Simulator", url: "https://studentaid.gov/loan-simulator/" },
};

export function money(n) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

function parseAmount(text) {
  const match = text.match(/\$?\s*([\d,]+(?:\.\d+)?)\s*(k|thousand|grand)?/i);
  if (!match) return null;
  let n = Number(match[1].replace(/,/g, ""));
  if (!Number.isFinite(n)) return null;
  if (match[2]) n *= 1000;
  return n;
}

function parseYears(text) {
  const match = text.match(/(\d+(?:\.\d+)?)\s*(?:year|yr)s?/i);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseRate(text) {
  const match = text.match(/(\d+(?:\.\d+)?)\s*%/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) && n >= 0 ? n / 100 : null;
}

function isPersonalHousing(text) {
  const t = text.toLowerCase();
  const hasIncome = /\b(i make|i earn|my (income|paycheck|salary)|a month|per month|monthly)\b/.test(t);
  const hasHousing = /\b(housing|rent|mortgage|portion|percent|percentage|how much should)\b/.test(t);
  const wantsSplit = /\b(should|portion of my income|how much of my)\b/.test(t);
  return hasHousing && (hasIncome || wantsSplit);
}

function wantsDashboard(text) {
  return /\b(dashboard|visual|chart|budget)\b/i.test(text);
}

function isLoanPayoff(text) {
  const t = text.toLowerCase();
  return (
    /\b(student (debt|loan)|pay(ing)? (it |them )?off|monthly (payment|pay)|repay)\b/.test(t) ||
    (/\bdebt\b/.test(t) && /\b(year|month)\b/.test(t))
  );
}

function monthlyPayment(principal, annualRate, months) {
  if (months <= 0) return 0;
  if (annualRate <= 0) return principal / months;
  const r = annualRate / 12;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

function buildLoanDashboard(principal, years, annualRate) {
  const months = Math.round(years * 12);
  const rate = annualRate ?? 0;
  const payment = monthlyPayment(principal, rate, months);
  const totalPaid = payment * months;
  const totalInterest = Math.max(0, totalPaid - principal);
  const schedule = [];
  let remaining = principal;
  const r = rate / 12;
  for (let m = 1; m <= months; m += 1) {
    const interest = remaining * r;
    const principalPaid = Math.min(remaining, payment - interest);
    remaining = Math.max(0, remaining - principalPaid);
    if (m === 1 || m % 6 === 0 || m === months) {
      schedule.push({ month: m, remaining, paid: principal - remaining });
    }
  }
  return {
    title: "Student debt payoff",
    principal,
    years,
    annualRate,
    monthlyPayment: payment,
    totalPaid,
    totalInterest,
    months,
    assumedZeroInterest: annualRate == null,
    schedule,
  };
}

function stageNote(stage) {
  if (stage === "student") {
    return "Because you selected Student, this answer emphasizes federal student aid and first-budget tools from ED and the CFPB.";
  }
  if (stage === "early-career") {
    return "Because you selected Early career, this answer emphasizes pay, insured deposits, credit, and tax basics from FDIC, CFPB, and the IRS.";
  }
  return "Because you selected Adult learner, this answer emphasizes education costs alongside work, using ED, CFPB, and IRS materials.";
}

function generalAnswer(text, stage) {
  const t = text.toLowerCase();
  const prefix = stageNote(stage);

  if (/\bfdic\b|deposit insurance|insure(d)? (my )?money|bank fail/.test(t)) {
    return {
      answer: `${prefix}\n\nFDIC deposit insurance protects depositors if an FDIC-insured bank fails. Standard coverage is $250,000 per depositor, per insured bank, per ownership category. It covers deposit products such as checking, savings, money market deposit accounts, and CDs. It does not cover investments such as stocks, bonds, or mutual funds, even if you bought them at a bank.\n\nVerify coverage for a specific bank and account structure with the FDIC.`,
      citations: [CITATIONS.fdicInsurance],
      dashboard: null,
      limited: false,
    };
  }

  if (/\bcredit report|credit score|fico\b/.test(t)) {
    return {
      answer: `${prefix}\n\nAccording to the CFPB, a credit report is a statement of your credit history prepared by a credit bureau. It typically includes identifying information, credit accounts, payment history, and public records. A credit score is a number lenders may use, based on information in those reports.\n\nYou have rights to see your reports and dispute errors. SmartSpend does not calculate a personal score.`,
      citations: [CITATIONS.cfpbCredit],
      dashboard: null,
      limited: false,
    };
  }

  if (/\bw-?2\b|\b1099\b|independent contractor|employee vs/.test(t)) {
    return {
      answer: `${prefix}\n\nThe IRS treats wage employees and many independent contractors differently:\n\n• Form W-2 reports wages from an employer. Employers generally withhold income tax and FICA.\n• Form 1099-NEC reports nonemployee compensation. Tax is often not withheld; you may need estimated payments and self-employment tax.\n\nThis app does not prepare a return.`,
      citations: [CITATIONS.irsW2, CITATIONS.irs1099],
      dashboard: null,
      limited: false,
    };
  }

  if (/\bscam|phishing|identity theft|fraud\b/.test(t)) {
    return {
      answer: `${prefix}\n\nThe FTC warns that scams often involve unexpected contact, pressure to pay quickly (gift cards, wire, crypto), and requests for personal or financial data.\n\nPause, verify using a number or site you look up, and report at ReportFraud.ftc.gov. SmartSpend will not ask you to send money or share passwords.`,
      citations: [CITATIONS.ftcScams],
      dashboard: null,
      limited: false,
    };
  }

  if (/\brepayment plan|income-driven|idr|standard repayment|student loan/.test(t) && !isLoanPayoff(t)) {
    return {
      answer: `${prefix}\n\nFederal Student Aid (Department of Education) publishes several federal repayment plans. A standard plan typically amortizes the loan over a set term. Income-driven plans set payment from income and family size.\n\nPrivate loans generally do not use ED income-driven plans. Confirm loan type on StudentAid.gov. Ask SmartSpend to build a payoff dashboard if you give principal, years, and optionally an interest rate.`,
      citations: [CITATIONS.edRepay, CITATIONS.edCalculator, CITATIONS.cfpbStudent],
      dashboard: null,
      limited: false,
    };
  }

  if (/\bbudget|save money|emergency fund|spend(ing)? plan/.test(t) && !isPersonalHousing(t)) {
    return {
      answer: `${prefix}\n\nThe CFPB treats a budget as a plan for income and expenses so you can see what you can afford and set goals. Official tools walk through listing take-home pay, needs, wants, and debts.\n\nSmartSpend will not assign a required percent of your income to housing. If you share amounts, ask it to build a dashboard and it will visualize your numbers without a “you should spend $X” recommendation.`,
      citations: [CITATIONS.cfpbBudget],
      dashboard: null,
      limited: false,
    };
  }

  if (/\btax credit|deduction|irs\b|withholding/.test(t)) {
    return {
      answer: `${prefix}\n\nThe IRS distinguishes credits (which reduce tax owed) from deductions (which reduce taxable income). Eligibility depends on filing status, income, and the specific provision. SmartSpend explains official categories; it does not compute your tax.`,
      citations: [CITATIONS.irsCredits],
      dashboard: null,
      limited: false,
    };
  }

  return null;
}

export function advise(question, stage) {
  const text = question.trim();
  if (!text) {
    return {
      answer: "Enter a money question. You can also ask me to build a dashboard from numbers in the same prompt.",
      citations: [],
      dashboard: null,
      limited: false,
    };
  }

  if (isPersonalHousing(text)) {
    return {
      answer: `${stageNote(stage)}\n\nSmartSpend cannot prescribe a personal housing share of your income (for example, “spend X% of $3,000 on rent”). CFPB, FDIC, FTC, IRS, and ED do not set a required housing percentage for an individual household.\n\nWhat I can do:\n• Explain general CFPB budgeting education.\n• If you list your rent, income, and other bills, ask me to build a dashboard so you can see the picture yourself — without a “you should spend $X” recommendation.`,
      citations: [CITATIONS.cfpbBudget, CITATIONS.cfpbStudent],
      dashboard: null,
      limited: true,
    };
  }

  const principal = parseAmount(text);
  const years = parseYears(text);
  const rate = parseRate(text);
  const loanLike = isLoanPayoff(text) || (wantsDashboard(text) && principal != null && years != null);

  if (loanLike && principal != null && years != null) {
    const dashboard = buildLoanDashboard(principal, years, rate);
    const rateLine = dashboard.assumedZeroInterest
      ? `No interest rate was given, so the payment ${money(dashboard.monthlyPayment)} is principal ÷ ${dashboard.months} months. Federal student loans do charge interest, so this is a floor, not an official ED payment.`
      : `Using the ${(dashboard.annualRate * 100).toFixed(2)}% annual rate you provided, a fixed amortization over ${dashboard.months} months is ${money(dashboard.monthlyPayment)} per month. Total paid would be ${money(dashboard.totalPaid)}, of which ${money(dashboard.totalInterest)} is interest.`;

    return {
      answer: `${stageNote(stage)}\n\nFor ${money(principal)} of student debt targeted over ${years} year${years === 1 ? "" : "s"}:\n\n${rateLine}\n\nThis is a fixed-term payoff illustration from the numbers in your prompt — not a federal income-driven plan and not a quote from your servicer. Confirm balance, rate, and plan on StudentAid.gov.\n\nA payoff dashboard is on the right, built from this prompt. You do not need a budget form.`,
      citations: [CITATIONS.edRepay, CITATIONS.edCalculator, CITATIONS.cfpbStudent],
      dashboard,
      limited: false,
    };
  }

  if (loanLike && (principal == null || years == null)) {
    return {
      answer: `${stageNote(stage)}\n\nI can calculate a monthly payoff and build the dashboard in this chat once two numbers are present:\n• How much you owe (for example, $35,000)\n• How many years you want to take (for example, 5 years)\n\nOptional: an interest rate (for example, 6.5%). If you omit the rate, I will show a zero-interest schedule and warn that federal loans accrue interest.`,
      citations: [CITATIONS.edRepay, CITATIONS.edCalculator, CITATIONS.cfpbStudent],
      dashboard: null,
      limited: false,
    };
  }

  const general = generalAnswer(text, stage);
  if (general) return general;

  return {
    answer: `${stageNote(stage)}\n\nI can help with general questions grounded in CFPB, FDIC, FTC, IRS, and Department of Education materials — for example deposit insurance, credit reports, federal repayment plans, tax forms, or scams.\n\nI can also build a dashboard from your prompt if you include amounts, such as:\n“I have $35,000 in student debt and want to pay it off in 5 years. What is my monthly payment? Build a dashboard.”\n\nI will not tell you what portion of a personal paycheck should go to housing.`,
    citations: [CITATIONS.cfpbBudget, CITATIONS.fdicInsurance, CITATIONS.edRepay],
    dashboard: null,
    limited: false,
  };
}
