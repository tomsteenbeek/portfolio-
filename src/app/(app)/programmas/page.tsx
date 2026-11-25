"use client";
import { AsyncPage } from "@/components/async-page";
import { RegisterListPage } from "@/components/registers/register-pages";
import { getRegister } from "@/lib/registers";

export default function Page() {
  return <AsyncPage render={async () => {

  return <RegisterListPage registerKey="programs" />;

  }} />;
}
