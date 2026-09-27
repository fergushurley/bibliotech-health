import { notFound, redirect } from "next/navigation";
import HealthApp from "@/app/health-app";
export default async function Page({
  params,
}: {
  params: Promise<{ page?: string[] }>;
}) {
  const { page } = await params;
  const route = "/" + (page ?? []).join("/");
  if (route === "/") redirect("/priors");
  if (
    ![
      "/priors",
      "/brief",
      "/agents",
      "/memory",
      "/access",
      "/insights/cross-specialty-cardiovascular",
    ].includes(route)
  )
    notFound();
  return <HealthApp />;
}
