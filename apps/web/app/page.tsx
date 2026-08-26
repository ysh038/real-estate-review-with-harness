import { VisuallyHidden } from "@repo/ui";

import { KakaoMap } from "../components/KakaoMap";
import { LoginButton } from "../components/LoginButton";
import { resolveInitialOffice } from "../lib/resolveInitialOffice";

interface IHomePageProps {
  searchParams: Promise<{ office?: string }>;
}

/**
 * `/?office=<id>` 딥링크(office-detail-route-and-deeplink AC15~AC17)를 서버에서
 * 미리 풀어 KakaoMap에 넘긴다 — 클라이언트가 뜬 뒤 별도로 조회하면 초기 렌더에서
 * 잠깐 기본 화면(성남시청)이 보였다가 사무소 위치로 튀는 깜빡임이 생긴다.
 */
const HomePage = async ({ searchParams }: IHomePageProps) => {
  const { office } = await searchParams;
  const initialOffice = await resolveInitialOffice(office);

  return (
    <main>
      <VisuallyHidden>
        <h1>경기도 공인중개사 리뷰</h1>
      </VisuallyHidden>
      <LoginButton />
      <KakaoMap initialOffice={initialOffice} />
    </main>
  );
};

export default HomePage;
