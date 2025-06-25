import { NextRequest } from 'next/server'
import { getAllClientsAsClientData, createClient } from '@/lib/db/clients'
import { clientValidation } from '@/lib/validation/client-validation'
import { ApiErrors, ApiSuccess, getValidatedBody } from '@/lib/api/api-helpers'
import { getCurrentUserForAPI } from '@/lib/auth/session'

export async function GET() {
  try {
    const user = await getCurrentUserForAPI()
    if (!user?.email) return ApiErrors.unauthorized()

    console.log('📖 [ClientsAPI] Loading clients for user:', user.email)
    const clients = await getAllClientsAsClientData()
    
    console.log('📊 [ClientsAPI] Found clients:', {
      count: clients.length,
      clients: clients.map(c => ({ id: c.id, name: c.name, type: c.type }))
    })
    
    return ApiSuccess.ok({ clients })
  } catch (error) {
    console.error('❌ [ClientsAPI] Get clients error:', error)
    return ApiErrors.internalError()
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserForAPI()
    if (!user?.email) return ApiErrors.unauthorized()

    const body = await getValidatedBody<{
      name: string
      primaryContactName: string
      primaryContactEmail: string
      primaryContactPhone?: string
      website?: string
      socialMedia?: Record<string, string>
      notes?: string
    }>(request, (data) => clientValidation.clientData(data as {
      name?: string
      primaryContactName?: string
      primaryContactEmail?: string
      primaryContactPhone?: string
      website?: string
    }))

    const { 
      name, 
      primaryContactName, 
      primaryContactEmail, 
      primaryContactPhone,
      website,
      socialMedia,
      notes 
    } = body

    const newClient = await createClient({
      name,
      primaryContactName,
      primaryContactEmail,
      primaryContactPhone,
      website,
      socialMedia: socialMedia || {},
      notes
    })

    const clientData = {
      id: newClient.id.toString(),
      name: newClient.name,
      type: 'client' as const,
      primaryContactName: newClient.primaryContactName,
      primaryContactEmail: newClient.primaryContactEmail,
      primaryContactPhone: newClient.primaryContactPhone,
      website: newClient.website,
      socialMedia: newClient.socialMedia,
      notes: newClient.notes
    }

    console.log('✅ [ClientsAPI] Client created successfully:', clientData.name)
    return ApiSuccess.created({ client: clientData }, 'Client created successfully')
  } catch (error) {
    console.error('Create client error:', error)
    return ApiErrors.internalError()
  }
} 