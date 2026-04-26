# Bundled official forms

For each compliance form, drop the **official fillable PDF** from the
agency website into this folder using the exact filenames below. The
inline form filler in the app will populate the named fields and offer
the filled PDF as a download from FilledFormViewer.

| File              | Source URL                                                          |
| ----------------- | ------------------------------------------------------------------- |
| `i-9.pdf`         | https://www.uscis.gov/sites/default/files/document/forms/i-9.pdf    |
| `w-4.pdf`         | https://www.irs.gov/pub/irs-pdf/fw4.pdf                             |
| `w-9.pdf`         | https://www.irs.gov/pub/irs-pdf/fw9.pdf                             |

These are the AcroForm fillable PDFs published by USCIS / IRS.

## Field-name iteration

Different IRS/USCIS PDF revisions use slightly different internal field
names. If clicking **Download official PDF** in the FilledFormViewer
produces a blank PDF, open the browser console — `officialPdfFiller`
logs every field name it found in the PDF when no fields match. Copy
those names into `src/utils/officialPdfFiller.js` under the matching
`fieldMaps[<formKey>]` block.

The field name format is usually the human-readable label (USCIS) or
the XFA path like `topmostSubform[0].Page1[0].Step1a[0].f1_01[0]` (IRS).
