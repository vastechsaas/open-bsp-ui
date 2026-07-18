export const COMPACT_SIDEBAR_WIDTH = 48;
export const COLLAPSED_SIDEBAR_WIDTH = 64;
export const EXPANDED_SIDEBAR_WIDTH = 240;
export const SIDEBAR_DESKTOP_BREAKPOINT = 1024;

export function getSidebarWidth(
  viewportWidth: number,
  sidebarCollapsed: boolean,
) {
  if (viewportWidth < SIDEBAR_DESKTOP_BREAKPOINT) {
    return COMPACT_SIDEBAR_WIDTH;
  }

  return sidebarCollapsed ? COLLAPSED_SIDEBAR_WIDTH : EXPANDED_SIDEBAR_WIDTH;
}

export function isSidebarExpanded(
  viewportWidth: number,
  sidebarCollapsed: boolean,
) {
  return viewportWidth >= SIDEBAR_DESKTOP_BREAKPOINT && !sidebarCollapsed;
}

export function getResizablePanelMaxWidth(
  viewportWidth: number,
  sidebarWidth: number,
) {
  return Math.floor(Math.max(0, viewportWidth - sidebarWidth) / 2);
}
