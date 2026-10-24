import * as THREE from 'three';
import { createBrushedSteelTexture } from '../surfaceTextures';

export interface ApplianceMaterials {
  steel: THREE.MeshStandardMaterial;
  steelDark: THREE.MeshStandardMaterial;
  drum: THREE.MeshStandardMaterial;
  blackGlass: THREE.MeshStandardMaterial;
  enamel: THREE.MeshStandardMaterial;
  chrome: THREE.MeshStandardMaterial;
  rubber: THREE.MeshStandardMaterial;
  castIron: THREE.MeshStandardMaterial;
}

const STEEL_METALNESS = 0.75;
const STEEL_ENV_INTENSITY = 1.8;
const CHROME_ENV_INTENSITY = 1.5;
const BLACK_GLASS_ENV_INTENSITY = 2.4;

let steelTexture: THREE.CanvasTexture | null = null;

function getSteelTexture(): THREE.CanvasTexture {
  steelTexture ??= createBrushedSteelTexture();
  return steelTexture;
}

function createSteel(color: string, roughness: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, map: getSteelTexture(), metalness: STEEL_METALNESS, roughness, envMapIntensity: STEEL_ENV_INTENSITY });
}

function createBlackGlass(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({ color: '#12161b', roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: BLACK_GLASS_ENV_INTENSITY });
}

function createEnamel(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({ color: '#f2f3f1', roughness: 0.4, clearcoat: 0.5, clearcoatRoughness: 0.25 });
}

export function createApplianceMaterials(): ApplianceMaterials {
  const drum = createSteel('#d8dbde', 0.5);
  drum.side = THREE.DoubleSide;
  return {
    steel: createSteel('#e8eaec', 0.38),
    steelDark: createSteel('#868b91', 0.42),
    drum,
    blackGlass: createBlackGlass(),
    enamel: createEnamel(),
    chrome: new THREE.MeshStandardMaterial({ color: '#eceef0', metalness: 1, roughness: 0.12, envMapIntensity: CHROME_ENV_INTENSITY }),
    rubber: new THREE.MeshStandardMaterial({ color: '#1c1e20', roughness: 0.85 }),
    castIron: new THREE.MeshStandardMaterial({ color: '#232528', roughness: 0.55, metalness: 0.35 }),
  };
}
