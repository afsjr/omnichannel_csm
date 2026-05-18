import { useState, useEffect } from 'react'
import { useChatStore } from '../contexts/ChatContext'

export default function ContactsModal({ isOpen, onClose }) {
  const { contacts, fetchContacts, createContact, startConversation } = useChatStore()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [newContact, setNewContact] = useState({ name: '', phone: '', email: '' })
  const [startMsg, setStartMsg] = useState('Olá! Tudo bem?')
  const [starting, setStarting] = useState(null)

  useEffect(() => {
    if (isOpen) {
      fetchContacts(1, search)
    }
  }, [isOpen, search])

  const handleCreate = async (e) => {
    e.preventDefault()
    const result = await createContact(newContact.name, newContact.phone, newContact.email)
    if (result.ok) {
      setNewContact({ name: '', phone: '', email: '' })
      setShowForm(false)
      fetchContacts(1, search)
    }
  }

  const handleStart = async (contact) => {
    setStarting(contact.id)
    await startConversation(contact.id, startMsg)
    setStarting(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content contacts-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📇 Contatos</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-search">
          <input
            type="text"
            placeholder="Buscar por nome ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
          <button className="btn-new-contact" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancelar' : '+ Novo'}
          </button>
        </div>

        {showForm && (
          <form className="contact-form" onSubmit={handleCreate}>
            <input
              type="text"
              placeholder="Nome"
              value={newContact.name}
              onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
              required
            />
            <input
              type="tel"
              placeholder="Telefone (WhatsApp)"
              value={newContact.phone}
              onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
              required
            />
            <input
              type="email"
              placeholder="Email (opcional)"
              value={newContact.email}
              onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
            />
            <button type="submit" className="btn-save">Salvar Contato</button>
          </form>
        )}

        <div className="contacts-list">
          {contacts.length === 0 ? (
            <p className="empty">Nenhum contato encontrado</p>
          ) : (
            contacts.map(contact => (
              <div key={contact.id} className="contact-item">
                <div className="contact-info">
                  <strong>{contact.name}</strong>
                  <span>{contact.phone}</span>
                  {contact.email && <span className="email">{contact.email}</span>}
                </div>
                <div className="contact-actions">
                  <input
                    type="text"
                    placeholder="Mensagem inicial"
                    value={starting === contact.id ? startMsg : ''}
                    onChange={(e) => setStartMsg(e.target.value)}
                    className="start-msg-input"
                  />
                  <button
                    className="btn-start"
                    onClick={() => handleStart(contact)}
                    disabled={starting === contact.id}
                  >
                    {starting === contact.id ? '...' : 'Iniciar'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}