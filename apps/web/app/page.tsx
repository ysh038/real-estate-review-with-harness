import { VisuallyHidden } from "@repo/ui";

import { KakaoMap } from "../components/KakaoMap";

const HomePage = () => (
  <main>
    <VisuallyHidden>
      <h1>경기도 공인중개사 리뷰</h1>
    </VisuallyHidden>
    <KakaoMap />
  </main>
);

export default HomePage;
