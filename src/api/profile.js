import { gatewayRequest } from './gateway'

export const getCandidateProfile = () => gatewayRequest('/candidates/profile')
export const saveCandidateProfile = (profile) => gatewayRequest('/candidates/profile', { method: 'PUT', body: JSON.stringify(profile) })
export const getRecruiterProfile = () => gatewayRequest('/recruiters/profile')
export const saveRecruiterProfile = (profile) => gatewayRequest('/recruiters/profile', { method: 'PUT', body: JSON.stringify(profile) })
