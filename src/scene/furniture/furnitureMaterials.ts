import * as THREE from 'three';
import { createWoodGrainTexture } from '../surfaceTextures';

export interface FurnitureMaterials {
  wood: THREE.MeshStandardMaterial;
  woodDark: THREE.MeshStandardMaterial;
  fabric: THREE.MeshStandardMaterial;
  leather: THREE.MeshStandardMaterial;
  bottleGlass: THREE.MeshStandardMaterial;
  leaf: THREE.MeshStandardMaterial;
  ceramic: THREE.MeshStandardMaterial;
  rug: THREE.MeshStandardMaterial;
  curtain: THREE.MeshStandardMaterial;
  lampShade: THREE.MeshStandardMaterial;
  plastic: THREE.MeshStandardMaterial;
  fruitRed: THREE.MeshStandardMaterial;
  fruitYellow: THREE.MeshStandardMaterial;
  fruitGreen: THREE.MeshStandardMaterial;
}

let woodTexture: THREE.CanvasTexture | null = null;

function getWoodTexture(): THREE.CanvasTexture {
  woodTexture ??= createWoodGrainTexture();
  return woodTexture;
}

function createWood(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, map: getWoodTexture(), roughness: 0.55 });
}

export const LAMP_DAY_EMISSIVE = 0.12;
export const LAMP_EVENING_EMISSIVE = 1.1;

export function createFurnitureMaterials(): FurnitureMaterials {
  return {
    wood: createWood('#c49a6c'),
    woodDark: createWood('#6d4a30'),
    fabric: new THREE.MeshStandardMaterial({ color: '#8d9399', roughness: 0.95 }),
    leather: new THREE.MeshStandardMaterial({ color: '#2f2b29', roughness: 0.5 }),
    bottleGlass: new THREE.MeshStandardMaterial({ color: '#1d3a2a', roughness: 0.12, metalness: 0.1 }),
    leaf: new THREE.MeshStandardMaterial({ color: '#4f7d4d', roughness: 0.75 }),
    ceramic: new THREE.MeshStandardMaterial({ color: '#ecebe6', roughness: 0.35 }),
    rug: new THREE.MeshStandardMaterial({ color: '#a99f90', roughness: 1 }),
    curtain: new THREE.MeshStandardMaterial({ color: '#ddd5c5', roughness: 0.95, side: THREE.DoubleSide }),
    plastic: new THREE.MeshStandardMaterial({ color: '#202225', roughness: 0.5 }),
    fruitRed: new THREE.MeshStandardMaterial({ color: '#b2352c', roughness: 0.5 }),
    fruitYellow: new THREE.MeshStandardMaterial({ color: '#e3c64d', roughness: 0.5 }),
    fruitGreen: new THREE.MeshStandardMaterial({ color: '#7ea53b', roughness: 0.5 }),
    lampShade: new THREE.MeshStandardMaterial({ color: '#f3ead7', roughness: 0.9, emissive: '#f3ead7', emissiveIntensity: LAMP_DAY_EMISSIVE, side: THREE.DoubleSide }),
  };
}
