import { useState } from 'react';
import { getModuleSpec } from '../domain/catalog';
import { buildEstimateCsv } from '../domain/estimateCsv';
import { calculateEstimate, listPlacedModules, type Kitchen } from '../domain/kitchen';
import { CopyLinkButton } from './CopyLinkButton';
import { downloadBlob } from './downloadFile';
import { formatRubles } from './formatRubles';
import { Icon } from './icons';
import { ModulePreview } from './ModulePreview';

interface EstimateCardProps {
  kitchen: Kitchen;
  onOrder: () => void;
  onPrint: () => void;
}

export function EstimateCard({ kitchen, onOrder, onPrint }: EstimateCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const estimate = calculateEstimate(kitchen);
  const specIdByModuleId = new Map(listPlacedModules(kitchen).map(({ module }) => [module.id, module.specId]));
  return (
    <section className="floating-bar estimate-card" aria-label="Смета">
      <button type="button" className="estimate-toggle" aria-expanded={isOpen} onClick={() => setIsOpen(!isOpen)}>
        <span className="estimate-heading">Смета</span>
        <span className="estimate-price estimate-sum">{formatRubles(estimate.total)}</span>
        <Icon name="down" />
      </button>
      <div className="estimate-collapse" data-open={isOpen} inert={!isOpen}>
        <div className="estimate-body">
          <div className="estimate-content">
          <ul className="estimate-lines">
            {estimate.lines.map((line) => (
              <li key={line.moduleId} className="estimate-line">
                <span className="estimate-thumb">
                  {specIdByModuleId.has(line.moduleId) && (
                    <ModulePreview spec={getModuleSpec(specIdByModuleId.get(line.moduleId) ?? '')} facadeColorId={kitchen.facadeColorId} bodyColorId={kitchen.bodyColorId} />
                  )}
                </span>
                <span className="estimate-name">
                  {line.width > 0 ? `${line.title} ${line.width}` : line.title}
                </span>
                <span className="estimate-price">{formatRubles(line.price)}</span>
              </li>
            ))}
            {estimate.extraLines.map((line) => (
              <li key={line.moduleId} className="estimate-line">
                <span>{line.title}</span>
                <span className="estimate-price">{formatRubles(line.price)}</span>
              </li>
            ))}
            {estimate.countertopPrice > 0 && (
              <li className="estimate-line">
                <span>Столешница</span>
                <span className="estimate-price">{formatRubles(estimate.countertopPrice)}</span>
              </li>
            )}
          </ul>
          <div className="estimate-actions">
            <CopyLinkButton kitchen={kitchen} />
            <div className="estimate-file-actions">
              <button
                type="button"
                className="catalog-button"
                onClick={() => downloadBlob(new Blob([buildEstimateCsv(kitchen)], { type: 'text/csv;charset=utf-8' }), `kuhnya-smeta-${new Date().toISOString().slice(0, 10)}.csv`)}
              >
                Смета в CSV
              </button>
              <button type="button" className="catalog-button" onClick={onPrint}>
                Печать, PDF
              </button>
            </div>
            <button type="button" className="catalog-button" onClick={onOrder}>
              Оформить заказ
            </button>
          </div>
          </div>
        </div>
      </div>
    </section>
  );
}
