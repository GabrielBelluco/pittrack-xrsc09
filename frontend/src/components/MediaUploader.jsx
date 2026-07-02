import { Upload } from 'lucide-react';
import { useState } from 'react';

const MEDIA_STEP_BY_STATUS = {
  'Aguardando Atendimento': 'Atendimento',
  'Em Diagnóstico': 'Diagnóstico',
  'Orçamento Gerado': 'Orçamento',
  'Aguardando Aprovação': 'Orçamento',
  Aprovado: 'Orçamento',
  'Em Reparo': 'Reparo',
  'Aguardando Peça': 'Peça',
  'Em Testes Finais': 'Testes Finais',
  Finalizado: 'Entrega',
  'Disponível para Retirada': 'Entrega'
};

function mediaStepForStatus(status) {
  return MEDIA_STEP_BY_STATUS[status] || null;
}

export default function MediaUploader({ busy, order, onUpload }) {
  const [file, setFile] = useState(null);
  const [description, setDescription] = useState('');
  const currentStep = mediaStepForStatus(order.status);
  const disabled = busy || !currentStep;

  async function handleSubmit(event) {
    event.preventDefault();

    if (!file || !currentStep) {
      return;
    }

    await onUpload({ file, step: currentStep, description });
    setFile(null);
    setDescription('');
    event.target.reset();
  }

  return (
    <form className="media-uploader section-block" onSubmit={handleSubmit}>
      <div className="section-title">
        <h3>Mídia real</h3>
        <span>foto ou vídeo</span>
      </div>

      <div className="form-grid">
        <div className="readonly-field">
          <span>Etapa atual</span>
          <strong>{currentStep || 'Indisponível'}</strong>
          <small>Definida automaticamente pelo status da ordem.</small>
        </div>

        <label>
          Arquivo
          <input
            type="file"
            accept="image/*,video/*"
            disabled={disabled}
            onChange={(event) => setFile(event.target.files?.[0] || null)}
          />
        </label>
      </div>

      <label>
        Descrição
        <textarea
          rows="2"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={disabled}
          placeholder="Ex.: ruído identificado durante teste de frenagem"
        />
      </label>

      {!currentStep && (
        <p className="workflow-empty">Envio de mídia indisponível para o status atual.</p>
      )}

      <button className="primary-button inline-primary" type="submit" disabled={disabled || !file}>
        <Upload size={18} />
        Enviar mídia
      </button>
    </form>
  );
}
