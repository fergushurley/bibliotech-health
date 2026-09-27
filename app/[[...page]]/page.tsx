import { notFound } from "next/navigation";
import Landing from "@/app/landing";
import HealthApp from "@/app/health-app";
export default async function Page({
  params,
}: {
  params: Promise<{ page?: string[] }>;
}) {
  const { page } = await params;
  const route = "/" + (page ?? []).join("/");
  if (route === "/") return <Landing />;
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
