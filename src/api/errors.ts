import type { components } from './schema.gen'

export type Problem = components['schemas']['Problem']
export type ConflictProblem = components['schemas']['ConflictProblem']
export type UnavailableReason = components['schemas']['UnavailableReason']

/** Any non-2xx response, or a network failure (status 0). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly problem: Problem | undefined,
    readonly correlationId: string | undefined,
  ) {
    super(problem?.detail ?? problem?.title ?? (status === 0 ? 'Network error' : `Request failed (${status})`))
    this.name = 'ApiError'
  }

  get fieldErrors(): { field: string; message: string }[] {
    return this.problem?.errors ?? []
  }
}

/** 409 from createAppointment — carries fresh reason and alternatives (research R8). */
export class ConflictError extends ApiError {
  readonly reason: UnavailableReason
  readonly alternatives: string[]

  constructor(problem: ConflictProblem, correlationId: string | undefined) {
    super(409, problem, correlationId)
    this.name = 'ConflictError'
    this.reason = problem.reason
    this.alternatives = problem.alternatives
  }
}

function isProblem(v: unknown): v is Problem {
  return typeof v === 'object' && v !== null && 'status' in v && 'title' in v
}

export function toApiError(status: number, body: unknown, correlationId: string | undefined): ApiError {
  const problem = isProblem(body) ? body : undefined
  if (status === 409 && problem && 'reason' in problem && 'alternatives' in problem) {
    return new ConflictError(problem as ConflictProblem, correlationId)
  }
  return new ApiError(status, problem, correlationId ?? problem?.correlationId)
}
