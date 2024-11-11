'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PinIcon, PinOffIcon, EditIcon, TrashIcon, PlusIcon, SearchIcon, LockIcon, Loader2 } from 'lucide-react'
import { Toaster, toast } from 'react-hot-toast'
import { Label } from "@/components/ui/label"

const API_URL = process.env.NEXT_PUBLIC_API_URL

interface User {
  id: string
  username: string
  role: 'admin' | 'editor' | 'viewer'
}

interface Comment {
  _id: string
  userId: string
  content: string
  createdAt: string
}

interface FAQ {
  _id: string
  question: string
  answer: string
  category: string
  isPinned: boolean
  visibility: 'public' | 'internal'
  createdBy: User
  updatedBy: User
  updatedAt: string
  comments: Comment[]
}

const categories = [
  'General', 'Product', 'Support', 'Technical', 'Business', 'Product Development',
  'Customer Support', 'Operations', 'Marketing and Sales', 'Legal and Compliance',
  'Finance and Funding', 'Technology and Tools', 'Team and Culture'
]

export default function EnhancedFAQCollaborator() {
  const [user, setUser] = useState<User | null>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false)
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false)
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null)
  const [newQuestion, setNewQuestion] = useState('')
  const [newAnswer, setNewAnswer] = useState('')
  const [newCategory, setNewCategory] = useState('General')
  const [searchTerm, setSearchTerm] = useState('')
  const [newVisibility, setNewVisibility] = useState<'public' | 'internal'>('public')
  const [activeTab, setActiveTab] = useState('all')

  const queryClient = useQueryClient()

  const { data: faqs, refetch } = useQuery<FAQ[]>({
    queryKey: ['faqs'],
    queryFn: async () => {
      const token = localStorage.getItem('token')
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      const response = await axios.get(`${API_URL}/faqs`, { headers })
      return response.data
    },
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchInterval: false,
    staleTime: 30000,
  })
  

  const fetchFAQs = useCallback(() => {
    refetch()
  }, [refetch])

  const decodeToken = (token: string) => {
    try {
      const payload = token.split('.')[1]
      const decoded = JSON.parse(atob(payload))
      setUser({ id: decoded.userId, username: decoded.username, role: decoded.role })
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      setActiveTab('internal')
    } catch (error) {
      console.error('Token decoding failed:', error)
      logout()
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      decodeToken(token)
    }
    fetchFAQs()
  }, [fetchFAQs])

  const loginMutation = useMutation<
  { token: string; user: User },
  Error,
  { username: string; password: string }
>({
  mutationFn: async (credentials) => {
    const response = await axios.post(`${API_URL}/auth/login`, credentials)
    return response.data
  },
  onSuccess: (data) => {
    localStorage.setItem('token', data.token)
    decodeToken(data.token)
    toast.success('Logged in successfully!')
    setIsLoginDialogOpen(false)
    fetchFAQs()
  },
  onError: () => {
    toast.error('Login failed. Please check your credentials.')
  },
})

const addFaqMutation = useMutation<
FAQ,
Error,
{
  question: string
  answer: string
  category: string
  visibility: 'public' | 'internal'
}
>({
mutationFn: async (newFaq) => {
  const response = await axios.post(`${API_URL}/faqs`, newFaq)
  return response.data
},
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['faqs'] })
  toast.success('FAQ added successfully!')
  setIsAddEditDialogOpen(false)
},
onError: () => {
  toast.error('Failed to add FAQ. Please try again.')
}
})

const updateFaqMutation = useMutation<
FAQ,
Error,
{
  id: string
  question: string
  answer: string
  category: string
  isPinned: boolean
  visibility: 'public' | 'internal'
}
>({
mutationFn: async (updatedFaq) => {
  const response = await axios.put(`${API_URL}/faqs/${updatedFaq.id}`, updatedFaq)
  return response.data
},
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['faqs'] })
  toast.success('FAQ updated successfully!')
  setIsAddEditDialogOpen(false)
},
onError: () => {
  toast.error('Failed to update FAQ. Please try again.')
}
})

  const deleteFaqMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem('token')
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      await axios.delete(`${API_URL}/faqs/${id}`, { headers })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faqs'] })
      toast.success('FAQ deleted successfully!')
    },
    onError: (error) => {
      console.error('Delete error:', error)
      toast.error('Failed to delete FAQ. Please try again.')
    }
  })
  

  const addCommentMutation = useMutation({
    mutationFn: async ({ faqId, content }: { faqId: string; content: string }) => {
      const response = await axios.post(`${API_URL}/faqs/${faqId}/comments`, { content })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faqs'] })
      toast.success('Comment added successfully!')
    },
    onError: () => {
      toast.error('Failed to add comment. Please try again.')
    }
  })

  const login = (e: React.FormEvent) => {
    e.preventDefault()
    loginMutation.mutate({ username, password })
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('token')
    delete axios.defaults.headers.common['Authorization']
    toast.success('Logged out successfully!')
    fetchFAQs()
    setActiveTab('all')
  }

  const addOrEditFAQ = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingFaq) {
      updateFaqMutation.mutate({
        id: editingFaq._id,
        question: newQuestion,
        answer: newAnswer,
        category: newCategory,
        isPinned: editingFaq.isPinned,
        visibility: newVisibility,
      })
    } else {
      addFaqMutation.mutate({ question: newQuestion, answer: newAnswer, category: newCategory, visibility: newVisibility })
    }
    setEditingFaq(null)
    setNewQuestion('')
    setNewAnswer('')
    setNewCategory('General')
    setNewVisibility('public')
  }

  const deleteFAQ = (id: string) => {
    if (window.confirm('Are you sure you want to delete this FAQ?')) {
      deleteFaqMutation.mutate(id)
    }
  }

  const togglePinFAQ = (faq: FAQ) => {
    updateFaqMutation.mutate({
      id: faq._id,
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      isPinned: !faq.isPinned,
      visibility: faq.visibility
    })
  }

  const addComment = (faqId: string, content: string) => {
    addCommentMutation.mutate({ faqId, content })
  }

  const filteredFAQs = faqs?.filter(faq =>
    (faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.category.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (activeTab === 'all' || 
     (activeTab === 'pinned' && faq.isPinned) ||
     (activeTab === 'internal' && faq.visibility === 'internal'))
  ) || []

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Toaster position="top-right" />
      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">Startup FAQ Collaborator</CardTitle>
          {user ? (
            <div className="flex items-center gap-2">
              <span className="text-sm">Welcome, {user.username} ({user.role})</span>
              <Button onClick={logout} size="sm" variant="outline">Logout</Button>
            </div>
          ) : (
            <Button onClick={() => setIsLoginDialogOpen(true)} size="sm">Login</Button>
          )}
        </CardHeader>
        
      </Card>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-grow">
          <SearchIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Search FAQs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        {user && (user.role === 'admin' || user.role === 'editor') && (
          <Button onClick={() => setIsAddEditDialogOpen(true)} className="whitespace-nowrap">
            <PlusIcon className="mr-2 h-4 w-4" /> Add New FAQ
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="w-full">
          <TabsTrigger value="all" className="flex-1">All FAQs</TabsTrigger>
          <TabsTrigger value="pinned" className="flex-1">Pinned FAQs</TabsTrigger>
          {user && (
            <TabsTrigger value="internal" className="flex-1">
              <LockIcon className="h-4 w-4 mr-1" /> Internal FAQs
            </TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="all">
          <FAQList faqs={filteredFAQs} user={user} togglePinFAQ={togglePinFAQ} deleteFAQ={deleteFAQ} addComment={addComment} setEditingFaq={setEditingFaq} setIsAddEditDialogOpen={setIsAddEditDialogOpen} />
        </TabsContent>
        <TabsContent value="pinned">
          <FAQList faqs={filteredFAQs} user={user} togglePinFAQ={togglePinFAQ} deleteFAQ={deleteFAQ} addComment={addComment} setEditingFaq={setEditingFaq} setIsAddEditDialogOpen={setIsAddEditDialogOpen} />
        </TabsContent>
        {user && (
          <TabsContent value="internal">
            <FAQList faqs={filteredFAQs} user={user} togglePinFAQ={togglePinFAQ} deleteFAQ={deleteFAQ} addComment={addComment} setEditingFaq={setEditingFaq} setIsAddEditDialogOpen={setIsAddEditDialogOpen} />
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={isLoginDialogOpen} onOpenChange={setIsLoginDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Login</DialogTitle>
            <DialogDescription>Enter your credentials to manage FAQs</DialogDescription>
          </DialogHeader>
          <form onSubmit={login} className="space-y-4">
            <Input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
           <DialogFooter>
  <Button type="submit" disabled={loginMutation.isPending}>
    {loginMutation.isPending ? (
      <>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Logging in...
      </>
    ) : (
      'Login'
    )}
  </Button>
</DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddEditDialogOpen} onOpenChange={setIsAddEditDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>{editingFaq ? 'Edit FAQ' : 'Add New FAQ'}</DialogTitle>
            <DialogDescription>
              {editingFaq ? 'Edit the FAQ details below.' : 'Enter the details for the new FAQ.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={addOrEditFAQ} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="question">Question</Label>
              <Input
                id="question"
                placeholder="Enter the question"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="answer">Answer</Label>
              <Textarea
                id="answer"
                placeholder="Enter the answer"
                value={newAnswer}
                onChange={(e) => setNewAnswer(e.target.value)}
                required
                className="min-h-[100px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger id="category" className="bg-background">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800">
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="visibility">Visibility</Label>
                <Select value={newVisibility} onValueChange={(value) => setNewVisibility(value as 'public' | 'internal')}>
                  <SelectTrigger id="visibility" className="bg-background">
                    <SelectValue placeholder="Select visibility" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800">
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="internal">Internal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
  <Button 
    type="button" 
    variant="outline" 
    onClick={() => setIsAddEditDialogOpen(false)}
  >
    Cancel
  </Button>
  <Button 
    type="submit" 
    disabled={addFaqMutation.isPending || updateFaqMutation.isPending}
  >
    {addFaqMutation.isPending || updateFaqMutation.isPending ? (
      <>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        {editingFaq ? 'Updating...' : 'Adding...'}
      </>
    ) : (
      editingFaq ? 'Update FAQ' : 'Add FAQ'
    )}
  </Button>
</DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function FAQList({ faqs, user, togglePinFAQ, deleteFAQ, addComment, setEditingFaq, setIsAddEditDialogOpen }: {
  faqs: FAQ[]
  user: User | null
  togglePinFAQ: (faq: FAQ) => void
  deleteFAQ: (id: string) => void
  addComment: (faqId: string, content: string) => void
  setEditingFaq: (faq: FAQ | null) => void
  setIsAddEditDialogOpen: (isOpen: boolean) => void
}) {
  return (
    <Accordion type="single" collapsible className="w-full space-y-2">
      {faqs.map((faq) => (
        <AccordionItem key={faq._id} value={faq._id} className="border rounded-lg overflow-hidden">
          <AccordionTrigger className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800">
            <div className="flex flex-wrap items-center gap-2 text-left">
              <Badge>{faq.category}</Badge>
              <span className="text-sm sm:text-base">{faq.question}</span>
              {faq.isPinned && <Badge variant="secondary" className="p-1"><PinIcon className="h-3 w-3" /></Badge>}
              {faq.visibility === 'internal' && <Badge variant="outline" className="p-1"><LockIcon className="h-3 w-3" /></Badge>}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 py-2">
            <p className="mb-2 text-sm sm:text-base">{faq.answer}</p>
            <p className="text-xs sm:text-sm text-gray-500">
              Last updated by {faq.updatedBy.username} on {new Date(faq.updatedAt).toLocaleString()}
            </p>
            {user && (user.role === 'admin' || user.role === 'editor') && (
              <div className="flex gap-2 mt-2">
                <Button onClick={() => {
                  setEditingFaq(faq)
                  setIsAddEditDialogOpen(true)
                }} variant="outline" size="sm">
                  <EditIcon className="h-4 w-4 mr-1" /> Edit
                </Button>
                <Button onClick={() => deleteFAQ(faq._id)} variant="destructive" size="sm">
                  <TrashIcon className="h-4 w-4 mr-1" /> Delete
                </Button>
                <Button onClick={() => togglePinFAQ(faq)} variant="outline" size="sm">
                  {faq.isPinned ? <PinOffIcon className="h-4 w-4 mr-1" /> : <PinIcon className="h-4 w-4 mr-1" />}
                  {faq.isPinned ? 'Unpin' : 'Pin'}
                </Button>
              </div>
            )}
            <div className="mt-4">
              <h4 className="text-sm font-bold">Comments:</h4>
              {faq.comments.map((comment) => (
                <p key={comment._id} className="text-xs text-gray-600 mt-1">
                  {comment.content} - By {comment.userId} on {new Date(comment.createdAt).toLocaleString()}
                </p>
              ))}
              {user && (
                <form onSubmit={(e) => {
                  e.preventDefault()
                  const form = e.target as HTMLFormElement
                  const content = form.comment.value
                  addComment(faq._id, content)
                  form.comment.value = ''
                }} className="mt-2">
                  <Input type="text" name="comment" placeholder="Add a comment..." className="text-sm" />
                </form>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}