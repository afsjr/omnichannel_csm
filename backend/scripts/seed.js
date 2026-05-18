require('dotenv').config();

const { createContainer } = require('../src/dependencyInjection');

const testData = {
  conversations: [
    {
      contact: { name: 'Maria Silva', phone: '11999887766' },
      message: 'Olá, gostaria de saber mais sobre o curso técnico de enfermagem noturno.',
      department: 'Comercial'
    },
    {
      contact: { name: 'João Santos', phone: '21988776655' },
      message: 'Preciso emitir uma segunda via do meu boleto. Como faço?',
      department: 'Financeiro'
    },
    {
      contact: { name: 'Ana Costa', phone: '31977665544' },
      message: 'Gostaria de solicitar meu certificado de conclusão de curso.',
      department: 'Secretaria'
    },
    {
      contact: { name: 'Carlos Oliveira', phone: '41966554433' },
      message: 'Quando serão as provas do módulo 3?',
      department: 'Acadêmico'
    },
    {
      contact: { name: 'Paula Ferreira', phone: '51955443322' },
      message: 'Qual o valor da mensalidade do curso técnico?',
      department: 'Comercial'
    },
    {
      contact: { name: 'Roberto Almeida', phone: '61944332211' },
      message: 'Meu pagamento foi recusado. Podem verificar?',
      department: 'Financeiro'
    },
    {
      contact: { name: 'Fernanda Lima', phone: '71933221100' },
      message: 'Preciso de uma declaração de matrícula urgente.',
      department: 'Secretaria'
    },
    {
      contact: { name: 'Marcos Souza', phone: '82922110099' },
      message: ' onde fica o hospital para fazer o estágio?',
      department: 'Acadêmico'
    }
  ]
};

async function seed() {
  console.log('Starting seed...');
  const container = createContainer();
  const { chat } = container.services;

  for (const conv of testData.conversations) {
    try {
      const result = await chat.simulateIncomingMessage({
        contact_name: conv.contact.name,
        phone: conv.contact.phone,
        content: conv.message,
        department: conv.department
      });
      console.log(`✓ Created conversation ${result.conversation.id} - ${conv.contact.name} (${conv.department})`);
    } catch (error) {
      console.error(`✗ Error for ${conv.contact.name}:`, error.message);
    }
  }

  console.log('\nSeed complete!');
  await container.close();
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});