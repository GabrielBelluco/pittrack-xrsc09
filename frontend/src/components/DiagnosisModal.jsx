import { useState } from 'react';
import { Stethoscope, X } from 'lucide-react';

export default function DiagnosisModal({ onClose, onSubmit, busy }) {
  const [description, setDescription] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [observations, setObservations] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!description.trim()) return;
    await onSubmit({ description: description.trim(), rootCause: rootCause.trim(), observations: observations.trim() });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3><Stethoscope size={18} /> Iniciar Diagnóstico</h3>
          <button type="button" className="icon-button" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <label>
            Descrição do diagnóstico
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Ruído ao frear, pastilhas desgastadas..."
            />
          </label>
          <label>
            Causa raiz
            <input
              type="text"
              value={rootCause}
              onChange={(e) => setRootCause(e.target.value)}
              placeholder="Ex: Desgaste natural das pastilhas"
            />
          </label>
          <label>
            Observações
            <textarea
              rows={2}
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Informações adicionais..."
            />
          </label>
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose}>Cancelar</button>
            <button type="submit" className="primary-button" disabled={busy || !description.trim()}>
              {busy ? 'Registrando...' : 'Registrar diagnóstico'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
