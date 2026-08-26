import { redirect } from "next/navigation";

/** `/mypage`는 기본 탭(리뷰)으로 보낸다. */
const MyPageIndex = () => {
  redirect("/mypage/reviews");
};

export default MyPageIndex;
