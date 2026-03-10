const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

function getToken(): string | null {
  return localStorage.getItem('token')
}

function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function decodeTokenPayload(): Record<string, string> | null {
  const token = getToken()
  if (!token) return null
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    return JSON.parse(atob(payload))
  } catch {
    return null
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }
  const text = await res.text()
  return text ? JSON.parse(text) : (undefined as T)
}

export const api = {
  // Auth
  async login(username: string, password: string): Promise<{ token: string }> {
    const result = await request<{ token: string }>('POST', '/auth/login', { username, password })
    localStorage.setItem('token', result.token)
    return result
  },
  logout() {
    localStorage.removeItem('token')
  },
  isLoggedIn(): boolean {
    return !!getToken()
  },
  isAdmin(): boolean {
    const payload = decodeTokenPayload()
    if (!payload) return false
    const role = payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']
    return role === 'admin'
  },

  // Users (admin)
  getUsers: () => request<User[]>('GET', '/auth/users'),
  createUser: (data: { username: string; password: string; role: string }) =>
    request<User>('POST', '/auth/users', data),
  deleteUser: (id: number) => request<void>('DELETE', `/auth/users/${id}`),

  // Boards
  getBoards: () => request<Board[]>('GET', '/boards'),
  createBoard: (data: { name: string; description?: string }) =>
    request<Board>('POST', '/boards', data),
  getBoard: (id: number) => request<Board>('GET', `/boards/${id}`),
  deleteBoard: (id: number) => request<void>('DELETE', `/boards/${id}`),
  addMember: (boardId: number, userId: number) =>
    request<void>('POST', `/boards/${boardId}/members`, { userId }),
  removeMember: (boardId: number, userId: number) =>
    request<void>('DELETE', `/boards/${boardId}/members/${userId}`),

  // Boards (update)
  updateBoard: (boardId: number, data: { name?: string; description?: string }) =>
    request<Board>('PUT', `/boards/${boardId}`, data),

  // Columns
  getColumns: (boardId: number) => request<Column[]>('GET', `/boards/${boardId}/columns`),
  createColumn: (boardId: number, data: { name: string }) =>
    request<Column>('POST', `/boards/${boardId}/columns`, data),
  updateColumn: (boardId: number, columnId: number, data: { name?: string }) =>
    request<Column>('PUT', `/boards/${boardId}/columns/${columnId}`, data),
  deleteColumn: (boardId: number, columnId: number) =>
    request<void>('DELETE', `/boards/${boardId}/columns/${columnId}`),

  // Cards
  createCard: (boardId: number, columnId: number, data: { title: string; description?: string }) =>
    request<Card>('POST', `/boards/${boardId}/columns/${columnId}/cards`, data),
  updateCard: (
    boardId: number,
    columnId: number,
    cardId: number,
    data: { title?: string; description?: string },
  ) => request<Card>('PUT', `/boards/${boardId}/columns/${columnId}/cards/${cardId}`, data),
  moveCard: (boardId: number, columnId: number, cardId: number, targetColumnId: number, position: number) =>
    request<Card>('PUT', `/boards/${boardId}/columns/${columnId}/cards/${cardId}/move`, {
      targetColumnId,
      position,
    }),
  deleteCard: (boardId: number, columnId: number, cardId: number) =>
    request<void>('DELETE', `/boards/${boardId}/columns/${columnId}/cards/${cardId}`),
}

// Types
export interface User {
  id: number
  username: string
  role: string
}

export interface Board {
  id: number
  name: string
  description?: string
  ownerId: number
  ownerUsername: string
  members: User[]
  columns: Column[]
}

export interface Column {
  id: number
  name: string
  position: number
  wipLimit?: number
  boardId: number
  cards: Card[]
}

export interface Card {
  id: number
  title: string
  description?: string
  position: number
  columnId: number
  stateHistory: CardStateHistory[]
}

export interface CardStateHistory {
  columnId: number
  columnName: string
  enteredAt: string
  enteredDate: string
  exitedAt?: string
  exitedDate?: string
}
