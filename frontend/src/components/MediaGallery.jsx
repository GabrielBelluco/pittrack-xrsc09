import { useEffect, useState } from 'react';
import { MEDIA_URL, fetchMedia } from '../services/api.js';

export default function MediaGallery({ orderId, media: _legacyMedia, budgets }) {
  const [mediaList, setMediaList] = useState([]);

  useEffect(() => {
    if (!orderId) return;
    fetchMedia(orderId)
      .then(setMediaList)
      .catch(() => setMediaList([]));
  }, [orderId]);

  const photos = mediaList.filter((m) => m.type === 'photo');
  const videos = mediaList.filter((m) => m.type === 'video');

  function mediaUrl(item) {
    return `${MEDIA_URL}/media/file/${item.filename}`;
  }

  return (
    <div className="side-stack">
      <div className="section-block">
        <div className="section-title">
          <h3>Fotos</h3>
          <span>{photos.length}</span>
        </div>

        <div className="compact-list">
          {photos.length === 0 && <p className="empty-state">Nenhuma foto.</p>}

          {photos.map((item) => (
            <a className="media-row" key={item.id} href={mediaUrl(item)} target="_blank" rel="noreferrer">
              <strong>{item.step}</strong>
              {item.description && <span>{item.description}</span>}
              <small>{item.originalName} ({(item.size / 1024).toFixed(0)} KB)</small>
            </a>
          ))}
        </div>
      </div>

      <div className="section-block">
        <div className="section-title">
          <h3>Vídeos</h3>
          <span>{videos.length}</span>
        </div>

        <div className="compact-list">
          {videos.length === 0 && <p className="empty-state">Nenhum vídeo.</p>}

          {videos.map((item) => (
            <a className="media-row" key={item.id} href={mediaUrl(item)} target="_blank" rel="noreferrer">
              <strong>{item.step}</strong>
              {item.description && <span>{item.description}</span>}
              <small>{item.originalName} ({(item.size / 1024).toFixed(0)} KB)</small>
            </a>
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
