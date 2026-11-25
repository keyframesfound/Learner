import ItemPlayer from "@/components/ItemPlayer";

export default async function ItemPage({ params }: { params: Promise<{ lesson: string }> }) {
  const { lesson } = await params;
  return <ItemPlayer lesson={lesson} />;
}
