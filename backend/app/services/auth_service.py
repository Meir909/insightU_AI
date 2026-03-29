from __future__ import annotations

from uuid import uuid4

from fastapi import HTTPException, status

from app.models import Account, AuthSession, CandidateProfile, CommitteeMember, InterviewSession
from app.schemas import CandidateRegisterRequest, CommitteeRegisterRequest, LoginRequest
from app.security import generate_session_token, hash_password, now_utc, session_expiry, validate_committee_access_key, verify_password
from app.services.repository import get_store


def _candidate_code(existing_count: int) -> str:
    return f"IU-{str(existing_count + 2401).zfill(4)}"


def register_candidate(payload: CandidateRegisterRequest) -> tuple[Account, AuthSession]:
    store = get_store()

    def mutate(state):
        if any(account.phone == payload.phone for account in state.accounts if account.role == "candidate"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Candidate account already exists")

        if payload.email and any(account.email == payload.email for account in state.accounts):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is already used")

        timestamp = now_utc()
        candidate = CandidateProfile(
            id=f"cand-{uuid4().hex[:8]}",
            code=_candidate_code(len(state.candidates)),
            name=payload.name,
            email=payload.email,
            phone=payload.phone,
            created_at=timestamp,
            updated_at=timestamp,
        )
        account = Account(
            id=f"acct-{uuid4().hex[:10]}",
            role="candidate",
            name=payload.name,
            email=payload.email,
            phone=payload.phone,
            password_hash=hash_password(payload.password),
            entity_id=candidate.id,
            created_at=timestamp,
            updated_at=timestamp,
        )
        interview = InterviewSession(
            id=f"eval-{uuid4().hex[:10]}",
            candidate_id=candidate.id,
            account_id=account.id,
            created_at=timestamp,
            updated_at=timestamp,
        )
        auth_session = AuthSession(
            token=generate_session_token(),
            account_id=account.id,
            role="candidate",
            created_at=timestamp,
            expires_at=session_expiry(),
        )

        state.candidates.append(candidate)
        state.accounts.append(account)
        state.interview_sessions.append(interview)
        state.auth_sessions.append(auth_session)
        return account, auth_session

    return store.update(mutate)


def register_committee(payload: CommitteeRegisterRequest) -> tuple[Account, AuthSession]:
    if not validate_committee_access_key(payload.access_key):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid committee access key")

    store = get_store()

    def mutate(state):
        if any(account.email == payload.email for account in state.accounts if account.role == "committee"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Committee account already exists")

        timestamp = now_utc()
        member = CommitteeMember(
            id=f"cm-{uuid4().hex[:8]}",
            name=payload.name,
            email=payload.email,
            created_at=timestamp,
        )
        account = Account(
            id=f"acct-{uuid4().hex[:10]}",
            role="committee",
            name=payload.name,
            email=payload.email,
            password_hash=hash_password(payload.password),
            entity_id=member.id,
            created_at=timestamp,
            updated_at=timestamp,
        )
        auth_session = AuthSession(
            token=generate_session_token(),
            account_id=account.id,
            role="committee",
            created_at=timestamp,
            expires_at=session_expiry(),
        )

        state.committee_members.append(member)
        state.accounts.append(account)
        state.auth_sessions.append(auth_session)
        return account, auth_session

    return store.update(mutate)


def login(payload: LoginRequest) -> tuple[Account, AuthSession]:
    store = get_store()

    def mutate(state):
        account = next(
            (
                item
                for item in state.accounts
                if item.role == payload.role
                and (
                    item.email == payload.identifier
                    or item.phone == payload.identifier
                )
            ),
            None,
        )
        if not account or not verify_password(payload.password, account.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

        auth_session = AuthSession(
            token=generate_session_token(),
            account_id=account.id,
            role=account.role,
            created_at=now_utc(),
            expires_at=session_expiry(),
        )
        state.auth_sessions = [session for session in state.auth_sessions if session.account_id != account.id]
        state.auth_sessions.append(auth_session)
        return account, auth_session

    return store.update(mutate)


def get_account_by_token(token: str) -> Account | None:
    state = get_store().load()
    session = next((item for item in state.auth_sessions if item.token == token), None)
    if not session:
        return None
    return next((item for item in state.accounts if item.id == session.account_id), None)
