class FunnelClassificationService {
  classifyFromMessage(messageContent, departmentName) {
    if (departmentName !== 'Comercial') {
      return null;
    }

    const content = messageContent.toLowerCase();

    const topoKeywords = [
      'conhecer', 'saber mais', 'informações', 'queria saber', 'tem como',
      'quanto custa', 'preço', 'custo', 'valor', 'orcamento', 'orçamento',
      'primeiro contato', 'iniciando', 'começando', 'estou pesquisando',
      'indicação', 'vi no', 'encontrei', 'chamou atenção', 'interesse inicial',
      'curiosidade', 'o que é', 'como funciona', 'quais cursos'
    ];

    const meioKeywords = [
      'comparar', 'diferença', 'vantagens', 'desvantagens', 'melhor opção',
      'recomenda', 'você sugere', 'como é', 'qual a diferença', 'vale a pena',
      'investimento', 'parcelar', 'desconto', 'bolsa', 'condição',
      'turma', 'início', 'quando começa', 'duração', 'horário', 'presencial',
      'online', 'certificado', 'carga horária', 'professor', 'material'
    ];

    const fundoKeywords = [
      'matricular', 'matrícula', 'inscrever', 'inscrição', 'formalizar',
      'assinar', 'contrato', 'pagamento', 'primeira parcela', 'entrada',
      'vencimento', 'boleto', 'pix', 'confirmar', 'reserva', 'vaga',
      'aprovado', 'limite', 'prazo final', 'última chance', 'urgente',
      'queria garantir', 'garantir minha vaga', 'fazer a matrícula'
    ];

    let topoScore = 0;
    let meioScore = 0;
    let fundoScore = 0;

    topoKeywords.forEach(kw => { if (content.includes(kw)) topoScore += 1; });
    meioKeywords.forEach(kw => { if (content.includes(kw)) meioScore += 1; });
    fundoKeywords.forEach(kw => { if (content.includes(kw)) fundoScore += 1; });

    const maxScore = Math.max(topoScore, meioScore, fundoScore);

    if (maxScore === 0) {
      return { stage: 'unclassified', confidence: 0 };
    }

    let stage;
    if (maxScore === topoScore) stage = 'topo';
    else if (maxScore === meioScore) stage = 'meio';
    else stage = 'fundo';

    const totalKeywords = topoKeywords.length + meioKeywords.length + fundoKeywords.length;
    const confidence = maxScore / (totalKeywords * 0.1);

    return {
      stage,
      confidence: Math.min(confidence, 1),
      scores: { topo: topoScore, meio: meioScore, fundo: fundoScore }
    };
  }

  getStageLabel(stage) {
    const labels = {
      topo: '🔵 Topo de Funil',
      meio: '🟡 Meio de Funil',
      fundo: '🟢 Fundo de Funil',
      unclassified: '⚪ Não classificado'
    };
    return labels[stage] || labels.unclassified;
  }

  getStageColor(stage) {
    const colors = {
      topo: '#3b82f6',
      meio: '#eab308',
      fundo: '#22c55e',
      unclassified: '#94a3b8'
    };
    return colors[stage] || colors.unclassified;
  }
}

module.exports = FunnelClassificationService;