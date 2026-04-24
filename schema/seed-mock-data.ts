// Run: TWENTY_API_URL=http://localhost:3000 TWENTY_API_KEY=<your_key> \
//      npx ts-node schema/seed-mock-data.ts

// Must be first — loads .env.local before any module reads process.env
// eslint-disable-next-line @typescript-eslint/no-require-imports
require("dotenv").config({ path: "../.env.local" });

import { accounts } from "../services/intelligence/src/mock-data/accounts";
import { upsertCompany } from "../services/intelligence/src/sync/twenty-writer";

// ── Contact definitions (2 per company, matched to country/region) ────────────

interface ContactSeed {
  firstName: string;
  lastName: string;
}

// Keyed by company domain
const CONTACTS: Record<string, [ContactSeed, ContactSeed]> = {
  "ruvo.com.br":          [{ firstName: "João",        lastName: "Silva"      }, { firstName: "Ana",        lastName: "Costa"      }],
  "kasi.finance":         [{ firstName: "David",       lastName: "Kamau"      }, { firstName: "Sarah",      lastName: "Wanjiku"    }],
  "cacaofinance.com":     [{ firstName: "Lucas",       lastName: "Oliveira"   }, { firstName: "Marina",     lastName: "Santos"     }],
  "sendcrypto.io":        [{ firstName: "Wei",         lastName: "Chen"       }, { firstName: "Priya",      lastName: "Sharma"     }],
  "flowremit.mx":         [{ firstName: "Carlos",      lastName: "Mendoza"    }, { firstName: "Valentina",  lastName: "Reyes"      }],
  "wirex.app":            [{ firstName: "James",       lastName: "Wilson"     }, { firstName: "Emily",      lastName: "Clarke"     }],
  "colbfinance.com":      [{ firstName: "Andrés",      lastName: "García"     }, { firstName: "Isabella",   lastName: "Moreno"     }],
  "neovault.eu":          [{ firstName: "Markus",      lastName: "Schmidt"    }, { firstName: "Laura",      lastName: "Müller"     }],
  "stackbank.com":        [{ firstName: "Michael",     lastName: "Johnson"    }, { firstName: "Jessica",    lastName: "Lee"        }],
  "toku.com":             [{ firstName: "Ryan",        lastName: "Mitchell"   }, { firstName: "Amanda",     lastName: "Torres"     }],
  "paystream.io":         [{ firstName: "Daniel",      lastName: "Brown"      }, { firstName: "Sarah",      lastName: "Kim"        }],
  "globalpay.network":    [{ firstName: "Thomas",      lastName: "Hughes"     }, { firstName: "Rachel",     lastName: "Davies"     }],
  "moneygram.com":        [{ firstName: "Robert",      lastName: "Anderson"   }, { firstName: "Lisa",       lastName: "Chen"       }],
  "westernunion.com":     [{ firstName: "Christopher", lastName: "Moore"      }, { firstName: "Jennifer",   lastName: "Davis"      }],
  "santander.com":        [{ firstName: "Pablo",       lastName: "Rodríguez"  }, { firstName: "Carmen",     lastName: "López"      }],
  "mastercard.com":       [{ firstName: "William",     lastName: "Taylor"     }, { firstName: "Michelle",   lastName: "Wang"       }],
  "pixelvault.com":       [{ firstName: "Alex",        lastName: "Turner"     }, { firstName: "Sophie",     lastName: "Chen"       }],
  "chainquest.gg":        [{ firstName: "Tyler",       lastName: "Brooks"     }, { firstName: "Emma",       lastName: "Watson"     }],
  "artblock.io":          [{ firstName: "Nathan",      lastName: "Rivers"     }, { firstName: "Olivia",     lastName: "Park"       }],
  "metaloot.gg":          [{ firstName: "Brandon",     lastName: "Hayes"      }, { firstName: "Kayla",      lastName: "Martinez"   }],
};

// ── REST helper (contacts endpoint) ──────────────────────────────────────────

async function createContact(
  contact: ContactSeed,
  domain: string,
  companyId: string
): Promise<void> {
  const apiUrl = process.env.TWENTY_API_URL;
  const apiKey = process.env.TWENTY_API_KEY;

  if (!apiUrl || !apiKey) {
    throw new Error("Missing required env vars: TWENTY_API_URL, TWENTY_API_KEY");
  }

  const email =
    `${contact.firstName.toLowerCase().replace(/[^a-z]/g, "")}.` +
    `${contact.lastName.toLowerCase().replace(/[^a-z]/g, "")}@${domain}`;

  const res = await fetch(`${apiUrl}/rest/people`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      name: { firstName: contact.firstName, lastName: contact.lastName },
      emails: { primaryEmail: email },
      companyId,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.warn(
      `    Warning: could not create contact ${contact.firstName} ${contact.lastName}: ${text}`
    );
  } else {
    console.log(
      `    Created contact: ${contact.firstName} ${contact.lastName} <${email}>`
    );
  }
}

// ── Opportunity seeding ───────────────────────────────────────────────────────

interface OpportunitySeed {
  name: string;
  companyName: string;
  stage: string;
  amountMicros: number;
  closeDate: string;
}

const OPPORTUNITIES: OpportunitySeed[] = [
  { name: "MoneyGram × Crossmint",   companyName: "MoneyGram",     stage: "PROPOSAL",   amountMicros: 2_400_000_000_000, closeDate: "2026-06-30" },
  { name: "Wirex × Crossmint",       companyName: "Wirex",         stage: "MEETING",    amountMicros:   380_000_000_000, closeDate: "2026-05-15" },
  { name: "Cacao Finance × Crossmint", companyName: "Cacao Finance", stage: "SCREENING", amountMicros:   180_000_000_000, closeDate: "2026-05-30" },
  { name: "Kasi × Crossmint",        companyName: "Kasi",          stage: "NEW",        amountMicros:    62_000_000_000, closeDate: "2026-07-31" },
  { name: "Toku × Crossmint",        companyName: "Toku",          stage: "PROPOSAL",   amountMicros:   950_000_000_000, closeDate: "2026-06-15" },
  { name: "NeoVault × Crossmint",    companyName: "NeoVault",      stage: "MEETING",    amountMicros:   220_000_000_000, closeDate: "2026-05-31" },
];

async function lookupAllCompanies(): Promise<Map<string, string>> {
  const apiUrl = process.env.TWENTY_API_URL;
  const apiKey = process.env.TWENTY_API_KEY;
  if (!apiUrl || !apiKey) throw new Error("Missing TWENTY_API_URL or TWENTY_API_KEY");

  const res = await fetch(`${apiUrl}/rest/companies?first=100`, {
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch companies: HTTP ${res.status}`);
  const json = (await res.json()) as { data: { companies: { id: string; name: string }[] } };
  const map = new Map<string, string>();
  for (const c of json.data?.companies ?? []) {
    map.set(c.name, c.id);
  }
  return map;
}

async function seedOpportunities(): Promise<void> {
  const apiUrl = process.env.TWENTY_API_URL;
  const apiKey = process.env.TWENTY_API_KEY;
  if (!apiUrl || !apiKey) throw new Error("Missing TWENTY_API_URL or TWENTY_API_KEY");

  console.log("\nSeeding opportunities…");
  const companyMap = await lookupAllCompanies();

  for (const opp of OPPORTUNITIES) {
    const companyId = companyMap.get(opp.companyName);
    if (!companyId) {
      console.warn(`  Skipping "${opp.name}" — company "${opp.companyName}" not found in Twenty`);
      continue;
    }

    const body: Record<string, unknown> = {
      name: opp.name,
      stage: opp.stage,
      amount: { amountMicros: opp.amountMicros, currencyCode: "USD" },
      closeDate: opp.closeDate,
      companyId,
    };

    const res = await fetch(`${apiUrl}/rest/opportunities`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      // Ignore duplicates, warn on everything else
      if (text.toUpperCase().includes("ALREADY") || text.toUpperCase().includes("UNIQUE")) {
        console.log(`  Already exists: ${opp.name}`);
      } else {
        console.warn(`  Warning: could not create opportunity "${opp.name}": ${text}`);
      }
    } else {
      console.log(`  Created opportunity: ${opp.name} (${opp.stage}, $${opp.amountMicros / 1_000_000} USD)`);
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const total = accounts.length;
  let seeded = 0;

  for (let i = 0; i < total; i++) {
    const account = accounts[i];
    console.log(`\nSeeding account ${i + 1}/${total}: ${account.name}`);

    let companyId: string;
    try {
      companyId = await upsertCompany(account);
    } catch (err) {
      console.error(
        `  ERROR upserting ${account.name}:`,
        err instanceof Error ? err.message : err
      );
      continue;
    }

    const contacts = CONTACTS[account.domain];
    if (contacts) {
      for (const contact of contacts) {
        await createContact(contact, account.domain, companyId);
      }
    }

    seeded++;
    await sleep(500);
  }

  console.log(`\nDone. ${seeded}/${total} accounts seeded to Twenty.`);

  await seedOpportunities();
  console.log("\nAll done.\n");
}

main().catch((err) => {
  console.error("\nFATAL:", err instanceof Error ? err.message : err);
  process.exit(1);
});
