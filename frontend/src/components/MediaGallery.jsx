import { API_URL } from '../services/api.js';

function mediaUrl(url) {
  if (!url) {
    return '';
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  return `${API_URL}${url}`;
}

export default function MediaGallery({ media, parts, budgets }) {
  return (
    <div className="side-stack">
      <div className="section-block">
        <div className="section-title">
          <h3>Mídias</h3>
          <span>{media.length}</span>
        </div>

        <div className="compact-list">
          {media.length === 0 && <p className="empty-state">Sem vídeos ou fotos.</p>}

          {media.map((item) => {
            const url = mediaUrl(item.url);

            return (
              <article className="media-row" key={item.id}>
                <strong>{item.step}</strong>
                {item.type === 'video' ? (
                  <video controls src={url} />
                ) : (
                  <img src={url} alt={item.description || item.step} />
                )}
                <span>{item.description}</span>
                <small>{item.original_name || item.url}</small>
              </article>
            );
          })}
        </div>
      </div>

      <div className="section-block">
        <div className="section-title">
          <h3>Peças</h3>
          <span>{parts.length}</span>
        </div>

        <div className="compact-list">
          {parts.length === 0 && <p className="empty-state">Nenhuma peça registrada.</p>}

          {parts.map((part) => (
            <div className="data-row" key={part.id}>
              <strong>{part.name}</strong>
              <span>{part.quantity} unidade(s) · {part.status}</span>
              {part.tracking_code && <small>{part.tracking_code}</small>}
            </div>
          ))}
        </div>
      </div>

      <div className="section-block">
        <div className="section-title">
          <h3>Orçamentos</h3>
          <span>{budgets.length}</span>
        </div>

        <div className="compact-list">
          {budgets.length === 0 && <p className="empty-state">Nenhum orçamento gerado.</p>}

          {budgets.map((budget) => (
            <div className="data-row" key={budget.id}>
              <strong>R$ {Number(budget.amount).toFixed(2)}</strong>
              <span>{budget.description}</span>
              <small>{budget.approved ? 'Aprovado' : 'Pendente'}</small>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
