function formatDate(value) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    day: '2-digit',
    month: '2-digit'
  }).format(new Date(value));
}

export default function Timeline({ entries }) {
  return (
    <div className="section-block">
      <div className="section-title">
        <h3>Timeline</h3>
        <span>{entries.length} eventos</span>
      </div>

      <div className="timeline">
        {entries.length === 0 && <p className="empty-state">Sem histórico ainda.</p>}

        {entries.map((entry) => (
          <article className="timeline-item" key={entry.id}>
            <div className="timeline-dot" />
            <div>
              <div className="timeline-top">
                <strong>{entry.title}</strong>
                <time>{formatDate(entry.timestamp)}</time>
              </div>
              <p>{entry.description}</p>
              <span className="muted">{entry.actor}</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
