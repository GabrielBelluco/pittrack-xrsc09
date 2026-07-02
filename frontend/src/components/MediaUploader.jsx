import { Upload } from 'lucide-react';
import { useState } from 'react';

const STEPS = ['Diagnóstico', 'Orçamento', 'Reparo', 'Peça', 'Testes Finais', 'Entrega'];

export default function MediaUploader({ busy, onUpload }) {
  const [file, setFile] = useState(null);
  const [step, setStep] = useState('Diagnóstico');
  const [description, setDescription] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();

    if (!file) {
      return;
    }

    await onUpload({ file, step, description });
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
        <label>
          Etapa
          <select value={step} onChange={(event) => setStep(event.target.value)}>
            {STEPS.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>

        <label>
          Arquivo
          <input
            type="file"
            accept="image/*,video/*"
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
          placeholder="Ex.: ruído identificado durante teste de frenagem"
        />
      </label>

      <button className="primary-button inline-primary" type="submit" disabled={busy || !file}>
        <Upload size={18} />
        Enviar mídia
      </button>
    </form>
  );
}
