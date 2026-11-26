import { describe, expect, it } from "vitest";
import { cleanDomain, companyDomainFor, domainFromUrl, logoUrl } from "./company-logo";

describe("cleanDomain", () => {
  it("normalises plain domains and URLs", () => {
    expect(cleanDomain("Stripe.com")).toBe("stripe.com");
    expect(cleanDomain("www.kraken.com")).toBe("kraken.com");
    expect(cleanDomain("https://www.openai.com/careers")).toBe("openai.com");
  });
  it("rejects empty, junk and job-board domains", () => {
    expect(cleanDomain("")).toBeNull();
    expect(cleanDomain(undefined)).toBeNull();
    expect(cleanDomain("not a domain")).toBeNull();
    expect(cleanDomain("boards.greenhouse.io")).toBeNull();
    expect(cleanDomain("linkedin.com")).toBeNull();
    expect(cleanDomain("acme.wd5.myworkdayjobs.com")).toBeNull();
  });
});

describe("domainFromUrl", () => {
  it("uses the employer's own careers site when the domain matches the company", () => {
    expect(domainFromUrl("https://careers.bosch.com/en/job/123", "Bosch")).toBe("bosch.com");
    expect(domainFromUrl("https://jobs.eu.kraken.com/x", "Kraken")).toBe("kraken.com");
    expect(domainFromUrl("https://crypto.com/careers", "Crypto.com")).toBe("crypto.com");
    expect(domainFromUrl("https://careers.acme.co.uk/1", "Acme Ltd")).toBe("acme.co.uk");
  });
  it("never trusts a domain that belongs to someone else", () => {
    expect(domainFromUrl("https://jobs.solana.com/companies/syndica", "Syndica")).toBeNull();
    expect(domainFromUrl("https://boards.greenhouse.io/stripe/jobs/1", "Stripe")).toBeNull();
    expect(domainFromUrl("https://www.linkedin.com/jobs/view/1", "LinkedIn")).toBeNull();
    expect(domainFromUrl("nonsense", "Acme")).toBeNull();
  });
});

describe("companyDomainFor", () => {
  it("prefers the reported domain, then the posting URL", () => {
    expect(companyDomainFor({ company: "Stripe", companyDomain: "stripe.com", url: "https://boards.greenhouse.io/stripe/jobs/1" })).toBe("stripe.com");
    expect(companyDomainFor({ company: "Bosch", companyDomain: null, url: "https://careers.bosch.com/x" })).toBe("bosch.com");
    expect(companyDomainFor({ company: "Acme", companyDomain: "", url: "https://jobs.lever.co/x/y" })).toBeNull();
  });
  it("builds an encoded logo URL", () => {
    expect(logoUrl("stripe.com")).toBe("https://www.google.com/s2/favicons?domain=stripe.com&sz=128");
  });
});
