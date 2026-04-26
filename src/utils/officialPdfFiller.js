// Loads the official fillable IRS / USCIS PDF for a given form, populates
// named fields with the captured `formData`, and returns the bytes for
// download. Per-form `fieldMaps` are best-guess from common revisions of
// these forms — when names don't match the user's actual PDF, the helper
// logs every field name in the PDF to the console so the dispatcher can
// copy them into this file and iterate.
//
// PDFs must live at /public/forms/<formKey>.pdf — the README in that
// folder lists the official source URLs to download.

import { PDFDocument } from "pdf-lib";

// Map from our captured `formData` keys to the PDF AcroForm field names.
// These are STARTING GUESSES — different USCIS / IRS revisions use slightly
// different field names. If a fill produces a blank PDF, check the browser
// console: officialPdfFiller logs every field name in the PDF when zero of
// our mapped names match. Copy the actual names back into this map.
const fieldMaps = {
  i9: {
    pdfFile: "/forms/i-9.pdf",
    // I-9 Section 1 — common 2023+ field names
    text: {
      lastName:        ["Last Name (Family Name) from Section 1", "Last Name Family Name from Section 1"],
      firstName:       ["First Name Given Name from Section 1", "First Name (Given Name) from Section 1"],
      middleInitial:   ["Employee Middle Initial (if any) from Section 1", "Employee Middle Initial"],
      otherLastNames:  ["Employee Other Last Names Used (if any) from Section 1", "Other Last Names Used (if any)"],
      address:         ["Address Street Number and Name from Section 1", "Address Street Number and Name"],
      aptNumber:       ["Apt Number (if any) from Section 1", "Apt Number"],
      city:            ["City or Town from Section 1", "City or Town"],
      state:           ["State from Section 1", "State"],
      zip:             ["ZIP Code from Section 1", "ZIP Code"],
      dob:             ["Date of Birth mmddyyyy", "DOB", "Date of Birth"],
      ssn:             ["U.S. Social Security Number from Section 1", "SSN"],
      email:           ["Employees E-mail Address from Section 1", "Email Address"],
      phone:           ["Telephone Number from Section 1", "Telephone Number"],
      alienNumber:     ["3 A lawful permanent resident Enter USCIS or A-Number"],
      i94Number:       ["Form I-94 Admission Number"],
      passportNumber:  ["Foreign Passport Number"],
      passportCountry: ["Country of Issuance"],
      workAuthExpiration: ["Exp Date mmddyyyy"],
      signature:       ["Today's Date mmddyyyy", "Signature of Employee"], // signature is typed name
      signatureDate:   ["Today's Date mmddyyyy"],
    },
    // checkbox: keyed by formData value mapped to field name(s) to tick
    citizenship: {
      // formData.citizenshipStatus → field name to check
      us_citizen:           ["CB_1"],
      non_citizen_national: ["CB_2"],
      lpr:                  ["CB_3"],
      alien_authorized:     ["CB_4"],
    },
  },
  w4: {
    pdfFile: "/forms/w-4.pdf",
    // W-4 (2024+) uses XFA-style names. These vary by year.
    text: {
      firstName:               ["topmostSubform[0].Page1[0].Step1a[0].f1_01[0]", "f1_01[0]"],
      lastName:                ["topmostSubform[0].Page1[0].Step1a[0].f1_02[0]", "f1_02[0]"],
      address:                 ["topmostSubform[0].Page1[0].Step1a[0].f1_03[0]", "f1_03[0]"],
      city:                    ["topmostSubform[0].Page1[0].Step1a[0].f1_04[0]", "f1_04[0]"],
      ssn:                     ["topmostSubform[0].Page1[0].f1_05[0]", "f1_05[0]"],
      step3_dependentsCredit:  ["topmostSubform[0].Page1[0].Step3_ReadOrder[0].f1_06[0]"],
      step4a_otherIncome:      ["topmostSubform[0].Page1[0].f1_07[0]"],
      step4b_deductions:       ["topmostSubform[0].Page1[0].f1_08[0]"],
      step4c_extraWithholding: ["topmostSubform[0].Page1[0].f1_09[0]"],
      signature:               ["topmostSubform[0].Page1[0].f1_10[0]"],
      signatureDate:           ["topmostSubform[0].Page1[0].f1_11[0]"],
    },
    // W-4 filing status checkboxes (Step 1c)
    filingStatus: {
      single_or_mfs:  ["topmostSubform[0].Page1[0].Step1c[0].c1_1[0]"],
      mfj_or_qss:     ["topmostSubform[0].Page1[0].Step1c[0].c1_1[1]"],
      hoh:            ["topmostSubform[0].Page1[0].Step1c[0].c1_1[2]"],
    },
  },
  w9: {
    pdfFile: "/forms/w-9.pdf",
    // W-9 (Oct 2018 / Mar 2024) — XFA style
    text: {
      // Note: W-9 is for sub-haulers (companies) — our existing form spec
      // doesn't capture all W-9 fields yet. We populate what we have.
      legalName:    ["topmostSubform[0].Page1[0].f1_1[0]"],
      businessName: ["topmostSubform[0].Page1[0].f1_2[0]"],
      address:      ["topmostSubform[0].Page1[0].Address[0].f1_7[0]"],
      cityStateZip: ["topmostSubform[0].Page1[0].Address[0].f1_8[0]"],
      ssn:          ["topmostSubform[0].Page1[0].SSN[0].f1_11[0]"],
      ein:          ["topmostSubform[0].Page1[0].EmployerID[0].f1_14[0]"],
      signature:    ["topmostSubform[0].Page1[0].f1_15[0]"],
      signatureDate:["topmostSubform[0].Page1[0].f1_16[0]"],
    },
  },
};

// Try each candidate name until one matches a real field on the form.
const trySetText = (form, candidates, value) => {
  for (const name of candidates) {
    try {
      const f = form.getTextField(name);
      f.setText(String(value ?? ""));
      return true;
    } catch { /* keep trying */ }
  }
  return false;
};

const tryCheck = (form, candidates) => {
  for (const name of candidates) {
    try {
      const f = form.getCheckBox(name);
      f.check();
      return true;
    } catch { /* keep trying */ }
  }
  return false;
};

// Where to fetch the bundled fillable PDFs from. Prefer the local /public
// path so we don't depend on the GitHub network at runtime; if that 404s
// (Vercel deploy lag, dev without files copied, etc.), fall back to the
// raw GitHub URL on main so the feature works the moment files land.
const RAW_GH_BASE = "https://raw.githubusercontent.com/sahilsingh4/four-brothers/main/public/forms";

const fetchPdfBytes = async (relPath) => {
  // Try local /forms/<file>.pdf first
  try {
    const r = await fetch(relPath);
    if (r.ok) return await r.arrayBuffer();
  } catch { /* fall through to GH */ }
  // Fallback to raw GitHub
  const fileName = relPath.replace(/^\/forms\//, "");
  const ghUrl = `${RAW_GH_BASE}/${fileName}`;
  const r2 = await fetch(ghUrl);
  if (!r2.ok) {
    throw new Error(`Couldn't fetch ${relPath} (local + GitHub both failed: ${r2.status}). Confirm the file exists at public/forms/${fileName}.`);
  }
  return await r2.arrayBuffer();
};

// Fill the official PDF for `formKey` ("i9" / "w4" / "w9") with `formData`,
// return a Uint8Array of the saved PDF. Throws if the PDF can't be fetched.
export const fillOfficialPdf = async (formKey, formData) => {
  const cfg = fieldMaps[formKey];
  if (!cfg) throw new Error(`No field map for ${formKey}`);

  const bytes = await fetchPdfBytes(cfg.pdfFile);
  const doc = await PDFDocument.load(bytes);
  const form = doc.getForm();

  // Track misses so we can guide the user when names don't match.
  const missed = [];

  // Text fields
  for (const [dataKey, candidates] of Object.entries(cfg.text || {})) {
    const value = formData?.[dataKey];
    if (value === undefined || value === null || value === "") continue;
    const ok = trySetText(form, candidates, value);
    if (!ok) missed.push({ dataKey, candidates });
  }

  // Citizenship / filing-status / similar single-choice radio-as-checkbox blocks
  for (const groupKey of ["citizenship", "filingStatus"]) {
    const map = cfg[groupKey];
    if (!map) continue;
    const dataKey = groupKey === "citizenship" ? "citizenshipStatus" : "filingStatus";
    const choice = formData?.[dataKey];
    if (!choice) continue;
    const candidates = map[choice];
    if (!candidates) continue;
    const ok = tryCheck(form, candidates);
    if (!ok) missed.push({ dataKey, choice, candidates });
  }

  // If everything missed, dump every field name to the console so user
  // can update the map. (One-time setup pain — saves the PR.)
  if (missed.length > 0 && Object.keys(cfg.text || {}).every((k) => missed.find((m) => m.dataKey === k))) {
    const allFields = form.getFields().map((f) => `${f.constructor?.name || "?"}: ${f.getName()}`);
    console.warn(`[officialPdfFiller] No fields matched for ${formKey}. Update fieldMaps in src/utils/officialPdfFiller.js. PDF contains:\n${allFields.join("\n")}`);
  }

  // Flatten so the values are baked in (no longer editable form fields).
  // Keep the form interactive if you want signers to add more — comment out.
  try { form.flatten(); } catch { /* some PDFs throw on flatten — fall through */ }

  return await doc.save();
};
