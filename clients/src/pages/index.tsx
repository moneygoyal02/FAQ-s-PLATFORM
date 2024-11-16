"use client"

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { PinIcon, PinOffIcon, Edit, Trash, Plus, Lock, Loader2, LogOut, LogIn, ChevronDown, ChevronUp, Menu } from 'lucide-react'
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

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

function EnhancedFAQCollaborator() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false)
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false)
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null)
  const [activeCategory, setActiveCategory] = useState('All')
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const queryClient = useQueryClient()

  const { data: faqs, isLoading } = useQuery<FAQ[]>({
    queryKey: ['faqs'],
    queryFn: async () => {
      const token = localStorage.getItem('token')
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      const response = await axios.get(`${API_URL}/faqs`, { headers })
      return response.data
    },
  })

  const decodeToken = useCallback((token: string) => {
    try {
      const payload = token.split('.')[1]
      const decoded = JSON.parse(atob(payload))
      setUser({ id: decoded.userId, username: decoded.username, role: decoded.role })
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    } catch (error) {
      console.error('Token decoding failed:', error)
      logout()
    }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      decodeToken(token)
    }
  }, [decodeToken])

  const showNotification = useCallback((type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 3000)
  }, [])

  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const response = await axios.post(`${API_URL}/auth/login`, credentials)
      return response.data
    },
    onSuccess: (data) => {
      localStorage.setItem('token', data.token)
      decodeToken(data.token)
      showNotification('success', 'Logged in successfully!')
      setIsLoginDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ['faqs'] })
    },
    onError: () => {
      showNotification('error', 'Login failed. Please check your credentials.')
    },
  })

  const addFaqMutation = useMutation({
    mutationFn: async (newFaq: Omit<FAQ, '_id' | 'createdBy' | 'updatedBy' | 'updatedAt' | 'comments' | 'isPinned'>) => {
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
    mutationFn: async (updatedFaq: Partial<FAQ> & { id: string }) => {
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

  const login = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const username = formData.get('username') as string
    const password = formData.get('password') as string
    loginMutation.mutate({ username, password })
  }

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem('token')
    delete axios.defaults.headers.common['Authorization']
    showNotification('success', 'Logged out successfully!')
    queryClient.invalidateQueries({ queryKey: ['faqs'] })
    setActiveCategory('All')
    setIsMobileMenuOpen(false)
  }, [queryClient, showNotification])

  const addOrEditFAQ = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const faqData = {
      question: formData.get('question') as string,
      answer: formData.get('answer') as string,
      category: formData.get('category') as string,
      visibility: formData.get('visibility') as 'public' | 'internal',
    }

    if (editingFaq) {
      updateFaqMutation.mutate({ id: editingFaq._id, ...faqData })
    } else {
      addFaqMutation.mutate(faqData)
    }
  }

  const deleteFAQ = (id: string) => {
    if (window.confirm('Are you sure you want to delete this FAQ?')) {
      deleteFaqMutation.mutate(id)
    }
  }

  const togglePinFAQ = (faq: FAQ) => {
    updateFaqMutation.mutate({
      id: faq._id,
      isPinned: !faq.isPinned,
    })
  }

  const addComment = (faqId: string, content: string) => {
    addCommentMutation.mutate({ faqId, content })
  }

  const filteredFAQs = useMemo(() => {
    return faqs?.filter(faq => activeCategory === 'All' || faq.category === activeCategory) || []
  }, [faqs, activeCategory])

  const CategoryList = useCallback(() => (
    <ul className="space-y-2">
      <li>
        <button
          onClick={() => {
            setActiveCategory('All')
            setIsMobileMenuOpen(false)
          }}
          className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
            activeCategory === 'All'
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-muted'
          }`}
        >
          All
        </button>
      </li>
      {categories.map((category) => (
        <li key={category}>
          <button
            onClick={() => {
              setActiveCategory(category)
              setIsMobileMenuOpen(false)
            }}
            className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
              activeCategory === category
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            }`}
          >
            {category}
          </button>
        </li>
      ))}
    </ul>
  ), [activeCategory, setActiveCategory, setIsMobileMenuOpen])

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 md:p-8">
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-4 right-4 p-4 rounded-md ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white z-50`}
          >
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">FAQ Collaborator</h1>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <span className="text-sm font-semibold hidden sm:inline">Welcome, {user.username}</span>
                <Button onClick={logout} size="sm" variant="outline">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsLoginDialogOpen(true)} size="sm">
                <LogIn className="w-4 h-4 mr-2" />
                Login
              </Button>
            )}
          </div>
        </header>

        <div className="mb-8 flex flex-wrap gap-4 w-full">
          {user && (
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="md:hidden">
                  <Menu className="mr-2 h-4 w-4" />
                  Categories
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <h2 className="text-xl font-semibold mb-4">Categories</h2>
                <CategoryList />
              </SheetContent>
            </Sheet>
          )}
          {user && (user.role === 'admin' || user.role === 'editor') && (
            <Button 
              onClick={() => setIsAddEditDialogOpen(true)} 
              className="rounded-full md:max-w-[200px]"
            >
              <Plus className="mr-2 h-4 w-4" /> Add New FAQ
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {user && (
            <div className="md:col-span-1 hidden md:block">
              <h2 className="text-xl font-semibold mb-4">Categories</h2>
              <CategoryList />
            </div>
          )}
          <div className={user ? "md:col-span-3" : "md:col-span-4"}>
            <AnimatePresence>
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : filteredFAQs.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center text-muted-foreground"
                >
                  No FAQs found.
                </motion.div>
              ) : (
                filteredFAQs.map((faq) => (
                  <motion.div
                    key={faq._id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="bg-card text-card-foreground rounded-lg shadow-md mb-4 overflow-hidden hover:shadow-lg transition-shadow duration-300"
                  >
                    <div
                      className="p-4 cursor-pointer flex justify-between items-center"
                      onClick={() => setExpandedFAQ(expandedFAQ === faq._id ? null : faq._id)}
                    >
                      <h3 className="text-lg font-semibold">{faq.question}</h3>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">{faq.category}</Badge>
                        {faq.isPinned && <PinIcon className="w-4 h-4 text-primary" />}
                        {faq.visibility === 'internal' && <Lock className="w-4 h-4 text-muted-foreground" />}
                        {expandedFAQ === faq._id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                    <AnimatePresence>
                      {expandedFAQ === faq._id && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: 'auto' }}
                          exit={{ height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="p-4 border-t border-border">
                            <p className="text-muted-foreground mb-4">{faq.answer}</p>
                            <p className="text-xs text-muted-foreground mb-2">
                              Last updated by {faq.updatedBy.username} on {new Date(faq.updatedAt).toLocaleString()}
                            </p>
                            {user && (user.role === 'admin' || user.role === 'editor') && (
                              <div className="flex gap-2 mb-4">
                                <Button
                                  onClick={() => {
                                    setEditingFaq(faq)
                                    setIsAddEditDialogOpen(true)
                                  }}
                                  variant="outline"
                                  size="sm"
                                >
                                  <Edit className="w-4 h-4 mr-1" /> Edit
                                </Button>
                                <Button onClick={() => deleteFAQ(faq._id)} variant="destructive" size="sm">
                                  <Trash className="w-4 h-4 mr-1" /> Delete
                                </Button>
                                <Button onClick={() => togglePinFAQ(faq)} variant="outline" size="sm">
                                  {faq.isPinned ? <PinOffIcon className="w-4 h-4 mr-1" /> : <PinIcon className="w-4 h-4 mr-1" />}
                                  {faq.isPinned ? 'Unpin' : 'Pin'}
                                </Button>
                              </div>
                            )}
                            <Tabs defaultValue="comments" className="w-full">
                              <TabsList>
                                <TabsTrigger value="comments">Comments</TabsTrigger>
                                {user && <TabsTrigger value="add-comment">Add Comment</TabsTrigger>}
                              </TabsList>
                              <TabsContent value="comments">
                                {faq.comments.length > 0 ? (
                                  faq.comments.map((comment) => (
                                    <p key={comment._id} className="text-sm text-muted-foreground mb-1">
                                      {comment.content} - By {comment.userId} on {new Date(comment.createdAt).toLocaleString()}
                                    </p>
                                  ))
                                ) : (
                                  <p className="text-sm text-muted-foreground">No comments yet.</p>
                                )}
                              </TabsContent>
                              {user && (
                                <TabsContent value="add-comment">
                                  <form
                                    onSubmit={(e) => {
                                      e.preventDefault()
                                      const form = e.target as HTMLFormElement
                                      const content = form.comment.value
                                      addComment(faq._id, content)
                                      form.comment.value = ''
                                    }}
                                    className="mt-2"
                                  >
                                    <Textarea name="comment" placeholder="Add a comment..." className="mb-2" />
                                    <Button type="submit" size="sm">Add Comment</Button>
                                  </form>
                                </TabsContent>
                              )}
                            </Tabs>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <Dialog open={isLoginDialogOpen} onOpenChange={setIsLoginDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Login</DialogTitle>
            <DialogDescription>Enter your credentials to manage FAQs</DialogDescription>
          </DialogHeader>
          <form onSubmit={login} className="space-y-4">
            <Input
              type="text"
              name="username"
              placeholder="Username"
              required
            />
            <Input
              type="password"
              name="password"
              placeholder="Password"
              required
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
                name="question"
                placeholder="Enter the question"
                defaultValue={editingFaq?.question}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="answer">Answer</Label>
              <Textarea
                id="answer"
                name="answer"
                placeholder="Enter the answer"
                defaultValue={editingFaq?.answer}
                required
                className="min-h-[100px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select name="category" defaultValue={editingFaq?.category || 'General'}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="visibility">Visibility</Label>
                <Select name="visibility" defaultValue={editingFaq?.visibility || 'internal'}>
                  <SelectTrigger id="visibility">
                    <SelectValue placeholder="Select visibility" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Internal</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
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

export default function Home() {
  const queryClient = new QueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      <EnhancedFAQCollaborator />
    </QueryClientProvider>
  )
}