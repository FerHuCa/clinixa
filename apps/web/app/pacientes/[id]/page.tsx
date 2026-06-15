import { PatientProfileClient } from "./patient-profile-client";

type PatientPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PatientPage({ params }: PatientPageProps) {
  const { id } = await params;

  return <PatientProfileClient patientId={id} />;
}
