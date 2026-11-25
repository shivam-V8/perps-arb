import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { estimateSeniority, LinkedInExportError, parseLinkedInExport } from "./linkedin-export";

/**
 * Synthetic LinkedIn data export (fictional person) using LinkedIn's real file
 * names and column headers, including its quirks: BOM, "Notes:" preamble, quoted
 * multi-line descriptions, files inside a folder.
 */
const BOM = "﻿";
const profileCsv =
  BOM +
  "First Name,Last Name,Maiden Name,Address,Birth Date,Headline,Summary,Industry,Zip Code,Geo Location,Twitter Handles,Websites,Instant Messengers\n" +
  'Asha,Verma,,"12 Secret Street, Pune",Jan 1 1990,ICU Nurse at Lakeview,"Critical care nurse, 6 years.",Hospitals,411001,"Pune, Maharashtra, India",,,[SKYPE:secret]\n';
const positionsCsv =
  "Company Name,Title,Description,Location,Started On,Finished On\n" +
  'Lakeview Hospital,Senior ICU Nurse,"Charge nurse two nights a week.\nPrecepted 8 new graduates.\nLed sepsis-bundle project.",Pune,Mar 2021,\n' +
  "St. Clare Hospital,Staff Nurse,,Mumbai,Jul 2017,Feb 2021\n";
const educationCsv = "School Name,Start Date,End Date,Notes,Degree Name,Activities\nUniversity of Pune,2013,2017,,BSc Nursing,\n";
const skillsCsv = "Name\nCritical Care\nVentilator Management\nEpic\n";
const certsCsv = "Name,Url,Authority,Started On,Finished On,License Number\nCCRN,,AACN,Jan 2022,,X1\n";
const emailsCsv =
  "Notes:\n\"Some addresses may be unconfirmed; this note mentions names and things.\"\n\n" +
  "Email Address,Confirmed,Primary,Updated On\nold@example.com,Yes,No,1/1/20\nasha@example.com,Yes,Yes,1/1/24\n";
const messagesCsv = "CONVERSATION ID,FROM,TO,CONTENT\n1,Asha,Bob,very private message\n";

function exportZip(files: Record<string, string>) {
  return zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, strToU8(v)])));
}

const full = {
  "Basic_LinkedInDataExport_11-25-2026/Profile.csv": profileCsv,
  "Basic_LinkedInDataExport_11-25-2026/Positions.csv": positionsCsv,
  "Basic_LinkedInDataExport_11-25-2026/Education.csv": educationCsv,
  "Basic_LinkedInDataExport_11-25-2026/Skills.csv": skillsCsv,
  "Basic_LinkedInDataExport_11-25-2026/Certifications.csv": certsCsv,
  "Basic_LinkedInDataExport_11-25-2026/Email Addresses.csv": emailsCsv,
  "Basic_LinkedInDataExport_11-25-2026/Languages.csv": "Name,Proficiency\nHindi,Native\n",
  "Basic_LinkedInDataExport_11-25-2026/messages.csv": messagesCsv,
};

describe("parseLinkedInExport", () => {
  const { draft, found, missingFiles } = parseLinkedInExport(exportZip(full));

  it("maps the profile", () => {
    expect(draft.full_name).toBe("Asha Verma");
    expect(draft.headline).toBe("ICU Nurse at Lakeview");
    expect(draft.summary).toBe("Critical care nurse, 6 years.");
    expect(draft.location).toBe("Pune, Maharashtra, India");
    expect(draft.email).toBe("asha@example.com"); // primary + confirmed, despite the Notes preamble
  });

  it("maps positions, newest first, current role → Present, multi-line description → highlights", () => {
    expect(draft.experience.map((e) => [e.title, e.company, e.start, e.end])).toEqual([
      ["Senior ICU Nurse", "Lakeview Hospital", "Mar 2021", "Present"],
      ["Staff Nurse", "St. Clare Hospital", "Jul 2017", "Feb 2021"],
    ]);
    expect(draft.experience[0].highlights).toEqual(["Charge nurse two nights a week.", "Precepted 8 new graduates.", "Led sepsis-bundle project."]);
  });

  it("maps education, certifications, skills and languages", () => {
    expect(draft.education).toEqual(["BSc Nursing, University of Pune (2017)", "CCRN — AACN"]);
    expect(draft.skills).toEqual(["Critical Care", "Ventilator Management", "Epic", "Language: Hindi"]);
    expect(found).toEqual({ positions: 2, education: 1, skills: 3, certifications: 1 });
    expect(missingFiles).toEqual([]);
  });

  it("never includes birth date, address, zip, IM handles or messages", () => {
    const all = JSON.stringify(draft);
    for (const secret of ["Jan 1 1990", "Secret Street", "411001", "SKYPE", "very private message"]) expect(all).not.toContain(secret);
  });

  it("estimates seniority from the current title", () => {
    expect(draft.seniority).toBe("senior");
  });
});

describe("edge cases", () => {
  it("reports missing files but still imports what's there", () => {
    const r = parseLinkedInExport(exportZip({ "Profile.csv": profileCsv, "Positions.csv": positionsCsv }));
    expect(r.missingFiles).toEqual(["Education.csv", "Skills.csv"]);
    expect(r.draft.experience).toHaveLength(2);
  });

  it("rejects non-ZIP files", () => {
    expect(() => parseLinkedInExport(strToU8("%PDF-1.4 not a zip"))).toThrow(LinkedInExportError);
  });

  it("rejects ZIPs that aren't LinkedIn exports", () => {
    try {
      parseLinkedInExport(exportZip({ "notes.txt": "hello", "messages.csv": messagesCsv }));
      expect.unreachable();
    } catch (e) {
      expect((e as LinkedInExportError).code).toBe("not_linkedin");
    }
  });

  it("skips oversized entries (zip-bomb guard)", () => {
    const huge = "Name\n" + "x\n".repeat(3 * 1024 * 1024); // ~6 MB uncompressed, compresses tiny
    const r = parseLinkedInExport(exportZip({ "Profile.csv": profileCsv, "Skills.csv": huge }));
    expect(r.draft.skills).toEqual([]);
    expect(r.missingFiles).toContain("Skills.csv");
  });
});

describe("estimateSeniority", () => {
  const now = new Date("2026-11-25");
  const role = (title: string, start: string, end = "Present") => ({ title, company: "", start, end, highlights: [] });
  it.each([
    [[role("Head of Operations", "2024")], "executive"],
    [[role("Engineering Manager", "2024")], "lead"],
    [[role("Software Engineering Intern", "Jun 2026")], "entry"],
    [[role("Data Analyst", "Jan 2025")], "entry"],
    [[role("Data Analyst", "Jan 2023")], "mid"],
    [[role("Accountant", "2021"), role("Accountant", "2015", "2021")], "senior"],
  ] as const)("%j → %s", (exp, level) => expect(estimateSeniority([...exp], now)).toBe(level));
});
