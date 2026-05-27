import { notFound } from "next/navigation";
import Home from "../page";
import { SCALE_CATEGORIES } from "@/lib/scales";
import type { TabType } from "@/components/scale-navbar";

const ROUTE_TABS: TabType[] = [
  "kinit",
  ...SCALE_CATEGORIES.map((category) => category.id),
  "quiz",
];

export default async function TabPage({
  params,
}: {
  params: Promise<{ tab: string }>;
}) {
  const { tab } = await params;

  if (!ROUTE_TABS.includes(tab as TabType)) {
    notFound();
  }

  return <Home />;
}
