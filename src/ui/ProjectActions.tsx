import { useRef, type ChangeEvent } from 'react';
import type { Kitchen } from '../domain/kitchen';
import { buildProjectFile } from '../domain/projectFile';
import { downloadBlob } from './downloadFile';
import { Icon } from './icons';

interface ProjectActionsProps {
  kitchen: Kitchen;
  onOpenText: (text: string) => void;
}

export function ProjectActions({ kitchen, onOpenText }: ProjectActionsProps) {
  const fileInput = useRef<HTMLInputElement>(null);

  const saveProject = () => {
    const file = new Blob([buildProjectFile(kitchen)], { type: 'application/json' });
    downloadBlob(file, `kuhnya-proekt-${new Date().toISOString().slice(0, 10)}.json`);
  };

  const readChosenFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) onOpenText(await file.text());
  };

  return (
    <div className="project-actions">
      <button type="button" className="catalog-button project-button" onClick={saveProject}>
        <Icon name="save" />
        Сохранить в файл
      </button>
      <button type="button" className="catalog-button project-button" onClick={() => fileInput.current?.click()}>
        <Icon name="open" />
        Открыть файл
      </button>
      <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={readChosenFile} />
    </div>
  );
}
