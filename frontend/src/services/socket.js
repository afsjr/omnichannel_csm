import { io } from 'socket.io-client';
import { useAuthStore } from '../contexts/AuthContext';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect(url = '') {
    const wsUrl = url || (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host;
    const token = useAuthStore.getState().token;

    this.socket = io(wsUrl, {
      transports: ['websocket', 'polling'],
      auth: { token }
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    this.socket.on('connected', (data) => {
      console.log('Socket ready:', data);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinRoom(room) {
    if (this.socket) {
      this.socket.emit('join:conversation', room);
    }
  }

  leaveRoom(room) {
    if (this.socket) {
      this.socket.emit('leave:conversation', room);
    }
  }

  joinDepartment(departmentId) {
    if (this.socket) {
      this.socket.emit('join:department', departmentId);
    }
  }

  joinUser(userId) {
    if (this.socket) {
      this.socket.emit('join:user', userId);
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
      this.listeners.set(event, callback);
    }
  }

  off(event) {
    if (this.socket && this.listeners.has(event)) {
      this.socket.off(event, this.listeners.get(event));
      this.listeners.delete(event);
    }
  }

  emit(event, data) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  getSocket() {
    return this.socket;
  }
}

const socketService = new SocketService();
export default socketService;