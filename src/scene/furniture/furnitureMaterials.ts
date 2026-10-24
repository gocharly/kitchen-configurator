import * as THREE from 'three';
import { createWoodGrainTexture } from '../surfaceTextures';

export interface FurnitureMaterials {
  wood: THREE.MeshStandardMaterial;
  woodDark: THREE.MeshStandardMaterial;
  fabric: THREE.MeshStandardMaterial;
  leather: THREE.MeshStandardMaterial;
  bottleGlass: THREE.MeshStandardMaterial;
}

let woodTexture: THREE.CanvasTexture | null = null;

function getWoodTexture(): THREE.CanvasTexture {
  woodTexture ??= createWoodGrainTexture();
  return woodTexture;
}

function createWood(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, map: getWoodTexture(), roughness: 0.55 });
}

export function createFurnitureMaterials(): FurnitureMaterials {
  return {
    wood: createWood('#c49a6c'),
    woodDark: createWood('#6d4a30'),
    fabric: new THREE.MeshStandardMaterial({ color: '#8d9399', roughness: 0.95 }),
    leather: new THREE.MeshStandardMaterial({ color: '#2f2b29', roughness: 0.5 }),
    bottleGlass: new THREE.MeshStandardMaterial({ color: '#1d3a2a', roughness: 0.12, metalness: 0.1 }),
  };
}
