import { useLocalStorage } from '@/hooks/useLocalStorage'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function UserProfile() {
  const [userName, setUserName] = useLocalStorage('mapa-userName', '')
  const [language, setLanguage] = useLocalStorage('mapa-language', 'English')
  const [aboutMe, setAboutMe] = useLocalStorage('mapa-aboutMe', '')

  const handleSave = () => {
    // Values are auto-saved by useLocalStorage hook
    console.log('Profile saved:', { userName, language, aboutMe })
  }

  return (
    <div className="h-full p-6">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">User Profile</h2>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>
              Your profile helps personalize the AI experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                placeholder="Your name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Language</label>
              <Input
                placeholder="e.g., English, German"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>About Me</CardTitle>
            <CardDescription>
              Context for the LLM to understand you better
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Tell us about yourself, your interests, preferences..."
              className="min-h-[150px]"
              value={aboutMe}
              onChange={(e) => setAboutMe(e.target.value)}
            />
            <Button onClick={handleSave}>Save Profile</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
