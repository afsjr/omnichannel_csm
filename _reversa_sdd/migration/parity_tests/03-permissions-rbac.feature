# language: pt
# spec-id: PT-003
# rastreabilidade:
#   process_flows: _reversa_sdd/flowcharts/auth.md § 4 Hierarquia de Permissões
#   target_architecture: Permissions Middleware
#   paradigma_alvo: OO com DI (sem mudança)

Funcionalidade: Permissões RBAC
  Como usuário do sistema
  Quero que minhas permissões reflitam meu papel (role)
  Para acessar apenas o que me é autorizado

  @paridade @critico
  Cenário: Master acessa todas as empresas
    Dado que estou autenticado como master
    Quando envio GET /instances com company_id=1
    Então a resposta deve listar instâncias da empresa "1"
    E o mesmo ocorre para GET /instances com company_id=2

  @paridade @critico
  Cenário: Admin acessa apenas sua empresa
    Dado que estou autenticado como admin da empresa "1"
    Quando envio GET /instances com company_id=1
    Então a resposta deve listar instâncias da empresa "1"
    Quando envio GET /instances com company_id=2
    Então a resposta deve ser 403 Forbidden

  @paridade
  Cenário: Agent não pode criar instância
    Dado que estou autenticado como agent da empresa "1"
    Quando envio POST /instances com {instance_name: "teste", phone_number: "5511999999999", company_id: 1}
    Então a resposta deve ser 403 Forbidden

  @paridade
  Cenário: Leader pode listar instâncias da sua empresa
    Dado que estou autenticado como leader da empresa "1"
    Quando envio GET /instances com company_id=1
    Então a resposta deve listar instâncias da empresa "1"

  @paridade
  Cenário: Leader não pode excluir instância
    Dado que estou autenticado como leader da empresa "1"
    Quando envio DELETE /instances/5
    Então a resposta deve ser 403 Forbidden

  @paridade
  Cenário: Admin pode excluir instância da sua empresa
    Dado que estou autenticado como admin da empresa "1"
    E que a instância "5" pertence à empresa "1"
    Quando envio DELETE /instances/5
    Então a resposta deve ser 200 OK
