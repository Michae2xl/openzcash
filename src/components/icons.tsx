/** Ícones SVG inline (stroke = currentColor). Leves, sem dependência externa. */

import type { ReactNode } from "react";

type IconProps = { className?: string };

function svg(path: ReactNode) {
  return function Icon({ className }: IconProps) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
      >
        {path}
      </svg>
    );
  };
}

export const IconDashboard = svg(
  <>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </>,
);

export const IconList = svg(
  <>
    <path d="M8 6h13M8 12h13M8 18h13" />
    <circle cx="3.5" cy="6" r="1" />
    <circle cx="3.5" cy="12" r="1" />
    <circle cx="3.5" cy="18" r="1" />
  </>,
);

export const IconKey = svg(
  <>
    <circle cx="7.5" cy="15.5" r="4.5" />
    <path d="M10.5 12.5 21 2m-4 1 2.5 2.5M14.5 5.5 17 8" />
  </>,
);

export const IconBalance = svg(
  <>
    <path d="M12 3v18M5 7h14M7 7l-3 6a3 3 0 0 0 6 0L7 7Zm10 0-3 6a3 3 0 0 0 6 0l-3-6Z" />
  </>,
);

export const IconArrowDown = svg(<path d="M12 5v14M19 12l-7 7-7-7" />);
export const IconArrowUp = svg(<path d="M12 19V5M5 12l7-7 7 7" />);

export const IconShield = svg(
  <path d="M12 3 5 6v6c0 4 3 6.5 7 9 4-2.5 7-5 7-9V6l-7-3Z" />,
);

export const IconAlert = svg(
  <>
    <path d="M12 9v4M12 17h.01" />
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
  </>,
);

export const IconCheck = svg(<path d="M20 6 9 17l-5-5" />);

export const IconCoins = svg(
  <>
    <ellipse cx="9" cy="7" rx="6" ry="3" />
    <path d="M3 7v5c0 1.66 2.69 3 6 3s6-1.34 6-3V7" />
    <path d="M15 11.5c2.5.3 6 1.4 6 3.5 0 1.66-2.69 3-6 3-1.2 0-2.3-.18-3.2-.48" />
  </>,
);

export const IconGrant = svg(
  <>
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <path d="M8 8h8M8 12h4" />
    <circle cx="15.5" cy="15.5" r="2.5" />
    <path d="M14 17.5l-1.2 2.8 2.7-1.2 2.7 1.2-1.2-2.8" />
  </>,
);

export const IconReceipt = svg(
  <path d="M5 3v18l2-1.2L9 21l2-1.2L13 21l2-1.2L17 21l2-1.2V3l-2 1.2L15 3l-2 1.2L11 3 9 4.2 7 3 5 4.2zM9 8h6M9 12h6" />,
);

export const IconUsers = svg(
  <>
    <circle cx="9" cy="8" r="3" />
    <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
    <path d="M16 5.4a3 3 0 0 1 0 5.2M21 20a5.5 5.5 0 0 0-3.5-5.1" />
  </>,
);

export const IconChart = svg(
  <>
    <path d="M3 3v18h18" />
    <rect x="6.5" y="12" width="3" height="6" rx="0.5" />
    <rect x="11.5" y="8" width="3" height="10" rx="0.5" />
    <rect x="16.5" y="5" width="3" height="13" rx="0.5" />
  </>,
);

export const IconVote = svg(
  <>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M8 12l2.5 2.5L16 9" />
  </>,
);

export const IconSigma = svg(<path d="M18 4H6l6 8-6 8h12" />);

export const IconSwap = svg(
  <>
    <path d="M16 3l4 4-4 4" />
    <path d="M20 7H9a4 4 0 0 0-4 4" />
    <path d="M8 21l-4-4 4-4" />
    <path d="M4 17h11a4 4 0 0 0 4-4" />
  </>,
);

export const IconMail = svg(
  <>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 7.5l9 6 9-6" />
  </>,
);

export const IconGrid = svg(
  <>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </>,
);

export const IconClose = svg(<path d="M6 6l12 12M18 6L6 18" />);

export const IconPencil = svg(
  <path d="M4 20h4L18.5 9.5a2.12 2.12 0 0 0-3-3L5 17v3z" />,
);

export const IconNews = svg(
  <>
    <path d="M4 5h13v14H6a2 2 0 0 1-2-2z" />
    <path d="M17 8h2a1 1 0 0 1 1 1v8a2 2 0 0 1-2 2" />
    <path d="M8 9h6M8 13h6M8 17h3" />
  </>,
);
