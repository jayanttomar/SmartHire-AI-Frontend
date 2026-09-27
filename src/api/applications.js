import { ApiError, gatewayRequest, gatewayUrl } from './gateway'

export const applyToJob = ({ jobId, resumeId, coverLetter }) => gatewayRequest('/applications', {
  method: 'POST',
  body: JSON.stringify({ jobId, resumeId, coverLetter }),
})

export const listMyApplications = () => gatewayRequest('/applications/me')

export const listJobApplications = (jobId) => gatewayRequest(`/jobs/${jobId}/applications`)

export const listRecruiterApplications = () => gatewayRequest('/recruiter/applications')

export const getApplicationResumeContent = (applicationId) => gatewayRequest(`/applications/${applicationId}/resume-content`)

export async function getApplicationResumeFile(applicationId) {
  const token = localStorage.getItem('smarthire_token')
  let response
  try {
    response = await fetch(`${gatewayUrl}/applications/${applicationId}/resume-file`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
  } catch {
    throw new ApiError('Network error. Please check that SmartHire services are running.', 0, null)
  }
  if (!response.ok) throw new ApiError('Unable to open this resume PDF.', response.status, null)
  return URL.createObjectURL(await response.blob())
}

export const updateApplicationStatus = (applicationId, status) => gatewayRequest(`/applications/${applicationId}/status`, {
  method: 'PATCH',
  body: JSON.stringify({ status }),
})

export const withdrawApplication = (applicationId) => gatewayRequest(`/applications/${applicationId}/withdraw`, { method: 'PATCH' })

export const recalculateApplicationMatch = (applicationId) => gatewayRequest(`/applications/${applicationId}/recalculate-match`, { method: 'POST' })
