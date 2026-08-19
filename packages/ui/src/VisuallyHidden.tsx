import type { ReactNode } from "react";

interface IVisuallyHiddenProps {
  children: ReactNode;
}

/** 시각적으로는 감추고 스크린리더에는 남기는 텍스트. */
export const VisuallyHidden = ({ children }: IVisuallyHiddenProps) => (
  <span
    style={{
      position: "absolute",
      width: 1,
      height: 1,
      margin: -1,
      padding: 0,
      overflow: "hidden",
      clip: "rect(0 0 0 0)",
      whiteSpace: "nowrap",
      border: 0,
    }}
  >
    {children}
  </span>
);
