import { NextResponse } from 'next/server';

/**
 * spec/API_SPEC.md 공통 에러 포맷.
 */
export const ERROR_CODES = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  INTERNAL: 500,
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

export function errorResponse(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json(
    { error: { code, message, details: details ?? {} } },
    { status: ERROR_CODES[code] },
  );
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
