export function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function downloadCsv(filename, content) {
  downloadBlob(filename, new Blob([content], { type: 'text/csv;charset=utf-8;' }));
}

export function downloadJson(filename, content) {
  downloadBlob(filename, new Blob([content], { type: 'application/json;charset=utf-8;' }));
}
