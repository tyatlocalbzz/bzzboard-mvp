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

export const SocialMediaStep = ({ data, onUpdate }: WizardStepProps) => {
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
              placeholder="@channelname"
            />
          </div>
        </div>
      </div>
    </div>
  )
} 