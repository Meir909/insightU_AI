import { envFlags } from "@/lib/env";
import * as fileStore from "@/lib/server/data-store";
import * as supabaseStore from "@/lib/server/supabase-store";

const store = envFlags.supabase ? supabaseStore : fileStore;

export const registerCandidateProfile = store.registerCandidateProfile;
export const registerCommitteeMember = store.registerCommitteeMember;
export const resolveCommitteeMember = store.resolveCommitteeMember;
export const getPersistedSessionByAuthSession = store.getPersistedSessionByAuthSession;
export const getOrCreatePersistedEvaluationSession = store.getOrCreatePersistedEvaluationSession;
export const saveInterviewState = store.saveInterviewState;
export const getPersistedCandidates = store.getPersistedCandidates;
export const getPersistedCandidate = store.getPersistedCandidate;
export const getPersistedShortlist = store.getPersistedShortlist;
export const recordCommitteeVote = store.recordCommitteeVote;
export const persistUploadedArtifactMeta = store.persistUploadedArtifactMeta;
export const saveUploadedBinary = store.saveUploadedBinary;
