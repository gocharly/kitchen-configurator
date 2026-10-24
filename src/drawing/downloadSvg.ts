const PIXELS_PER_MM = 0.25;

export function downloadSvg(svg: SVGSVGElement, fileName: string): void {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const viewBox = svg.viewBox.baseVal;
  clone.removeAttribute('class');
  clone.removeAttribute('style');
  clone.setAttribute('width', String(Math.round(viewBox.width * PIXELS_PER_MM)));
  clone.setAttribute('height', String(Math.round(viewBox.height * PIXELS_PER_MM)));
  const markup = `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}`;
  const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
