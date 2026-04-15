import {
  processArtifactReferenceSchema,
  processMaterialsSectionEnvelopeSchema,
  processOutputReferenceSchema,
  processSourceReferenceSchema,
  processSurfaceSectionErrorSchema,
} from '../../apps/platform/shared/contracts/index.js';

export const currentArtifactReferenceFixture = processArtifactReferenceSchema.parse({
  artifactId: 'artifact-process-001',
  displayName: 'Feature Specification Draft',
  currentVersionLabel: 'draft-3',
  roleLabel: 'Current working artifact',
  updatedAt: '2026-04-13T12:12:00.000Z',
});

export const linkedOutputReferenceFixture = processOutputReferenceSchema.parse({
  outputId: 'output-linked-001',
  displayName: 'Feature Specification Draft',
  revisionLabel: 'draft-3',
  state: 'published_to_artifact',
  updatedAt: '2026-04-13T12:11:00.000Z',
});

export const standaloneOutputReferenceFixture = processOutputReferenceSchema.parse({
  outputId: 'output-standalone-001',
  displayName: 'Review Notes',
  revisionLabel: 'notes-1',
  state: 'in_progress',
  updatedAt: '2026-04-13T12:14:00.000Z',
});

export const revisedStandaloneOutputReferenceFixture = processOutputReferenceSchema.parse({
  outputId: standaloneOutputReferenceFixture.outputId,
  displayName: standaloneOutputReferenceFixture.displayName,
  revisionLabel: 'notes-2',
  state: 'ready_for_review',
  updatedAt: '2026-04-13T12:24:00.000Z',
});

export const processSourceReferenceFixture = processSourceReferenceSchema.parse({
  sourceAttachmentId: 'source-process-001',
  displayName: 'liminal-build',
  purpose: 'implementation',
  targetRef: 'main',
  hydrationState: 'hydrated',
  updatedAt: '2026-04-13T12:10:00.000Z',
});

export const phaseChangeArtifactReferenceFixture = processArtifactReferenceSchema.parse({
  artifactId: 'artifact-process-002',
  displayName: 'Implementation Checklist',
  currentVersionLabel: 'review-1',
  roleLabel: 'Current review artifact',
  updatedAt: '2026-04-13T12:25:00.000Z',
});

export const phaseChangeOutputReferenceFixture = processOutputReferenceSchema.parse({
  outputId: 'output-phase-change-001',
  displayName: 'Implementation Plan',
  revisionLabel: 'plan-4',
  state: 'ready_for_review',
  updatedAt: '2026-04-13T12:26:00.000Z',
});

export const phaseChangeSourceReferenceFixture = processSourceReferenceSchema.parse({
  sourceAttachmentId: 'source-process-002',
  displayName: 'docs/spec-build',
  purpose: 'review',
  targetRef: 'story-4',
  hydrationState: 'hydrated',
  updatedAt: '2026-04-13T12:23:00.000Z',
});

export const processMaterialsSectionErrorFixture = processSurfaceSectionErrorSchema.parse({
  code: 'PROCESS_SURFACE_MATERIALS_LOAD_FAILED',
  message: 'Process materials could not be loaded.',
});

export const readyProcessMaterialsFixture = processMaterialsSectionEnvelopeSchema.parse({
  status: 'ready',
  currentArtifacts: [currentArtifactReferenceFixture],
  currentOutputs: [standaloneOutputReferenceFixture],
  currentSources: [processSourceReferenceFixture],
});

export const revisedOutputProcessMaterialsFixture = processMaterialsSectionEnvelopeSchema.parse({
  status: 'ready',
  currentArtifacts: [currentArtifactReferenceFixture],
  currentOutputs: [revisedStandaloneOutputReferenceFixture],
  currentSources: [processSourceReferenceFixture],
});

export const phaseChangedProcessMaterialsFixture = processMaterialsSectionEnvelopeSchema.parse({
  status: 'ready',
  currentArtifacts: [phaseChangeArtifactReferenceFixture],
  currentOutputs: [phaseChangeOutputReferenceFixture],
  currentSources: [phaseChangeSourceReferenceFixture],
});

export const emptyProcessMaterialsFixture = processMaterialsSectionEnvelopeSchema.parse({
  status: 'empty',
  currentArtifacts: [],
  currentOutputs: [],
  currentSources: [],
});

export const errorProcessMaterialsFixture = processMaterialsSectionEnvelopeSchema.parse({
  status: 'error',
  currentArtifacts: [],
  currentOutputs: [],
  currentSources: [],
  error: processMaterialsSectionErrorFixture,
});
