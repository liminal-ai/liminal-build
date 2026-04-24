import { exportPackageResponseSchema } from '../../apps/platform/shared/contracts/index.js';

export const exportPackageResponseFixture = exportPackageResponseSchema.parse({
  exportId: 'export-001',
  downloadName: 'specification-package.mpkz',
  downloadUrl:
    'http://localhost:5001/api/projects/project-001/processes/process-001/review/exports/export-001?token=test',
  contentType: 'application/gzip',
  packageFormat: 'mpkz',
  expiresAt: '2026-04-22T12:15:00.000Z',
});
