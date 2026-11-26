import { decisionReceiptFromRows, reviewSummary } from "@/lib/decisions/publication";
import { committeeOperationsEnabled } from "@/lib/auth/committee-policy";
import { verifyPilotModeration } from "@/lib/auth/committee-admin";
import { sourceCaptureSummary, verifySourceProposal } from "@/lib/archive/source-proposals";
import { createHash } from "node:crypto";
import { Prisma, type ArchiveComment } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import type { SessionPayload } from "@/lib/auth/guards";
import { isDemoAccount } from "@/lib/auth/email-policy";
import { isVerifiedPilotAccount, publicPilotRequested, publicPilotScope, participantPublicationMode } from "@/lib/auth/public-pilot-policy";
import type { DiscussionComment, DiscussionPolicy, DiscussionParticipation } from "@/components/proposal-discussion";

import { debitParticipationCreditsAtCurrentPrice, usesDemoCredits } from "@/lib/services/participation-credits";
import type { ProposalParticipationBoard, ProposalParticipation } from "@/lib/domain/proposal-participation";
import { appendArchiveActivity, initializeArchiveActivity } from "@/lib/services/archive-activity";
import { sha256, utf8, verifyArchivePackage, decodeFile } from "@/lib/archive/format";
import { abandonmentInclude, abandonmentView } from "./proposal-lifecycle";
import { recordDiscussionNotification } from "./discussion-notifications";

export class ArchiveDiscussionError extends Error {
  constructor(public readonly code: string, public readonly status: number) { super(code); }
}
const fail = (code: string, status = 400): never => { throw new ArchiveDiscussionError(code, status); };
const commentSchema = z.object({ body: z.string().trim().min(1).max(4000), parentId: z.string().max(128).nullable().optional(), requestKey: z.string().uuid(), policyVersion: z.number().int().positive().max(2147483647).optional() }).strict();
const reactionSchema = z.object({ version: z.number().int().min(1).max(50).optional(), liked: z.boolean(), requestKey: z.string().uuid(), policyVersion: z.number().int().positive().max(2147483647).optional() }).strict();
const changeSchema = z.object({ version: z.number().int().min(1).max(50), requestKey: z.string().uuid(), body: z.string().trim().min(1).max(4000).optional() }).strict();
type DiscussionAction = "post" | "hide" | "reaction" | "edit" | "withdraw";
type Tx = Prisma.TransactionClient;
type ReactionState = { replayLiked: boolean | null; recentCount: bigint; liked: boolean | null; chargedBefore: boolean | null };

async function access(tx: Tx, communityId: string, recordId: string, session: SessionPayload | null, moderationToken?: string) {
  const archive = await tx.proposalArchive.findFirst({ where: { communityId, recordId, revisions: { some: {} } } });
  if (!archive) return fail("PROPOSAL_NOT_FOUND", 404);
  const user = session?.subjectType === "user" ? await tx.user.findFirst({ where: { id: session.userId, status: "ACTIVE" }, select: { id: true, email: true, emailVerifiedAt: true, displayName: true, shareProfileInDiscussion: true } }) : null;
  const creditCommunityId = archive.committeeId ?? communityId;
  const manager = user && !publicPilotRequested() ? await tx.communityMembership.findFirst({ where: { communityId: creditCommunityId, userId: user.id, status: "ACTIVE", role: { in: ["OWNER", "MANAGER", ...(archive.committeeId ? ["MODERATOR" as const] : [])] } } }) : null;
  const pseudonym = user ? `Participant ${createHash("sha256").update(`${archive.id}:${user.id}`).digest("hex").slice(0, 6)}` : "Visitor";
  const pilot = publicPilotRequested() ? publicPilotScope() : null;
  const canPost = Boolean(user && (!publicPilotRequested() || pilot?.hostId === communityId && pilot.committeeId === archive.committeeId && isVerifiedPilotAccount(user)));
  const pilotModerator = canPost && await verifyPilotModeration(user?.id, communityId, archive.committeeId, moderationToken, tx);
  return { archive, creditCommunityId, user, label: user?.shareProfileInDiscussion && user.displayName ? user.displayName : pseudonym, canPost, canModerate: Boolean(pilotModerator || (!publicPilotRequested() && manager && user && !isDemoAccount(user.id) && (!archive.committeeId || committeeOperationsEnabled()))) };
}

async function commentViews(tx: Tx, rows: ArchiveComment[], userId?: string): Promise<DiscussionComment[]> {
  if (!rows.length) return [];
  const visibleIds = rows.filter(row => !row.hiddenAt && !row.withdrawnAt).map(row => row.id);
  const [profiles, counts, mine, versions] = await Promise.all([
    tx.user.findMany({ where: { id: { in: [...new Set(rows.map(row => row.authorId))] } }, select: { id: true, displayName: true, avatarUrl: true, shareProfileInDiscussion: true, status: true } }),
    tx.archiveReaction.groupBy({ by: ["commentId", "version"], where: { commentId: { in: visibleIds }, liked: true }, _count: { _all: true } }),
    userId ? tx.archiveReaction.findMany({ where: { commentId: { in: visibleIds }, userId }, select: { commentId: true, version: true, liked: true, chargedBefore: true } }) : [],
    tx.archiveCommentVersion.findMany({ where: { OR: rows.map(row => ({ commentId: row.id, version: row.currentVersion })) } })
  ]);
  const profileById = new Map(profiles.map(profile => [profile.id, profile]));
  const countById = new Map(counts.map(count => [`${count.commentId}:${count.version}`, count._count._all]));
  const versionById = new Map(versions.map(version => [version.commentId, version]));
  return rows.map(row => {
  const profile = profileById.get(row.authorId);
  const version = versionById.get(row.id);
  const reaction = mine.find(item => item.commentId === row.id && item.version === row.currentVersion);
  const shared = profile?.status === "ACTIVE" && profile.shareProfileInDiscussion;
  const pseudonym = `Participant ${createHash("sha256").update(`${row.archiveId}:${row.authorId}`).digest("hex").slice(0, 6)}`;
  return { id: row.id, parentId: row.parentId, authorLabel: shared && profile.displayName ? profile.displayName : pseudonym, authorAvatarUrl: shared ? profile.avatarUrl : null,
    createdAt: row.createdAt.toISOString(), body: row.hiddenAt || row.withdrawnAt ? null : version?.body ?? row.body, hidden: Boolean(row.hiddenAt),
    version: row.currentVersion, editedAt: row.currentVersion > 1 ? version?.createdAt.toISOString() ?? null : null, withdrawn: Boolean(row.withdrawnAt),
    canEdit: row.authorId === userId && !row.hiddenAt && !row.withdrawnAt && row.currentVersion < 50, canWithdraw: row.authorId === userId && !row.hiddenAt && !row.withdrawnAt,
    moderation: row.hiddenAt ? { reason: row.hideReason!, moderatorLabel: "Moderator", hiddenAt: row.hiddenAt.toISOString() } : null,
    reaction: { count: countById.get(`${row.id}:${row.currentVersion}`) ?? 0, likedByMe: reaction?.liked ?? false, chargedBefore: reaction?.chargedBefore ?? false } };
  });
}

async function commentView(tx: Tx, row: ArchiveComment, userId?: string) {
  return (await commentViews(tx, [row], userId))[0];
}

async function serializable<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 4; attempt++) {
    try { return await db.$transaction(fn, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 }); }
    catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2034", "P2002"].includes(error.code)) continue;
      throw error;
    }
  }
  return fail("CONCURRENT_UPDATE", 409);
}

type ArchiveDiscussionRead = { comments: DiscussionComment[]; capabilities: { canPost: boolean; canReact: boolean; canModerate: boolean }; policy: DiscussionPolicy };
export function readArchiveDiscussion(communityId: string, recordId: string, session: SessionPayload | null, moderationToken?: string): Promise<ArchiveDiscussionRead & { proposal: ProposalParticipation }>;
export function readArchiveDiscussion(communityId: string, recordId: string, session: SessionPayload | null, moderationToken: string | undefined, includeProposal: false): Promise<ArchiveDiscussionRead>;
export async function readArchiveDiscussion(communityId: string, recordId: string, session: SessionPayload | null, moderationToken?: string, includeProposal = true) {
  return db.$transaction(async tx => {
    const actor = await access(tx, communityId, recordId, session, moderationToken);
    const rows = await tx.archiveComment.findMany({ where: { archiveId: actor.archive.id }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], take: 500 });
    const policy: DiscussionPolicy = { visibility: "PUBLIC", immutable: true, versioned: true, maxLength: 4000, readOnly: false, participation: await participationView(tx, actor.creditCommunityId, actor.user?.id) };
    return { comments: await commentViews(tx, rows, actor.user?.id),
      capabilities: { canPost: actor.canPost && rows.length < 500, canReact: actor.canPost, canModerate: actor.canModerate }, policy,
      ...(includeProposal ? { proposal: await proposalView(tx, actor.archive, actor.user?.id) } : {}) };
  });
}

export function mutateArchiveDiscussion(communityId: string, recordId: string, session: SessionPayload, action: DiscussionAction, input: unknown, commentId?: string, moderationToken?: string): Promise<DiscussionComment>;
export function mutateArchiveDiscussion(communityId: string, recordId: string, session: SessionPayload, action: DiscussionAction, input: unknown, commentId: string | undefined, moderationToken: string | undefined, includeParticipation: true): Promise<{ comment: DiscussionComment; participation: DiscussionParticipation }>;
export async function mutateArchiveDiscussion(communityId: string, recordId: string, session: SessionPayload, action: DiscussionAction, input: unknown, commentId?: string, moderationToken?: string, includeParticipation = false) {
  return serializable(async tx => {
    const actor = await access(tx, communityId, recordId, session, action === "hide" ? moderationToken : undefined);
    if (!actor.user || !actor.canPost) return fail("forbidden", 403);
    const userId = actor.user.id;
    let freshParticipation: DiscussionParticipation | undefined;
    const result = async (comment: DiscussionComment) => includeParticipation
      ? { comment, participation: freshParticipation ?? await participationView(tx, actor.creditCommunityId, userId) }
      : comment;
    await initializeArchiveActivity(tx, actor.archive);
    if (action === "post") {
      const parsed = commentSchema.safeParse(input); if (!parsed.success) return fail("INVALID_COMMENT_INPUT");
      const data = parsed.data, parentId = data.parentId ?? null;
      const existing = await tx.archiveComment.findUnique({ where: { archiveId_authorId_requestKey: { archiveId: actor.archive.id, authorId: userId, requestKey: data.requestKey } } });
      if (existing) { if (existing.body !== data.body || existing.parentId !== parentId) return fail("COMMENT_IDEMPOTENCY_CONFLICT", 409); return result(await commentView(tx, existing, userId)); }
      if (await tx.archiveComment.count({ where: { archiveId: actor.archive.id } }) >= 500) return fail("DISCUSSION_READ_ONLY", 409);
      if (await tx.archiveComment.count({ where: { authorId: userId, createdAt: { gt: new Date(Date.now() - 60000) } } }) >= 5) return fail("COMMENT_RATE_LIMIT", 429);
      let replyRecipientId: string | undefined;
      if (parentId) {
        const parent = await tx.archiveComment.findFirst({ where: { id: parentId, archiveId: actor.archive.id, hiddenAt: null, withdrawnAt: null } });
        if (!parent) return fail("PARENT_COMMENT_NOT_FOUND", 404);
        replyRecipientId = parent.authorId;
      }
      const debit = await debitParticipationCreditsAtCurrentPrice(tx, { communityId: actor.creditCommunityId, userId, kind: "COMMENT", targetType: "ARCHIVE", targetId: actor.archive.id,
        policyVersion: data.policyVersion,
        requestKey: `archive-comment:${hash({ archiveId: actor.archive.id, requestKey: data.requestKey })}`,
        payloadHash: hash({ archiveId: actor.archive.id, body: data.body, parentId }) });
      freshParticipation = debit.participation;
      const row = await tx.archiveComment.create({ data: { archiveId: actor.archive.id, authorId: userId, authorLabel: actor.label, body: data.body, parentId, requestKey: data.requestKey } });
      await tx.archiveCommentVersion.createMany({ data: [{ commentId: row.id, version: 1, body: row.body, bodyHash: await sha256(utf8(row.body)), requestKey: row.requestKey, createdAt: row.createdAt }], skipDuplicates: true });
      await appendArchiveActivity(tx, actor.archive, userId, `comment:${row.id}`, { kind: "COMMENT_POSTED", commentId: row.id, parentId, bodyHash: await sha256(utf8(row.body)) }, row.createdAt);
      if (replyRecipientId) await recordDiscussionNotification(tx, { kind: "COMMENT_REPLIED", recipientId: replyRecipientId, actorId: userId, commentId: row.id, createdAt: row.createdAt });
      return result(await commentView(tx, row, userId));
    }
    const row = await tx.archiveComment.findFirst({ where: { id: commentId, archiveId: actor.archive.id } });
    if (!row || !commentId) return fail("COMMENT_NOT_FOUND", 404);
    if (action === "hide") {
      if (!actor.canModerate) return fail("forbidden", 403);
      const parsed = z.object({ reason: z.string().trim().min(1).max(500) }).strict().safeParse(input);
      if (!parsed.success) return fail("INVALID_MODERATION_INPUT");
      if (row.hiddenAt) return result(await commentView(tx, row, userId));
      const hiddenAt = new Date();
      const hidden = await tx.archiveComment.update({ where: { id: row.id }, data: { hiddenAt, hiddenById: userId, hiddenByLabel: actor.label, hideReason: parsed.data.reason } });
      await appendArchiveActivity(tx, actor.archive, userId, `hide:${row.id}`, { kind: "COMMENT_HIDDEN", commentId: row.id, reason: parsed.data.reason }, hiddenAt);
      return result(await commentView(tx, hidden, userId));
    }
    if (action === "edit" || action === "withdraw") {
      if (row.authorId !== userId) return fail("forbidden", 403);
      const parsed = changeSchema.safeParse(input); if (!parsed.success) return fail("INVALID_COMMENT_INPUT");
      const data = parsed.data;
      if (action === "edit") {
        if (!data.body) return fail("INVALID_COMMENT_INPUT");
        const replay = await tx.archiveCommentVersion.findUnique({ where: { commentId_requestKey: { commentId, requestKey: data.requestKey } } });
        if (replay) {
          if (replay.version !== data.version + 1 || replay.body !== data.body) return fail("COMMENT_IDEMPOTENCY_CONFLICT", 409);
          return result(await commentView(tx, row, userId));
        }
      } else {
        if (data.body !== undefined) return fail("INVALID_COMMENT_INPUT");
        if (row.withdrawalKey === data.requestKey && row.currentVersion === data.version) return result(await commentView(tx, row, userId));
      }
      if (row.hiddenAt || row.withdrawnAt) return fail("COMMENT_UNAVAILABLE", 409);
      if (row.currentVersion !== data.version) return fail("COMMENT_VERSION_CHANGED", 409);
      const current = await tx.archiveCommentVersion.findUniqueOrThrow({ where: { commentId_version: { commentId, version: data.version } } });
      const at = new Date();
      if (action === "withdraw") {
        const withdrawn = await tx.archiveComment.update({ where: { id: commentId }, data: { withdrawnAt: at, withdrawalKey: data.requestKey } });
        await tx.discussionNotification.updateMany({ where: { commentId, withdrawnAt: null }, data: { withdrawnAt: at } });
        await appendArchiveActivity(tx, actor.archive, userId, `withdraw:${commentId}`, { kind: "COMMENT_WITHDRAWN", commentId, version: data.version, bodyHash: current.bodyHash }, at);
        return result(await commentView(tx, withdrawn, userId));
      }
      if (row.currentVersion >= 50) return fail("COMMENT_VERSION_LIMIT", 409);
      if (await tx.archiveCommentVersion.count({ where: { comment: { authorId: userId }, version: { gt: 1 }, createdAt: { gt: new Date(Date.now() - 60000) } } }) >= 5) return fail("COMMENT_RATE_LIMIT", 429);
      if (data.body === current.body) return fail("COMMENT_UNCHANGED", 409);
      const version = await tx.archiveCommentVersion.create({ data: { commentId, version: data.version + 1, body: data.body!, bodyHash: await sha256(utf8(data.body!)), previousBodyHash: current.bodyHash, requestKey: data.requestKey, createdAt: at } });
      const edited = await tx.archiveComment.update({ where: { id: commentId }, data: { currentVersion: version.version } });
      // A like notification must not suggest endorsement of the replacement text.
      await tx.discussionNotification.updateMany({ where: { commentId, kind: "COMMENT_LIKED", withdrawnAt: null }, data: { withdrawnAt: at } });
      await appendArchiveActivity(tx, actor.archive, userId, `edit:${version.id}`, { kind: "COMMENT_EDITED", commentId, version: version.version, bodyHash: version.bodyHash, previousBodyHash: current.bodyHash }, at);
      return result(await commentView(tx, edited, userId));
    }
    if (row.hiddenAt) return fail("COMMENT_ALREADY_HIDDEN", 409);
    const parsed = reactionSchema.safeParse(input); if (!parsed.success) return fail("INVALID_REACTION_INPUT");
    const { liked, requestKey } = parsed.data;
    const version = parsed.data.version ?? 1;
    if (row.withdrawnAt) return fail("COMMENT_UNAVAILABLE", 409);
    // These reads share the serializable snapshot and require one network trip.
    const [reaction] = await tx.$queryRaw<(ReactionState & { replayVersion: number | null })[]>`
      SELECT (SELECT "liked" FROM "ArchiveReactionRequest" WHERE "commentId" = ${commentId} AND "userId" = ${userId} AND "requestKey" = ${requestKey}) AS "replayLiked",
        (SELECT "version" FROM "ArchiveReactionRequest" WHERE "commentId" = ${commentId} AND "userId" = ${userId} AND "requestKey" = ${requestKey}) AS "replayVersion",
        (SELECT COUNT(*) FROM "ArchiveReactionRequest" WHERE "userId" = ${userId} AND "createdAt" > ${new Date(Date.now() - 60000)}) AS "recentCount",
        reaction."liked", reaction."chargedBefore"
      FROM (SELECT 1) AS singleton
      LEFT JOIN "ArchiveReaction" AS reaction ON reaction."commentId" = ${commentId} AND reaction."userId" = ${userId} AND reaction."version" = ${version}`;
    if (reaction.replayLiked !== null) { if (reaction.replayLiked !== liked || reaction.replayVersion !== version) return fail("REACTION_IDEMPOTENCY_CONFLICT", 409); return result(await commentView(tx, row, userId)); }
    if (version !== row.currentVersion) return fail("COMMENT_VERSION_CHANGED", 409);
    if (reaction.recentCount >= 30n) return fail("REACTION_RATE_LIMIT", 429);
    let chargedBefore = reaction?.chargedBefore ?? false;
    if (liked && !reaction?.liked && !chargedBefore) {
      const debit = await debitParticipationCreditsAtCurrentPrice(tx, { communityId: actor.creditCommunityId, userId, kind: "REACTION", targetType: "ARCHIVE_COMMENT", targetId: commentId,
        policyVersion: parsed.data.policyVersion,
        requestKey: `archive-reaction:${commentId}${version === 1 ? "" : `:v${version}`}`, payloadHash: hash({ archiveId: actor.archive.id, commentId, userId, ...(version > 1 ? { version } : {}) }) });
      chargedBefore = Boolean(debit.operationId);
      freshParticipation = debit.participation;
    }
    const recorded = await tx.archiveReactionRequest.create({ data: { commentId, userId, requestKey, liked, version } });
    await tx.archiveReaction.upsert({ where: { commentId_userId_version: { commentId, userId, version } }, create: { commentId, userId, version, liked, chargedBefore }, update: { liked, chargedBefore } });
    await appendArchiveActivity(tx, actor.archive, userId, `comment-like:${recorded.id}`, { kind: "COMMENT_LIKE_SET", commentId, liked, version }, recorded.createdAt);
    if (!liked || !reaction?.liked) await recordDiscussionNotification(tx, { kind: "COMMENT_LIKED", recipientId: row.authorId, actorId: userId, commentId, createdAt: recorded.createdAt }, liked);
    return result(await commentView(tx, row, userId));
  });
}


const hash = (value: Record<string, unknown>) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

async function participationView(tx: Tx, communityId: string, userId?: string): Promise<DiscussionParticipation> {
  // Every caller resolved this credit scope from a published archive and an
  // active user. Read the scoped policy and account together, without repeating
  // the general credit-access query for each opened discussion.
  const community = await tx.community.findUnique({ where: { id: communityId },
    select: { id: true, name: true, kind: true, participationMode: true, commentCost: true, reactionCost: true, participationPolicyVersion: true,
      creditAccounts: { where: { userId: userId ?? "" }, take: 1, select: { balance: true, paymentReview: true } } } });
  if (!community) return fail("COMMUNITY_NOT_FOUND", 404);
  const creditScope = { id: community.id, name: community.name, kind: community.kind };
  if (userId) {
    const account = community.creditAccounts[0];
    return { communityId, creditScope, mode: community.participationMode, commentCost: community.commentCost, reactionCost: community.reactionCost,
      version: community.participationPolicyVersion, availableCredits: account?.balance ?? 0, sandbox: usesDemoCredits(community), sponsored: false, paymentReview: account?.paymentReview ?? false };
  }
  return { communityId, creditScope, mode: community.participationMode, commentCost: community.commentCost, reactionCost: community.reactionCost,
    version: community.participationPolicyVersion, availableCredits: null, sandbox: usesDemoCredits(community), sponsored: false };
}

async function proposalView(tx: Tx, archive: { id: string; recordId: string; title: string; labels?: string[] }, userId?: string, recordedReaction?: { liked: boolean; chargedBefore: boolean }): Promise<ProposalParticipation> {
  const [counts, mine] = await Promise.all([
    tx.proposalArchive.findUniqueOrThrow({ where: { id: archive.id }, select: { _count: { select: { likes: { where: { liked: true } }, comments: { where: { hiddenAt: null, withdrawnAt: null } } } } } }),
    recordedReaction ?? (userId ? tx.archiveProposalLike.findUnique({ where: { archiveId_userId: { archiveId: archive.id, userId } } }) : null)
  ]);
  return { recordId: archive.recordId, title: archive.title, labels: archive.labels ?? [], likes: counts._count.likes, commentCount: counts._count.comments, likedByMe: mine?.liked ?? false, chargedBefore: mine?.chargedBefore ?? false };
}

/** Public counts and prices; only the current active account's balance and likes. */
export async function readProposalParticipationBoard(communityId: string, session: SessionPayload | null): Promise<ProposalParticipationBoard> {
  return db.$transaction(async tx => {
    const records = await tx.proposalArchive.findMany({ where: { communityId, revisions: { some: {} } }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: { id: true, recordId: true, title: true, committeeId: true, labels: true, abandonment: { include: abandonmentInclude }, revisions: { orderBy: { revision: "desc" }, take: 1, select: { packageJson: true, manifestHash: true, decision: { include: { ballots: true } } } } } });
    const scopes = new Set(records.map(record => record.committeeId ?? communityId));
    if (scopes.size > 1) return fail("PROPOSAL_SCOPE_MISMATCH", 409);
    const creditCommunityId = records[0]?.committeeId ?? communityId;
    const user = session?.subjectType === "user" ? await tx.user.findFirst({ where: { id: session.userId, status: "ACTIVE" }, select: { id: true, email: true, emailVerifiedAt: true } }) : null;
    const ids = records.map(record => record.id);
    const [likes, comments, mine] = await Promise.all([
      tx.archiveProposalLike.groupBy({ by: ["archiveId"], where: { archiveId: { in: ids }, liked: true }, _count: { _all: true } }),
      tx.archiveComment.groupBy({ by: ["archiveId"], where: { archiveId: { in: ids }, hiddenAt: null, withdrawnAt: null }, _count: { _all: true } }),
      user ? tx.archiveProposalLike.findMany({ where: { archiveId: { in: ids }, userId: user.id } }) : []
    ]);
    const pilot = publicPilotRequested() ? publicPilotScope() : null;
    const canParticipate = Boolean(user && (!publicPilotRequested() || pilot?.hostId === communityId && pilot.committeeId === creditCommunityId && isVerifiedPilotAccount(user)));
    return { publicationMode: participantPublicationMode(), canParticipate, participation: records.length ? await participationView(tx, creditCommunityId, user?.id) : null,
      proposals: await Promise.all(records.map(async record => ({ recordId: record.recordId, title: record.title, labels: record.labels, review: record.revisions[0]?.decision ? reviewSummary(await decisionReceiptFromRows(record.revisions[0].decision, JSON.parse(record.revisions[0].packageJson))) : null, ...(await sourceCaptureView(record.revisions?.[0])), abandonment: await abandonmentView(record.abandonment), likes: likes.find(row => row.archiveId === record.id)?._count._all ?? 0,
        commentCount: comments.find(row => row.archiveId === record.id)?._count._all ?? 0,
        likedByMe: mine.some(row => row.archiveId === record.id && row.liked), chargedBefore: mine.some(row => row.archiveId === record.id && row.chargedBefore) }))) };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}

type SourceCaptureRevision = { packageJson: string; manifestHash: string };

async function computeSourceCaptureView(revision: SourceCaptureRevision) {
  const bundle = JSON.parse(revision.packageJson);
  const kind = JSON.parse(bundle.manifest).kind;
  if (kind === "NATIVE_PROPOSAL") {
    const checked = await verifyArchivePackage(bundle, revision.manifestHash);
    const file = checked.bundle.files.find(file => file.path === "application.json");
    if (!file) throw new Error("NATIVE_APPLICATION_MISSING");
    const application = z.object({ applicant: z.string(), requestedAmountUsd: z.string(), submittedAt: z.string().datetime(),
      publication: z.enum(["PILOT_DEMO", "COMMUNITY_PUBLICATION"]) }).parse(JSON.parse(new TextDecoder().decode(decodeFile(file))));
    return { application };
  }
  if (kind !== "SOURCE_PROPOSAL") return {};
  // The board needs only the latest status; full source evidence loads with its selected revision.
  return sourceCaptureSummary(await verifySourceProposal(bundle, revision.manifestHash));
}

type SourceCaptureView = Awaited<ReturnType<typeof computeSourceCaptureView>>;

const SOURCE_CAPTURE_CACHE_MAX = 500;
const SOURCE_CAPTURE_CACHE_TTL_MS = 10 * 60_000;
const sourceCaptureCache = new Map<string, { value: SourceCaptureView; expiresAt: number }>();

async function sourceCaptureView(revision?: SourceCaptureRevision): Promise<SourceCaptureView> {
  if (!revision) return {};
  const cached = sourceCaptureCache.get(revision.manifestHash);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const value = await computeSourceCaptureView(revision);
  if (sourceCaptureCache.size >= SOURCE_CAPTURE_CACHE_MAX) {
    const oldest = sourceCaptureCache.keys().next().value;
    if (oldest !== undefined) sourceCaptureCache.delete(oldest);
  }
  sourceCaptureCache.set(revision.manifestHash, { value, expiresAt: Date.now() + SOURCE_CAPTURE_CACHE_TTL_MS });
  return value;
}

export async function setArchiveProposalLike(communityId: string, recordId: string, session: SessionPayload, input: unknown) {
  const parsed = reactionSchema.safeParse(input); if (!parsed.success) return fail("INVALID_REACTION_INPUT");
  return serializable(async tx => {
    const actor = await access(tx, communityId, recordId, session);
    if (!actor.user || !actor.canPost) return fail("forbidden", 403);
    const archiveId = actor.archive.id, userId = actor.user.id;
    await initializeArchiveActivity(tx, actor.archive);
    const { liked, requestKey, policyVersion } = parsed.data;
    let recordedReaction: { liked: boolean; chargedBefore: boolean } | undefined;
    let freshParticipation: DiscussionParticipation | undefined;
    const [reaction] = await tx.$queryRaw<ReactionState[]>`
      SELECT (SELECT "liked" FROM "ArchiveProposalLikeRequest" WHERE "archiveId" = ${archiveId} AND "userId" = ${userId} AND "requestKey" = ${requestKey}) AS "replayLiked",
        (SELECT COUNT(*) FROM "ArchiveProposalLikeRequest" WHERE "userId" = ${userId} AND "createdAt" > ${new Date(Date.now() - 60000)}) AS "recentCount",
        reaction."liked", reaction."chargedBefore"
      FROM (SELECT 1) AS singleton
      LEFT JOIN "ArchiveProposalLike" AS reaction ON reaction."archiveId" = ${archiveId} AND reaction."userId" = ${userId}`;
    if (reaction.replayLiked !== null) {
      if (reaction.replayLiked !== liked) return fail("REACTION_IDEMPOTENCY_CONFLICT", 409);
    } else {
      if (reaction.recentCount >= 30n) return fail("REACTION_RATE_LIMIT", 429);
      let chargedBefore = reaction?.chargedBefore ?? false;
      if (liked && !reaction?.liked && !chargedBefore) {
        const debit = await debitParticipationCreditsAtCurrentPrice(tx, { communityId: actor.creditCommunityId, userId, kind: "REACTION", targetType: "ARCHIVE", targetId: archiveId,
          policyVersion, requestKey: `archive-like:${archiveId}`, payloadHash: hash({ archiveId, userId }) });
        chargedBefore = Boolean(debit.operationId);
        freshParticipation = debit.participation;
      }
      recordedReaction = await tx.archiveProposalLike.upsert({ where: { archiveId_userId: { archiveId, userId } }, create: { archiveId, userId, liked, chargedBefore }, update: { liked, chargedBefore }, select: { liked: true, chargedBefore: true } });
      const recorded = await tx.archiveProposalLikeRequest.create({ data: { archiveId, userId, liked, requestKey } });
      await appendArchiveActivity(tx, actor.archive, userId, `proposal-like:${recorded.id}`, { kind: "PROPOSAL_LIKE_SET", liked }, recorded.createdAt);
    }
    return { proposal: await proposalView(tx, actor.archive, userId, recordedReaction), participation: freshParticipation ?? await participationView(tx, actor.creditCommunityId, userId) };
  });
}

/** Author withdrawal preserves public versions; moderation suppresses their text. */
export async function readArchiveCommentHistory(communityId: string, recordId: string, commentId: string) {
  return db.$transaction(async tx => {
    const row = await tx.archiveComment.findFirst({ where: { id: commentId, archive: { communityId, recordId, revisions: { some: {} } } }, include: { versions: { orderBy: { version: "desc" }, take: 50 } } });
    if (!row) return fail("COMMENT_NOT_FOUND", 404);
    const counts = await tx.archiveReaction.groupBy({ by: ["version"], where: { commentId, liked: true }, _count: { _all: true } });
    return { commentId, currentVersion: row.currentVersion, withdrawnAt: row.withdrawnAt?.toISOString() ?? null,
      versions: row.versions.map(version => ({ version: version.version, body: row.hiddenAt ? null : version.body, bodyHash: version.bodyHash,
        previousBodyHash: version.previousBodyHash, createdAt: version.createdAt.toISOString(), likes: counts.find(item => item.version === version.version)?._count._all ?? 0 })) };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}
