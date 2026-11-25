import { RegisterDetailPage } from "@/components/registers/register-pages";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RegisterDetailPage registerKey="suppliers" id={id} />;
}
