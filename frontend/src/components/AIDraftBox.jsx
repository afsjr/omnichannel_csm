export default function AIDraftBox({ draft, confidence, onUse, onRegenerate }) {
  const confidencePercent = confidence ? Math.round(confidence * 100) : 0;

  return (
    <div className="ai-draft-box">
      <div className="ai-draft-header">
        <div className="ai-badge-large">
          <span className="ai-icon">✨</span>
          <span>Sugestão da IA</span>
          {confidencePercent > 0 && (
            <span className="confidence-badge">{confidencePercent}%</span>
          )}
        </div>
        <div className="ai-actions">
          <button onClick={onRegenerate} className="btn-regenerate" title="Regenerar">
            ↻
          </button>
        </div>
      </div>
      <div className="ai-draft-content">
        <p>{draft}</p>
      </div>
      <div className="ai-draft-footer">
        <p className="ai-hint">Revise a sugestão antes de enviar</p>
        <button onClick={onUse} className="btn-use-draft">
          Usar esta sugestão
        </button>
      </div>
    </div>
  );
}