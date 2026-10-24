import * as THREE from 'three';
import { MM, createBox } from '../cabinetFronts';
import { createRod, type ModelContext, type ModelFrame } from '../appliances/applianceShapes';

const BODY_RADIUS_SEGMENTS = 32;
const TILT_ROD_RADIUS_MM = 7;
const HEAD_OVERHANG_MM = 3;
const JAR_BASE_INSET_MM = 2;

function centerOf(frame: ModelFrame): [number, number] {
  return [frame.width / 2, frame.depth / 2];
}

function createTiltedRod(radiusMm: number, lengthMm: number, base: [number, number, number], tilt: { x: number; z: number }, material: THREE.Material): THREE.Group {
  const rod = createRod(radiusMm, lengthMm, [0, lengthMm / 2, 0], 'y', material);
  const holder = new THREE.Group().add(rod);
  holder.rotation.set(tilt.x, 0, tilt.z);
  holder.position.set(base[0] * MM, base[1] * MM, base[2] * MM);
  return holder;
}

function createHalfBowl(radiusMm: number, center: [number, number, number], material: THREE.Material): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(radiusMm * MM, BODY_RADIUS_SEGMENTS, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(center[0] * MM, center[1] * MM, center[2] * MM);
  mesh.castShadow = true;
  return mesh;
}

function createBall(radiusMm: number, center: [number, number, number], material: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radiusMm * MM, 20, 14), material);
  mesh.position.set(center[0] * MM, center[1] * MM, center[2] * MM);
  mesh.castShadow = true;
  return mesh;
}

export function buildPan(frame: ModelFrame, context: ModelContext): THREE.Group {
  const { steelDark, castIron, rubber } = context.materials;
  const group = new THREE.Group();
  const radius = frame.depth / 2;
  const wall = frame.height;
  group.add(createRod(radius, wall, [radius, wall / 2, radius], 'y', steelDark));
  group.add(createRod(radius - 8, 2, [radius, wall + 1, radius], 'y', castIron));
  group.add(createBox([frame.width - 2 * radius + 20, 12, 26], [2 * radius - 20, wall - 22, radius - 13], steelDark));
  group.add(createBox([frame.width - 2 * radius - 40, 18, 30], [2 * radius + 20, wall - 25, radius - 15], rubber));
  return group;
}

export function buildSaucepan(frame: ModelFrame, context: ModelContext): THREE.Group {
  const { steel, steelDark, chrome } = context.materials;
  const group = new THREE.Group();
  const [centerX, centerZ] = centerOf(frame);
  const radius = Math.min(frame.width, frame.depth) / 2 - 14;
  const bodyHeight = frame.height * 0.78;
  group.add(createRod(radius, bodyHeight, [centerX, bodyHeight / 2, centerZ], 'y', steel));
  group.add(createRod(radius + 4, 8, [centerX, bodyHeight + 4, centerZ], 'y', steelDark));
  group.add(createRod(14, 18, [centerX, bodyHeight + 17, centerZ], 'y', chrome));
  [-1, 1].forEach((side) => group.add(createBox([34, 10, 20], [centerX + side * (radius + 17) - 17, bodyHeight - 28, centerZ - 10], steelDark)));
  return group;
}

export function buildKettle(frame: ModelFrame, context: ModelContext): THREE.Group {
  const { steel, plastic, rubber } = context.materials;
  const group = new THREE.Group();
  const [centerX, centerZ] = centerOf(frame);
  const baseHeight = 22;
  const bodyHeight = frame.height - baseHeight;
  group.add(createRod(frame.depth * 0.48, baseHeight, [centerX, baseHeight / 2, centerZ], 'y', plastic));
  const body = new THREE.Mesh(new THREE.CylinderGeometry(frame.depth * 0.36 * MM, frame.depth * 0.44 * MM, bodyHeight * MM, BODY_RADIUS_SEGMENTS), steel);
  body.position.set(centerX * MM, (baseHeight + bodyHeight / 2) * MM, centerZ * MM);
  body.castShadow = true;
  group.add(body);
  group.add(createRod(frame.depth * 0.26, 10, [centerX, frame.height + 5, centerZ], 'y', plastic));
  group.add(createBox([34, 46, 70], [centerX - 17, baseHeight + bodyHeight * 0.6, centerZ + frame.depth * 0.3], steel, 6));
  group.add(createBox([22, bodyHeight * 0.7, 30], [centerX + frame.width * 0.5 - 40, baseHeight + bodyHeight * 0.1, centerZ - 15], rubber, 8));
  return group;
}

export function buildToaster(frame: ModelFrame, context: ModelContext): THREE.Group {
  const { steel, plastic, rubber } = context.materials;
  const group = new THREE.Group();
  const bodyHeight = frame.height - 6;
  group.add(createBox([frame.width, bodyHeight, frame.depth], [0, 6, 0], steel, 14));
  [0.28, 0.6].forEach((ratio) => group.add(createBox([frame.width * 0.56, 2, 12], [frame.width * 0.22, frame.height + 1, frame.depth * ratio - 6], plastic)));
  group.add(createBox([10, 30, 24], [frame.width + 4, frame.height * 0.5, frame.depth * 0.5 - 12], plastic, 3));
  [14, frame.width - 34].forEach((x) => group.add(createBox([20, 6, frame.depth - 28], [x, 0, 14], rubber)));
  return group;
}

export function buildCoffeeMachine(frame: ModelFrame, context: ModelContext): THREE.Group {
  const { plastic, steel, steelDark, ceramic } = context.materials;
  const group = new THREE.Group();
  const columnDepth = frame.depth * 0.5;
  group.add(createBox([frame.width, frame.height, columnDepth], [0, 0, 0], plastic, 14));
  group.add(createBox([frame.width + 2 * HEAD_OVERHANG_MM, frame.height * 0.25, frame.depth * 0.72], [-HEAD_OVERHANG_MM, frame.height * 0.7, 0], steelDark, 10));
  group.add(createBox([frame.width - 30, 10, frame.depth - columnDepth + 8], [15, 14, columnDepth - 8], steel, 3));
  group.add(createBox([frame.width - 34, 6, frame.depth - columnDepth], [17, 24, columnDepth - 8], steelDark));
  group.add(createRod(34, 62, [frame.width / 2, 24 + 31, columnDepth + (frame.depth - columnDepth) / 2], 'y', ceramic));
  group.add(createBox([40, 18, 8], [frame.width / 2 - 20, frame.height * 0.8, frame.depth * 0.72], steel, 2));
  return group;
}

export function buildCounterMicrowave(frame: ModelFrame, context: ModelContext): THREE.Group {
  const { steel, blackGlass, steelDark } = context.materials;
  const group = new THREE.Group();
  const panelWidth = frame.width * 0.24;
  group.add(createBox([frame.width, frame.height, frame.depth], [0, 0, 0], steel, 10));
  group.add(createBox([frame.width - panelWidth - 40, frame.height - 50, 3], [20, 25, frame.depth], blackGlass, 2));
  group.add(createBox([panelWidth - 20, frame.height - 60, 3], [frame.width - panelWidth + 5, 30, frame.depth], steelDark, 2));
  group.add(createBox([8, frame.height * 0.5, 14], [frame.width - panelWidth - 32, frame.height * 0.25, frame.depth + 3], steelDark, 3));
  return group;
}

export function buildCuttingBoard(frame: ModelFrame, context: ModelContext): THREE.Group {
  const { wood, woodDark } = context.materials;
  const group = new THREE.Group();
  group.add(createBox([frame.width, frame.height, frame.depth], [0, 0, 0], wood, 5));
  group.add(createRod(16, frame.height + 2, [frame.width - 40, (frame.height + 2) / 2, 40], 'y', woodDark));
  return group;
}

export function buildFruitBowl(frame: ModelFrame, context: ModelContext): THREE.Group {
  const { ceramic, fruitRed, fruitYellow, fruitGreen } = context.materials;
  const group = new THREE.Group();
  const [centerX, centerZ] = centerOf(frame);
  const radius = frame.width / 2;
  const bowlDepth = radius * 0.7;
  group.add(createHalfBowl(radius, [centerX, radius + 4, centerZ], ceramic));
  group.add(createRod(radius * 0.4, 4, [centerX, 2, centerZ], 'y', ceramic));
  const fruit: [number, number, number, THREE.Material][] = [
    [-0.35, 0.1, 0, fruitRed], [0.3, 0.12, -0.15, fruitGreen], [0, 0.2, 0.3, fruitYellow], [0.05, 0.28, -0.12, fruitRed],
  ];
  fruit.forEach(([dx, dy, dz, material]) => group.add(createBall(radius * 0.36, [centerX + dx * radius, bowlDepth + 12 + dy * radius, centerZ + dz * radius], material)));
  return group;
}

export function buildKnifeBlock(frame: ModelFrame, context: ModelContext): THREE.Group {
  const { woodDark, rubber } = context.materials;
  const group = new THREE.Group();
  group.add(createBox([frame.width, frame.height * 0.78, frame.depth], [0, 0, 0], woodDark, 6));
  [0.2, 0.5, 0.8].forEach((ratio) => group.add(createBox([14, 70, 26], [frame.width * ratio - 7, frame.height * 0.78, frame.depth * 0.5 - 13], rubber, 3)));
  group.add(createBox([frame.width - 24, 8, frame.depth - 24], [12, frame.height * 0.78 - 4, 12], woodDark));
  return group;
}

export function buildUtensilJar(frame: ModelFrame, context: ModelContext): THREE.Group {
  const { steel, wood, woodDark, steelDark } = context.materials;
  const group = new THREE.Group();
  const [centerX, centerZ] = centerOf(frame);
  const jarHeight = frame.height * 0.55;
  const jar = new THREE.Mesh(new THREE.CylinderGeometry(frame.width * 0.46 * MM, frame.width * 0.46 * MM, jarHeight * MM, BODY_RADIUS_SEGMENTS, 1, true), steel);
  jar.material = (steel.clone() as THREE.MeshStandardMaterial);
  jar.material.side = THREE.DoubleSide;
  jar.position.set(centerX * MM, (jarHeight / 2) * MM, centerZ * MM);
  group.add(jar);
  group.add(createRod(frame.width * 0.46 - JAR_BASE_INSET_MM, 3, [centerX, 1.5, centerZ], 'y', steelDark));
  const length = frame.height - 20;
  [[-18, 0, 0.12, 0.1, wood], [16, 8, -0.1, -0.14, woodDark], [0, -14, 0.04, -0.2, wood]].forEach(([dx, dz, tx, tz, material]) => {
    group.add(createTiltedRod(TILT_ROD_RADIUS_MM, length, [centerX + (dx as number), 10, centerZ + (dz as number)], { x: tx as number, z: tz as number }, material as THREE.Material));
  });
  return group;
}

export function buildBreadBin(frame: ModelFrame, context: ModelContext): THREE.Group {
  const { enamel, steel, chrome } = context.materials;
  const group = new THREE.Group();
  const lidHeight = frame.height * 0.32;
  group.add(createBox([frame.width, frame.height - lidHeight, frame.depth], [0, 0, 0], enamel, 8));
  group.add(createBox([frame.width + 4, lidHeight, frame.depth + 4], [-2, frame.height - lidHeight, -2], steel, 8));
  group.add(createRod(5, 90, [frame.width / 2, frame.height - lidHeight - 20, frame.depth + 8], 'x', chrome));
  return group;
}

export function buildCanisters(frame: ModelFrame, context: ModelContext): THREE.Group {
  const { ceramic, wood } = context.materials;
  const group = new THREE.Group();
  const slot = frame.width / 3;
  [0.85, 1, 0.85].forEach((ratio, index) => {
    const height = frame.height * ratio;
    const x = slot * (index + 0.5);
    group.add(createRod(slot * 0.42, height * 0.86, [x, (height * 0.86) / 2, frame.depth / 2], 'y', ceramic));
    group.add(createRod(slot * 0.44, height * 0.14, [x, height * 0.86 + (height * 0.14) / 2, frame.depth / 2], 'y', wood));
  });
  return group;
}

export function buildMugs(frame: ModelFrame, context: ModelContext): THREE.Group {
  const { ceramic, fruitRed } = context.materials;
  const group = new THREE.Group();
  [0.28, 0.72].forEach((ratio, index) => {
    const x = frame.width * ratio;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(38 * MM, 34 * MM, frame.height * MM, 28), index === 0 ? ceramic : fruitRed);
    body.position.set(x * MM, (frame.height / 2) * MM, (frame.depth / 2) * MM);
    body.castShadow = true;
    group.add(body);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(22 * MM, 5 * MM, 10, 16, Math.PI), index === 0 ? ceramic : fruitRed);
    handle.rotation.z = -Math.PI / 2;
    handle.position.set((x + 38) * MM, (frame.height / 2) * MM, (frame.depth / 2) * MM);
    group.add(handle);
  });
  return group;
}

export function buildDishRack(frame: ModelFrame, context: ModelContext): THREE.Group {
  const { steelDark, ceramic, chrome } = context.materials;
  const group = new THREE.Group();
  group.add(createBox([frame.width, 8, frame.depth], [0, 0, 0], steelDark, 3));
  for (let line = 0; line <= 4; line += 1) {
    group.add(createRod(2.5, frame.width - 30, [frame.width / 2, 22, 30 + (line * (frame.depth - 60)) / 4], 'x', chrome));
  }
  for (let plate = 0; plate < 4; plate += 1) {
    group.add(createRod(frame.depth * 0.32, 6, [50 + plate * ((frame.width - 100) / 3), 22 + frame.depth * 0.32, frame.depth / 2], 'x', ceramic));
  }
  return group;
}

export function buildBlender(frame: ModelFrame, context: ModelContext): THREE.Group {
  const { plastic, glass, steel } = context.materials;
  const group = new THREE.Group();
  const [centerX, centerZ] = centerOf(frame);
  const baseHeight = frame.height * 0.28;
  group.add(createBox([frame.width, baseHeight, frame.depth], [0, 0, 0], plastic, 14));
  const jar = new THREE.Mesh(new THREE.CylinderGeometry(frame.width * 0.38 * MM, frame.width * 0.28 * MM, (frame.height - baseHeight - 20) * MM, BODY_RADIUS_SEGMENTS), glass);
  jar.position.set(centerX * MM, (baseHeight + (frame.height - baseHeight - 20) / 2) * MM, centerZ * MM);
  group.add(jar);
  group.add(createRod(frame.width * 0.4, 20, [centerX, frame.height - 10, centerZ], 'y', plastic));
  group.add(createRod(frame.width * 0.12, 8, [centerX, frame.height + 4, centerZ], 'y', steel));
  return group;
}

export function buildTowelHolder(frame: ModelFrame, context: ModelContext): THREE.Group {
  const { steelDark, enamel, chrome } = context.materials;
  const group = new THREE.Group();
  const [centerX, centerZ] = centerOf(frame);
  group.add(createRod(frame.width * 0.46, 8, [centerX, 4, centerZ], 'y', steelDark));
  group.add(createRod(7, frame.height, [centerX, frame.height / 2, centerZ], 'y', chrome));
  group.add(createRod(frame.width * 0.36, frame.height * 0.45, [centerX, 8 + (frame.height * 0.45) / 2, centerZ], 'y', enamel));
  return group;
}
