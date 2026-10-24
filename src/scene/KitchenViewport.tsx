import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { layoutKitchen, listSpaceTaken, locateModuleCenter, type Kitchen, type WallId } from '../domain/kitchen';
import { LAST_QUALITY_LEVEL, QUALITY_LEVELS, createFrameCostMonitor, pickStartQualityLevel, rememberQualityLevel, type FrameCostMonitor } from './renderQuality';
import { applyNightAmount, buildKitchenGroup, disposeKitchenGroup } from './buildKitchenGroup';
import {
  PANEL_ANIMATION_MS,
  applyPanelProgress,
  findOpenableWrapper,
  listOpenableWrappers,
  readOpenable,
} from './openablePanels';
import { findModuleHolder, pickPointOnHorizontalPlane } from './moduleDragging';

const MM = 0.001;
const DEFAULT_FIELD_OF_VIEW_DEG = 40;
const EYE_FIELD_OF_VIEW_DEG = 62;
const EYE_HEIGHT_M = 1.6;
const EYE_TARGET_HEIGHT_M = 1.25;
const EYE_INSET_FROM_FRONT_M = 0.25;
const NIGHT_TRANSITION_MS = 380;
const TONE_EXPOSURE = 0.9;
const LIGHTING = {
  day: { background: '#e9ebee', environment: 0.38, sun: 1.25, sunColor: '#fff1de', fill: 0.34 },
  evening: { background: '#1d2128', environment: 0.1, sun: 0.22, sunColor: '#9db1ff', fill: 0.1 },
} as const;
const SHADOW_SOFTNESS = 6;
const MULTISAMPLE_COUNT = 4;
const OCCLUSION_RADIUS_M = 0.45;
const OCCLUSION_SCALE = 1.9;
const DENOISE_RADIUS_PX = 10;
const DENOISE_RINGS = 3;
const DENOISE_SAMPLES = 24;
const TOP_VIEW_HEIGHT_FACTOR = 1.15;
const TOP_VIEW_TILT_M = 0.05;
const MIN_ANCHOR_TOP_PX = 64;
const ANCHOR_HALF_WIDTH_PX = 240;
const ANCHOR_MOVE_EPSILON_PX = 0.5;
const CAMERA_ANIMATION_MS = 450;
const FIT_MARGIN = 1.25;
const VIEW_INSET_ANIMATION_MS = 280;

interface ViewportRig {
  container: HTMLElement;
  occlusion: GTAOPass;
  state: { occlusionScale: number };
  monitor: FrameCostMonitor;
  qualityLevel: number;
  areShadowsStale: boolean;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  composer: EffectComposer;
  light: THREE.DirectionalLight;
  fill: THREE.HemisphereLight;
  render: () => void;
  onRendered: (() => void) | null;
  cameraFrame: number;
  insetFrame: number;
  inset: ViewInset;
  insetTarget: ViewInset;
  hasUserMovedCamera: boolean;
  nightAmount: number;
  nightFrame: number;
  kitchenGroup: THREE.Group | null;
}

export interface ViewInset {
  left: number;
  bottom: number;
}

export interface ViewportHandle {
  showPerspective: () => void;
  showTop: () => void;
  showEye: () => void;
  captureImage: () => Promise<Blob | null>;
  zoomBy: (factor: number) => void;
}

function createComposer(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera, readOcclusionScale: () => number): { composer: EffectComposer; occlusion: GTAOPass } {
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: MULTISAMPLE_COUNT });
  const composer = new EffectComposer(renderer, target);
  const occlusion = new GTAOPass(scene, camera, 1, 1);
  const resizeFull = occlusion.setSize.bind(occlusion);
  occlusion.setSize = (width: number, height: number) => resizeFull(Math.max(1, Math.round(width * readOcclusionScale())), Math.max(1, Math.round(height * readOcclusionScale())));
  occlusion.updateGtaoMaterial({ radius: OCCLUSION_RADIUS_M, scale: OCCLUSION_SCALE });
  occlusion.updatePdMaterial({ radius: DENOISE_RADIUS_PX, rings: DENOISE_RINGS, samples: DENOISE_SAMPLES });
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(occlusion);
  composer.addPass(new OutputPass());
  return { composer, occlusion };
}

function createRig(container: HTMLElement): ViewportRig {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = TONE_EXPOSURE;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(LIGHTING.day.background);
  const environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.55;

  const light = new THREE.DirectionalLight('#fff4e6', 1.5);
  light.castShadow = true;
  light.shadow.mapSize.set(2048, 2048);
  light.shadow.radius = SHADOW_SOFTNESS;
  light.shadow.bias = -0.0004;
  light.shadow.normalBias = 0.01;
  const fill = new THREE.HemisphereLight('#f4f7ff', '#cfc8bc', 0.55);
  scene.add(light, light.target, fill);

  const camera = new THREE.PerspectiveCamera(DEFAULT_FIELD_OF_VIEW_DEG, 1, 0.1, 60);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.maxPolarAngle = Math.PI / 2 - 0.02;
  controls.minDistance = 1;
  controls.maxDistance = 14;

  const state = { occlusionScale: QUALITY_LEVELS[0].occlusionScale };
  const { composer, occlusion } = createComposer(renderer, scene, camera, () => state.occlusionScale);
  const rig: ViewportRig = { container, renderer, scene, camera, controls, composer, occlusion, state, light, fill, monitor: createFrameCostMonitor(() => degradeQuality(rig)), qualityLevel: 0, areShadowsStale: true, render: () => undefined, onRendered: null, cameraFrame: 0, insetFrame: 0, inset: { left: 0, bottom: 0 }, insetTarget: { left: 0, bottom: 0 }, hasUserMovedCamera: false, nightAmount: 0, nightFrame: 0, kitchenGroup: null };
  rig.render = () => {
    if (rig.areShadowsStale) {
      renderer.shadowMap.needsUpdate = true;
      rig.areShadowsStale = false;
    }
    const startedAt = performance.now();
    composer.render();
    rig.onRendered?.();
    window.requestAnimationFrame(() => rig.monitor.record(performance.now() - startedAt));
  };
  applyQualityLevel(rig, pickStartQualityLevel());
  controls.addEventListener('change', rig.render);
  controls.addEventListener('start', () => {
    window.cancelAnimationFrame(rig.cameraFrame);
    rig.hasUserMovedCamera = true;
  });
  return rig;
}

interface CameraView {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

function measureKitchenBounds(kitchen: Kitchen): THREE.Box3 {
  const taken = listSpaceTaken(kitchen);
  if (taken.length === 0) {
    const { room } = kitchen;
    return new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(room.length * MM, room.height * MM, room.width * MM));
  }
  const bounds = new THREE.Box3();
  taken.forEach(({ rect, top }) => {
    bounds.expandByPoint(new THREE.Vector3(rect.x0 * MM, 0, rect.z0 * MM));
    bounds.expandByPoint(new THREE.Vector3(rect.x1 * MM, top * MM, rect.z1 * MM));
  });
  return bounds;
}

function measureFitView(rig: ViewportRig, kitchen: Kitchen): CameraView {
  const bounds = measureKitchenBounds(kitchen);
  const target = bounds.getCenter(new THREE.Vector3());
  const radius = bounds.getSize(new THREE.Vector3()).length() / 2;
  const halfFieldOfView = THREE.MathUtils.degToRad(rig.camera.fov) / 2;
  const { clientWidth, clientHeight } = rig.renderer.domElement;
  const freeWidth = Math.max(clientWidth - rig.insetTarget.left, 1);
  const freeHeight = Math.max(clientHeight - rig.insetTarget.bottom, 1);
  const shrink = clientHeight === 0 ? 1 : Math.max(1, clientHeight / freeWidth, clientHeight / freeHeight);
  const distance = (radius / Math.sin(halfFieldOfView)) * shrink * FIT_MARGIN;
  const direction = new THREE.Vector3(0.35, 0.32, 1).normalize();
  return { target, position: target.clone().addScaledVector(direction, Math.max(distance, rig.controls.minDistance * 2)) };
}

function measureTopView(room: Kitchen['room']): CameraView {
  const center = new THREE.Vector3((room.length / 2) * MM, 0, (room.width / 2) * MM);
  const height = Math.max(room.length, room.width) * MM * TOP_VIEW_HEIGHT_FACTOR + 1;
  return { target: center, position: new THREE.Vector3(center.x, height, center.z + TOP_VIEW_TILT_M) };
}

function measureEyeView(room: Kitchen['room']): CameraView {
  const centerX = (room.length / 2) * MM;
  const frontZ = room.width * MM - EYE_INSET_FROM_FRONT_M;
  return { target: new THREE.Vector3(centerX, EYE_TARGET_HEIGHT_M, 0), position: new THREE.Vector3(centerX, EYE_HEIGHT_M, frontZ) };
}

function setFieldOfView(rig: ViewportRig, degrees: number): void {
  rig.camera.fov = degrees;
  rig.camera.updateProjectionMatrix();
}

function applyLighting(rig: ViewportRig, nightAmount: number): void {
  const { day, evening } = LIGHTING;
  const mix = (from: number, to: number) => from + (to - from) * nightAmount;
  (rig.scene.background as THREE.Color).set(day.background).lerp(new THREE.Color(evening.background), nightAmount);
  rig.scene.environmentIntensity = mix(day.environment, evening.environment);
  rig.light.intensity = mix(day.sun, evening.sun);
  rig.light.color.set(day.sunColor).lerp(new THREE.Color(evening.sunColor), nightAmount);
  rig.fill.intensity = mix(day.fill, evening.fill);
  if (rig.kitchenGroup) applyNightAmount(rig.kitchenGroup, nightAmount);
}

function measureZoomView(rig: ViewportRig, factor: number): CameraView {
  const offset = rig.camera.position.clone().sub(rig.controls.target).multiplyScalar(factor);
  const distance = THREE.MathUtils.clamp(offset.length(), rig.controls.minDistance, rig.controls.maxDistance);
  return { target: rig.controls.target.clone(), position: rig.controls.target.clone().add(offset.setLength(distance)) };
}

function applyCameraView(rig: ViewportRig, view: CameraView): void {
  rig.controls.target.copy(view.target);
  rig.camera.position.copy(view.position);
  rig.controls.update();
}

function easeOutCubic(progress: number): number {
  return 1 - Math.pow(1 - progress, 3);
}

function flyCameraTo(rig: ViewportRig, view: CameraView): void {
  window.cancelAnimationFrame(rig.cameraFrame);
  const from: CameraView = { position: rig.camera.position.clone(), target: rig.controls.target.clone() };
  const startTime = performance.now();
  const step = (now: number) => {
    const eased = easeOutCubic(Math.min(1, (now - startTime) / CAMERA_ANIMATION_MS));
    applyCameraView(rig, {
      position: from.position.clone().lerp(view.position, eased),
      target: from.target.clone().lerp(view.target, eased),
    });
    if (eased < 1) rig.cameraFrame = window.requestAnimationFrame(step);
  };
  rig.cameraFrame = window.requestAnimationFrame(step);
}

function fitCameraToKitchen(rig: ViewportRig, kitchen: Kitchen): void {
  applyCameraView(rig, measureFitView(rig, kitchen));
}

function measureSelectionAnchor(rig: ViewportRig, moduleId: string): { x: number; y: number } | null {
  const holder = findModuleHolder(rig.kitchenGroup, moduleId);
  if (!holder) return null;
  const box = new THREE.Box3().setFromObject(holder);
  const top = new THREE.Vector3((box.min.x + box.max.x) / 2, box.max.y, (box.min.z + box.max.z) / 2).project(rig.camera);
  if (top.z > 1) return null;
  const { clientWidth, clientHeight } = rig.renderer.domElement;
  const half = Math.min(ANCHOR_HALF_WIDTH_PX, clientWidth / 2);
  return {
    x: THREE.MathUtils.clamp(((top.x + 1) / 2) * clientWidth, half, clientWidth - half),
    y: Math.max(MIN_ANCHOR_TOP_PX, ((1 - top.y) / 2) * clientHeight),
  };
}

function refocusCameraOnRoom(rig: ViewportRig, room: Kitchen['room'], previousSpan: number): void {
  const center = new THREE.Vector3((room.length / 2) * MM, (room.height / 3) * MM, (room.width / 3) * MM);
  const ratio = Math.max(room.length, room.width) / previousSpan;
  const offset = rig.camera.position.clone().sub(rig.controls.target).multiplyScalar(ratio);
  rig.controls.target.copy(center);
  rig.camera.position.copy(center).add(offset);
  rig.controls.update();
}

function measureRoomSpan(room: Kitchen['room']): number {
  return Math.max(room.length, room.width);
}

function frameLight(rig: ViewportRig, room: Kitchen['room']): void {
  const halfSpan = (Math.max(room.length, room.width) / 2) * MM + 1;
  const shadow = rig.light.shadow.camera;
  shadow.left = -halfSpan;
  shadow.right = halfSpan;
  shadow.top = halfSpan;
  shadow.bottom = -halfSpan;
  shadow.near = 0.5;
  shadow.far = 14;
  shadow.updateProjectionMatrix();
  const target = new THREE.Vector3((room.length / 2) * MM, 0, (room.width / 2) * MM);
  rig.light.target.position.copy(target);
  rig.light.position.set(target.x + 0.8, room.height * MM + 1.8, target.z + 3.2);
}

function applyViewInset(rig: ViewportRig, inset: ViewInset): void {
  const { clientWidth, clientHeight } = rig.renderer.domElement;
  rig.inset = inset;
  if (clientWidth === 0 || clientHeight === 0) return;
  rig.camera.setViewOffset(clientWidth, clientHeight, -inset.left / 2, inset.bottom / 2, clientWidth, clientHeight);
  rig.camera.updateProjectionMatrix();
}

function slideViewInset(rig: ViewportRig, target: ViewInset): void {
  window.cancelAnimationFrame(rig.insetFrame);
  rig.insetTarget = target;
  const from = rig.inset;
  const startTime = performance.now();
  const step = (now: number) => {
    const eased = easeOutCubic(Math.min(1, (now - startTime) / VIEW_INSET_ANIMATION_MS));
    applyViewInset(rig, { left: from.left + (target.left - from.left) * eased, bottom: from.bottom + (target.bottom - from.bottom) * eased });
    rig.render();
    if (eased < 1) rig.insetFrame = window.requestAnimationFrame(step);
  };
  rig.insetFrame = window.requestAnimationFrame(step);
}

function applyQualityLevel(rig: ViewportRig, index: number): void {
  const level = QUALITY_LEVELS[index];
  rig.qualityLevel = index;
  const ratio = Math.min(window.devicePixelRatio, level.pixelRatio);
  rig.renderer.setPixelRatio(ratio);
  rig.composer.setPixelRatio(ratio);
  rig.state.occlusionScale = level.occlusionScale;
  rig.occlusion.enabled = level.hasOcclusion;
  rig.occlusion.updateGtaoMaterial({ samples: level.occlusionSamples });
  rig.light.shadow.mapSize.set(level.shadowMapSize, level.shadowMapSize);
  rig.light.shadow.map?.dispose();
  rig.light.shadow.map = null;
  rig.areShadowsStale = true;
  resizeRig(rig, rig.container);
}

function degradeQuality(rig: ViewportRig): void {
  if (rig.qualityLevel >= LAST_QUALITY_LEVEL) return;
  applyQualityLevel(rig, rig.qualityLevel + 1);
  rememberQualityLevel(rig.qualityLevel);
}

function resizeRig(rig: ViewportRig, container: HTMLElement): void {
  const { clientWidth, clientHeight } = container;
  if (clientWidth === 0 || clientHeight === 0) return;
  rig.renderer.setSize(clientWidth, clientHeight);
  rig.composer.setSize(clientWidth, clientHeight);
  rig.camera.aspect = clientWidth / clientHeight;
  rig.camera.updateProjectionMatrix();
  applyViewInset(rig, rig.inset);
  rig.render();
}

const WALL_PLANE_DEPTH_MM = 280;
const CLICK_TOLERANCE_PX = 4;

type ItemKind = 'module' | 'opening';

interface ItemHit {
  itemKind: ItemKind;
  itemId: string;
  wall: WallId;
  height: number;
}

interface DragState {
  itemKind: ItemKind;
  itemId: string;
  wall: WallId;
  grabOffset: number;
  planeHeight: number;
  grabX: number;
  grabZ: number;
  moved: boolean;
}

interface Press {
  x: number;
  y: number;
  onItem: boolean;
}

function toNormalizedPointer(rig: ViewportRig, event: PointerEvent): THREE.Vector2 {
  const bounds = rig.renderer.domElement.getBoundingClientRect();
  return new THREE.Vector2(
    ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
    -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
  );
}

function findItemHit(rig: ViewportRig, event: PointerEvent): ItemHit | null {
  if (!rig.kitchenGroup) return null;
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(toNormalizedPointer(rig, event), rig.camera);
  const hit = raycaster.intersectObjects(rig.kitchenGroup.children, true)[0];
  if (!hit) return null;
  let node: THREE.Object3D | null = hit.object;
  while (node && node.userData.itemId === undefined) node = node.parent;
  if (!node) return null;
  return { itemKind: node.userData.itemKind, itemId: node.userData.itemId, wall: node.userData.wall, height: hit.point.y };
}

function measurePointerAlongWall(
  rig: ViewportRig,
  event: PointerEvent,
  wall: WallId,
  room: Kitchen['room'],
): number | null {
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(toNormalizedPointer(rig, event), rig.camera);
  const depth = WALL_PLANE_DEPTH_MM * MM;
  const plane =
    wall === 'back'
      ? new THREE.Plane(new THREE.Vector3(0, 0, 1), -depth)
      : wall === 'left'
        ? new THREE.Plane(new THREE.Vector3(1, 0, 0), -depth)
        : new THREE.Plane(new THREE.Vector3(1, 0, 0), -(room.length * MM - depth));
  const point = new THREE.Vector3();
  if (!raycaster.ray.intersectPlane(plane, point)) return null;
  return (wall === 'back' ? point.x : point.z) / MM;
}

interface DraggedExtent {
  center: number;
  width: number;
}

function measureDraggedExtent(kitchen: Kitchen, itemKind: ItemKind, itemId: string): DraggedExtent | null {
  if (itemKind === 'opening') {
    const opening = kitchen.openings.find((o) => o.id === itemId);
    return opening ? { center: opening.offset + opening.width / 2, width: opening.width } : null;
  }
  const item = layoutKitchen(kitchen).find((entry) => entry.module.id === itemId);
  return item ? { center: item.offset + item.module.width / 2, width: item.module.width } : null;
}

interface KitchenViewportProps {
  kitchen: Kitchen;
  selectedModuleId: string | null;
  onSelect: (moduleId: string | null) => void;
  onDragModule: (moduleId: string, cx: number, cz: number) => void;
  onMoveOpening: (openingId: string, offset: number) => void;
  selectionToolbar?: ReactNode;
  leftInsetPx: number;
  bottomInsetPx: number;
  isEvening: boolean;
  isReadOnly?: boolean;
}

function findOpenableAt(rig: ViewportRig, event: PointerEvent): THREE.Object3D | null {
  if (!rig.kitchenGroup) return null;
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(toNormalizedPointer(rig, event), rig.camera);
  const hit = raycaster.intersectObjects(rig.kitchenGroup.children, true)[0];
  return hit ? findOpenableWrapper(hit.object) : null;
}

function easeInOut(progress: number): number {
  return progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
}

function restoreOpenPanels(group: THREE.Group, openKeys: Set<string>): void {
  listOpenableWrappers(group).forEach((wrapper) => applyPanelProgress(wrapper, openKeys.has(readOpenable(wrapper).key) ? 1 : 0));
}

export const KitchenViewport = forwardRef<ViewportHandle, KitchenViewportProps>(function KitchenViewport(
  { kitchen, selectedModuleId, onSelect, onDragModule, onMoveOpening, selectionToolbar, leftInsetPx, bottomInsetPx, isEvening, isReadOnly = false },
  handleRef,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rigRef = useRef<ViewportRig | null>(null);
  const fittedSpanRef = useRef(0);
  const kitchenRef = useRef(kitchen);
  const selectedIdRef = useRef(selectedModuleId);
  const isDraggingRef = useRef(false);
  const openKeysRef = useRef(new Set<string>());
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const isReadOnlyRef = useRef(isReadOnly);
  const onSelectRef = useRef(onSelect);
  const onDragModuleRef = useRef(onDragModule);
  const onMoveOpeningRef = useRef(onMoveOpening);
  kitchenRef.current = kitchen;
  selectedIdRef.current = selectedModuleId;
  isReadOnlyRef.current = isReadOnly;
  onSelectRef.current = onSelect;
  onDragModuleRef.current = onDragModule;
  onMoveOpeningRef.current = onMoveOpening;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const rig = createRig(container);
    rigRef.current = rig;
    const observer = new ResizeObserver(() => resizeRig(rig, container));
    observer.observe(container);
    resizeRig(rig, container);
    const canvas = rig.renderer.domElement;
    let drag: DragState | null = null;
    rig.onRendered = () => {
      const moduleId = selectedIdRef.current;
      const next = moduleId && !isDraggingRef.current ? measureSelectionAnchor(rig, moduleId) : null;
      setAnchor((previous) => {
        if (!next || !previous) return next;
        const isSame = Math.abs(previous.x - next.x) < ANCHOR_MOVE_EPSILON_PX && Math.abs(previous.y - next.y) < ANCHOR_MOVE_EPSILON_PX;
        return isSame ? previous : next;
      });
    };
    let press: Press | null = null;
    const animationFrames = new Map<THREE.Object3D, number>();

    const animatePanel = (wrapper: THREE.Object3D, target: number) => {
      const startProgress = readOpenable(wrapper).progress;
      const startTime = performance.now();
      window.cancelAnimationFrame(animationFrames.get(wrapper) ?? 0);
      const step = (now: number) => {
        const elapsed = Math.min(1, (now - startTime) / PANEL_ANIMATION_MS);
        applyPanelProgress(wrapper, startProgress + (target - startProgress) * easeInOut(elapsed));
        rig.areShadowsStale = true;
        rig.render();
        if (elapsed < 1) animationFrames.set(wrapper, window.requestAnimationFrame(step));
        else animationFrames.delete(wrapper);
      };
      animationFrames.set(wrapper, window.requestAnimationFrame(step));
    };

    const togglePanelAt = (event: PointerEvent) => {
      const wrapper = findOpenableAt(rig, event);
      if (!wrapper) return;
      const { key } = readOpenable(wrapper);
      const isOpening = !openKeysRef.current.has(key);
      if (isOpening) openKeysRef.current.add(key);
      else openKeysRef.current.delete(key);
      animatePanel(wrapper, isOpening ? 1 : 0);
    };

    const measureGrab = (hit: ItemHit, event: PointerEvent): Pick<DragState, 'grabOffset' | 'grabX' | 'grabZ'> | null => {
      const kitchenNow = kitchenRef.current;
      if (hit.itemKind === 'opening') {
        const along = measurePointerAlongWall(rig, event, hit.wall, kitchenNow.room);
        const extent = measureDraggedExtent(kitchenNow, 'opening', hit.itemId);
        return along === null || !extent ? null : { grabOffset: along - extent.center, grabX: 0, grabZ: 0 };
      }
      const point = pickPointOnHorizontalPlane(toNormalizedPointer(rig, event), rig.camera, hit.height);
      const center = locateModuleCenter(kitchenNow, hit.itemId);
      if (!point || !center) return null;
      return { grabOffset: 0, grabX: point.x / MM - center.cx, grabZ: point.z / MM - center.cz };
    };

    const startDrag = (hit: ItemHit, event: PointerEvent) => {
      const grab = measureGrab(hit, event);
      if (!grab) return;
      drag = { ...hit, ...grab, planeHeight: hit.height, moved: false };
      isDraggingRef.current = true;
      setAnchor(null);
      rig.controls.enabled = false;
      canvas.setPointerCapture(event.pointerId);
      canvas.style.cursor = 'grabbing';
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (isReadOnlyRef.current) {
        press = { x: event.clientX, y: event.clientY, onItem: false };
        return;
      }
      const hit = findItemHit(rig, event);
      press = { x: event.clientX, y: event.clientY, onItem: hit !== null };
      if (!hit) return;
      if (hit.itemKind === 'module') onSelectRef.current(hit.itemId);
      startDrag(hit, event);
    };

    const dragModule = (state: DragState, event: PointerEvent) => {
      const point = pickPointOnHorizontalPlane(toNormalizedPointer(rig, event), rig.camera, state.planeHeight);
      if (!point) return;
      onDragModuleRef.current(state.itemId, point.x / MM - state.grabX, point.z / MM - state.grabZ);
    };

    const dragOpening = (state: DragState, event: PointerEvent) => {
      const along = measurePointerAlongWall(rig, event, state.wall, kitchenRef.current.room);
      const extent = measureDraggedExtent(kitchenRef.current, 'opening', state.itemId);
      if (along === null || !extent) return;
      onMoveOpeningRef.current(state.itemId, along - state.grabOffset - extent.width / 2);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!drag) {
        canvas.style.cursor = findItemHit(rig, event) ? 'grab' : '';
        return;
      }
      if (press && !drag.moved && Math.hypot(event.clientX - press.x, event.clientY - press.y) > CLICK_TOLERANCE_PX) drag.moved = true;
      if (!drag.moved) return;
      if (drag.itemKind === 'module') dragModule(drag, event);
      else dragOpening(drag, event);
    };

    const handlePointerUp = (event: PointerEvent) => {
      const finishedPress = press;
      press = null;
      if (drag) {
        if (!drag.moved) togglePanelAt(event);
        drag = null;
        isDraggingRef.current = false;
        rig.render();
        rig.controls.enabled = true;
        canvas.releasePointerCapture(event.pointerId);
        canvas.style.cursor = '';
        return;
      }
      if (!finishedPress || finishedPress.onItem) return;
      if (isReadOnlyRef.current) {
        if (Math.hypot(event.clientX - finishedPress.x, event.clientY - finishedPress.y) < CLICK_TOLERANCE_PX) togglePanelAt(event);
        return;
      }
      const moved = Math.hypot(event.clientX - finishedPress.x, event.clientY - finishedPress.y);
      if (moved < CLICK_TOLERANCE_PX) onSelectRef.current(null);
    };

    canvas.addEventListener('pointerdown', handlePointerDown, { capture: true });
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointercancel', handlePointerUp);
    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown, { capture: true });
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointercancel', handlePointerUp);
      animationFrames.forEach((frame) => window.cancelAnimationFrame(frame));
      window.cancelAnimationFrame(rig.cameraFrame);
      window.cancelAnimationFrame(rig.insetFrame);
      window.cancelAnimationFrame(rig.nightFrame);
      observer.disconnect();
      rig.controls.dispose();
      rig.composer.dispose();
      if (rig.kitchenGroup) disposeKitchenGroup(rig.kitchenGroup);
      rig.renderer.dispose();
      rig.renderer.domElement.remove();
      rigRef.current = null;
    };
  }, []);

  useEffect(() => {
    const rig = rigRef.current;
    if (!rig) return;
    if (rig.kitchenGroup) {
      rig.scene.remove(rig.kitchenGroup);
      disposeKitchenGroup(rig.kitchenGroup);
    }
    rig.kitchenGroup = buildKitchenGroup(kitchen, selectedModuleId);
    restoreOpenPanels(rig.kitchenGroup, openKeysRef.current);
    rig.scene.add(rig.kitchenGroup);
    frameLight(rig, kitchen.room);
    rig.areShadowsStale = true;
    const span = measureRoomSpan(kitchen.room);
    if (fittedSpanRef.current === 0) fitCameraToKitchen(rig, kitchen);
    else if (span !== fittedSpanRef.current) refocusCameraOnRoom(rig, kitchen.room, fittedSpanRef.current);
    fittedSpanRef.current = span;
    applyLighting(rig, rig.nightAmount);
    rig.render();
  }, [kitchen, selectedModuleId]);

  useEffect(() => {
    const rig = rigRef.current;
    if (!rig) return;
    window.cancelAnimationFrame(rig.nightFrame);
    const from = rig.nightAmount;
    const target = isEvening ? 1 : 0;
    const startTime = performance.now();
    const step = (now: number) => {
      const eased = easeInOut(Math.min(1, (now - startTime) / NIGHT_TRANSITION_MS));
      rig.nightAmount = from + (target - from) * eased;
      applyLighting(rig, rig.nightAmount);
      rig.render();
      if (eased < 1) rig.nightFrame = window.requestAnimationFrame(step);
    };
    rig.nightFrame = window.requestAnimationFrame(step);
  }, [isEvening]);

  useEffect(() => {
    const rig = rigRef.current;
    if (!rig) return;
    slideViewInset(rig, { left: leftInsetPx, bottom: bottomInsetPx });
    if (!rig.hasUserMovedCamera) flyCameraTo(rig, measureFitView(rig, kitchenRef.current));
  }, [leftInsetPx, bottomInsetPx]);

  useImperativeHandle(
    handleRef,
    () => ({
      showPerspective: () => {
        const rig = rigRef.current;
        if (!rig) return;
        setFieldOfView(rig, DEFAULT_FIELD_OF_VIEW_DEG);
        rig.hasUserMovedCamera = false;
        flyCameraTo(rig, measureFitView(rig, kitchenRef.current));
      },
      showTop: () => {
        const rig = rigRef.current;
        if (!rig) return;
        setFieldOfView(rig, DEFAULT_FIELD_OF_VIEW_DEG);
        flyCameraTo(rig, measureTopView(kitchenRef.current.room));
      },
      showEye: () => {
        const rig = rigRef.current;
        if (!rig) return;
        setFieldOfView(rig, EYE_FIELD_OF_VIEW_DEG);
        rig.hasUserMovedCamera = true;
        flyCameraTo(rig, measureEyeView(kitchenRef.current.room));
      },
      captureImage: () => {
        const rig = rigRef.current;
        if (!rig) return Promise.resolve(null);
        rig.composer.render();
        return new Promise((resolve) => rig.renderer.domElement.toBlob(resolve, 'image/png'));
      },
      zoomBy: (factor) => {
        const rig = rigRef.current;
        if (!rig) return;
        flyCameraTo(rig, measureZoomView(rig, factor));
      },
    }),
    [],
  );

  return (
    <div className="viewport-frame">
      <div className="viewport" ref={containerRef} />
      {anchor && selectionToolbar && (
        <div className="selection-anchor" style={{ left: anchor.x, top: anchor.y }}>
          {selectionToolbar}
        </div>
      )}
    </div>
  );
});
