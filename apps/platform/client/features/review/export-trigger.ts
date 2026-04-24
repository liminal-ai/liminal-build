import type { ExportPackageResponse, RequestError } from '../../../shared/contracts/index.js';

function createParagraph(targetDocument: Document, text: string) {
  const paragraph = targetDocument.createElement('p');
  paragraph.textContent = text;
  return paragraph;
}

async function triggerDownload(args: {
  response: Response;
  downloadName: string;
  targetDocument: Document;
}): Promise<void> {
  const blob = await args.response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const downloadLink = args.targetDocument.createElement('a');

  downloadLink.href = objectUrl;
  downloadLink.download = args.downloadName;
  downloadLink.style.display = 'none';
  args.targetDocument.body.append(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  queueMicrotask(() => URL.revokeObjectURL(objectUrl));
}

export function renderExportTrigger(args: {
  packageId: string;
  isExporting: boolean;
  lastExport: ExportPackageResponse | null;
  error: RequestError | null;
  targetDocument: Document;
  onExport: () => void;
  onExportExpired: () => void;
}): HTMLElement {
  const container = args.targetDocument.createElement('section');
  const button = args.targetDocument.createElement('button');
  const statusRegion = args.targetDocument.createElement('div');

  container.setAttribute('data-export-trigger', 'true');
  statusRegion.setAttribute('aria-live', 'polite');
  statusRegion.setAttribute('aria-atomic', 'true');
  statusRegion.setAttribute('data-export-status-region', args.packageId);

  button.type = 'button';
  button.textContent = args.lastExport === null ? 'Export package' : 'Export again';
  button.disabled = args.isExporting;
  button.addEventListener('click', () => {
    args.onExport();
  });

  container.append(button);

  if (args.isExporting) {
    statusRegion.append(createParagraph(args.targetDocument, 'Preparing package export...'));
  }

  if (args.lastExport !== null) {
    const exportResponse = args.lastExport;
    const downloadLink = args.targetDocument.createElement('a');
    downloadLink.href = exportResponse.downloadUrl;
    downloadLink.download = exportResponse.downloadName;
    downloadLink.textContent = `Download ${exportResponse.downloadName}`;
    downloadLink.setAttribute('data-export-download-link', args.packageId);
    downloadLink.addEventListener('click', (event) => {
      const expiresAt = Date.parse(exportResponse.expiresAt);
      const clockSkewBufferMs = 5_000;
      if (Number.isFinite(expiresAt) && expiresAt <= Date.now() + clockSkewBufferMs) {
        event.preventDefault();
        args.onExportExpired();
        return;
      }

      event.preventDefault();
      void fetch(exportResponse.downloadUrl, {
        credentials: 'include',
      })
        .then(async (response) => {
          if (!response.ok) {
            if (response.status === 404) {
              args.onExportExpired();
            }
            return;
          }

          await triggerDownload({
            response,
            downloadName: exportResponse.downloadName,
            targetDocument: args.targetDocument,
          });
        })
        .catch(() => {});
    });
    statusRegion.append(
      createParagraph(args.targetDocument, `Download expires at ${args.lastExport.expiresAt}`),
      downloadLink,
    );
  }

  if (args.error !== null) {
    statusRegion.append(createParagraph(args.targetDocument, args.error.message));
  }

  container.append(statusRegion);

  return container;
}
