import {
  requestErrorSchema,
  reviewTargetErrorSchema,
} from '../../apps/platform/shared/contracts/index.js';

export const artifactVersionNotFoundRequestErrorFixture = requestErrorSchema.parse({
  code: 'ARTIFACT_VERSION_NOT_FOUND',
  message: 'The requested artifact version is unavailable.',
  status: 404,
});

export const packageMemberUnavailableRequestErrorFixture = requestErrorSchema.parse({
  code: 'PACKAGE_MEMBER_UNAVAILABLE',
  message: 'The requested pinned package member is unavailable.',
  status: 404,
});

export const packageMemberNotAllowedRequestErrorFixture = requestErrorSchema.parse({
  code: 'PACKAGE_MEMBER_NOT_ALLOWED',
  message: 'The requested package member is outside the current package context.',
  status: 409,
});

export const artifactVersionNotFoundTargetErrorFixture = reviewTargetErrorSchema.parse({
  code: 'ARTIFACT_VERSION_NOT_FOUND',
  message: 'The selected artifact version is unavailable.',
});

export const packageMemberUnavailableTargetErrorFixture = reviewTargetErrorSchema.parse({
  code: 'PACKAGE_MEMBER_UNAVAILABLE',
  message: 'The pinned package member is unavailable.',
});
