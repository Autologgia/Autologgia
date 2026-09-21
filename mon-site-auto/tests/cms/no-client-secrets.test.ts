import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// Garde-fous statiques : aucun secret CMS ne peut atteindre le navigateur.

const ROOT = process.cwd();

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (["node_modules", ".next", ".git", "tests", ".vercel"].includes(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

const files = walk(ROOT).map((file) => ({ path: relative(ROOT, file).replace(/\\/g, "/"), source: readFileSync(file, "utf8") }));
const clientFiles = files.filter((file) => /^\s*["']use client["']/.test(file.source));
const SERVER_SECRET_NAMES = [
  "SYNERGY_CMS_DELIVERY_TOKEN",
  "SYNERGY_LEAD_INGESTION_TOKEN",
  "CMS_REVALIDATE_SECRET",
  "HISTORY_ACCESS_SECRET",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SANITY_API_WRITE_TOKEN",
  "RESEND_API_KEY",
];

describe("aucun secret CMS côté navigateur", () => {
  it("il existe des composants clients à analyser", () => {
    expect(clientFiles.length).toBeGreaterThan(5);
  });

  it("aucun composant client n'importe lib/cms ni un module server-only", () => {
    const serverOnlyModules = files.filter((file) => /^\s*import\s+["']server-only["']/m.test(file.source)).map((file) => file.path);
    expect(serverOnlyModules.length).toBeGreaterThan(0);
    for (const client of clientFiles) {
      expect(client.source, client.path).not.toMatch(/from\s+["']@\/lib\/cms\//);
      expect(client.source, client.path).not.toMatch(/from\s+["']@\/lib\/sanity-write["']/);
      for (const serverModule of serverOnlyModules) {
        const alias = "@/" + serverModule.replace(/\.(ts|tsx)$/, "");
        expect(client.source, `${client.path} -> ${alias}`).not.toContain(`"${alias}"`);
      }
    }
  });

  it("aucun composant client ne lit une variable d'environnement secrète", () => {
    for (const client of clientFiles) {
      for (const name of SERVER_SECRET_NAMES) {
        expect(client.source, `${client.path} référence ${name}`).not.toContain(name);
      }
      // Seules les variables NEXT_PUBLIC_* sont légitimes côté navigateur.
      const envReads = [...client.source.matchAll(/process\.env\.([A-Z0-9_]+)/g)].map((match) => match[1]);
      for (const name of envReads) expect(name, client.path).toMatch(/^NEXT_PUBLIC_/);
    }
  });

  it("tous les modules lib/cms/* sont marqués server-only", () => {
    const cmsModules = files.filter((file) => file.path.startsWith("lib/cms/"));
    expect(cmsModules.length).toBeGreaterThanOrEqual(5);
    for (const cmsModule of cmsModules) expect(cmsModule.source, cmsModule.path).toMatch(/^\s*import\s+["']server-only["']/m);
  });

  it("aucune variable NEXT_PUBLIC_* ne porte un secret (token, secret, clé de service)", () => {
    const names = new Set<string>();
    for (const file of files) for (const match of file.source.matchAll(/NEXT_PUBLIC_[A-Z0-9_]+/g)) names.add(match[0]);
    for (const name of names) expect(name, "variable publique suspecte").not.toMatch(/TOKEN|SECRET|SERVICE|PRIVATE|PASSWORD/);
    const example = readFileSync(join(ROOT, ".env.example"), "utf8");
    expect(example).not.toMatch(/^NEXT_PUBLIC_[A-Z0-9_]*(TOKEN|SECRET|SERVICE|PRIVATE|PASSWORD)/m);
  });

  it("le token Synergy n'est lu que dans lib/cms/config.ts", () => {
    const readers = files.filter((file) => file.source.includes("SYNERGY_CMS_DELIVERY_TOKEN")).map((file) => file.path);
    expect(readers).toEqual(["lib/cms/config.ts"]);
  });

  it("le site public ne parle jamais directement à Supabase (aucun client, aucune URL)", () => {
    for (const file of files) {
      expect(file.source, file.path).not.toMatch(/@supabase\/supabase-js|createClient\(.*supabase/);
      expect(file.source, file.path).not.toMatch(/\.supabase\.co/);
    }
  });

  it("les routes qui portent le jeton sont des handlers serveur, jamais des composants clients", () => {
    for (const path of ["app/api/cms-media/[id]/route.ts", "app/api/vehicle-history/[slug]/route.ts", "app/api/cms/revalidate/route.ts"]) {
      const file = files.find((entry) => entry.path === path);
      expect(file, path).toBeDefined();
      expect(file!.source, path).not.toMatch(/["']use client["']/);
    }
  });
});
