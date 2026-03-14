import { SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/clerk-react"
import { Button } from "@/components/ui/button"
import { AppLayout } from "./components/layout/AppLayout"
import { SubPageContainer } from "./components/layout/SubPageContainer"
import { FeedPage } from "./components/feed/FeedPage"
import { useState } from "react"

function App() {
  const [columns, setColumns] = useState([{ id: 'feed', title: 'For You' }])

  const addColumn = () => {
    const newId = `col-${Date.now()}`
    setColumns([...columns, { id: newId, title: 'New Thread' }])
  }

  return (
    <>
      <SignedOut>
        <div className="min-h-screen bg-slate-50 text-foreground flex flex-col items-center justify-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <h1 className="text-4xl font-bold mb-4">Threads Clone</h1>
            <p className="text-muted-foreground mb-4">Please sign in to access your account</p>
            <div className="flex gap-4">
              <SignInButton mode="modal">
                <Button variant="default" className="rounded-full px-8 py-6 text-lg font-bold">Log in</Button>
              </SignInButton>
              
              <SignUpButton mode="modal">
                <Button variant="outline" className="rounded-full px-8 py-6 text-lg font-bold">Sign up</Button>
              </SignUpButton>
            </div>
          </div>
        </div>
      </SignedOut>
      
      <SignedIn>
        <AppLayout>
          {columns.map((col) => (
            <SubPageContainer 
              key={col.id} 
              title={col.title} 
              onAddSubPage={col.id === 'feed' ? addColumn : undefined}
              columnCount={columns.length}
            >
              {col.id === 'feed' ? <FeedPage /> : (
                <div className="flex items-center justify-center h-full text-muted-foreground p-10 text-center">
                  This is a new flexible column. You can add more features here!
                </div>
              )}
            </SubPageContainer>
          ))}
        </AppLayout>
      </SignedIn>
    </>
  )
}

export default App
