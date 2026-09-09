import type { Metadata } from "next";
import { getAllVehicles } from "@/lib/cms/vehicles";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import VehicleGrid from "@/components/VehicleGrid";
import type { Car } from "@/lib/types";

export const metadata: Metadata = {
  title: "Catalogue — Autologgia",
  description:
    "Parcourez l'ensemble des véhicules premium disponibles chez Autologgia. Filtrez par marque, catégorie, statut et prix.",
};

export const revalidate = 60;

export default async function CataloguePage() {
  const cars: Car[] = await getAllVehicles();

  return (
    <main className="min-h-screen bg-white">
      <Header />

      {/* ── HERO COMPACT ── */}
      <section className="bg-navy px-6 pb-14 pt-28">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-medium uppercase tracking-[0.5em] text-[#C9A84C]">
            Notre sélection
          </p>
          <h1 className="mt-3 font-heading text-5xl font-light text-white md:text-6xl">
            Catalogue
          </h1>
          <p className="mt-4 max-w-xl text-gray-400">
            Découvrez l&apos;ensemble de nos véhicules. Filtrez par catégorie,
            statut, marque ou prix pour trouver le vôtre.
          </p>

          {/* Stats rapides */}
          <div className="mt-8 flex flex-wrap gap-6">
            <div className="text-sm text-gray-400">
              <span className="font-heading text-2xl font-light text-[#C9A84C]">
                {cars.length}
              </span>{" "}
              véhicule{cars.length !== 1 ? "s" : ""} en catalogue
            </div>
            <div className="text-sm text-gray-400">
              <span className="font-heading text-2xl font-light text-[#C9A84C]">
                {cars.filter((c) =>
                  ["disponible", "occasion", "neuf"].includes(c.status ?? "")
                ).length}
              </span>{" "}
              disponible{cars.filter((c) => ["disponible", "occasion", "neuf"].includes(c.status ?? "")).length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
      </section>

      {/* ── CATALOGUE ── */}
      <section className="px-6 py-14">
        <div className="mx-auto max-w-7xl">
          <VehicleGrid cars={cars} />
        </div>
      </section>

      <Footer />
    </main>
  );
}
