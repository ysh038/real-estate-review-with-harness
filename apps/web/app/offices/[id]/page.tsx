import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import styles from "./page.module.css";
import { OfficeInfoFields } from "../../../components/OfficeInfoFields";
import { OfficeMiniMap } from "../../../components/OfficeMiniMap";
import { ReviewSection } from "../../../components/ReviewSection";
import { buildOfficeMetadata } from "../../../lib/officeMetadata";
import { fetchOfficeDetail, ReviewApiError } from "../../../lib/reviewsApi";

interface IOfficeDetailPageProps {
  params: Promise<{ id: string }>;
}

/** 404는 "없는 사무소"로, 그 외 오류는 그대로 던져 Next 에러 바운더리가 처리하게 한다. */
const loadOffice = async (id: string) => {
  try {
    return await fetchOfficeDetail(id);
  } catch (error) {
    if (error instanceof ReviewApiError && error.status === 404) return null;
    throw error;
  }
};

export const generateMetadata = async ({
  params,
}: IOfficeDetailPageProps): Promise<Metadata> => {
  const { id } = await params;
  const office = await loadOffice(id);
  if (!office) return {};

  const { title, description } = buildOfficeMetadata(office);
  return { title, description, openGraph: { title, description } };
};

const OfficeDetailPage = async ({ params }: IOfficeDetailPageProps) => {
  const { id } = await params;
  const office = await loadOffice(id);
  if (!office) notFound();

  return (
    <main className={styles.page}>
      <Link className={styles.backLink} href="/">
        지도로 돌아가기
      </Link>
      <h1 className={styles.title}>{office.name}</h1>
      <OfficeInfoFields office={office} />
      <OfficeMiniMap lat={office.lat} lng={office.lng} name={office.name} />
      <ReviewSection officeId={office.id} />
    </main>
  );
};

export default OfficeDetailPage;
