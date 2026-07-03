import { useState } from 'react';
import { ThumbsDown, X } from 'lucide-react';

export default function RejectModal({ onClose, onSubmit, busy }) {
  const [reason, setReason] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    await onSubmit(reason.trim());
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3><ThumbsDown size={18} /> Reprovar Orçamento</h3>
          <button type="button" className="icon-button" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <label>
            Justificativa da reprovação
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Valor muito alto, solicitar revisão..."
            />
          </label>
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose}>Cancelar</button>
            <button type="submit" className="primary-button" disabled={busy || !reason.trim()}>
              {busy ? 'Reprovando...' : 'Reprovar orçamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
