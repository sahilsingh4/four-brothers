// Form specs for the InlineFormFiller. Kept in a separate file so the React
// Fast Refresh rule (only-export-components) doesn't complain about mixing
// component + constant exports.

export const FORM_SPECS = {
  i9: {
    title: "I-9 · Employment Eligibility (Section 1)",
    legalNote: "Section 1 is employee-completed. Your employer fills in Section 2 within 3 business days of your start date.",
    sections: [
      {
        title: "Your information",
        fields: [
          { id: "lastName", label: "Last name (Family name)", required: true },
          { id: "firstName", label: "First name (Given name)", required: true },
          { id: "middleInitial", label: "Middle initial", maxLength: 2 },
          { id: "otherLastNames", label: "Other last names used (if any)" },
          { id: "address", label: "Street address", required: true },
          { id: "aptNumber", label: "Apt #" },
          { id: "city", label: "City", required: true },
          { id: "state", label: "State", required: true, maxLength: 2 },
          { id: "zip", label: "ZIP", required: true },
          { id: "dob", label: "Date of birth", type: "date", required: true },
          { id: "ssn", label: "Social Security #", required: true, placeholder: "123-45-6789" },
          { id: "email", label: "Email", type: "email" },
          { id: "phone", label: "Phone", type: "tel" },
        ],
      },
      {
        title: "Citizenship / immigration status",
        fields: [
          {
            id: "citizenshipStatus",
            label: "I attest, under penalty of perjury, that I am:",
            type: "radio",
            required: true,
            options: [
              { v: "us_citizen", label: "1. A citizen of the United States" },
              { v: "non_citizen_national", label: "2. A non-citizen national of the United States" },
              { v: "lpr", label: "3. A lawful permanent resident (Alien #/USCIS#)" },
              { v: "alien_authorized", label: "4. A non-citizen authorized to work" },
            ],
          },
          { id: "alienNumber", label: "Alien Registration / USCIS # (if status 3 or 4)" },
          { id: "i94Number", label: "Form I-94 admission # (if status 4)" },
          { id: "passportNumber", label: "Foreign passport # (if status 4)" },
          { id: "passportCountry", label: "Country of issuance (if status 4)" },
          { id: "workAuthExpiration", label: "Work authorization expires (if applicable)", type: "date" },
        ],
      },
      {
        title: "Signature",
        fields: [
          { id: "signature", label: "Type your full name to sign", required: true },
          { id: "signatureDate", label: "Date", type: "date", required: true },
        ],
      },
    ],
  },
  w4: {
    title: "W-4 · Federal Tax Withholding (2020+ redesigned form)",
    legalNote: "Use this form to set how much federal tax your employer withholds from your pay. If unsure, consult a tax pro or use the IRS Tax Withholding Estimator.",
    sections: [
      {
        title: "Step 1 — Personal information",
        fields: [
          { id: "firstName", label: "First name", required: true },
          { id: "lastName", label: "Last name", required: true },
          { id: "address", label: "Street address", required: true },
          { id: "city", label: "City", required: true },
          { id: "state", label: "State", required: true, maxLength: 2 },
          { id: "zip", label: "ZIP", required: true },
          { id: "ssn", label: "Social Security #", required: true, placeholder: "123-45-6789" },
          {
            id: "filingStatus",
            label: "Step 1(c) — Filing status",
            type: "radio",
            required: true,
            options: [
              { v: "single_or_mfs", label: "Single or Married filing separately" },
              { v: "mfj_or_qss", label: "Married filing jointly or Qualifying surviving spouse" },
              { v: "hoh", label: "Head of household" },
            ],
          },
        ],
      },
      {
        title: "Steps 2–4 (skip if Single + only one job)",
        fields: [
          {
            id: "step2_multipleJobs",
            label: "Step 2 — Multiple jobs / spouse works?",
            type: "checkbox",
            checkboxLabel: "Yes — I have more than one job, or my spouse works.",
          },
          { id: "step3_dependentsCredit", label: "Step 3 — Credit for qualifying children + other dependents (USD, leave blank if none)", type: "number" },
          { id: "step4a_otherIncome", label: "Step 4(a) — Other income (USD/year, not from jobs)", type: "number" },
          { id: "step4b_deductions", label: "Step 4(b) — Deductions (USD/year, not standard deduction)", type: "number" },
          { id: "step4c_extraWithholding", label: "Step 4(c) — Extra withholding per pay period (USD)", type: "number" },
        ],
      },
      {
        title: "Signature",
        fields: [
          { id: "signature", label: "Type your full name to sign", required: true },
          { id: "signatureDate", label: "Date", type: "date", required: true },
        ],
      },
    ],
  },
  direct_deposit: {
    title: "Direct deposit authorization",
    legalNote: "By signing, you authorize 4 Brothers Trucking to deposit your pay into the account below.",
    sections: [
      {
        title: "Account",
        fields: [
          {
            id: "accountType",
            label: "Account type",
            type: "radio",
            required: true,
            options: [
              { v: "checking", label: "Checking" },
              { v: "savings", label: "Savings" },
            ],
          },
          { id: "bankName", label: "Bank name", required: true, placeholder: "e.g. Wells Fargo" },
          { id: "routingNumber", label: "Routing #", required: true, placeholder: "9 digits", maxLength: 9 },
          { id: "accountNumber", label: "Account #", required: true },
          { id: "accountHolderName", label: "Name on account", required: true },
        ],
      },
      {
        title: "Signature",
        fields: [
          { id: "signature", label: "Type your full name to sign", required: true },
          { id: "signatureDate", label: "Date", type: "date", required: true },
        ],
      },
    ],
  },
};
