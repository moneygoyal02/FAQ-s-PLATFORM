import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

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
  createdBy: User
  updatedBy: User
  updatedAt: string
  comments: Comment[]
}

const categories = ['General', 'Product', 'Support', 'Technical', 'Business']

export default function Home() {
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
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  const queryClient = useQueryClient()

  const { data: faqs, isLoading, isError } = useQuery<FAQ[]>({
    queryKey: ['faqs'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/faqs`)
      return response.data
    }
  })

  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const response = await axios.post(`${API_URL}/auth/login`, credentials)
      return response.data
    },
    onSuccess: (data) => {
      setUser(data.user)
      localStorage.setItem('token', data.token)
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
      showNotification('success', 'Logged in successfully!')
      setIsLoginDialogOpen(false)
    },
    onError: () => {
      showNotification('error', 'Login failed. Please check your credentials.')
    },
  })
  

  const addFaqMutation = useMutation({
    mutationFn: async (newFaq: { question: string; answer: string; category: string }) => {
      const response = await axios.post(`${API_URL}/faqs`, newFaq)
      return response.data
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['faqs'] })
      showNotification('success', 'FAQ added successfully!')
      setIsAddEditDialogOpen(false)
    },
    onError: () => {
      showNotification('error', 'Failed to add FAQ. Please try again.')
    }
  })
  
  const updateFaqMutation = useMutation({
    mutationFn: async (updatedFaq: { id: string; question: string; answer: string; category: string; isPinned: boolean }) => {
      const response = await axios.put(`${API_URL}/faqs/${updatedFaq.id}`, updatedFaq)
      return response.data
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['faqs'] })
      showNotification('success', 'FAQ updated successfully!')
      setIsAddEditDialogOpen(false)
    },
    onError: () => {
      showNotification('error', 'Failed to update FAQ. Please try again.')
    }
  })
  
  const deleteFaqMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`${API_URL}/faqs/${id}`)
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['faqs'] })
      showNotification('success', 'FAQ deleted successfully!')
    },
    onError: () => {
      showNotification('error', 'Failed to delete FAQ. Please try again.')
    }
  })
  
  const addCommentMutation = useMutation({
    mutationFn: async ({ faqId, content }: { faqId: string; content: string }) => {
      const response = await axios.post(`${API_URL}/faqs/${faqId}/comments`, { content })
      return response.data
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['faqs'] })
      showNotification('success', 'Comment added successfully!')
    },
    onError: () => {
      showNotification('error', 'Failed to add comment. Please try again.')
    }
  })
  

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 3000)
  }

  const login = (e: React.FormEvent) => {
    e.preventDefault()
    loginMutation.mutate({ username, password })
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('token')
    delete axios.defaults.headers.common['Authorization']
    showNotification('success', 'Logged out successfully!')
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
      })
    } else {
      addFaqMutation.mutate({ question: newQuestion, answer: newAnswer, category: newCategory })
    }
    setEditingFaq(null)
    setNewQuestion('')
    setNewAnswer('')
    setNewCategory('General')
  }

  const deleteFAQ = (id: string) => {
    deleteFaqMutation.mutate(id)
  }

  const togglePinFAQ = (faq: FAQ) => {
    updateFaqMutation.mutate({
      id: faq._id,
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      isPinned: !faq.isPinned
    })
  }


  const addComment = (faqId: string, content: string) => {
    addCommentMutation.mutate({ faqId, content })
  }

  const filteredFAQs = faqs?.filter(faq => 
    faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.category.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  const pinnedFAQs = filteredFAQs.filter(faq => faq.isPinned)
  const unpinnedFAQs = filteredFAQs.filter(faq => !faq.isPinned)

  if (isLoading) return <div>Loading...</div>
  if (isError) return <div>Error fetching FAQs</div>

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">Startup FAQ Collaborator</h1>
        {user ? (
          <div className="flex items-center gap-2">
            <span>Welcome, {user.username} ({user.role})</span>
            <Button onClick={logout}>Logout</Button>
          </div>
        ) : (
          <Button onClick={() => setIsLoginDialogOpen(true)}>Login</Button>
        )}
      </div>
      
      {notification && (
        <Alert variant={notification.type === 'success' ? 'default' : 'destructive'} className="mb-4">
          <AlertTitle>{notification.type === 'success' ? 'Success' : 'Error'}</AlertTitle>
          <AlertDescription>{notification.message}</AlertDescription>
        </Alert>
      )}

      <div className="mb-4">
        <Input
          type="text"
          placeholder="Search FAQs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {user && (user.role === 'admin' || user.role === 'editor') && (
        <Button onClick={() => setIsAddEditDialogOpen(true)} className="mb-4">Add New FAQ</Button>
      )}

      <Tabs defaultValue="all" className="mb-4">
        <TabsList>
          <TabsTrigger value="all">All FAQs</TabsTrigger>
          <TabsTrigger value="pinned">Pinned FAQs</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <Accordion type="single" collapsible className="w-full">
            {pinnedFAQs.concat(unpinnedFAQs).map((faq) => (
              <AccordionItem key={faq._id} value={faq._id}>
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    {faq.isPinned && <Badge variant="secondary">Pinned</Badge>}
                    <Badge>{faq.category}</Badge>
                    {faq.question}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="mb-2">{faq.answer}</p>
                  <p className="text-sm text-gray-500">Last updated by {faq.updatedBy.username} on {new Date(faq.updatedAt).toLocaleString()}</p>
                  {user && (user.role === 'admin' || user.role === 'editor') && (
                    <div className="flex gap-2 mt-2">
                      <Button onClick={() => {
                        setEditingFaq(faq)
                        setNewQuestion(faq.question)
                        setNewAnswer(faq.answer)
                        setNewCategory(faq.category)
                        setIsAddEditDialogOpen(true)
                      }} variant="outline">Edit</Button>
                      <Button onClick={() => deleteFAQ(faq._id)} variant="destructive">Delete</Button>
                      <Button onClick={() => togglePinFAQ(faq)} variant="outline">
                        {faq.isPinned ? 'Unpin' : 'Pin'}
                      </Button>
                    </div>
                  )}
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">Comments:</h4>
                    {faq.comments.map((comment) => (
                      <div key={comment._id} className="bg-gray-100 p-2 rounded mb-2">
                        <p>{comment.content}</p>
                        <p className="text-xs text-gray-500">By {comment.userId} on {new Date(comment.createdAt).toLocaleString()}</p>
                      </div>
                    ))}
                    {user && (
                      <form onSubmit={(e) => {
                        e.preventDefault()
                        const content = (e.target as HTMLFormElement).comment.value
                        addComment(faq._id, content)
                        ;(e.target as HTMLFormElement).comment.value = ''
                      }} className="mt-2">
                        <Input name="comment" placeholder="Add a comment..." />
                        <Button type="submit" className="mt-2">Add Comment</Button>
                      </form>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </TabsContent>
        <TabsContent value="pinned">
          <Accordion type="single" collapsible className="w-full">
            {pinnedFAQs.map((faq) => (
              <AccordionItem key={faq._id} value={faq._id}>
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Pinned</Badge>
                    <Badge>{faq.category}</Badge>
                    {faq.question}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="mb-2">{faq.answer}</p>
                  <p className="text-sm text-gray-500">Last updated by {faq.updatedBy.username} on {new Date(faq.updatedAt).toLocaleString()}</p>
                  {user && (user.role === 'admin' || user.role === 'editor') && (
                    <div className="flex gap-2 mt-2">
                      <Button onClick={() => {
                        setEditingFaq(faq)
                        setNewQuestion(faq.question)
                        setNewAnswer(faq.answer)
                        setNewCategory(faq.category)
                        setIsAddEditDialogOpen(true)
                      }} variant="outline">Edit</Button>
                      <Button onClick={() => deleteFAQ(faq._id)} variant="destructive">Delete</Button>
                      <Button onClick={() => togglePinFAQ(faq)} variant="outline">Unpin</Button>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </TabsContent>
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
              <Button type="submit">Login</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddEditDialogOpen} onOpenChange={setIsAddEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFaq ? 'Edit FAQ' : 'Add New FAQ'}</DialogTitle>
            <DialogDescription>
              {editingFaq ? 'Edit the FAQ details below.' : 'Enter the details for the new FAQ.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={addOrEditFAQ} className="space-y-4">
            <Input
              placeholder="Question"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
            />
            <Textarea
              placeholder="Answer"
              value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)}
            />
            <Select value={newCategory} onValueChange={setNewCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DialogFooter>
              <Button type="submit">{editingFaq ? 'Update FAQ' : 'Add FAQ'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}