import { AdminDirectory, AdminOverview } from "../lib/api";
import { SectionCard } from "../components/SectionCard";

type AdminPageProps = {
  overview: AdminOverview | null;
  directory: AdminDirectory | null;
  onRoleChange: (userId: string, role: string) => void;
  onEventStatusChange: (eventId: string, status: string) => void;
};

const roleOptions = [
  { value: "participant", label: "Участник" },
  { value: "coach", label: "Тренер" },
  { value: "organizer", label: "Организатор" },
  { value: "admin", label: "Админ" }
];

const statusOptions = [
  { value: "draft", label: "Черновик" },
  { value: "registration_open", label: "Регистрация" },
  { value: "published", label: "Опубликовано" },
  { value: "completed", label: "Завершено" },
  { value: "cancelled", label: "Отменено" }
];

function formatSourceLabel(source: string) {
  if (source === "self") return "Самостоятельно";
  if (source === "coach") return "Через тренера";
  return source;
}

export function AdminPage({ overview, directory, onRoleChange, onEventStatusChange }: AdminPageProps) {
  if (!overview || !directory) {
    return <SectionCard title="Админ-панель">Загружаем административную сводку...</SectionCard>;
  }

  const coaches = directory.users.filter((user) => user.role === "coach").length;
  const organizers = directory.users.filter((user) => user.role === "organizer").length;

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div className="hero-copy">
          <span className="hero-label">ADMIN MODE</span>
          <h1>Центр контроля VERUM</h1>
          <p>Здесь администратор проверяет пользователей, роли, события, заявки и последние действия в системе.</p>
        </div>
        <div className="hero-stats">
          <div>
            <strong>{overview.stats.total_participants}</strong>
            <span>Участников</span>
          </div>
          <div>
            <strong>{coaches}</strong>
            <span>Тренеров</span>
          </div>
          <div>
            <strong>{organizers}</strong>
            <span>Организаторов</span>
          </div>
        </div>
      </section>

      <SectionCard title="Быстрая сводка" subtitle="Главные показатели перед презентацией и модерацией">
        <div className="overview-grid">
          <article className="overview-card">
            <strong>{overview.stats.total_events}</strong>
            <span>Событий всего</span>
          </article>
          <article className="overview-card">
            <strong>{overview.stats.open_events}</strong>
            <span>Открыта регистрация</span>
          </article>
          <article className="overview-card">
            <strong>{overview.stats.total_registrations}</strong>
            <span>Заявок на события</span>
          </article>
          <article className="overview-card">
            <strong>{overview.stats.pending_email_verification}</strong>
            <span>Без подтверждённого email</span>
          </article>
        </div>
      </SectionCard>

      <SectionCard title="Пользователи и роли" subtitle="Назначай тренеров, организаторов и администраторов без отдельного окна входа">
        <div className="results-list">
          {directory.users.map((user) => (
            <div key={user.id} className="result-row admin-row">
              <div>
                <strong>{user.telegram_username ? `@${user.telegram_username}` : user.email}</strong>
                <span>
                  {user.email} · {user.email_verified ? "email подтверждён" : "email не подтверждён"}
                </span>
              </div>
              <div className="result-meta">
                <select value={user.role} onChange={(event) => onRoleChange(user.id, event.target.value)}>
                  {roleOptions.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="События на модерации" subtitle="Организатор создаёт черновик, админ открывает регистрацию или публикует событие">
        <div className="results-list">
          {directory.events.map((event) => (
            <div key={event.id} className="result-row admin-row">
              <div>
                <strong>{event.title}</strong>
                <span>
                  {event.city} · {event.organizer_name} · {new Date(event.start_at).toLocaleDateString("ru-RU")}
                </span>
              </div>
              <div className="result-meta">
                <select value={event.status} onChange={(selectEvent) => onEventStatusChange(event.id, selectEvent.target.value)}>
                  {statusOptions.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Последние регистрации" subtitle="Кто и на какие дисциплины подал заявку">
        <div className="results-list">
          {overview.recent_registrations.length ? (
            overview.recent_registrations.map((item) => (
              <div key={`${item.participant_verum_global_id}-${item.created_at}-${item.discipline_title}`} className="result-row">
                <div>
                  <strong>{item.participant_name}</strong>
                  <span>
                    {item.participant_verum_global_id} · {item.event_title}
                  </span>
                </div>
                <div className="result-meta">
                  <span>{item.discipline_title}</span>
                  <strong>{formatSourceLabel(item.source)}</strong>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">Пока нет новых регистраций.</div>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Журнал действий" subtitle="Последние изменения, входы и системные события">
        <div className="results-list">
          {overview.recent_activity.map((item) => (
            <div key={`${item.entity_type}-${item.action}-${item.created_at}`} className="result-row">
              <div>
                <strong>{item.actor_label}</strong>
                <span>
                  {item.entity_type} · {item.action}
                </span>
              </div>
              <div className="result-meta">
                <span>{new Date(item.created_at).toLocaleString("ru-RU")}</span>
                <strong>Audit</strong>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
