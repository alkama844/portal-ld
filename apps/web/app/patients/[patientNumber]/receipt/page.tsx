import { redirect } from 'next/navigation';

export default function PatientReceiptIndexPage({ params }: { params: { patientNumber: string } }) {
  redirect(`/patients/${params.patientNumber}/receipt/new`);
}
