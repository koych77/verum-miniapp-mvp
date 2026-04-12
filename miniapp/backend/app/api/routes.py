import hashlib
import hmac
import json
import secrets
import smtplib
from datetime import date
from email.message import EmailMessage
from urllib.parse import parse_qsl

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.db.session import get_db
from app.models.entities import AuditLog, Event, EventRegistration, EventResult, News, Partner, Participant, RatingSnapshot, User
from app.schemas.common import (
    AdminActivityOut,
    AdminOverviewOut,
    AdminRecentRegistrationOut,
    AdminStatsOut,
    AuthOut,
    AuthStatusOut,
    DisciplineOut,
    EmailSendIn,
    EmailVerifyIn,
    EventOut,
    EventResultOut,
    NewsOut,
    ParticipantHistoryItemOut,
    ParticipantPrivateOut,
    ParticipantPublicOut,
    ParticipantSummaryOut,
    ParticipantUpdateIn,
    PartnerOut,
    RatingItemOut,
    RegisterEventIn,
    TelegramInitIn,
)
from app.services.bootstrap import compute_age, event_registration_open

router = APIRouter(prefix="/api/v1")
EMAIL_CODES: dict[str, str] = {}
TOKENS: dict[str, str] = {}


def _json_payload(payload: object) -> str:
    return json.dumps(payload, ensure_ascii=False, default=str)


def _participant_public(participant: Participant) -> ParticipantPublicOut:
    return ParticipantPublicOut(
        verum_global_id=participant.verum_global_id,
        first_name=participant.first_name,
        last_name=participant.last_name,
        nickname=participant.nickname,
        age=compute_age(participant.birth_date),
        gender=participant.gender,
        city=participant.city,
        team=participant.team,
        coach_name=participant.coach_name,
        school_name=participant.school_name,
        photo_url=participant.photo_url,
    )


def _participant_summary(participant: Participant) -> ParticipantSummaryOut:
    return ParticipantSummaryOut(
        verum_global_id=participant.verum_global_id,
        full_name=f"{participant.first_name} {participant.last_name}",
        nickname=participant.nickname,
        gender=participant.gender,
        city=participant.city,
        team=participant.team,
        school_name=participant.school_name,
        photo_url=participant.photo_url,
    )


def _rating_item(snapshot: RatingSnapshot, participant: Participant) -> RatingItemOut:
    return RatingItemOut(
        rank=snapshot.rank_global or 0,
        verum_global_id=participant.verum_global_id,
        full_name=f"{participant.first_name} {participant.last_name}",
        nickname=participant.nickname,
        city=participant.city,
        team=participant.team,
        gender=participant.gender,
        points=snapshot.total_points,
    )


def _history_item(result: EventResult, event: Event | None) -> ParticipantHistoryItemOut:
    return ParticipantHistoryItemOut(
        event_title=event.title if event else "",
        event_slug=event.slug if event else "",
        date=event.start_at if event else None,
        discipline_title=result.discipline_title,
        qualifying_place=result.qualifying_place,
        top_stage=result.top_stage,
        final_place=result.final_place,
        awarded_points=result.awarded_points,
    )


def _event_out(event: Event) -> EventOut:
    participants_count = len({registration.participant_id for registration in event.registrations})
    return EventOut(
        id=event.id,
        slug=event.slug,
        title=event.title,
        city=event.city,
        venue_address=event.venue_address,
        start_at=event.start_at,
        registration_deadline=event.registration_deadline,
        poster_url=event.poster_url,
        description=event.description,
        status=event.status,
        organizer_name=event.organizer_name,
        registration_open=event_registration_open(event),
        participants_count=participants_count,
        results_count=len(event.results),
        disciplines=[
            DisciplineOut(title=discipline.title, format=discipline.format, nomination_label=discipline.nomination_label)
            for discipline in sorted(event.disciplines, key=lambda row: row.sort_order)
        ],
    )


def _next_verum_id(db: Session) -> str:
    count = db.query(Participant).count() + 1
    return f"V-{date.today().year}-{count:06d}"


def _telegram_auth_payload(init_data: str | None) -> dict:
    if not init_data or init_data == "demo":
        return {}
    if not settings.telegram_bot_token:
        raise HTTPException(status_code=500, detail="Не настроен токен Telegram-бота.")

    pairs = dict(parse_qsl(init_data, keep_blank_values=True))
    provided_hash = pairs.pop("hash", None)
    if not provided_hash:
        raise HTTPException(status_code=401, detail="Подпись Telegram не найдена.")

    data_check_string = "\n".join(f"{key}={pairs[key]}" for key in sorted(pairs))
    secret_key = hmac.new(b"WebAppData", settings.telegram_bot_token.encode("utf-8"), hashlib.sha256).digest()
    expected_hash = hmac.new(secret_key, data_check_string.encode("utf-8"), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected_hash, provided_hash):
        raise HTTPException(status_code=401, detail="Telegram-подпись не прошла проверку.")

    user_payload = pairs.get("user")
    if not user_payload:
        raise HTTPException(status_code=401, detail="В initData нет данных пользователя Telegram.")
    return json.loads(user_payload)


def _provision_telegram_user(payload: dict, db: Session) -> User:
    telegram_user_id = str(payload["id"])
    telegram_username = payload.get("username") or f"user_{telegram_user_id}"
    user = db.query(User).filter(User.telegram_user_id == telegram_user_id).first()
    if user:
        user.telegram_username = telegram_username
        return user

    email = f"telegram-{telegram_user_id}@verum.app"
    user = User(
        role="participant",
        telegram_user_id=telegram_user_id,
        telegram_username=telegram_username,
        email=email,
        email_verified=False,
    )
    db.add(user)
    db.flush()

    first_name = payload.get("first_name") or "Новый"
    last_name = payload.get("last_name") or "участник"
    nickname = payload.get("username") or f"{first_name} {last_name}".strip()
    participant = Participant(
        verum_global_id=_next_verum_id(db),
        user_id=user.id,
        first_name=first_name,
        last_name=last_name,
        nickname=nickname,
        birth_date=date(2012, 1, 1),
        gender="not_set",
        city="Не указан",
        team="Не указана",
        coach_name="Не указан",
        school_name="Не указана",
        phone="Не указан",
        photo_url="https://dummyimage.com/600x800/111111/ff7a00&text=VERUM+ATHLETE",
    )
    db.add(participant)
    return user


def _send_code_email(email: str, code: str) -> str:
    if not settings.smtp_host:
        return "demo-log"

    message = EmailMessage()
    message["Subject"] = "VERUM email verification"
    message["From"] = settings.smtp_from
    message["To"] = email
    message.set_content(f"Ваш код подтверждения VERUM: {code}")

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as smtp:
        if settings.smtp_use_tls:
            smtp.starttls()
        if settings.smtp_user:
            smtp.login(settings.smtp_user, settings.smtp_password)
        smtp.send_message(message)

    return "smtp"


def _current_user(authorization: str | None = Header(default=None), db: Session = Depends(get_db)) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Нужна авторизация.")
    token = authorization.replace("Bearer ", "", 1).strip()
    user_id = TOKENS.get(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Сессия устарела. Открой Mini App заново.")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Пользователь не найден.")
    return user


def _require_admin(user: User = Depends(_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Этот раздел доступен только администратору.")
    return user


def _actor_label_for_activity(actor_user_id: str | None, actors: dict[str, User]) -> str:
    if not actor_user_id or actor_user_id not in actors:
        return "Система"

    actor = actors[actor_user_id]
    return actor.telegram_username or actor.email


@router.get("/health")
def health():
    return {"ok": True}


@router.get("/meta")
def meta():
    return {"appVersion": settings.app_version}


@router.post("/auth/telegram/init", response_model=AuthOut)
def telegram_init(payload: TelegramInitIn, db: Session = Depends(get_db)):
    telegram_payload = _telegram_auth_payload(payload.initData)
    if telegram_payload:
        user = _provision_telegram_user(telegram_payload, db)
    else:
        user = db.query(User).filter(User.role == "participant").first()
        if not user:
            raise HTTPException(status_code=404, detail="Демо-пользователь не найден.")

    token = secrets.token_urlsafe(24)
    TOKENS[token] = user.id
    db.add(
        AuditLog(
            actor_user_id=user.id,
            entity_type="auth",
            action="telegram_init",
            payload=_json_payload(
                {
                    "has_init_data": bool(payload.initData and payload.initData != "demo"),
                    "telegram_username": user.telegram_username,
                }
            ),
        )
    )
    db.commit()
    return AuthOut(token=token, role=user.role, profile_status="active")


@router.post("/auth/email/send-code")
def send_email_code(payload: EmailSendIn, db: Session = Depends(get_db), user: User = Depends(_current_user)):
    code = "".join(secrets.choice("0123456789") for _ in range(6))
    EMAIL_CODES[payload.email] = code
    delivery = _send_code_email(payload.email, code)
    db.add(AuditLog(actor_user_id=user.id, entity_type="email_verification", action="send_code", payload=_json_payload({"email": payload.email})))
    db.commit()
    response = {"ok": True, "delivery": delivery}
    if settings.environment != "production":
        response["code"] = code
    return response


@router.post("/auth/email/verify-code")
def verify_email_code(payload: EmailVerifyIn, db: Session = Depends(get_db), user: User = Depends(_current_user)):
    if EMAIL_CODES.get(payload.email) != payload.code:
        raise HTTPException(status_code=400, detail="Неверный код подтверждения.")
    user.email = payload.email
    user.email_verified = True
    db.add(AuditLog(actor_user_id=user.id, entity_type="email_verification", action="verify_code", payload=_json_payload({"email": payload.email})))
    db.commit()
    return {"ok": True}


@router.get("/auth/me", response_model=AuthStatusOut)
def auth_me(user: User = Depends(_current_user)):
    return AuthStatusOut(
        role=user.role,
        email=user.email,
        telegram_username=user.telegram_username,
        email_verified=user.email_verified,
    )


@router.get("/admin/overview", response_model=AdminOverviewOut)
def admin_overview(db: Session = Depends(get_db), user: User = Depends(_require_admin)):
    del user
    total_events = db.query(Event).count()
    open_events = sum(1 for event in db.query(Event).all() if event_registration_open(event))
    stats = AdminStatsOut(
        total_participants=db.query(Participant).count(),
        total_events=total_events,
        open_events=open_events,
        total_partners=db.query(Partner).count(),
        total_registrations=db.query(EventRegistration).count(),
        pending_email_verification=db.query(User).filter(User.role == "participant", User.email_verified.is_(False)).count(),
    )

    registrations = (
        db.query(EventRegistration, Participant, Event)
        .join(Participant, Participant.id == EventRegistration.participant_id)
        .join(Event, Event.id == EventRegistration.event_id)
        .order_by(EventRegistration.created_at.desc())
        .limit(8)
        .all()
    )
    recent_registrations = [
        AdminRecentRegistrationOut(
            participant_name=f"{participant.first_name} {participant.last_name}",
            participant_verum_global_id=participant.verum_global_id,
            event_title=event.title,
            discipline_title=registration.discipline_title,
            source=registration.source,
            created_at=registration.created_at,
        )
        for registration, participant, event in registrations
    ]

    audit_rows = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(8).all()
    actor_ids = {row.actor_user_id for row in audit_rows if row.actor_user_id}
    actors = {actor.id: actor for actor in db.query(User).filter(User.id.in_(actor_ids)).all()} if actor_ids else {}
    recent_activity = [
        AdminActivityOut(
            action=row.action,
            entity_type=row.entity_type,
            actor_label=_actor_label_for_activity(row.actor_user_id, actors),
            created_at=row.created_at,
            payload=row.payload,
        )
        for row in audit_rows
    ]

    return AdminOverviewOut(stats=stats, recent_registrations=recent_registrations, recent_activity=recent_activity)


@router.get("/partners/ticker", response_model=list[PartnerOut])
def partner_ticker(db: Session = Depends(get_db)):
    rows = db.query(Partner).order_by(Partner.sort_order.asc(), Partner.name.asc()).all()
    return [PartnerOut.model_validate(row, from_attributes=True) for row in rows]


@router.get("/partners", response_model=list[PartnerOut])
def partners(db: Session = Depends(get_db)):
    rows = db.query(Partner).order_by(Partner.sort_order.asc(), Partner.name.asc()).all()
    return [PartnerOut.model_validate(row, from_attributes=True) for row in rows]


@router.get("/partners/{slug}", response_model=PartnerOut)
def partner_detail(slug: str, db: Session = Depends(get_db)):
    partner = db.query(Partner).filter(Partner.slug == slug).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Партнёр не найден.")
    return PartnerOut.model_validate(partner, from_attributes=True)


@router.get("/news", response_model=list[NewsOut])
def news(db: Session = Depends(get_db)):
    rows = db.query(News).order_by(News.published_at.desc()).limit(5).all()
    return [NewsOut.model_validate(row, from_attributes=True) for row in rows]


@router.get("/events", response_model=list[EventOut])
def events(db: Session = Depends(get_db)):
    rows = (
        db.query(Event)
        .options(joinedload(Event.disciplines), joinedload(Event.registrations), joinedload(Event.results))
        .order_by(Event.start_at.asc())
        .all()
    )
    return [_event_out(row) for row in rows]


@router.get("/events/{slug}", response_model=EventOut)
def event_by_slug(slug: str, db: Session = Depends(get_db)):
    row = (
        db.query(Event)
        .options(joinedload(Event.disciplines), joinedload(Event.registrations), joinedload(Event.results))
        .filter(Event.slug == slug)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Событие не найдено.")
    return _event_out(row)


@router.get("/events/{slug}/results", response_model=list[EventResultOut])
def event_results(slug: str, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.slug == slug).first()
    if not event:
        raise HTTPException(status_code=404, detail="Событие не найдено.")

    rows = (
        db.query(EventResult, Participant)
        .join(Participant, Participant.id == EventResult.participant_id)
        .filter(EventResult.event_id == event.id)
        .all()
    )
    rows.sort(key=lambda row: ((row[0].final_place or 999), -row[0].awarded_points))
    return [
        EventResultOut(
            participant_id=participant.id,
            verum_global_id=participant.verum_global_id,
            full_name=f"{participant.first_name} {participant.last_name}",
            nickname=participant.nickname,
            discipline_title=result.discipline_title,
            qualifying_place=result.qualifying_place,
            top_stage=result.top_stage,
            final_place=result.final_place,
            awarded_points=result.awarded_points,
        )
        for result, participant in rows
    ]


@router.post("/events/{event_id}/register-self")
def register_self(event_id: str, payload: RegisterEventIn, db: Session = Depends(get_db), user: User = Depends(_current_user)):
    participant = db.query(Participant).filter(Participant.user_id == user.id).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Профиль участника не найден.")
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Событие не найдено.")
    if not event_registration_open(event):
        raise HTTPException(status_code=400, detail="Регистрация на это событие уже закрыта.")

    existing = (
        db.query(EventRegistration)
        .filter(
            EventRegistration.event_id == event.id,
            EventRegistration.participant_id == participant.id,
            EventRegistration.discipline_title == payload.discipline_title,
        )
        .first()
    )
    if existing:
        return {"ok": True, "status": "already_registered"}

    registration = EventRegistration(
        event_id=event.id,
        participant_id=participant.id,
        discipline_title=payload.discipline_title,
        source="self",
    )
    db.add(registration)
    db.add(
        AuditLog(
            actor_user_id=user.id,
            entity_type="event_registration",
            action="register_self",
            payload=_json_payload({"event_id": event.id, "discipline_title": payload.discipline_title}),
        )
    )
    db.commit()
    return {"ok": True, "status": "registered"}


@router.get("/ratings/global/top10", response_model=list[RatingItemOut])
def rating_top10(db: Session = Depends(get_db)):
    rows = (
        db.query(RatingSnapshot, Participant)
        .join(Participant, Participant.id == RatingSnapshot.participant_id)
        .filter(RatingSnapshot.season_year == 2026)
        .order_by(RatingSnapshot.rank_global.asc())
        .limit(10)
        .all()
    )
    return [_rating_item(snapshot, participant) for snapshot, participant in rows]


@router.get("/ratings/global", response_model=list[RatingItemOut])
def rating_full(db: Session = Depends(get_db)):
    rows = (
        db.query(RatingSnapshot, Participant)
        .join(Participant, Participant.id == RatingSnapshot.participant_id)
        .filter(RatingSnapshot.season_year == 2026)
        .order_by(RatingSnapshot.rank_global.asc())
        .all()
    )
    return [_rating_item(snapshot, participant) for snapshot, participant in rows]


@router.get("/participants", response_model=list[ParticipantSummaryOut])
def participants(db: Session = Depends(get_db)):
    rows = db.query(Participant).order_by(Participant.first_name.asc(), Participant.last_name.asc()).all()
    return [_participant_summary(row) for row in rows]


@router.get("/participants/me", response_model=ParticipantPrivateOut)
def participant_me(db: Session = Depends(get_db), user: User = Depends(_current_user)):
    participant = db.query(Participant).filter(Participant.user_id == user.id).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Профиль участника не найден.")
    public = _participant_public(participant)
    return ParticipantPrivateOut(
        **public.model_dump(),
        birth_date=participant.birth_date,
        email=user.email,
        phone=participant.phone,
    )


@router.get("/participants/me/history", response_model=list[ParticipantHistoryItemOut])
def participant_me_history(db: Session = Depends(get_db), user: User = Depends(_current_user)):
    participant = db.query(Participant).filter(Participant.user_id == user.id).first()
    if not participant:
        raise HTTPException(status_code=404, detail="История участника недоступна.")
    rows = (
        db.query(EventResult, Event)
        .join(Event, Event.id == EventResult.event_id)
        .filter(EventResult.participant_id == participant.id)
        .order_by(Event.start_at.desc())
        .all()
    )
    return [_history_item(result, event) for result, event in rows]


@router.patch("/participants/me")
def update_participant_me(payload: ParticipantUpdateIn, db: Session = Depends(get_db), user: User = Depends(_current_user)):
    participant = db.query(Participant).filter(Participant.user_id == user.id).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Профиль участника не найден.")

    participant.first_name = payload.first_name
    participant.last_name = payload.last_name
    participant.nickname = payload.nickname
    participant.birth_date = payload.birth_date
    participant.gender = payload.gender
    participant.city = payload.city
    participant.team = payload.team
    participant.coach_name = payload.coach_name
    participant.school_name = payload.school_name
    participant.phone = payload.phone
    participant.photo_url = payload.photo_url
    user.email = payload.email

    db.add(
        AuditLog(
            actor_user_id=user.id,
            entity_type="participant",
            entity_id=participant.id,
            action="profile_updated",
            payload=_json_payload(payload.model_dump(mode="json")),
        )
    )
    db.commit()
    return {"ok": True, "auditLogged": True, "adminNotified": True}


@router.get("/participants/{verum_global_id}", response_model=ParticipantPublicOut)
def participant_public(verum_global_id: str, db: Session = Depends(get_db)):
    participant = db.query(Participant).filter(Participant.verum_global_id == verum_global_id).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Участник не найден.")
    return _participant_public(participant)


@router.get("/participants/{verum_global_id}/history", response_model=list[ParticipantHistoryItemOut])
def participant_history(verum_global_id: str, db: Session = Depends(get_db)):
    participant = db.query(Participant).filter(Participant.verum_global_id == verum_global_id).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Участник не найден.")
    rows = (
        db.query(EventResult, Event)
        .join(Event, Event.id == EventResult.event_id)
        .filter(EventResult.participant_id == participant.id)
        .order_by(Event.start_at.desc())
        .all()
    )
    return [_history_item(result, event) for result, event in rows]
