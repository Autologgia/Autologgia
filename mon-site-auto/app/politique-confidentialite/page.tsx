import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Politique de confidentialité – Autologgia",
  description:
    "Politique de confidentialité d'Autologgia : données collectées, finalités, droits RGPD et contact pour toute demande relative à vos données personnelles.",
  robots: { index: true, follow: true },
};

const UPDATED = "9 mai 2026";

export default function PolitiqueConfidentialitePage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-white">

        {/* ── Hero ── */}
        <div className="bg-navy-light px-6 pb-14 pt-28">
          <div className="mx-auto max-w-3xl">
            <p className="text-xs font-medium uppercase tracking-[0.5em] text-[#C9A84C]">
              Protection des données
            </p>
            <h1 className="mt-3 font-heading text-4xl font-light text-white md:text-5xl">
              Politique de confidentialité
            </h1>
            <p className="mt-3 text-sm text-gray-500">
              Dernière mise à jour : {UPDATED}
            </p>
          </div>
        </div>

        {/* ── Contenu ── */}
        <div className="px-6 py-14">
          <div className="mx-auto max-w-3xl space-y-14">

            {/* Intro */}
            <p className="leading-relaxed text-navy/70">
              La société <strong className="font-medium text-navy">FRERES ROUX AUTO</strong> (ci-après
              «&nbsp;Autologgia&nbsp;») accorde une grande importance à la protection de votre vie
              privée. Cette politique de confidentialité vous informe sur la façon dont nous
              collectons, utilisons et protégeons vos données personnelles, conformément au
              Règlement Général sur la Protection des Données (RGPD – Règlement UE 2016/679) et à
              la loi Informatique et Libertés du 6 janvier 1978 modifiée.
            </p>

            {/* 1. Responsable du traitement */}
            <section>
              <SectionTitle n="1" title="Responsable du traitement" />
              <dl className="mt-6 space-y-3.5">
                <InfoRow label="Société"   value="FRERES ROUX AUTO" />
                <InfoRow label="SIREN"     value="989 297 742" />
                <InfoRow label="Adresse"   value="11B Chemin des Gourguettes, 06150 Cannes" />
                <InfoRow label="Email"     value="autologgia.web@gmail.com" />
                <InfoRow label="Téléphone" value="+33 6 64 79 94 24" />
              </dl>
            </section>

            {/* 2. Données collectées */}
            <section>
              <SectionTitle n="2" title="Données personnelles collectées" />
              <div className="mt-5 space-y-6">

                <SubSection title="Via le formulaire de contact">
                  <ul className="mt-3 space-y-1.5 text-navy/70">
                    {[
                      "Nom complet",
                      "Adresse email",
                      "Numéro de téléphone",
                      "Sujet de la demande",
                      "Message libre",
                    ].map((item) => <Li key={item}>{item}</Li>)}
                  </ul>
                </SubSection>

                <SubSection title="Via le formulaire d'estimation">
                  <ul className="mt-3 space-y-1.5 text-navy/70">
                    {[
                      "Données du véhicule : marque, modèle, année, kilométrage, puissance, carburant, transmission, version, état général",
                      "Photos du véhicule (optionnel)",
                      "Numéro de téléphone",
                      "Adresse email (optionnel)",
                      "Localisation (optionnel)",
                      "Message complémentaire (optionnel)",
                    ].map((item) => <Li key={item}>{item}</Li>)}
                  </ul>
                </SubSection>

                <SubSection title="Données techniques">
                  <p className="mt-3 leading-relaxed text-navy/70">
                    Lors de votre navigation, des données techniques peuvent être collectées
                    automatiquement par l'hébergeur (adresse IP, type de navigateur, pages
                    consultées) à des fins de sécurité et de maintenance du service. Ces données
                    ne sont pas exploitées à des fins commerciales par Autologgia.
                  </p>
                </SubSection>

              </div>
            </section>

            {/* 3. Finalités */}
            <section>
              <SectionTitle n="3" title="Finalités du traitement" />
              <div className="mt-5 space-y-4 leading-relaxed text-navy/70">
                <p>Vos données personnelles sont collectées et traitées pour les finalités suivantes :</p>
                <ul className="space-y-2">
                  {[
                    "Répondre à vos demandes de contact et d'information sur nos véhicules",
                    "Établir et vous transmettre une estimation personnalisée de votre véhicule",
                    "Assurer le suivi de votre dossier dans le cadre d'un projet d'achat ou de vente",
                    "Vous contacter par téléphone ou email dans le cadre de votre demande",
                    "Assurer la sécurité et le bon fonctionnement du site",
                  ].map((item) => <Li key={item}>{item}</Li>)}
                </ul>
                <p>
                  Vos données ne sont <strong className="font-medium text-navy">jamais revendues
                  à des tiers</strong> et ne sont pas utilisées à des fins de prospection
                  commerciale sans votre consentement préalable.
                </p>
              </div>
            </section>

            {/* 4. Base légale */}
            <section>
              <SectionTitle n="4" title="Base légale du traitement" />
              <div className="mt-5 space-y-4 leading-relaxed text-navy/70">
                <p>
                  Le traitement de vos données repose sur les bases légales suivantes :
                </p>
                <ul className="space-y-2">
                  <Li><strong className="font-medium text-navy">Votre consentement</strong> — recueilli explicitement via la case à cocher présente sur nos formulaires, conformément à l'article 6.1.a du RGPD.</Li>
                  <Li><strong className="font-medium text-navy">L'exécution d'un contrat ou de mesures précontractuelles</strong> — lorsque vous nous sollicitez dans le cadre d'un projet d'achat ou de vente (article 6.1.b du RGPD).</Li>
                  <Li><strong className="font-medium text-navy">Notre intérêt légitime</strong> — pour assurer la sécurité du site et prévenir les fraudes (article 6.1.f du RGPD).</Li>
                </ul>
              </div>
            </section>

            {/* 5. Conservation */}
            <section>
              <SectionTitle n="5" title="Durée de conservation" />
              <div className="mt-5 space-y-4 leading-relaxed text-navy/70">
                <p>
                  Vos données personnelles sont conservées pour une durée n'excédant pas celle
                  nécessaire à la finalité pour laquelle elles ont été collectées :
                </p>
                <ul className="space-y-2">
                  <Li><strong className="font-medium text-navy">Données de contact et d'estimation</strong> — 3 ans à compter du dernier contact ou de la dernière interaction.</Li>
                  <Li><strong className="font-medium text-navy">Données de prospection</strong> — 3 ans à compter de la collecte, ou jusqu'à retrait de votre consentement.</Li>
                  <Li><strong className="font-medium text-navy">Données techniques</strong> — 12 mois conformément aux obligations légales applicables.</Li>
                </ul>
                <p>
                  À l'expiration de ces délais, vos données sont supprimées ou anonymisées.
                </p>
              </div>
            </section>

            {/* 6. Destinataires */}
            <section>
              <SectionTitle n="6" title="Destinataires des données" />
              <div className="mt-5 space-y-4 leading-relaxed text-navy/70">
                <p>
                  Vos données sont traitées par l'équipe d'Autologgia (FRERES ROUX AUTO) dans le
                  cadre strict de vos demandes. Elles peuvent être transmises aux sous-traitants
                  techniques suivants, exclusivement pour les besoins du service :
                </p>
                <ul className="space-y-2">
                  <Li><strong className="font-medium text-navy">Vercel Inc.</strong> (hébergement du site) — Politique de confidentialité disponible sur vercel.com</Li>
                  <Li><strong className="font-medium text-navy">Resend Inc.</strong> (envoi d'e-mails transactionnels) — Politique disponible sur resend.com</Li>
                  <Li><strong className="font-medium text-navy">Sanity AS</strong> (gestion du contenu CMS) — Politique disponible sur sanity.io</Li>
                </ul>
                <p>
                  Ces sous-traitants agissent sur instruction d'Autologgia et s'engagent
                  contractuellement à respecter la confidentialité et la sécurité de vos données.
                </p>
              </div>
            </section>

            {/* 7. Droits RGPD */}
            <section>
              <SectionTitle n="7" title="Vos droits" />
              <div className="mt-5 space-y-4 leading-relaxed text-navy/70">
                <p>
                  Conformément au RGPD et à la loi Informatique et Libertés, vous disposez des
                  droits suivants concernant vos données personnelles :
                </p>
                <ul className="space-y-2">
                  <Li><strong className="font-medium text-navy">Droit d'accès</strong> — obtenir la confirmation que des données vous concernant sont traitées et en recevoir une copie.</Li>
                  <Li><strong className="font-medium text-navy">Droit de rectification</strong> — demander la correction de données inexactes ou incomplètes.</Li>
                  <Li><strong className="font-medium text-navy">Droit à l'effacement</strong> — demander la suppression de vos données dans les cas prévus par la loi.</Li>
                  <Li><strong className="font-medium text-navy">Droit à la limitation</strong> — demander la suspension du traitement dans certains cas.</Li>
                  <Li><strong className="font-medium text-navy">Droit à la portabilité</strong> — recevoir vos données dans un format structuré et lisible par machine.</Li>
                  <Li><strong className="font-medium text-navy">Droit d'opposition</strong> — vous opposer au traitement de vos données, notamment à des fins de prospection.</Li>
                  <Li><strong className="font-medium text-navy">Droit de retrait du consentement</strong> — retirer à tout moment votre consentement sans que cela remette en cause la licéité des traitements effectués avant ce retrait.</Li>
                </ul>
                <p>
                  Pour exercer ces droits, contactez-nous à{" "}
                  <a
                    href="mailto:autologgia.web@gmail.com"
                    className="font-medium text-[#C9A84C] underline underline-offset-2 transition hover:text-[#b8962e]"
                  >
                    autologgia.web@gmail.com
                  </a>
                  {" "}en précisant votre identité. Nous nous engageons à vous répondre dans un
                  délai d'un mois.
                </p>
                <p>
                  Vous avez également le droit d'introduire une réclamation auprès de la{" "}
                  <strong className="font-medium text-navy">CNIL</strong> (Commission Nationale
                  de l'Informatique et des Libertés) sur{" "}
                  <span className="font-medium text-navy">cnil.fr</span>.
                </p>
              </div>
            </section>

            {/* 8. Cookies */}
            <section>
              <SectionTitle n="8" title="Cookies" />
              <div className="mt-5 space-y-4 leading-relaxed text-navy/70">
                <p>
                  Ce site utilise uniquement des <strong className="font-medium text-navy">cookies
                  techniques strictement nécessaires</strong> à son fonctionnement normal :
                  gestion des sessions, préférences de navigation et sécurité. Ces cookies
                  n'impliquent pas de consentement préalable en vertu de la directive ePrivacy.
                </p>
                <p>
                  Nous n'utilisons actuellement <strong className="font-medium text-navy">aucun
                  cookie de mesure d'audience, de publicité ou de suivi tiers</strong>
                  {" "}(Google Analytics, Meta Pixel, etc.).
                </p>
                <p>
                  Si cette pratique venait à évoluer, nous mettrons à jour la présente politique
                  et recueillerons votre consentement conformément à la réglementation applicable.
                </p>
              </div>
            </section>

            {/* 9. Sécurité */}
            <section>
              <SectionTitle n="9" title="Sécurité des données" />
              <p className="mt-5 leading-relaxed text-navy/70">
                Autologgia met en œuvre les mesures techniques et organisationnelles appropriées
                pour protéger vos données contre tout accès non autorisé, perte, destruction ou
                divulgation. Les échanges entre votre navigateur et nos serveurs sont chiffrés via
                le protocole HTTPS (TLS).
              </p>
            </section>

            {/* 10. Contact */}
            <section>
              <SectionTitle n="10" title="Contact — Délégué à la protection des données" />
              <p className="mt-5 leading-relaxed text-navy/70">
                Pour toute question relative à la présente politique ou pour exercer vos droits,
                vous pouvez nous contacter :
              </p>
              <dl className="mt-5 space-y-3.5">
                <InfoRow label="Email"    value="autologgia.web@gmail.com" />
                <InfoRow label="Adresse"  value="11B Chemin des Gourguettes, 06150 Cannes" />
              </dl>
            </section>

            {/* Retour */}
            <div className="border-t border-[#e5e3dd] pt-8">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm text-navy/50 transition hover:text-navy"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Retour à l&apos;accueil
              </Link>
            </div>

          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function SectionTitle({ n, title }: { n: string; title: string }) {
  return (
    <div className="flex items-baseline gap-3 border-b border-[#e5e3dd] pb-3">
      <span className="font-heading text-2xl font-light text-[#C9A84C]">{n}.</span>
      <h2 className="font-heading text-2xl font-light text-navy">{title}</h2>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-0">
      <dt className="w-full shrink-0 text-sm font-medium text-navy/50 sm:w-40">{label}</dt>
      <dd className="text-sm font-medium text-navy">{value}</dd>
    </div>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#e5e3dd] bg-[#f8f7f5] p-5">
      <h3 className="text-sm font-semibold text-navy">{title}</h3>
      {children}
    </div>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C9A84C]" />
      <span>{children}</span>
    </li>
  );
}
