import type {
  ArtifactSectionEnvelope,
  ProcessSectionEnvelope,
  ProjectShellResponse,
  SourceAttachmentSectionEnvelope,
} from '../../../shared/contracts/index.js';
import type { AuthenticatedActor } from '../auth/auth-session.service.js';
import { artifactSectionEnvelopeSchema } from '../../../shared/contracts/index.js';
import { processSectionEnvelopeSchema } from '../../../shared/contracts/index.js';
import { sourceAttachmentSectionEnvelopeSchema } from '../../../shared/contracts/index.js';
import { SectionError } from '../../errors/section-error.js';
import type { PlatformStore } from './platform-store.js';
import { ArtifactSectionReader } from './readers/artifact-section.reader.js';
import { ProcessSectionReader } from './readers/process-section.reader.js';
import { SourceSectionReader } from './readers/source-section.reader.js';

export class ProjectShellService {
  private readonly processSectionReader: ProcessSectionReader;
  private readonly artifactSectionReader: ArtifactSectionReader;
  private readonly sourceSectionReader: SourceSectionReader;

  constructor(
    private readonly platformStore: PlatformStore,
    readers: {
      processSectionReader?: ProcessSectionReader;
      artifactSectionReader?: ArtifactSectionReader;
      sourceSectionReader?: SourceSectionReader;
    } = {},
  ) {
    this.processSectionReader =
      readers.processSectionReader ?? new ProcessSectionReader(platformStore);
    this.artifactSectionReader =
      readers.artifactSectionReader ?? new ArtifactSectionReader(platformStore);
    this.sourceSectionReader =
      readers.sourceSectionReader ?? new SourceSectionReader(platformStore);
  }

  async getShell(args: {
    actor: AuthenticatedActor;
    projectId: string;
  }): Promise<ProjectShellResponse> {
    const access = await this.platformStore.getProjectAccess({
      userId: args.actor.userId,
      projectId: args.projectId,
    });

    if (access.kind !== 'accessible') {
      throw new Error('Project shell access must be validated before reading shell state.');
    }

    const [processes, artifacts, sourceAttachments] = await Promise.all([
      this.readProcesses(args),
      this.readArtifacts(args),
      this.readSourceAttachments(args),
    ]);

    return {
      project: access.project,
      processes,
      artifacts,
      sourceAttachments,
    };
  }

  private async readProcesses(args: {
    actor: AuthenticatedActor;
    projectId: string;
  }): Promise<ProcessSectionEnvelope> {
    try {
      return await this.processSectionReader.read(args);
    } catch (error) {
      return processSectionEnvelopeSchema.parse({
        status: 'error',
        items: [],
        error: {
          code: 'PROJECT_SHELL_PROCESSES_LOAD_FAILED',
          message: this.getSectionMessage(error, 'Process summaries failed to load.'),
        },
      });
    }
  }

  private async readArtifacts(args: {
    actor: AuthenticatedActor;
    projectId: string;
  }): Promise<ArtifactSectionEnvelope> {
    try {
      return await this.artifactSectionReader.read(args);
    } catch (error) {
      return artifactSectionEnvelopeSchema.parse({
        status: 'error',
        items: [],
        error: {
          code: 'PROJECT_SHELL_ARTIFACTS_LOAD_FAILED',
          message: this.getSectionMessage(error, 'Artifact summaries failed to load.'),
        },
      });
    }
  }

  private async readSourceAttachments(args: {
    actor: AuthenticatedActor;
    projectId: string;
  }): Promise<SourceAttachmentSectionEnvelope> {
    try {
      return await this.sourceSectionReader.read(args);
    } catch (error) {
      return sourceAttachmentSectionEnvelopeSchema.parse({
        status: 'error',
        items: [],
        error: {
          code: 'PROJECT_SHELL_SOURCES_LOAD_FAILED',
          message: this.getSectionMessage(error, 'Source attachment summaries failed to load.'),
        },
      });
    }
  }

  private getSectionMessage(error: unknown, fallback: string): string {
    if (error instanceof SectionError) {
      return error.message;
    }

    if (error instanceof Error && error.message.length > 0) {
      return error.message;
    }

    return fallback;
  }
}
