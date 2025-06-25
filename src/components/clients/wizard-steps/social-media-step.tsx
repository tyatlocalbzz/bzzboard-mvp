'use client'

import { MobileInput } from '@/components/ui/mobile-input'
import { Label } from '@/components/ui/label'
import { 
  Instagram, 
  Facebook, 
  Linkedin, 
  Twitter, 
  Youtube
} from 'lucide-react'
import { WizardStepProps } from '@/lib/types/wizard'
import { useAdminEnabledPlatforms } from '@/lib/hooks/use-client-platforms'
import { ClientData } from '@/lib/types/client'

export const SocialMediaStep = ({ data, onUpdate }: WizardStepProps) => {
  const adminEnabledPlatforms = useAdminEnabledPlatforms()
  
  const handleSocialMediaChange = (platform: string, value: string) => {
    onUpdate({
      socialMedia: {
        ...data.socialMedia,
        [platform]: value.trim() || undefined
      }
    })
  }

  return (
    <div className="space-y-6">
        {/* Social Media Handles */}
        <div className="space-y-4">
          <Label className="text-sm font-medium text-gray-900">
            Social Media Handles
          </Label>
          
          <div className="grid grid-cols-1 gap-4">
            {adminEnabledPlatforms.map((platform) => {
              // Map platform names to social media keys
              const platformToSocialKey: Record<string, keyof NonNullable<ClientData['socialMedia']>> = {
                'Instagram': 'instagram',
                'Facebook': 'facebook',
                'LinkedIn': 'linkedin',
                'X': 'twitter', // X platform uses the twitter field in client data
                'TikTok': 'tiktok',
                'YouTube': 'youtube'
              }
              
              const socialKey = platformToSocialKey[platform.name]
              if (!socialKey) return null // Skip platforms without social media mapping
              
              return (
                <div key={platform.name} className="space-y-2">
                  <Label className="text-xs flex items-center gap-1">
                    {platform.name === 'Instagram' && <Instagram className="h-3 w-3 text-pink-600" />}
                    {platform.name === 'Facebook' && <Facebook className="h-3 w-3 text-blue-600" />}
                    {platform.name === 'LinkedIn' && <Linkedin className="h-3 w-3 text-blue-700" />}
                    {platform.name === 'X' && <Twitter className="h-3 w-3 text-blue-500" />}
                    {platform.name === 'TikTok' && (
                      <div className="h-3 w-3 bg-black rounded-sm flex items-center justify-center">
                        <span className="text-white text-[8px] font-bold">T</span>
                      </div>
                    )}
                    {platform.name === 'YouTube' && <Youtube className="h-3 w-3 text-red-600" />}
                    {platform.name}
                  </Label>
                  <MobileInput
                    value={data.socialMedia[socialKey] || ''}
                    onChange={(e) => handleSocialMediaChange(socialKey, e.target.value)}
                    placeholder={
                      platform.name === 'Facebook' ? 'Page name or URL' :
                      platform.name === 'LinkedIn' ? 'company/companyname or profile URL' :
                      platform.name === 'YouTube' ? '@channelname' :
                      '@username'
                    }
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>
  )
} 