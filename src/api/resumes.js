import { gatewayRequest } from './gateway'

export const listMyResumes = () => gatewayRequest('/resumes/me')

export const uploadResume = (file) => {
  const body = new FormData()
  body.append('file', file)
  return gatewayRequest('/resumes/upload', { method: 'POST', body })
}

export const generateResume = (draft) => gatewayRequest('/resumes/generate', {
  method: 'POST',
  body: JSON.stringify(draft),
})
