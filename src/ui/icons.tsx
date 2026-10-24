const ICON_PATHS = {
  templates: 'M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z',
  room: 'M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7M12 11v10',
  opening: 'M5 3h14v18H5zM12 3v18M5 12h14',
  decor: 'M12 3c3 4 6 7 6 10a6 6 0 01-12 0c0-3 3-6 6-10z',
  modules: 'M4 3h16v18H4zM12 3v18M9 11v2M15 11v2',
  composition: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  drawing: 'M4 20l4-1 11-11-3-3L5 16l-1 4zM14 7l3 3',
  undo: 'M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3',
  redo: 'M15 14l5-5-5-5M20 9H10a6 6 0 000 12h3',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  left: 'M15 5l-7 7 7 7',
  right: 'M9 5l7 7-7 7',
  down: 'M5 9l7 7 7-7',
  up: 'M5 15l7-7 7 7',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  close: 'M6 6l12 12M18 6L6 18',
  link: 'M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1',
  cube: 'M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zM12 12l8-4.5M12 12v9M12 12L4 7.5',
  topView: 'M4 4h16v16H4zM4 10h6v10M10 10h10',
  zoomIn: 'M11 4a7 7 0 100 14 7 7 0 000-14zM21 21l-5-5M11 8v6M8 11h6',
  rotate: 'M20 12a8 8 0 11-2.6-5.9M20 4v5h-5',
  zoomOut: 'M11 4a7 7 0 100 14 7 7 0 000-14zM21 21l-5-5M8 11h6',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 100 6 3 3 0 000-6z',
  moon: 'M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z',
  camera: 'M4 8h4l2-3h4l2 3h4v11H4zM12 11a3.5 3.5 0 100 7 3.5 3.5 0 000-7z',
  save: 'M12 4v11M7 11l5 5 5-5M5 20h14',
  open: 'M12 16V5M7 9l5-5 5 5M5 20h14',
  print: 'M7 9V4h10v5M7 17H4v-7h16v7h-3M7 14h10v6H7z',
  table: 'M4 5h16v14H4zM4 10h16M10 5v14',
} as const;

export type IconName = keyof typeof ICON_PATHS;

interface IconProps {
  name: IconName;
}

export function Icon({ name }: IconProps) {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}
