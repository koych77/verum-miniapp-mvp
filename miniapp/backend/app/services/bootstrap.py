import json
from datetime import date, datetime, timezone

from sqlalchemy.orm import Session

from app.models.entities import AuditLog, Event, EventDiscipline, EventResult, News, Partner, Participant, RatingSnapshot, User


def compute_age(birth_date: date) -> int:
    today = date.today()
    years = today.year - birth_date.year
    if (today.month, today.day) < (birth_date.month, birth_date.day):
        years -= 1
    return years


def event_registration_open(event: Event) -> bool:
    deadline = event.registration_deadline
    if deadline.tzinfo is None:
        deadline = deadline.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) <= deadline


def seed_database(db: Session) -> None:
    if db.query(User).first():
        return

    admin = User(role="admin", email="admin@verum.app", email_verified=True, telegram_username="verum_admin")
    participant_user = User(role="participant", email="participant@verum.app", email_verified=True, telegram_username="bboy_ice")
    db.add_all([admin, participant_user])
    db.flush()

    participants = [
        Participant(
            verum_global_id="V-2026-000001",
            user_id=participant_user.id,
            first_name="Иван",
            last_name="Петров",
            nickname="Bboy Ice",
            birth_date=date(2011, 5, 20),
            gender="male",
            city="Минск",
            team="North Crew",
            coach_name="Alex Stone",
            school_name="VERUM School",
            phone="+375291111111",
            photo_url="https://dummyimage.com/600x800/0f0f10/ff7a00&text=Bboy+Ice",
        ),
        Participant(
            verum_global_id="V-2026-000002",
            first_name="Анна",
            last_name="Козлова",
            nickname="Bgirl Nova",
            birth_date=date(2012, 2, 11),
            gender="female",
            city="Брест",
            team="Nova Kids",
            coach_name="Alex Stone",
            school_name="VERUM School",
            phone="+375292222222",
            photo_url="https://dummyimage.com/600x800/1a1a1d/ffffff&text=Bgirl+Nova",
        ),
        Participant(
            verum_global_id="V-2026-000003",
            first_name="Максим",
            last_name="Сидоров",
            nickname="Maks Flow",
            birth_date=date(2010, 9, 5),
            gender="male",
            city="Гродно",
            team="Flow Unit",
            coach_name="Nikita Jay",
            school_name="Break Hub",
            phone="+375293333333",
            photo_url="https://dummyimage.com/600x800/111111/ff9a2f&text=Maks+Flow",
        ),
        Participant(
            verum_global_id="V-2026-000004",
            first_name="Елизавета",
            last_name="Соколова",
            nickname="Liza Vibe",
            birth_date=date(2013, 7, 14),
            gender="female",
            city="Витебск",
            team="Vibe Kids",
            coach_name="Marina Fox",
            school_name="Move Up",
            phone="+375294444444",
            photo_url="https://dummyimage.com/600x800/111111/ff7a00&text=Liza+Vibe",
        ),
    ]
    db.add_all(participants)

    db.add_all(
        [
            Partner(
                name="VERUM Official",
                slug="verum-official",
                logo_url="https://dummyimage.com/320x100/111111/ff7a00&text=VERUM",
                description="Главный партнер серии VERUM и поддержки развития breaking-сообщества.",
                website_url="https://verum.app",
                sort_order=1,
            ),
            Partner(
                name="Future Beat",
                slug="future-beat",
                logo_url="https://dummyimage.com/320x100/222222/ffffff&text=Future+Beat",
                description="Партнер молодежных баттлов и городских фестивалей.",
                website_url="https://example.com/future-beat",
                sort_order=2,
            ),
            Partner(
                name="Street Energy",
                slug="street-energy",
                logo_url="https://dummyimage.com/320x100/0f0f10/ff9a2f&text=Street+Energy",
                description="Поддержка спортивных и танцевальных проектов VERUM по всей Беларуси.",
                website_url="https://example.com/street-energy",
                sort_order=3,
            ),
        ]
    )

    omnibreak = Event(
        slug="omnibreak-2026-minsk",
        title="OMNIBREAK",
        city="Минск",
        venue_address="г. Минск, пр. Независимости 173 (БЦ Футурис)",
        start_at=datetime(2026, 5, 17, 10, 0, tzinfo=timezone.utc),
        registration_deadline=datetime(2026, 5, 15, 23, 59, tzinfo=timezone.utc),
        poster_url="https://dummyimage.com/900x1200/101010/ff7a00&text=OMNIBREAK+2026",
        description=(
            "Номинации: BEGINNERS 1x1, KIDS 1x1 до 7/10/13/15 лет, KIDS 3x3, ROOTS & FUTURE, "
            "BONNIE & CLYDE, OMNIBREAK до 15 лет, OMNIBREAK 16+, BEAT OBEY."
        ),
        status="registration_open",
        organizer_name="OMNI Crew",
    )
    verum_jam = Event(
        slug="verum-jam-2026-brest",
        title="VERUM JAM",
        city="Брест",
        venue_address="г. Брест, ул. Советская 88",
        start_at=datetime(2026, 6, 21, 11, 0, tzinfo=timezone.utc),
        registration_deadline=datetime(2026, 6, 18, 23, 59, tzinfo=timezone.utc),
        poster_url="https://dummyimage.com/900x1200/141414/ff9a2f&text=VERUM+JAM",
        description="Открытый городской ивент с баттлами 1x1, 2x2 и семейными форматами.",
        status="registration_open",
        organizer_name="VERUM Brest",
    )
    summer_floor = Event(
        slug="summer-floor-2026-grodno",
        title="SUMMER FLOOR",
        city="Гродно",
        venue_address="г. Гродно, ул. Дзержинского 4",
        start_at=datetime(2026, 8, 9, 12, 0, tzinfo=timezone.utc),
        registration_deadline=datetime(2026, 8, 5, 23, 59, tzinfo=timezone.utc),
        poster_url="https://dummyimage.com/900x1200/161616/ffffff&text=SUMMER+FLOOR",
        description="Летний турнир с большим детским блоком, judging talks и финалами на центральной сцене.",
        status="published",
        organizer_name="Flow Unit",
    )

    db.add_all([omnibreak, verum_jam, summer_floor])
    db.flush()

    db.add_all(
        [
            EventDiscipline(event_id=omnibreak.id, title="BEGINNERS 1x1", format="1v1", nomination_label="Beginners", sort_order=1),
            EventDiscipline(event_id=omnibreak.id, title="KIDS 1x1 до 13 лет", format="1v1", nomination_label="Kids U13", sort_order=2),
            EventDiscipline(event_id=omnibreak.id, title="KIDS 3x3", format="3v3", nomination_label="Kids 3x3", sort_order=3),
            EventDiscipline(event_id=verum_jam.id, title="OPEN 2x2", format="2v2", nomination_label="Open 2x2", sort_order=1),
            EventDiscipline(event_id=verum_jam.id, title="KIDS 1x1 до 10 лет", format="1v1", nomination_label="Kids U10", sort_order=2),
            EventDiscipline(event_id=summer_floor.id, title="OPEN 1x1", format="1v1", nomination_label="Open 1x1", sort_order=1),
            EventDiscipline(event_id=summer_floor.id, title="TEAM SHOWCASE", format="team", nomination_label="Team Showcase", sort_order=2),
        ]
    )

    db.add_all(
        [
            News(
                title="Открыта регистрация на OMNIBREAK",
                body="Регистрация уже доступна внутри Mini App. Участники и тренеры могут подавать заявки прямо из карточки мероприятия.",
                image_url="https://dummyimage.com/1200x630/101010/ff7a00&text=Registration+Open",
                event_slug=omnibreak.slug,
            ),
            News(
                title="VERUM запускает сезонный рейтинг 2026",
                body="В новом сезоне учитываются отбор, выход в топ и итоговое место на всех подтвержденных мероприятиях.",
                image_url="https://dummyimage.com/1200x630/111111/ffffff&text=Season+2026",
            ),
            News(
                title="Партнерская программа VERUM расширяется",
                body="В экосистему входят новые бренды, поддерживающие развитие breaking-сообщества.",
            ),
            News(
                title="Организаторы могут подавать события на модерацию",
                body="Новый кабинет организатора уже готов для первых тестов и публикации мероприятий через админ-модерацию.",
            ),
            News(
                title="Тренерские кабинеты доступны в beta",
                body="Тренеры могут создавать учеников, хранить их как черновики и подавать заявки на турниры.",
            ),
        ]
    )

    p1, p2, p3, p4 = participants
    db.add_all(
        [
            EventRegistration(event_id=omnibreak.id, participant_id=p1.id, discipline_title="KIDS 1x1 до 13 лет", source="self"),
            EventRegistration(event_id=omnibreak.id, participant_id=p2.id, discipline_title="KIDS 1x1 до 13 лет", source="coach"),
            EventRegistration(event_id=verum_jam.id, participant_id=p3.id, discipline_title="OPEN 2x2", source="self"),
            EventRegistration(event_id=summer_floor.id, participant_id=p4.id, discipline_title="OPEN 1x1", source="self"),
            EventResult(event=omnibreak, participant=p1, discipline_title="KIDS 1x1 до 13 лет", qualifying_place=1, top_stage="final", final_place=1, awarded_points=70),
            EventResult(event=omnibreak, participant=p2, discipline_title="KIDS 1x1 до 13 лет", qualifying_place=2, top_stage="final", final_place=2, awarded_points=60),
            EventResult(event=omnibreak, participant=p3, discipline_title="BEGINNERS 1x1", qualifying_place=4, top_stage="top8", final_place=5, awarded_points=32),
            EventResult(event=verum_jam, participant=p4, discipline_title="KIDS 1x1 до 10 лет", qualifying_place=3, top_stage="top4", final_place=3, awarded_points=41),
            RatingSnapshot(participant=p1, season_year=2026, total_points=214, rank_global=1),
            RatingSnapshot(participant=p2, season_year=2026, total_points=186, rank_global=2),
            RatingSnapshot(participant=p4, season_year=2026, total_points=159, rank_global=3),
            RatingSnapshot(participant=p3, season_year=2026, total_points=141, rank_global=4),
            AuditLog(actor_user_id=admin.id, entity_type="bootstrap", action="seed_database", payload=json.dumps({"participants": 4, "events": 3})),
        ]
    )
    db.commit()
