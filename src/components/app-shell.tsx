"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ZarvisDock } from "./zarvis/zarvis-dock";
import { LogoutButton } from "./logout-button";
import { ScrollHints } from "./scroll-hints";
import { APPS, backOf, parentAppOf, placeOf } from "@/lib/design-routes";
import { GLYPH, Glyph } from "./app-marks";
import { CommandPalette } from "./command-palette";
import { MobileTabBar } from "./mobile-tab-bar";
import { useMediaQuery } from "./use-media-query";
import { TopBarPlace } from "./top-bar-place";
import { AppNavigation } from "./app-navigation";
import { useThemeColor } from "./use-theme-color";
import { MOBILE_NAV_QUERY } from "@/lib/mobile-tabs";
import { wrapFocus } from "@/lib/focus-wrap";

type Theme = "light" | "dark";
const THEME_KEY = "oz-theme";
const OPEN_KEY = "oz-nav-open";
const ZCG_CLOSED_DEFAULT_KEY = "oz-zcg-closed-default-v1";
// The light workspace is the default everywhere; dark is a per-browser choice.
const THEME_ORDER: Theme[] = ["light", "dark"];
/** What Tab stops on inside the open Apps sheet. */
const TABBABLE = "a[href], button:not([disabled])";
const THEME_LABEL: Record<Theme, string> = {
  light: "Light theme (switch to dark)",
  dark: "Dark theme (switch to light)",
};

export function AppShell({
  children,
  isAdmin = false,
  isPreview = false,
  footer,
}: {
  children: ReactNode;
  isAdmin?: boolean;
  isPreview?: boolean;
  /**
   * Server-rendered treasury figures: pinned to the bottom of every page on
   * wide screens, inside the Treasury tab's sheet where the tab bar shows.
   */
  footer?: ReactNode;
}) {
  const pathname = usePathname();
  const rawPlace = placeOf(pathname);
  // Data-management pages exist for administrators only; an anonymous visitor
  // on the public /onboarding route gets no trail into them.
  const place = rawPlace?.app.admin && !isAdmin ? undefined : rawPlace;
  // Hidden apps (Lockbox) open only from the treasury bar.
  const apps = APPS.filter((a) => (!a.admin || isAdmin) && !a.hidden);
  const back = backOf(pathname);
  const parentApp = place ? parentAppOf(place.app) : undefined;
  const isHome = pathname === "/zcg" || pathname === "/";

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");
  const [openApps, setOpenApps] = useState<Record<string, boolean>>({});
  const [counts, setCounts] = useState<Record<string, string>>({});
  // Tab-bar width: the sidebar is a drawer and the phone shell applies.
  const compact = useMediaQuery(MOBILE_NAV_QUERY);
  // The drawer exists only there; a window widened while it was open is not left locked.
  const drawerOpen = navOpen && compact;
  const side = useRef<HTMLElement>(null);
  const shell = useRef<HTMLDivElement>(null);
  // The browser chrome and the phone status area follow the theme's canvas.
  useThemeColor(shell, theme);

  // Per-browser conveniences: the theme and which apps stay expanded.
  // Read after mount (reading storage during render breaks hydration).
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      const t = window.localStorage.getItem(THEME_KEY) as Theme | null;
      if (t && THEME_ORDER.includes(t)) setTheme(t);
      const o = window.localStorage.getItem(OPEN_KEY);
      if (o) {
        const saved = JSON.parse(o) as Record<string, boolean>;
        // Reset the old expanded default once; later user toggles still persist.
        if (!window.localStorage.getItem(ZCG_CLOSED_DEFAULT_KEY)) {
          delete saved.zcg;
          window.localStorage.setItem(OPEN_KEY, JSON.stringify(saved));
        }
        setOpenApps(saved);
      }
      window.localStorage.setItem(ZCG_CLOSED_DEFAULT_KEY, "1");
    } catch {
      /* private mode or blocked storage: defaults apply */
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Record counts beside the sidebar items, read after the page paints.
  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/nav-counts", { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : {}))
      .then((d: Record<string, string>) => setCounts(d ?? {}))
      .catch(() => {
        /* counts are a convenience; the navigation works without them */
      });
    return () => ctrl.abort();
  }, []);

  // The drawer and the search close on navigation; ⌘K / Ctrl+K toggles the search.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setNavOpen(false);
    setPaletteOpen(false);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [pathname]);
  // A drawer left open does not come back by itself when the window is
  // widened past tab-bar width and narrowed again.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!compact) setNavOpen(false);
  }, [compact]);
  // The page behind an open drawer stays put. Where its scrollbar takes room,
  // that room stays reserved, so nothing behind shifts sideways (as the palette does).
  useEffect(() => {
    if (!drawerOpen) return;
    const root = document.documentElement;
    const hasScrollbar = window.innerWidth > root.clientWidth;
    root.style.scrollbarGutter = hasScrollbar ? "stable" : "";
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      root.style.scrollbarGutter = "";
    };
  }, [drawerOpen]);
  // An open drawer behaves like a dialog: focus moves into it and stays there
  // (Tab wraps at both ends), Esc closes it and focus returns to the control
  // that opened it (the Apps tab).
  useEffect(() => {
    if (!drawerOpen) return;
    const active = document.activeElement;
    const opener =
      active instanceof HTMLElement && active !== document.body ? active : null;
    side.current?.querySelector<HTMLElement>(".rd-side-close")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNavOpen(false);
      if (e.key !== "Tab") return;
      const stops = Array.from(
        side.current?.querySelectorAll<HTMLElement>(TABBABLE) ?? [],
      ).filter((el) => el.getClientRects().length > 0);
      const target = wrapFocus(
        stops.length,
        stops.indexOf(document.activeElement as HTMLElement),
        e.shiftKey,
      );
      if (target === null) return;
      e.preventDefault();
      stops[target].focus();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      opener?.focus();
    };
  }, [drawerOpen]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((isOpen) => !isOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function cycleTheme() {
    const next = THEME_ORDER[(THEME_ORDER.indexOf(theme) + 1) % THEME_ORDER.length];
    document.documentElement.dataset.theme = next;
    setTheme(next);
    try {
      window.localStorage.setItem(THEME_KEY, next);
    } catch {
      /* ignore */
    }
  }
  function saveOpenApps(next: Record<string, boolean>) {
    setOpenApps(next);
    try {
      window.localStorage.setItem(OPEN_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }
  function toggleApp(id: string, fallbackOpen: boolean) {
    saveOpenApps({ ...openApps, [id]: !(openApps[id] ?? fallbackOpen) });
  }
  /** Following an app's name also opens its list, even after the visitor collapsed it. */
  function openApp(id: string) {
    if (openApps[id] !== true) saveOpenApps({ ...openApps, [id]: true });
  }

  return (
    <div
      ref={shell}
      className={cn("rd-shell", isPreview && "rd-shell-preview")}
      data-theme={theme}
      data-nav={drawerOpen ? "open" : undefined}
      data-section={place?.app.label ?? "Explore"}
      data-layout={
        /^\/coinholders\/verify\/[^/]+\/[^/]+\/?$/.test(pathname)
          ? "proposal"
          : (pathname === "/zcg/participate" || pathname === "/opportunities" || pathname.startsWith("/opportunities/"))
            ? "workspace"
            : undefined
      }
    >
      {/* Out of reach under the open Apps sheet, like the rest of the page. */}
      <a href="#main-content" className="rd-skip" inert={drawerOpen}>
        Skip to content
      </a>

      <aside
        ref={side}
        className="rd-side"
        aria-label="OpenZcash"
        role={drawerOpen ? "dialog" : undefined}
        aria-modal={drawerOpen || undefined}
        onClick={(e) => {
          // Following any link closes the drawer, even one to the page already open.
          if (!e.defaultPrevented && e.target instanceof Element && e.target.closest("a")) setNavOpen(false);
        }}
      >
        <div className="rd-side-banner">
          <button
            type="button"
            className="rd-side-close"
            onClick={() => setNavOpen(false)}
            aria-label="Close menu"
          >
            <Glyph d={GLYPH.close} />
          </button>
          <Link href="/zcg" className="rd-brand" aria-label="OpenZcash home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logos/marks/openzcash.png" width="40" height="40" alt="" />
            <span className="rd-brand-text">
              <strong>OpenZcash</strong>
            </span>
          </Link>
        </div>
        <nav className="rd-side-nav" aria-label="Apps">
          <AppNavigation
            apps={apps}
            place={place}
            counts={counts}
            openApps={openApps}
            compact={compact}
            onToggle={toggleApp}
            onOpen={openApp}
            onVisit={() => setNavOpen(false)}
          />
        </nav>
        <div className="rd-side-foot">
          <Link href="/zcg/methodology">Sources &amp; methodology</Link>
          <Link href="/zarvis/about">About Zarvis</Link>
          {isPreview ? (
            <a href="https://openzcash.org" target="_blank" rel="noreferrer">
              Current website ↗
            </a>
          ) : null}
          {isAdmin ? <LogoutButton /> : null}
        </div>
      </aside>
      <div
        className="rd-backdrop"
        aria-hidden="true"
        onClick={() => setNavOpen(false)}
      />

      {/* Behind the open drawer the page is out of reach, as behind any dialog. */}
      <div className="rd-body" inert={drawerOpen}>
        <header className="rd-topbar">
          <button
            type="button"
            className="rd-icon-button rd-menu"
            onClick={() => setNavOpen(true)}
            aria-label="Open menu"
          >
            <Glyph d={GLYPH.menu} size={17} />
          </button>
          {!isHome ? (
            <Link
              href={back.href}
              className="rd-back"
              aria-label={`Back to ${back.label}`}
              title={`Back to ${back.label}`}
            >
              ‹
            </Link>
          ) : null}
          <nav className="rd-breadcrumb" aria-label="Breadcrumb">
            {place ? (
              <>
                {parentApp ? (
                  <>
                    <Link href={parentApp.href}>{parentApp.label}</Link>
                    <span aria-hidden>›</span>
                  </>
                ) : null}
                {place.page ? (
                  place.app.navigationOnly ? <span>{place.app.label}</span> : <Link href={place.app.href}>{place.app.label}</Link>
                ) : (
                  <span>{place.app.label}</span>
                )}
                {place.page ? (
                  <>
                    <span aria-hidden>›</span>
                    {place.detail ? (
                      <Link href={place.detail.parent.href}>{place.page.label}</Link>
                    ) : (
                      <span>{place.page.label}</span>
                    )}
                  </>
                ) : null}
                {place.detail ? (
                  <>
                    <span aria-hidden>›</span>
                    <span>{place.detail.label}</span>
                  </>
                ) : null}
              </>
            ) : null}
          </nav>
          {/* The same trail folded for a phone; only one of the two is shown. */}
          <TopBarPlace place={place} />
          <button
            type="button"
            className="rd-search"
            onClick={() => setPaletteOpen(true)}
            aria-label="Search pages, grants and apps"
            aria-haspopup="dialog"
          >
            <Glyph d={GLYPH.search} size={14} />
            <span>Search pages, grants, apps…</span>
            <kbd>⌘K</kbd>
          </button>
          <div className="rd-topbar-actions">
            <Link href="/zarvis" className="rd-button rd-button-primary">
              Ask Zarvis
            </Link>
            <button
              type="button"
              className="rd-icon-button"
              onClick={cycleTheme}
              aria-label={THEME_LABEL[theme]}
              title={THEME_LABEL[theme]}
            >
              <Glyph d={theme === "dark" ? GLYPH.moon : GLYPH.sun} size={16} />
            </button>
          </div>
        </header>

        <main id="main-content" className="rd-main">
          <ScrollHints />
          <div className="rd-content">{children}</div>
        </main>

        {footer ? (
          <footer className="rd-treasury-bar" aria-label="Treasury at a glance">
            {/* One node, one place: at tab-bar width it lives in the Treasury sheet. */}
            {compact ? null : footer}
          </footer>
        ) : null}
      </div>

      <MobileTabBar
        pathname={pathname}
        compact={compact}
        treasury={compact ? footer : null}
        appsOpen={drawerOpen}
        onApps={() => setNavOpen(true)}
        searchOpen={paletteOpen}
        onSearch={() => setPaletteOpen(true)}
      />
      <ZarvisDock />
      <CommandPalette apps={apps} open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
