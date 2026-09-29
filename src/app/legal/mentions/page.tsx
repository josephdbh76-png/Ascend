import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Éditeur et hébergeur du site ASCEND.",
};

const h2 = "text-base font-semibold text-text-primary";

export default function LegalNoticePage() {
  const publisher = [
    LEGAL.companyName ?? LEGAL.brand,
    LEGAL.legalForm,
    LEGAL.siret && `SIRET ${LEGAL.siret}`,
    LEGAL.address,
  ].filter(Boolean);

  return (
    <LegalPage title="Mentions légales">
      <h2 className={h2}>Éditeur</h2>
      <p>
        {publisher.map((line, i) => (
          <span key={i} className="block">
            {line}
          </span>
        ))}
        {LEGAL.publicationDirector && (
          <span className="block">Directeur de la publication : {LEGAL.publicationDirector}</span>
        )}
        <span className="block">
          Contact :{" "}
          <a href={`mailto:${LEGAL.contactEmail}`} className="text-text-primary underline hover:text-gold">
            {LEGAL.contactEmail}
          </a>
        </span>
      </p>

      <h2 className={h2}>Hébergement</h2>
      <p>
        <span className="block">
          Application : {LEGAL.host.name}, {LEGAL.host.address} ({LEGAL.host.website.replace("https://", "")})
        </span>
        <span className="block">
          Données et authentification : {LEGAL.dataHost.name} ({LEGAL.dataHost.website.replace("https://", "")})
        </span>
      </p>

      <h2 className={h2}>Paiements</h2>
      <p>
        Les paiements sont traités par Stripe Payments Europe Ltd. ASCEND ne reçoit ni ne conserve jamais
        tes numéros de carte bancaire.
      </p>

      <h2 className={h2}>Propriété intellectuelle</h2>
      <p>
        La marque ASCEND, le site et ses contenus (textes, visuels, logos, code) sont protégés. Toute
        reproduction sans autorisation écrite est interdite. Les contenus publiés par les membres restent
        la propriété de leurs auteurs.
      </p>
    </LegalPage>
  );
}
