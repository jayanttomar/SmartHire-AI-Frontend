import { gatewayRequest } from './gateway'
export const listJobs = () => gatewayRequest('/jobs')
export const listMyJobs = () => gatewayRequest('/jobs/mine')
export const getJob = (id) => gatewayRequest(`/jobs/${id}`)
export const createJob = (job) => gatewayRequest('/jobs', { method: 'POST', body: JSON.stringify(job) })
export const updateJob = (id, job) => gatewayRequest(`/jobs/${id}`, { method: 'PUT', body: JSON.stringify(job) })
export const deactivateJob = (id) => gatewayRequest(`/jobs/${id}`, { method: 'DELETE' })
