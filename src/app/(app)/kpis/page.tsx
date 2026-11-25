import { RegisterListPage } from "@/components/registers/register-pages";
import { getRegister } from "@/lib/registers";

export const metadata = { title: getRegister("kpis").title };

export default function Page() {
  return <RegisterListPage registerKey="kpis" />;
}
