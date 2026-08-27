import type { Metadata } from "next";

import styles from "../legalPage.module.css";

export const metadata: Metadata = { title: "오픈소스 라이선스 고지 | 경기도 공인중개사 리뷰" };

/**
 * apps/api·apps/web의 실제 package.json 의존성과 설치된 각 패키지의 package.json
 * license 필드를 직접 확인해 작성했다 — 원본의 목록을 복사하지 않는다(원본은
 * @aws-sdk/client-s3·sharp·postgres·@hono/zod-validator를 쓰지 않아 구성 자체가
 * 다르다, legal-pages-and-footer 설계 메모).
 */
const OSS_LIST = [
  { name: "Next.js", license: "MIT", url: "https://github.com/vercel/next.js" },
  { name: "React", license: "MIT", url: "https://github.com/facebook/react" },
  { name: "Hono", license: "MIT", url: "https://github.com/honojs/hono" },
  {
    name: "@hono/zod-validator",
    license: "MIT",
    url: "https://github.com/honojs/middleware",
  },
  {
    name: "Drizzle ORM",
    license: "Apache-2.0",
    url: "https://github.com/drizzle-team/drizzle-orm",
  },
  { name: "Zod", license: "MIT", url: "https://github.com/colinhacks/zod" },
  { name: "postgres", license: "Unlicense", url: "https://github.com/porsager/postgres" },
  { name: "sharp", license: "Apache-2.0", url: "https://github.com/lovell/sharp" },
  {
    name: "@aws-sdk/client-s3",
    license: "Apache-2.0",
    url: "https://github.com/aws/aws-sdk-js-v3",
  },
  { name: "카카오 지도 SDK", license: "카카오 이용약관", url: "https://apis.map.kakao.com" },
];

const OssPage = () => (
  <>
    <h1 className={styles.title}>오픈소스 라이선스 고지</h1>
    <p className={styles.revisionDate}>이 서비스는 아래 오픈소스 소프트웨어를 사용합니다.</p>

    <div className={styles.list}>
      {OSS_LIST.map((item) => (
        <div key={item.name} className={`${styles.listItem} ${styles.ossItem}`}>
          <span>
            <span className={styles.ossName}>{item.name}</span>
            <span className={styles.ossLicense}>{item.license}</span>
          </span>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.ossLink}
          >
            소스 →
          </a>
        </div>
      ))}
    </div>

    <p className={styles.ossFootnote}>
      * 전체 패키지 목록은 저장소의 package.json 파일을 참조하세요.
    </p>
  </>
);

export default OssPage;
