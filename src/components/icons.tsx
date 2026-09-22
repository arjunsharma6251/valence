/**
 * Authored 24px icon set, single stroke weight (1.8), round joins.
 * Kept tiny on purpose; every glyph the app shows lives here.
 */
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function Base({ size = 24, children, ...rest }: P) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconPractice = (p: P) => (
  <Base {...p}>
    <rect x="4" y="4" width="16" height="16" rx="4" />
    <path d="M8.5 12.5l2.5 2.5 4.5-5" />
  </Base>
);
export const IconMock = (p: P) => (
  <Base {...p}>
    <circle cx="12" cy="13" r="7.5" />
    <path d="M12 9v4l2.5 2M9.5 3.5h5" />
  </Base>
);
export const IconReview = (p: P) => (
  <Base {...p}>
    <path d="M4.5 12a7.5 7.5 0 0 1 12.8-5.3L19.5 9" />
    <path d="M19.5 4.5V9H15" />
    <path d="M19.5 12a7.5 7.5 0 0 1-12.8 5.3L4.5 15" />
    <path d="M4.5 19.5V15H9" />
  </Base>
);
export const IconPartII = (p: P) => (
  <Base {...p}>
    <path d="M14 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5z" />
    <path d="M14 3.5V8.5h5M8.5 13h7M8.5 16.5h5" />
  </Base>
);
export const IconChevron = (p: P) => (
  <Base {...p}>
    <path d="M9 6l6 6-6 6" />
  </Base>
);
export const IconCheck = (p: P) => (
  <Base {...p} strokeWidth={2.2}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Base>
);
export const IconX = (p: P) => (
  <Base {...p} strokeWidth={2.2}>
    <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
  </Base>
);
export const IconFlag = (p: P) => (
  <Base {...p}>
    <path d="M6 21V4.5" />
    <path d="M6 5h11.5l-2 4 2 4H6" />
  </Base>
);
export const IconPerson = (p: P) => (
  <Base {...p}>
    <circle cx="12" cy="8.5" r="3.5" />
    <path d="M5 19.5a7 7 0 0 1 14 0" />
  </Base>
);
export const IconSearch = (p: P) => (
  <Base {...p}>
    <circle cx="11" cy="11" r="6" />
    <path d="M20 20l-4.5-4.5" />
  </Base>
);
export const IconBack = (p: P) => (
  <Base {...p} strokeWidth={2}>
    <path d="M14.5 5.5L8 12l6.5 6.5" />
  </Base>
);
export const IconPause = (p: P) => (
  <Base {...p}>
    <path d="M9 6v12M15 6v12" />
  </Base>
);
export const IconShare = (p: P) => (
  <Base {...p}>
    <path d="M12 3.5v11" />
    <path d="M8 7.5l4-4 4 4" />
    <path d="M6.5 11H6a2 2 0 0 0-2 2v5.5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V13a2 2 0 0 0-2-2h-.5" />
  </Base>
);
