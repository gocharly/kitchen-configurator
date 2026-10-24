import { Icon, type IconName } from './icons';

export interface RailSection {
  id: string;
  title: string;
  icon: IconName;
}

interface SectionRailProps {
  sections: RailSection[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

export function SectionRail({ sections, activeId, onSelect }: SectionRailProps) {
  return (
    <nav className="rail" role="tablist" aria-label="Разделы" aria-orientation="vertical">
      {sections.map((section) => (
        <button
          key={section.id}
          type="button"
          role="tab"
          aria-selected={section.id === activeId}
          aria-label={section.title}
          data-tip={section.title}
          className="rail-button"
          onClick={() => onSelect(section.id)}
        >
          <Icon name={section.icon} />
        </button>
      ))}
    </nav>
  );
}
