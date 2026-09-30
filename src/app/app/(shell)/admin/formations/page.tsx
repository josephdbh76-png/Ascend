import type { Metadata } from "next";
import { listTrainingsForAdmin } from "@/services/training.service";
import { AdminSection } from "../AdminSection";
import { TrainingsAdmin } from "../TrainingsAdmin";

export const metadata: Metadata = { title: "Formations · Administration" };

export default async function AdminTrainingsPage() {
  const trainings = await listTrainingsForAdmin();
  return (
    <AdminSection
      title="Formations"
      description="Les formations proposées par les membres passent ici avant d'être publiées. Épingle celles à mettre à la une : les autres suivent l'ordre des vues de la semaine."
    >
      <TrainingsAdmin initial={trainings} />
    </AdminSection>
  );
}
