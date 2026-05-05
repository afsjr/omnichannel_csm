# BMAD - Market

## Posicionamento
"OmniChat centraliza atendimento digital com foco em operacao simples e ganho rapido de produtividade."

## Concorrencia (mapa inicial)
- Plataformas de atendimento consolidadas (mais robustas, maior custo).
- Solucoes focadas apenas em WhatsApp.
- CRMs com modulo de chat acoplado.

## Diferencial inicial
- Implantacao rapida.
- Interface objetiva para operacao diaria.
- Arquitetura pronta para multiempresa desde o inicio.

## Canal principal de aquisicao (inicio)
- Prospecao ativa e parceria com agencias locais.

Explicacao tecnica:
No inicio, canal manual e mais rapido para validar problema real. Crescimento por ads sem validacao de retencao tende a queimar caixa.

## Riscos de mercado
- Dependencia de API de terceiros para canal.
- Mudancas de politica em provedores.

## Mitigacao
- Abstracao por canal no backend.
- Contratos de integracao desacoplados por provider.

Explicacao tecnica:
Criar uma camada de servico por canal evita acoplamento forte. Se um provider mudar contrato, o impacto fica local no adaptador.
