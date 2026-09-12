import { z } from 'zod';
import { prisma } from '@jobtalk/db';
import { errorResponse, readJson } from '@/lib/api';
import { resolveLocale } from '@/lib/locale';
import { ForbiddenIdentityFieldError, parseVisaProfile } from '@/lib/profile-schema';
import {
  brokerageNotice,
  buildContext,
  evaluateEligibility,
  loadRulesFor,
  localizeResult,
  lookupCommuteMinutes,
  toPostingFacts,
} from '@/lib/evaluation';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z
  .object({
    postingId: z.string().uuid(),
    // 프로필을 인라인으로 받아 비로그인 미리보기를 지원한다 (spec/API_SPEC.md 2장)
    profile: z.unknown().nullish(),
  })
  .strict();

export async function POST(request: Request) {
  const locale = resolveLocale(request);
  const raw = await readJson(request);
  if (raw == null) return errorResponse('VALIDATION_ERROR', 'JSON 본문이 필요합니다.');

  const parsedBody = bodySchema.safeParse(raw);
  if (!parsedBody.success) {
    return errorResponse('VALIDATION_ERROR', '요청 형식이 올바르지 않습니다.', {
      issues: parsedBody.error.issues,
    });
  }

  let profile = null;
  if (parsedBody.data.profile != null) {
    try {
      profile = parseVisaProfile(parsedBody.data.profile);
    } catch (error) {
      if (error instanceof ForbiddenIdentityFieldError) {
        // L5 — 식별번호는 받지 않는다. 무시가 아니라 거부다.
        return errorResponse('VALIDATION_ERROR', error.message, { fields: error.fields });
      }
      if (error instanceof z.ZodError) {
        return errorResponse('VALIDATION_ERROR', '프로필 형식이 올바르지 않습니다.', {
          issues: error.issues,
        });
      }
      throw error;
    }
  }

  const posting = await prisma.posting.findUnique({
    where: { id: parsedBody.data.postingId },
    include: { workplace: true },
  });
  if (posting == null) return errorResponse('NOT_FOUND', '공고를 찾을 수 없습니다.');

  const context = buildContext();
  const commuteMinutes = profile == null ? null : await lookupCommuteMinutes(profile, posting.workplace);
  const rules = await loadRulesFor(profile, context);

  const result = evaluateEligibility(
    toPostingFacts(posting, commuteMinutes),
    profile,
    rules,
    context,
  );

  return NextResponse.json({
    ...localizeResult(result, locale),
    brokerageNotice: brokerageNotice(profile, locale),
  });
}
