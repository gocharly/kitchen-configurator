import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BACKSPLASHES, BODY_COLORS, FACADE_COLORS, FACADE_STYLES, FLOORS, HANDLES, STYLE_PRESETS, WALL_FINISHES } from './domain/catalog';
import {
  DEFAULT_KITCHEN,
  addOpening,
  applyKitchenTemplate,
  moveModule,
  applyStylePreset,
  paintKitchen,
  removeModule,
  removeOpening,
  resizeModule,
  resizeRoom,
  updateOpening,
  type WallId,
} from './domain/kitchen';
import { dragModule, rotateFreeModule } from './domain/dragging';
import { addCatalogModule } from './domain/standing';
import { DrawingSheet } from './drawing/DrawingSheet';
import { buildDrawing, type SheetId } from './drawing/drawingModel';
import { downloadSvg } from './drawing/downloadSvg';
import { KitchenViewport, type ViewportHandle } from './scene/KitchenViewport';
import { CheckoutPanel } from './ui/CheckoutPanel';
import { ChoicePicker } from './ui/ChoicePicker';
import { ColorPicker } from './ui/ColorPicker';
import { DrawingPanel } from './ui/DrawingPanel';
import { EstimateCard } from './ui/EstimateCard';
import { Flyout } from './ui/Flyout';
import { HistoryBar } from './ui/HistoryBar';
import { ModuleCatalog, ModuleList } from './ui/ModulePanels';
import { OpeningPanel } from './ui/OpeningPanel';
import { RoomPanel } from './ui/RoomPanel';
import { SectionRail, type RailSection } from './ui/SectionRail';
import { SelectionToolbar } from './ui/SelectionToolbar';
import { SurfacePicker } from './ui/SurfacePicker';
import { TemplatePanel } from './ui/TemplatePanel';
import { ViewBar, type ViewMode } from './ui/ViewBar';
import { readKitchenFromAddress, writeKitchenToAddress } from './ui/kitchenUrl';
import { downloadBlob } from './ui/downloadFile';
import { useKitchenHistory } from './ui/useKitchenHistory';

type SectionId = 'templates' | 'room' | 'openings' | 'decor' | 'modules' | 'composition' | 'drawing' | 'checkout';

const RAIL_SECTIONS: (RailSection & { id: SectionId })[] = [
  { id: 'templates', title: 'Шаблоны', icon: 'templates' },
  { id: 'room', title: 'Комната', icon: 'room' },
  { id: 'openings', title: 'Окна и двери', icon: 'opening' },
  { id: 'decor', title: 'Декор', icon: 'decor' },
  { id: 'modules', title: 'Модули', icon: 'modules' },
  { id: 'composition', title: 'Состав', icon: 'composition' },
  { id: 'drawing', title: 'Чертёж', icon: 'drawing' },
];

const SECTION_TITLES: Record<SectionId, string> = {
  templates: 'Шаблоны',
  room: 'Комната',
  openings: 'Окна и двери',
  decor: 'Декор',
  modules: 'Модули',
  composition: 'Состав',
  drawing: 'Чертёж',
  checkout: 'Оформление заказа',
};

const WIDE_SCREEN_MIN_PX = 1100;
const FLYOUT_EXIT_MS = 160;
const PHONE_MAX_WIDTH_PX = 720;

export function App() {
  const {
    kitchen,
    updateKitchen: setKitchen,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useKitchenHistory(() => readKitchenFromAddress() ?? DEFAULT_KITCHEN);
  const [activeSection, setActiveSection] = useState<SectionId | null>(() =>
    window.innerWidth >= WIDE_SCREEN_MIN_PX ? 'modules' : null,
  );
  const [activeWall, setActiveWall] = useState<WallId>('back');
  const [activeSheet, setActiveSheet] = useState<SheetId>('plan');
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>('perspective');
  const [isEvening, setIsEvening] = useState(false);
  const [shownSection, setShownSection] = useState<SectionId | null>(activeSection);
  const [leftInsetPx, setLeftInsetPx] = useState(0);
  const [bottomInsetPx, setBottomInsetPx] = useState(0);
  const overlayRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef<SVGSVGElement>(null);
  const viewportRef = useRef<ViewportHandle>(null);

  useEffect(() => writeKitchenToAddress(kitchen), [kitchen]);

  useLayoutEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const edge = activeSection ? overlay.querySelector('.flyout') : overlay.querySelector('.rail');
    const box = edge?.getBoundingClientRect();
    const isPhone = window.innerWidth <= PHONE_MAX_WIDTH_PX;
    setLeftInsetPx(box && !isPhone ? box.right : 0);
    setBottomInsetPx(box && isPhone ? window.innerHeight - box.top : 0);
  }, [activeSection, shownSection]);

  useEffect(() => {
    if (activeSection) {
      setShownSection(activeSection);
      return;
    }
    const timer = window.setTimeout(() => setShownSection(null), FLYOUT_EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [activeSection]);

  const toggleSection = (id: string) => setActiveSection((current) => (current === id ? null : (id as SectionId)));
  const changeView = (next: ViewMode) => {
    setView(next);
    if (next === 'top') viewportRef.current?.showTop();
    else if (next === 'eye') viewportRef.current?.showEye();
    else viewportRef.current?.showPerspective();
  };
  const saveSnapshot = () => {
    setSelectedModuleId(null);
    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(async () => {
        const image = await viewportRef.current?.captureImage();
        if (image) downloadBlob(image, `kuhnya-${new Date().toISOString().slice(0, 10)}.png`);
      }),
    );
  };
  const resizeSelected = (moduleId: string, width: number) => setKitchen((current) => resizeModule(current, moduleId, width));
  const moveSelected = (moduleId: string, direction: -1 | 1) => setKitchen((current) => moveModule(current, moduleId, direction));
  const removeSelected = (moduleId: string) => {
    setKitchen((current) => removeModule(current, moduleId));
    setSelectedModuleId(null);
  };

  return (
    <div className="app">
      <main className="stage">
        {activeSection === 'drawing' && (
          <div className="stage-pane drawing-pane">
            <DrawingSheet ref={drawingRef} drawing={buildDrawing(kitchen, activeSheet)} />
          </div>
        )}
        <div className="stage-pane" hidden={activeSection === 'drawing'}>
          <KitchenViewport
            ref={viewportRef}
            kitchen={kitchen}
            selectedModuleId={selectedModuleId}
            leftInsetPx={leftInsetPx}
            bottomInsetPx={bottomInsetPx}
            isEvening={isEvening}
            onSelect={setSelectedModuleId}
            onDragModule={(moduleId, cx, cz) => setKitchen((current) => dragModule(current, moduleId, { cx, cz }))}
            onMoveOpening={(openingId, offset) =>
              setKitchen((current) => updateOpening(current, openingId, { offset }))
            }
            selectionToolbar={
              selectedModuleId && (
                <SelectionToolbar
                  kitchen={kitchen}
                  moduleId={selectedModuleId}
                  onResize={resizeSelected}
                  onMove={moveSelected}
                  onRotate={(moduleId) => setKitchen((current) => rotateFreeModule(current, moduleId))}
                  onRemove={removeSelected}
                />
              )
            }
          />
        </div>
      </main>
      <HistoryBar canUndo={canUndo} canRedo={canRedo} onUndo={undo} onRedo={redo} />
      <div className="overlay-left" ref={overlayRef}>
        <SectionRail
          sections={RAIL_SECTIONS}
          activeId={activeSection === 'checkout' ? null : activeSection}
          onSelect={toggleSection}
        />
        {shownSection && (
          <Flyout title={SECTION_TITLES[shownSection]} isClosing={activeSection === null} contentKey={shownSection} onClose={() => setActiveSection(null)}>
            {shownSection === 'templates' && (
              <TemplatePanel kitchen={kitchen} onApply={(template) => setKitchen((current) => applyKitchenTemplate(current, template))} />
            )}
            {shownSection === 'room' && <RoomPanel kitchen={kitchen} onResize={(patch) => setKitchen((current) => resizeRoom(current, patch))} />}
            {shownSection === 'openings' && (
              <OpeningPanel
                kitchen={kitchen}
                wall={activeWall}
                onWallChange={setActiveWall}
                onAdd={(kind) => setKitchen((current) => addOpening(current, kind, crypto.randomUUID(), activeWall))}
                onUpdate={(openingId, patch) => setKitchen((current) => updateOpening(current, openingId, patch))}
                onRemove={(openingId) => setKitchen((current) => removeOpening(current, openingId))}
              />
            )}
            {shownSection === 'decor' && (
              <div className="decor-groups">
                <ChoicePicker
                  label="Стиль"
                  options={STYLE_PRESETS}
                  selectedId={null}
                  onSelect={(presetId) => setKitchen((current) => applyStylePreset(current, presetId))}
                />
                <ColorPicker
                  label="Фасад"
                  options={FACADE_COLORS}
                  selectedId={kitchen.facadeColorId}
                  onSelect={(facadeColorId) => setKitchen((current) => paintKitchen(current, { facadeColorId }))}
                />
                <ColorPicker
                  label="Корпус"
                  options={BODY_COLORS}
                  selectedId={kitchen.bodyColorId}
                  onSelect={(bodyColorId) => setKitchen((current) => paintKitchen(current, { bodyColorId }))}
                />
                <ChoicePicker
                  label="Стиль фасада"
                  options={FACADE_STYLES}
                  selectedId={kitchen.facadeStyleId}
                  onSelect={(facadeStyleId) => setKitchen((current) => paintKitchen(current, { facadeStyleId }))}
                />
                <ChoicePicker
                  label="Ручки"
                  options={HANDLES}
                  selectedId={kitchen.handleId}
                  onSelect={(handleId) => setKitchen((current) => paintKitchen(current, { handleId }))}
                />
                <SurfacePicker
                  label="Пол"
                  options={FLOORS}
                  selectedId={kitchen.floorId}
                  onSelect={(floorId) => setKitchen((current) => paintKitchen(current, { floorId }))}
                />
                <SurfacePicker
                  label="Фартук"
                  options={BACKSPLASHES}
                  selectedId={kitchen.backsplashId}
                  onSelect={(backsplashId) => setKitchen((current) => paintKitchen(current, { backsplashId }))}
                />
                <SurfacePicker
                  label="Стены"
                  options={WALL_FINISHES}
                  selectedId={kitchen.wallFinishId}
                  onSelect={(wallFinishId) => setKitchen((current) => paintKitchen(current, { wallFinishId }))}
                />
              </div>
            )}
            {shownSection === 'modules' && (
              <ModuleCatalog
                kitchen={kitchen}
                wall={activeWall}
                onWallChange={setActiveWall}
                onAdd={(specId) => setKitchen((current) => addCatalogModule(current, specId, crypto.randomUUID(), activeWall))}
              />
            )}
            {shownSection === 'composition' && (
              <ModuleList
                kitchen={kitchen}
                selectedId={selectedModuleId}
                onSelect={setSelectedModuleId}
                onResize={resizeSelected}
                onMove={moveSelected}
                onRemove={removeSelected}
              />
            )}
            {shownSection === 'drawing' && (
              <DrawingPanel
                kitchen={kitchen}
                sheet={activeSheet}
                onSheetChange={setActiveSheet}
                onDownload={() => drawingRef.current && downloadSvg(drawingRef.current, `kitchen-${activeSheet}.svg`)}
              />
            )}
            {shownSection === 'checkout' && <CheckoutPanel kitchen={kitchen} />}
          </Flyout>
        )}
      </div>
      <EstimateCard kitchen={kitchen} onOrder={() => setActiveSection('checkout')} />
      {activeSection !== 'drawing' && (
        <ViewBar
          view={view}
          isEvening={isEvening}
          onViewChange={changeView}
          onToggleEvening={() => setIsEvening((current) => !current)}
          onSnapshot={saveSnapshot}
          onZoom={(factor) => viewportRef.current?.zoomBy(factor)}
        />
      )}
    </div>
  );
}
