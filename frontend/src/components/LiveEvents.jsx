import { Radio } from 'lucide-react';

function formatTime(value) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(new Date(value));
}

export default function LiveEvents({ events, connected }) {
  return (
    <aside className="panel events-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Tempo real</p>
          <h2>Eventos</h2>
        </div>
        <span className={`connection ${connected ? 'on' : 'off'}`}>
          <Radio size={16} />
          {connected ? 'online' : 'offline'}
        </span>
      </div>

      <div className="event-list">
        {events.length === 0 && <p className="empty-state">Aguardando eventos.</p>}

        {events.map((event) => (
          <article className="event-item" key={`${event.timestamp}-${event.type}-${event.orderId || 'x'}`}>
            <div className="event-top">
              <strong>{event.type}</strong>
              <time>{formatTime(event.deliveredAt || event.timestamp)}</time>
            </div>
            <p>{event.message}</p>
            <span className="muted">
              ordem {event.orderId || '-'} · {event.source || 'sistema'}
            </span>
          </article>
        ))}
      </div>
    </aside>
  );
}
