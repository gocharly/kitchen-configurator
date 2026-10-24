import { useRef } from 'react';
import type { Kitchen } from './domain/kitchen';
import { KitchenViewport, type ViewportHandle } from './scene/KitchenViewport';
import { EstimateCard } from './ui/EstimateCard';
import { ViewBar } from './ui/ViewBar';
import { useViewControls } from './ui/useViewControls';

interface KitchenViewerProps {
  kitchen: Kitchen;
}

const doNothing = () => undefined;

export function KitchenViewer({ kitchen }: KitchenViewerProps) {
  const viewportRef = useRef<ViewportHandle>(null);
  const controls = useViewControls(viewportRef);
  return (
    <div className="app">
      <main className="stage">
        <div className="stage-pane">
          <KitchenViewport
            ref={viewportRef}
            kitchen={kitchen}
            selectedModuleId={null}
            leftInsetPx={0}
            bottomInsetPx={0}
            isEvening={controls.isEvening}
            isReadOnly
            onSelect={doNothing}
            onDragModule={doNothing}
            onMoveOpening={doNothing}
          />
        </div>
      </main>
      <EstimateCard kitchen={kitchen} isReadOnly />
      <ViewBar
        view={controls.view}
        isEvening={controls.isEvening}
        onViewChange={controls.changeView}
        onToggleEvening={controls.toggleEvening}
        onSnapshot={controls.saveSnapshot}
        onZoom={controls.zoomBy}
      />
    </div>
  );
}
