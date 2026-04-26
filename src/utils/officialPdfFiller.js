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
    // I-9 (01/20/25 edition) — field names verified against the official PDF.
    // Page 1 Section 1 + mirror copies on Supplement A's "from Section 1"
    // header (so the supplement auto-shows the employee's name).
    text: {
      lastName: [
        "Last Name (Family Name)",                  // Page 1 Section 1
        "Last Name Family Name from Section 1",     // Supplement A header
        "Last Name Family Name from Section 1-2",   // Supplement A continuation
      ],
      firstName: [
        "First Name Given Name",                    // Page 1 (no parens in this edition!)
        "First Name Given Name from Section 1",
        "First Name Given Name from Section 1-2",
      ],
      middleInitial: [
        "Employee Middle Initial (if any)",         // Page 1
        "Middle initial if any from Section 1",
        "Middle initial if any from Section 1-2",
      ],
      otherLastNames:  ["Employee Other Last Names Used (if any)"],
      address:         ["Address Street Number and Name"],
      aptNumber:       ["Apt Number (if any)"],
      city:            ["City or Town"],
      zip:             ["ZIP Code"],
      dob:             ["Date of Birth mmddyyyy"],
      ssn:             ["US Social Security Number"],
      email:           ["Employees E-mail Address"],
      phone:           ["Telephone Number"],
      alienNumber:     ["3 A lawful permanent resident Enter USCIS or ANumber"],
      i94Number:       ["Form I-94 Admission Number"],
      passportNumber:  ["Foreign Passport Number"],
      passportCountry: ["Country of Issuance"],
      workAuthExpiration: ["Exp Date mmddyyyy"],
      signature:       ["Signature of Employee"],   // typed name
      signatureDate:   ["Today's Date mmddyyy"],    // 3 y's in this edition (PDF typo)
    },
    // Section 1 state is a dropdown, not a text field
    dropdown: {
      state: ["State"],
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
    // W-4 (2024+) — verified against the official IRS PDF. Page 1 employee
    // section uses 11 numbered fields f1_01..f1_11 in form-fill order; the
    // signature itself is a graphical signature (not an AcroForm field) so
    // we only fill the date below it.
    text: {
      firstName:               ["topmostSubform[0].Page1[0].Step1a[0].f1_01[0]"],
      lastName:                ["topmostSubform[0].Page1[0].Step1a[0].f1_02[0]"],
      address:                 ["topmostSubform[0].Page1[0].Step1a[0].f1_03[0]"],
      city:                    ["topmostSubform[0].Page1[0].Step1a[0].f1_04[0]"],
      ssn:                     ["topmostSubform[0].Page1[0].f1_05[0]"],
      step3_qualifyingChildren:["topmostSubform[0].Page1[0].Step3_ReadOrder[0].f1_06[0]"],
      step3_otherDependents:   ["topmostSubform[0].Page1[0].Step3_ReadOrder[0].f1_07[0]"],
      step3_total:             ["topmostSubform[0].Page1[0].f1_08[0]"],
      step4a_otherIncome:      ["topmostSubform[0].Page1[0].f1_09[0]"],
      step4b_deductions:       ["topmostSubform[0].Page1[0].f1_10[0]"],
      step4c_extraWithholding: ["topmostSubform[0].Page1[0].f1_11[0]"],
      signatureDate:           ["topmostSubform[0].Page1[0].f1_12[0]"],
      // Employer-only fields (skipped during employee onboarding)
      employerNameAddress:     ["topmostSubform[0].Page1[0].f1_13[0]"],
      firstDayEmployment:      ["topmostSubform[0].Page1[0].f1_14[0]"],
      employerEin:             ["topmostSubform[0].Page1[0].f1_15[0]"],
    },
    // W-4 filing status checkboxes — c1_1[0..2] is the Step 1c group;
    // the PDF puts them at Page1 root, not under Step1c subform.
    filingStatus: {
      single_or_mfs:  ["topmostSubform[0].Page1[0].c1_1[0]"],
      mfj_or_qss:     ["topmostSubform[0].Page1[0].c1_1[1]"],
      hoh:            ["topmostSubform[0].Page1[0].c1_1[2]"],
    },
  },
  w9: {
    pdfFile: "/forms/w-9.pdf",
    // W-9 (March 2024 rev) — verified against the official IRS PDF.
    // SSN is split into 3 sub-fields (3-2-4 digits); EIN is split into
    // 2 sub-fields (2-7). The filler accepts a single SSN/EIN string and
    // splits it across the segments.
    text: {
      legalName:    ["topmostSubform[0].Page1[0].f1_01[0]"],
      businessName: ["topmostSubform[0].Page1[0].f1_02[0]"],
      llcClassification: ["topmostSubform[0].Page1[0].Boxes3a-b_ReadOrder[0].f1_03[0]"],
      otherClassification: ["topmostSubform[0].Page1[0].Boxes3a-b_ReadOrder[0].f1_04[0]"],
      exemptPayeeCode:   ["topmostSubform[0].Page1[0].f1_05[0]"],
      fatcaCode:         ["topmostSubform[0].Page1[0].f1_06[0]"],
      address:           ["topmostSubform[0].Page1[0].Address_ReadOrder[0].f1_07[0]"],
      cityStateZip:      ["topmostSubform[0].Page1[0].Address_ReadOrder[0].f1_08[0]"],
      accountNumbers:    ["topmostSubform[0].Page1[0].f1_09[0]"],
      requesterInfo:     ["topmostSubform[0].Page1[0].f1_10[0]"],
    },
    // Split-numeric fields: writes a digits-only value across multiple
    // segments by maxLength. Used for SSN (3-2-4) and EIN (2-7).
    splitNumeric: {
      ssn: [
        "topmostSubform[0].Page1[0].f1_11[0]",
        "topmostSubform[0].Page1[0].f1_12[0]",
        "topmostSubform[0].Page1[0].f1_13[0]",
      ],
      ein: [
        "topmostSubform[0].Page1[0].f1_14[0]",
        "topmostSubform[0].Page1[0].f1_15[0]",
      ],
    },
  },
};

// Set EVERY candidate that exists on the form, not just the first match.
// This lets us fill mirror fields (e.g. Section 1 + Supplement A's
// "from Section 1" header) in one pass without knowing which page each
// candidate lives on. If setText rejects due to maxLength (e.g. SSN field
// is 9 chars but the user entered "123-45-6789"), retry with non-digits
// stripped — covers SSN/EIN/phone-formatted inputs without per-field config.
const trySetText = (form, candidates, value) => {
  const v = String(value ?? "");
  let any = false;
  for (const name of candidates) {
    let f;
    try { f = form.getTextField(name); }
    catch { continue; }
    try {
      f.setText(v);
      any = true;
    } catch {
      try {
        f.setText(v.replace(/\D/g, ""));
        any = true;
      } catch { /* give up on this field */ }
    }
  }
  return any;
};

const tryCheck = (form, candidates) => {
  let any = false;
  for (const name of candidates) {
    try {
      const f = form.getCheckBox(name);
      f.check();
      any = true;
    } catch { /* try next */ }
  }
  return any;
};

// Write a digits-only value across an ordered list of fields, slicing per
// each field's maxLength. Used for W-9's segmented SSN (3-2-4) and EIN (2-7).
const trySetSplitNumeric = (form, fieldNames, value) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return false;
  let pos = 0;
  let any = false;
  for (const name of fieldNames) {
    let f;
    try { f = form.getTextField(name); } catch { continue; }
    const len = f.getMaxLength?.() || digits.length - pos;
    const chunk = digits.slice(pos, pos + len);
    pos += len;
    try { f.setText(chunk); any = true; } catch { /* skip */ }
    if (pos >= digits.length) break;
  }
  return any;
};

// pdf-lib treats a dropdown's options case-sensitively; if our value isn't
// in the option list, fall back to setText where supported.
const trySetDropdown = (form, candidates, value) => {
  const v = String(value ?? "");
  if (!v) return false;
  let any = false;
  for (const name of candidates) {
    try {
      const f = form.getDropdown(name);
      const options = f.getOptions();
      const match = options.find((o) => o.toLowerCase() === v.toLowerCase()) || v;
      try { f.select(match); any = true; } catch { /* unselectable, skip */ }
    } catch { /* try next */ }
  }
  return any;
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

  // Dropdowns (e.g. Section 1 state on the I-9)
  for (const [dataKey, candidates] of Object.entries(cfg.dropdown || {})) {
    const value = formData?.[dataKey];
    if (value === undefined || value === null || value === "") continue;
    const ok = trySetDropdown(form, candidates, value);
    if (!ok) missed.push({ dataKey, candidates, kind: "dropdown" });
  }

  // Split-numeric (e.g. W-9 SSN 3-2-4, EIN 2-7)
  for (const [dataKey, fieldNames] of Object.entries(cfg.splitNumeric || {})) {
    const value = formData?.[dataKey];
    if (value === undefined || value === null || value === "") continue;
    const ok = trySetSplitNumeric(form, fieldNames, value);
    if (!ok) missed.push({ dataKey, fieldNames, kind: "splitNumeric" });
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
