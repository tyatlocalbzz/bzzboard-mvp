import { IntegrationsManager } from '@/components/integrations/integrations-manager'
import { AuthUser } from '@/lib/auth/types'

interface IntegrationsTabProps {
  user: AuthUser
}

export const IntegrationsTab = ({ user }: IntegrationsTabProps) => {
  // AuthUser already has the correct structure for IntegrationsManager
  const integrationsUser = {
    id: user.id, // Already a string
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">Connected Services</h2>
        <p className="text-sm text-gray-600">
          Connect and configure external services to enhance your workflow
        </p>
      </div>
      
      <IntegrationsManager user={integrationsUser} />
    </div>
  )
} 