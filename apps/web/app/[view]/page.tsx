import { notFound } from "next/navigation";
import Dashboard from "../../components/dashboard";
export default async function Page({
  params,
}: {
  params: Promise<{ view: string }>;
}) {
  const { view } = await params;
  if (!["priors", "brief", "memory", "agents", "access"].includes(view))
    notFound();
  return <Dashboard view={view} />;
}
