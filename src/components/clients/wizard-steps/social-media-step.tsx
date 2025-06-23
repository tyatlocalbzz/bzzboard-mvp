'use client'

import { MobileInput } from '@/components/ui/mobile-input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Globe, 
  Instagram, 
  Facebook, 
  Linkedin, 
  Twitter, 
  Youtube,
  MessageSquare 
} from 'lucide-react'

interface WizardData {
  name: string
  primaryContactName: string
  primaryContactEmail: string
  primaryContactPhone?: string
  website?: string
  socialMedia: {
    instagram?: string
    facebook?: string
    linkedin?: string
    twitter?: string
    tiktok?: string
    youtube?: string
  }
  notes?: string
}

interface SocialMediaStepProps {
  data: WizardData
  onUpdate: (data: Partial<WizardData>) => void
}

export const SocialMediaStep = ({ data, onUpdate }: SocialMediaStepProps) => {
  const handleFieldChange = (field: keyof WizardData, value: string) => {
    onUpdate({ [field]: value })
  }

  const handleSocialMediaChange = (platform: string, value: string) => {
    onUpdate({
      socialMedia: {
        ...data.socialMedia,
        [platform]: value.trim() || undefined
      }
    })
  }

  const validateWebsite = (url: string): string | undefined => {
    if (!url) return undefined
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return 'Website must start with http:// or https://'
    }
    return undefined
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <MessageSquare className="h-6 w-6 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Social Media</h3>
        <p className="text-sm text-gray-600">Add social handles (optional)</p>
      </div>

      {/* Website */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-1">
            <Globe className="h-3 w-3" />
            Website
          </Label>
          <MobileInput
            value={data.website || ''}
            onChange={(e) => handleFieldChange('website', e.target.value)}
            placeholder="https://example.com"
            error={data.website ? validateWebsite(data.website) : undefined}
          />
        </div>

        {/* Social Media Handles */}
        <div className="space-y-4">
          <Label className="text-sm font-medium text-gray-900">
            Social Media Handles
          </Label>
          <p className="text-xs text-gray-500 -mt-2">
            This helps us understand which platforms to create content for
          </p>
          
          <div className="grid grid-cols-1 gap-4">
            {/* Instagram */}
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1">
                <Instagram className="h-3 w-3 text-pink-600" />
                Instagram
              </Label>
              <MobileInput
                value={data.socialMedia.instagram || ''}
                onChange={(e) => handleSocialMediaChange('instagram', e.target.value)}
                placeholder="@username"
              />
            </div>

            {/* Facebook */}
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1">
                <Facebook className="h-3 w-3 text-blue-600" />
                Facebook
              </Label>
              <MobileInput
                value={data.socialMedia.facebook || ''}
                onChange={(e) => handleSocialMediaChange('facebook', e.target.value)}
                placeholder="Page name or URL"
              />
            </div>

            {/* LinkedIn */}
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1">
                <Linkedin className="h-3 w-3 text-blue-700" />
                LinkedIn
              </Label>
              <MobileInput
                value={data.socialMedia.linkedin || ''}
                onChange={(e) => handleSocialMediaChange('linkedin', e.target.value)}
                placeholder="company/companyname or profile URL"
              />
            </div>

            {/* Twitter */}
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1">
                <Twitter className="h-3 w-3 text-blue-500" />
                Twitter
              </Label>
              <MobileInput
                value={data.socialMedia.twitter || ''}
                onChange={(e) => handleSocialMediaChange('twitter', e.target.value)}
                placeholder="@username"
              />
            </div>

            {/* TikTok */}
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1">
                <div className="h-3 w-3 bg-black rounded-sm flex items-center justify-center">
                  <span className="text-white text-[8px] font-bold">T</span>
                </div>
                TikTok
              </Label>
              <MobileInput
                value={data.socialMedia.tiktok || ''}
                onChange={(e) => handleSocialMediaChange('tiktok', e.target.value)}
                placeholder="@username"
              />
            </div>

            {/* YouTube */}
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1">
                <Youtube className="h-3 w-3 text-red-600" />
                YouTube
              </Label>
              <MobileInput
                value={data.socialMedia.youtube || ''}
                onChange={(e) => handleSocialMediaChange('youtube', e.target.value)}
                placeholder="@channelname or channel URL"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Notes</Label>
        <Textarea
          value={data.notes || ''}
          onChange={(e) => handleFieldChange('notes', e.target.value)}
          placeholder="Additional notes..."
          rows={3}
        />
      </div>

      {/* Info Box */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-white text-xs font-bold">✓</span>
          </div>
          <div>
            <h4 className="text-sm font-medium text-green-900 mb-1">
              Optional but helpful
            </h4>
            <p className="text-xs text-green-800">
              This information helps us create more targeted content and understand 
              your client&apos;s brand presence. You can always add or update this later.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 