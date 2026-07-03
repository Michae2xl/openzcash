import { describe, expect, it } from "vitest";
import { requestedAmountFromBody } from "./github-applications-parse";

const clean = `### Requested Grant Amount (USD)

$477,658

### Hardware/Software Costs (USD)

$6,000`;

const blankRequestedWithTotal = `### Requested Grant Amount (USD)

Light wallets need compact blocks to synchronize with the chain. This is prose,
not a number, so the requested field is effectively empty.

### Hardware/Software Costs (USD)

### Total Budget (USD)

50000

### Startup Funding (USD)`;

const proseEverywhere = `### Requested Grant Amount (USD)

Rozo Merchant POS brings Zcash into brick-and-mortar payments.

### Total Budget (USD)

Some qualitative description with no standalone figure line here $30k inline.`;

// Hand-written re-applications (filed outside the issue form) use "##"
// headers instead of the form's "###" — real case: issue #341 (KeepKey).
const h2Headers = `## Applicant Background

We are reapplying based on community feedback.

## Requested Grant Amount (USD)

$135,000

## Category

Wallets

## Compensation Costs (USD)

$135,000`;

// A blank "##" field must not leak an amount from a LATER "##" section.
const h2BlankRequested = `## Requested Grant Amount (USD)

## Category

Wallets

## Compensation Costs (USD)

$99,000`;

describe("requestedAmountFromBody", () => {
  it("parses a clean dollar amount", () => {
    expect(requestedAmountFromBody(clean)).toBe(477658);
  });

  it("falls back to Total Budget when Requested is prose/blank", () => {
    expect(requestedAmountFromBody(blankRequestedWithTotal)).toBe(50000);
  });

  it("returns null when no standalone amount line exists", () => {
    expect(requestedAmountFromBody(proseEverywhere)).toBeNull();
  });

  it("returns null for empty/undefined bodies", () => {
    expect(requestedAmountFromBody(undefined)).toBeNull();
    expect(requestedAmountFromBody("")).toBeNull();
  });

  it("parses '##' headers from hand-written re-applications (issue #341)", () => {
    expect(requestedAmountFromBody(h2Headers)).toBe(135000);
  });

  it("does not leak an amount from a later '##' section", () => {
    expect(requestedAmountFromBody(h2BlankRequested)).toBeNull();
  });
});
