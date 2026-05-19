# language: pt
# spec-id: PT-002
# rastreabilidade:
#   process_flows: _reversa_sdd/code-analysis.md § 2.9 Instances → fluxo de conexão
#   target_architecture: InstanceService.connect → EvolutionProvider.connect
#   paradigma_alvo: OO com DI (sem mudança)

Funcionalidade: Conexão e Desconexão de Instâncias WhatsApp
  Como admin da empresa
  Quero conectar e desconectar instâncias WhatsApp
  Para ativar/desativar números no sistema

  @paridade @critico
  Cenário: Conectar instância gera QR Code
    Dado que existe uma instância com ID "5" com status="offline"
    Quando envio POST /instances/5/connect
    Então a resposta deve conter o campo qr_code com um QR Code válido (base64)
    E o campo qr_code_expires deve ser uma data futura
    E o status da instância deve ser "connecting"

  @paridade
  Cenário: Conectar instância já conectada
    Dado que a instância "5" tem status="connected"
    Quando envio POST /instances/5/connect
    Então a resposta deve ser 409 Conflict com mensagem "Instância já conectada"

  @paridade @critico
  Cenário: Desconectar instância conectada
    Dado que a instância "5" tem status="connected"
    Quando envio POST /instances/5/disconnect
    Então o status da instância deve ser "offline"
    E o campo qr_code deve ser removido ou null

  @paridade
  Cenário: Desconectar instância já desconectada
    Dado que a instância "5" tem status="offline"
    Quando envio POST /instances/5/disconnect
    Então a resposta deve ser 409 Conflict com mensagem "Instância já desconectada"

  @paridade
  Cenário: Evolution API retorna erro ao conectar
    Dado que a Evolution API está indisponível
    Quando envio POST /instances/5/connect
    Então a resposta deve ser 502 Bad Gateway
    E o status da instância deve permanecer "offline"
