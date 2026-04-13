import React from "react";
import { NavLink } from "react-router-dom";

/* ------------------------------------------------------------------
   Icons (inline SVGs, 22×22, stroke-only for theme-adaptive color).
   Simple line-art feels native on mobile and works in both themes.
   ------------------------------------------------------------------ */

const Icon = ({ children, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    {children}
  </svg>
);

const HomeIcon = () => (
  <Icon>
    <path d="M3 12 12 3l9 9" />
    <path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10" />
  </Icon>
);

const DistrictsIcon = () => (
  <Icon>
    <path d="M3 21V10l6-4 6 4v11" />
    <path d="M15 21V14l6-2v9" />
    <path d="M9 21v-6h2" />
    <path d="M3 21h18" />
  </Icon>
);

const CampusesIcon = () => (
  <Icon>
    <path d="M3 10 12 4l9 6" />
    <path d="M6 10v10h12V10" />
    <path d="M9 14h6" />
    <path d="M9 18h6" />
  </Icon>
);

const TrendsIcon = () => (
  <Icon>
    <path d="M4 19h16" />
    <path d="M4 15l4-5 4 3 4-7 4 5" />
    <circle cx="8" cy="10" r="1" />
    <circle cx="12" cy="13" r="1" />
    <circle cx="16" cy="6" r="1" />
    <circle cx="20" cy="11" r="1" />
  </Icon>
);

const AboutIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 16v-5" />
    <path d="M12 8h.01" />
  </Icon>
);

const TABS = [
  { to: "/",          label: "Home",      Icon: HomeIcon,      end: true },
  { to: "/districts", label: "Districts", Icon: DistrictsIcon },
  { to: "/campuses",  label: "Campuses",  Icon: CampusesIcon },
  { to: "/spending",  label: "Trends",    Icon: TrendsIcon },
  { to: "/about",     label: "About",     Icon: AboutIcon },
];

/**
 * Fixed-bottom primary navigation for mobile (<md). Replaces the hamburger
 * drawer. Matches the native-feel pattern the user pointed to (ThisHome).
 */
export default function MobileTabBar() {
  return (
    <nav
      className="mobile-tabbar"
      aria-label="Primary"
      role="navigation"
    >
      <ul className="mobile-tabbar__list">
        {TABS.map(({ to, label, Icon: TabIcon, end }) => (
          <li key={to} className="mobile-tabbar__item">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `mobile-tabbar__link${isActive ? " is-active" : ""}`
              }
              aria-label={label}
            >
              <span className="mobile-tabbar__icon" aria-hidden="true">
                <TabIcon />
              </span>
              <span className="mobile-tabbar__label">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
