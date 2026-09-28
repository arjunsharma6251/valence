import { siteName, siteUrl } from "@/lib/site";

/**
 * Site-level structured data. Search engines use it for the sitelinks search
 * box and to understand what the site is; it is inert for users.
 */
export function SiteSchema() {
  const json = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: siteName,
        description: "Free practice for the U.S. National Chemistry Olympiad, built on every published past exam.",
        inLanguage: "en-US",
        potentialAction: {
          "@type": "SearchAction",
          target: { "@type": "EntryPoint", urlTemplate: `${siteUrl}/search?q={search_term_string}` },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "EducationalOccupationalProgram",
        "@id": `${siteUrl}/#program`,
        name: "U.S. National Chemistry Olympiad practice",
        url: siteUrl,
        educationalProgramMode: "online",
        provider: { "@type": "Organization", name: siteName, url: siteUrl },
        teaches: "Stoichiometry, descriptive and laboratory chemistry, states of matter, thermodynamics, kinetics, equilibrium, oxidation and reduction, atomic structure, bonding, organic and biochemistry",
      },
    ],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />;
}
