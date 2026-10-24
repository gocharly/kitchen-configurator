import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { ModuleSpec } from '../domain/catalog';
import type { Kitchen } from '../domain/kitchen';
import { encodeKitchenLink } from '../domain/kitchenLink';
import { buildKitchenGroup, buildModulePreviewGroup, disposeKitchenGroup } from './buildKitchenGroup';

const PREVIEW_SIZE_PX = 224;
const FIELD_OF_VIEW_DEG = 28;
const FIT_MARGIN = 1.12;
const KITCHEN_PREVIEW_WIDTH_PX = 320;
const KITCHEN_PREVIEW_HEIGHT_PX = 240;
const KITCHEN_FIELD_OF_VIEW_DEG = 40;
const MM = 0.001;
const VIEW_DIRECTION = new THREE.Vector3(0.55, 0.42, 1).normalize();

interface PreviewStage {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
}

let stage: PreviewStage | null = null;
const previews = new Map<string, string>();
const kitchenPreviews = new Map<string, string>();

function createStage(): PreviewStage {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(PREVIEW_SIZE_PX, PREVIEW_SIZE_PX, false);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping;
  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.7;
  const light = new THREE.DirectionalLight('#fff4e6', 1.6);
  light.position.set(-2, 4, 5);
  scene.add(light, new THREE.HemisphereLight('#f4f7ff', '#cfc8bc', 0.6));
  return { renderer, scene, camera: new THREE.PerspectiveCamera(FIELD_OF_VIEW_DEG, 1, 0.05, 40) };
}

function frameCamera(camera: THREE.PerspectiveCamera, group: THREE.Group): void {
  const box = new THREE.Box3().setFromObject(group);
  const center = box.getCenter(new THREE.Vector3());
  const radius = box.getSize(new THREE.Vector3()).length() / 2;
  const distance = (radius / Math.sin(THREE.MathUtils.degToRad(FIELD_OF_VIEW_DEG) / 2)) * FIT_MARGIN;
  camera.position.copy(center).addScaledVector(VIEW_DIRECTION, distance);
  camera.lookAt(center);
}

function prepareStage(target: PreviewStage, width: number, height: number, fieldOfView: number): void {
  target.renderer.setSize(width, height, false);
  target.camera.aspect = width / height;
  target.camera.fov = fieldOfView;
  target.camera.updateProjectionMatrix();
}

function frameCameraOnRoom(camera: THREE.PerspectiveCamera, room: Kitchen['room']): void {
  const center = new THREE.Vector3((room.length / 2) * MM, (room.height / 3) * MM, (room.width / 3) * MM);
  const distance = (Math.max(room.length, room.width) * MM * 0.95 + 1) / Math.min(1, camera.aspect);
  camera.position.set(center.x + distance * 0.35, center.y + distance * 0.32, center.z + distance);
  camera.lookAt(center);
}

export function renderKitchenPreview(kitchen: Kitchen): string {
  const key = encodeKitchenLink(kitchen);
  const cached = kitchenPreviews.get(key);
  if (cached) return cached;
  stage ??= createStage();
  prepareStage(stage, KITCHEN_PREVIEW_WIDTH_PX, KITCHEN_PREVIEW_HEIGHT_PX, KITCHEN_FIELD_OF_VIEW_DEG);
  const group = buildKitchenGroup(kitchen, null);
  stage.scene.add(group);
  frameCameraOnRoom(stage.camera, kitchen.room);
  stage.renderer.render(stage.scene, stage.camera);
  const url = stage.renderer.domElement.toDataURL('image/png');
  stage.scene.remove(group);
  disposeKitchenGroup(group);
  kitchenPreviews.set(key, url);
  return url;
}

export function renderModulePreview(spec: ModuleSpec, colors: { facadeColorId: string; bodyColorId: string }): string {
  const key = `${spec.id}|${colors.facadeColorId}|${colors.bodyColorId}`;
  const cached = previews.get(key);
  if (cached) return cached;
  stage ??= createStage();
  prepareStage(stage, PREVIEW_SIZE_PX, PREVIEW_SIZE_PX, FIELD_OF_VIEW_DEG);
  const group = buildModulePreviewGroup(spec, colors);
  stage.scene.add(group);
  frameCamera(stage.camera, group);
  stage.renderer.render(stage.scene, stage.camera);
  const url = stage.renderer.domElement.toDataURL('image/png');
  stage.scene.remove(group);
  disposeKitchenGroup(group);
  previews.set(key, url);
  return url;
}
