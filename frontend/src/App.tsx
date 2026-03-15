import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from "@clerk/clerk-react"
import { Button } from "@/components/ui/button"

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-6">
      <h1 className="text-4xl font-bold">Social App</h1>
      
      <SignedOut>
        <div className="flex flex-col items-center gap-2">
          <p className="text-muted-foreground mb-4">Please sign in to access your account</p>
          <div className="flex gap-4">
            <SignInButton mode="modal">
              <Button variant="default">Sign In</Button>
            </SignInButton>
            
            <SignUpButton mode="modal">
              <Button variant="outline">Sign Up</Button>
            </SignUpButton>
          </div>
        </div>
      </SignedOut>
      
      <SignedIn>
        <div className="flex flex-col items-center gap-4">
          <p className="text-muted-foreground">Welcome back! You are now signed in.</p>
          {/* UserButton handles the profile and sign-out UI out of the box */}
          <UserButton afterSignOutUrl="/" appearance={{ elements: { userButtonAvatarBox: "w-12 h-12" } }} />
        </div>
      </SignedIn>
      
    </div>
  )
}

export default App
