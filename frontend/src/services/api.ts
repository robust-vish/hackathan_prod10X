import axios from 'axios'
import type { AnalysisResult, CreateTicketResult } from '../types'

const api = axios.create({
  baseURL: '/api',
  timeout: 120000,
})

export async function analyzeTicket(ticketId: number): Promise<AnalysisResult> {
  const { data } = await api.post<AnalysisResult>('/analyze', { ticket_id: ticketId })
  return data
}

export async function createTicket(
  prompt: string,
  files?: File[]
): Promise<CreateTicketResult> {
  const formData = new FormData()
  formData.append('prompt', prompt)
  if (files) {
    files.forEach((file) => formData.append('files', file))
  }
  const { data } = await api.post<CreateTicketResult>('/create-ticket', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function getProjects() {
  const { data } = await api.get('/projects')
  return data.projects as { id: number; name: string }[]
}

export async function getUsers() {
  const { data } = await api.get('/users')
  return data.users as { id: number; name: string; login: string }[]
}
