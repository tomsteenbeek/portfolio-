"use client";
import { AsyncPage } from "@/components/async-page";
import { RegisterDetailPage } from "@/components/registers/register-pages";

export default function Page() {
  return <AsyncPage render={async (__sp) => {
    const params = Promise.resolve({ id: __sp.get("id") ?? "", nummer: __sp.get("nr") ?? "" });

  const { id } = await params;
  return <RegisterDetailPage registerKey="skills" id={id} />;

  }} />;
}
