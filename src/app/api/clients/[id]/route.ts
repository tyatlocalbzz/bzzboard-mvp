import { NextRequest } from 'next/server'
import { getCurrentUserForAPI } from '@/lib/auth/session'
import { getClientByIdAsClientData, updateClient, deleteClient } from '@/lib/db/clients'
import { clientValidation } from '@/lib/validation/client-validation'
import { 
  ApiErrors, 
  ApiSuccess, 
  getValidatedParams,
  getValidatedBody,
  validateId
} from '@/lib/api/api-helpers'

interface ClientUpdateBody {
  name: string
  primaryContactName: string
  primaryContactEmail: string
  primaryContactPhone?: string
  website?: string
  socialMedia?: Record<string, string>
  notes?: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUserForAPI()
    if (!user?.email) {
      return ApiErrors.unauthorized()
    }

    const { id } = await getValidatedParams(params)
    console.log('📖 [ClientAPI] GET request for client:', id)
    
    const clientId = validateId(id, 'Client')
    
    console.log('🔍 [ClientAPI] Looking up client:', clientId)
    const client = await getClientByIdAsClientData(clientId)
    
    if (!client) {
      console.log('❌ [ClientAPI] Client not found:', clientId)
      return ApiErrors.notFound('Client')
    }

    console.log('✅ [ClientAPI] Client found:', client.name)
    return ApiSuccess.ok({ client })

  } catch (error) {
    console.error('❌ [ClientAPI] Get client error:', error)
    return ApiErrors.internalError('Failed to fetch client')
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUserForAPI()
    if (!user?.email) {
      return ApiErrors.unauthorized()
    }

    const { id } = await getValidatedParams(params)
    const clientId = validateId(id, 'Client')

    const body = await getValidatedBody<ClientUpdateBody>(request, (data) => {
      const clientData = data as ClientUpdateBody
      return clientValidation.clientData({
        name: clientData.name,
        primaryContactName: clientData.primaryContactName,
        primaryContactEmail: clientData.primaryContactEmail,
        primaryContactPhone: clientData.primaryContactPhone,
        website: clientData.website
      })
    })

    const { 
      name, 
      primaryContactName, 
      primaryContactEmail, 
      primaryContactPhone,
      website,
      socialMedia,
      notes 
    } = body

    const updatedClient = await updateClient(clientId, {
      name,
      primaryContactName,
      primaryContactEmail,
      primaryContactPhone,
      website,
      socialMedia: socialMedia || {},
      notes
    })

    if (!updatedClient) {
      return ApiErrors.notFound('Client')
    }

    const clientData = {
      id: updatedClient.id.toString(),
      name: updatedClient.name,
      type: 'client' as const,
      primaryContactName: updatedClient.primaryContactName,
      primaryContactEmail: updatedClient.primaryContactEmail,
      primaryContactPhone: updatedClient.primaryContactPhone,
      website: updatedClient.website,
      socialMedia: updatedClient.socialMedia,
      notes: updatedClient.notes
    }

    return ApiSuccess.ok({ client: clientData }, 'Client updated successfully')

  } catch (error) {
    console.error('❌ [ClientAPI] Update client error:', error)
    return ApiErrors.internalError('Failed to update client')
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUserForAPI()
    if (!user?.email) {
      return ApiErrors.unauthorized()
    }

    const { id } = await getValidatedParams(params)
    const clientId = validateId(id, 'Client')

    // Check for cascade option in query params
    const url = new URL(request.url)
    const cascade = url.searchParams.get('cascade') === 'true'

    console.log('🗑️ [ClientAPI] DELETE request for client:', clientId, 'cascade:', cascade)

    const result = await deleteClient(clientId, { cascade })

    if (!result.success) {
      if (result.dependencies) {
        // Return dependency information for confirmation dialog
        return ApiSuccess.ok({
          canDelete: false,
          dependencies: result.dependencies,
          message: result.message
        })
      }
      return ApiErrors.badRequest(result.message)
    }

    console.log('✅ [ClientAPI] Client deleted successfully:', result.message)
    return ApiSuccess.ok({
      canDelete: true,
      message: result.message,
      dependencies: result.dependencies
    })

  } catch (error) {
    console.error('❌ [ClientAPI] Delete client error:', error)
    return ApiErrors.internalError('Failed to delete client')
  }
} 