// src/services/crud.service.ts
import { apiClient } from '../api/apiClient'

export function createCrudService<T>(endpoint: string) {
  return {
    async findAll() {
      const { data } = await apiClient.get(endpoint)
      return data.data as T[]
    },

    async findById(id: string) {
      const { data } = await apiClient.get(`${endpoint}/${id}`)
      return data.data as T
    },

    async create(payload: Partial<T>) {
      const { data } = await apiClient.post(endpoint, payload)
      return data.data as T
    },

    async update(id: string, payload: Partial<T>) {
      const { data } = await apiClient.put(`${endpoint}/${id}`, payload)
      return data.data as T
    },

    async remove(id: string) {
      const { data } = await apiClient.delete(`${endpoint}/${id}`)
      return data
    },
  }
}