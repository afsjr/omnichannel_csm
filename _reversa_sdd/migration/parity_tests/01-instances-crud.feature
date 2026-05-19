# language: pt
# spec-id: PT-001
# rastreabilidade:
#   process_flows: _reversa_sdd/code-analysis.md § 2.9 Instances
#   target_architecture: InstanceController + InstanceService + InstanceRepository
#   paradigma_alvo: OO com DI (sem mudança)

Funcionalidade: CRUD de Instâncias WhatsApp
  Como admin da empresa
  Quero gerenciar instâncias WhatsApp
  Para conectar números da empresa ao sistema

  @paridade @critico
  Cenário: Criar instância com dados válidos
    Dado que existe uma empresa com ID "1"
    E que estou autenticado como admin desta empresa
    Quando envio POST /instances com {instance_name: "vendas", phone_number: "5511999999999", company_id: 1}
    Então a resposta deve conter os campos id, instance_name, phone_number, status, company_id
    E o status deve ser "offline"
    E a tabela connections deve ter um registro com company_id=1 e instance_name="vendas"

  @paridade @critico
  Cenário: Listar instâncias da empresa
    Dado que a empresa "1" tem 3 instâncias cadastradas
    Quando envio GET /instances com company_id=1
    Então a resposta deve ser uma lista com 3 instâncias
    E cada instância deve conter os campos id, instance_name, status

  @paridade
  Cenário: Obter detalhes de uma instância
    Dado que existe uma instância com ID "5" na empresa "1"
    Quando envio GET /instances/5
    Então a resposta deve conter os mesmos dados do registro na tabela connections

  @paridade
  Cenário: Atualizar dados de uma instância
    Dado que existe uma instância com ID "5" com instance_name="vendas"
    Quando envio PUT /instances/5 com {instance_name: "vendas-novo"}
    Então a tabela connections deve ter instance_name="vendas-novo" para o ID "5"

  @paridade @critico
  Cenário: Excluir uma instância
    Dado que existe uma instância com ID "5" na empresa "1"
    Quando envio DELETE /instances/5
    Então a resposta deve ser 200 OK
    E a tabela connections não deve mais conter o registro com ID "5"

  @paridade
  Cenário: Criar instância com nome duplicado na mesma empresa
    Dado que a empresa "1" já tem uma instância com instance_name="vendas"
    Quando envio POST /instances com {instance_name: "vendas", company_id: 1}
    Então a resposta deve ser 409 Conflict com mensagem de erro

  @paridade
  Cenário: Acessar instância de outra empresa
    Dado que a instância "5" pertence à empresa "1"
    E que estou autenticado como admin da empresa "2"
    Quando envio GET /instances/5
    Então a resposta deve ser 403 Forbidden
