import { sanityFetch, urlFor } from "@/lib/sanity";
import { formatCarPrice, formatMileage, formatPower } from "@/lib/format";
import Link from "next/link";
import VehicleGallery from "@/components/VehicleGallery";
import AccordionSection from "@/components/AccordionSection";
import HistoryGate from "@/components/HistoryGate";
import PortableTextContent, { ptToPlainText } from "@/components/PortableTextContent";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import type { Metadata } from "next";
import type { SanityImageSource } from "@sanity/image-url";
import type { Car } from "@/lib/types";
import { getVehicleStatusInfo } from "@/lib/vehicle-status";

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 60;
export const dynamicParams = true;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const car = await sanityFetch<
    Pick<Car, "name" | "price" | "numericPrice" | "description">
  >(
    `*[_type == "car" && slug.current == $slug][0]{ name, price, numericPrice, description }`,
    { slug }
  );

  if (!car) return { title: "Véhicule – Autologgia" };

  const plainDesc = ptToPlainText(car.description);
  const formattedPrice = formatCarPrice(car.numericPrice, car.price);
  return {
    title: `${car.name} – Autologgia`,
    description:
      plainDesc ||
      `${car.name} disponible chez Autologgia. Prix : ${formattedPrice}. Contactez-nous pour plus d'informations.`,
  };
}

export default async function VehiclePage({ params }: Props) {
  const { slug } = await params;

  const car = await sanityFetch<Car>(
    `*[_type == "car" && slug.current == $slug][0]{
      name,
      price,
      numericPrice,
      year,
      mileage,
      transmission,
      fuel,
      power,
      "images": images[defined(asset)],
      description,
      status,
      location,
      critAir,
      options,
      historyText,
      historyFile { asset->{ url } }
    }`,
    { slug }
  );

  if (!car) {
    return (
      <>
        <Header />
        <main className="flex min-h-screen items-center justify-center bg-white text-navy">
          <div className="text-center">
            <p className="font-heading text-5xl font-light text-[#C9A84C]">404</p>
            <p className="mt-4 text-navy/60">Véhicule introuvable.</p>
            <Link
              href="/catalogue"
              className="mt-6 inline-block text-sm text-navy/50 underline underline-offset-2 hover:text-navy"
            >
              Retour au catalogue
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const imageUrls =
    car.images?.map((img: SanityImageSource) =>
      urlFor(img).width(1400).height(900).url()
    ) || [];

  const statusInfo = getVehicleStatusInfo(car.status);
  const formattedPrice = formatCarPrice(car.numericPrice, car.price);
  const descriptionPlain = ptToPlainText(car.description);
  const descriptionPreview = descriptionPlain
    ? descriptionPlain.slice(0, 280).trim() + (descriptionPlain.length > 280 ? "…" : "")
    : undefined;

  const historyFileUrl: string | undefined = car.historyFile?.asset?.url;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white px-6 pb-16 pt-28">
        <div className="mx-auto max-w-6xl">

          {/* Retour */}
          <Link
            href="/catalogue"
            className="inline-flex items-center gap-2 text-sm text-navy/50 transition hover:text-navy"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Retour au catalogue
          </Link>

          {/* ── GRILLE GALERIE + INFOS ── */}
          <div className="mt-8 grid gap-10 lg:grid-cols-[1.4fr_1fr]">

            {/* Galerie */}
            <section>
              <VehicleGallery images={imageUrls} />
            </section>

            {/* Panneau d'informations — reste bleu foncé */}
            <aside className="flex flex-col rounded-2xl border border-white/5 bg-navy-light p-8">

              {/* Badges statut + localisation */}
              <div className="flex flex-wrap items-center gap-2">
                {statusInfo && (
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${statusInfo.subtleClasses}`}>
                    {statusInfo.label}
                  </span>
                )}
                {car.location && (
                  <span className="text-sm text-gray-400">{car.location}</span>
                )}
              </div>

              {/* Nom */}
              <h1 className="mt-4 font-heading text-4xl font-light leading-tight tracking-tight text-white">
                {car.name}
              </h1>

              {/* Prix — blanc sur fond dark */}
              <p className="mt-4 font-heading text-3xl font-light text-white">
                {formattedPrice}
              </p>

              {/* Specs — bulles blanches avec texte navy */}
              <div className="mt-8 grid grid-cols-2 gap-3">
                <Spec label="Année" value={car.year} />
                <Spec label="Kilométrage" value={formatMileage(car.mileage)} />
                <Spec label="Transmission" value={car.transmission} />
                <Spec label="Carburant" value={car.fuel} />
                <Spec label="Puissance" value={formatPower(car.power)} />
                <Spec label="Crit'air" value={car.critAir ?? "Non renseigné"} />
              </div>

              {/* CTA */}
              <div className="mt-auto grid gap-3 pt-8">
                <Link
                  href={`/contact?vehicule=${encodeURIComponent(car.name)}&retourVehicule=${encodeURIComponent(slug)}`}
                  className="flex items-center justify-center gap-2 rounded-full bg-[#C9A84C] px-8 py-4 text-center font-semibold text-white transition hover:bg-[#b8962e]"
                >
                  Contacter pour ce véhicule
                </Link>
                <a
                  href={`https://wa.me/33664799424?text=Bonjour%2C+je+suis+int%C3%A9ress%C3%A9+par+le+v%C3%A9hicule+${encodeURIComponent(car.name)}.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-full border border-[#25D366]/30 px-8 py-3 text-sm font-medium text-[#25D366] transition hover:border-[#25D366]/60 hover:bg-[#25D366]/5"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
                  </svg>
                  Demander sur WhatsApp
                </a>
                <a
                  href="tel:+33664799424"
                  className="rounded-full border border-white/15 px-8 py-3 text-center text-sm font-medium text-gray-300 transition hover:border-white/30 hover:text-white"
                >
                  Appeler directement
                </a>
              </div>
            </aside>
          </div>

          {/* ── ACCORDÉONS (sous la galerie) ── */}
          <div className="mt-8 space-y-4">

            {/* Description */}
            {car.description && (
              <AccordionSection
                title="Description"
                preview={descriptionPreview}
              >
                <PortableTextContent value={car.description} className="text-[#071A2D]" />
              </AccordionSection>
            )}

            {/* Options & équipements */}
            {(car.options?.length ?? 0) > 0 && (
              <AccordionSection title="Options & équipements">
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {car.options?.map((option: string, i: number) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded-xl border border-[#071A2D]/15 bg-[#071A2D]/5 px-4 py-3 text-sm text-[#071A2D]"
                    >
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#C9A84C]" />
                      {option}
                    </div>
                  ))}
                </div>
              </AccordionSection>
            )}

            {/* Historique — gated */}
            <HistoryGate
              carName={car.name}
              historyText={car.historyText}
              historyFileUrl={historyFileUrl}
            />
          </div>

          {/* ── BANDE CTA BAS ── */}
          <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl border border-[#C9A84C]/15 bg-navy-light p-8 sm:flex-row">
            <div>
              <p className="font-heading text-xl font-light text-white">
                Ce véhicule vous intéresse ?
              </p>
              <p className="mt-1 text-sm text-gray-400">
                Notre équipe est disponible pour répondre à toutes vos questions.
              </p>
            </div>
            <Link
              href={`/contact?vehicule=${encodeURIComponent(car.name)}&retourVehicule=${encodeURIComponent(slug)}`}
              className="shrink-0 rounded-full bg-[#C9A84C] px-8 py-3 font-semibold text-white transition hover:bg-[#b8962e]"
            >
              Nous contacter
            </Link>
          </div>

        </div>
      </main>
      <Footer />
    </>
  );
}

function Spec({ label, value }: { label: string; value?: string | number }) {
  if (!value) return null;
  return (
    <div className="rounded-xl border border-[#e5e3dd] bg-white px-4 py-3">
      <p className="text-xs uppercase tracking-wider text-navy/50">{label}</p>
      <p className="mt-1 text-sm font-medium text-navy">{value}</p>
    </div>
  );
}
