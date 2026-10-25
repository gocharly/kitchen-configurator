import { KITCHEN_TEMPLATES } from '../domain/templates';
import { applyKitchenTemplate, calculateEstimate, type Kitchen } from '../domain/kitchen';
import { KitchenPreview } from './KitchenPreview';
import { ProjectActions } from './ProjectActions';
import { formatPrice } from './formatPrice';

interface TemplatePanelProps {
  kitchen: Kitchen;
  onApply: (template: Kitchen) => void;
  onOpenProjectText: (text: string) => void;
}

export function TemplatePanel({ kitchen, onApply, onOpenProjectText }: TemplatePanelProps) {
  return (
    <div className="panel-stack">
    <ProjectActions kitchen={kitchen} onOpenText={onOpenProjectText} />
    <ul className="template-grid">
      {KITCHEN_TEMPLATES.map((template) => (
        <li key={template.id}>
          <button type="button" className="template-tile" onClick={() => onApply(template.kitchen)}>
            <span className="template-tile-preview">
              <KitchenPreview kitchen={applyKitchenTemplate(kitchen, template.kitchen)} />
            </span>
            <span className="module-title">{template.title}</span>
            <span className="module-caption">
              {template.kitchen.room.length} × {template.kitchen.room.width} мм, {formatPrice(calculateEstimate(template.kitchen).total)}
            </span>
          </button>
        </li>
      ))}
    </ul>
    </div>
  );
}
